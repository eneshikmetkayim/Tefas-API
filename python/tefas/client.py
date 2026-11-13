"""
TEFAS API Client (Pure HTTP)
"""

import asyncio
import http.cookiejar
import json
import socket
import urllib.error
import urllib.request
from datetime import date, timedelta
from typing import Optional

from .exceptions import (
    TefasConnectionError,
    TefasDataError,
    TefasError,
    TefasTimeoutError,
    TefasWAFError,
)
from .models import (
    Announcement,
    Fund,
    FundAllocation,
    FundCategory,
    FundFounder,
    FundGroup,
    FundInfo,
    FundManagementFee,
    FundNameSearchResult,
    FundPrice,
    FundProfile,
    FundSizeInfo,
    FundType,
    MarketSummary,
)

_EMPTY_RESULT_MARKERS = ("index 0 out of bounds", "kayıt bulunamadı", "kayit bulunamadi")
_WAF_MARKERS = ("erişim engellendi", "web application firewall")
_MAX_CHUNK_DAYS = 28
_MAX_FALLBACK_BUSINESS_DAYS = 7
_MAX_RATE_LIMIT_RETRIES = 3

_DEFAULT_HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Origin": "https://www.tefas.gov.tr",
    "Referer": "https://www.tefas.gov.tr/tr/fon-karsilastirma",
}


def _is_empty_result_message(error_code: Optional[str], error_message: Optional[str], result_list) -> bool:
    if error_code:
        return False
    if result_list:
        return False
    if not error_message:
        return False
    lowered = str(error_message).lower()
    return any(marker in lowered for marker in _EMPTY_RESULT_MARKERS)


def _iter_date_chunks(start_date: date, end_date: date, max_days: int = _MAX_CHUNK_DAYS):
    """Tarih aralığını sondan başa max_days (<= 28 gün) bloklarına böler."""
    if start_date > end_date:
        return
    cursor_end = end_date
    span = timedelta(days=max_days - 1)
    while cursor_end >= start_date:
        cursor_start = max(start_date, cursor_end - span)
        yield cursor_start, cursor_end
        cursor_end = cursor_start - timedelta(days=1)


def _previous_business_day(d: date) -> date:
    prev = d - timedelta(days=1)
    while prev.weekday() >= 5:
        prev -= timedelta(days=1)
    return prev


def _normalize_fund_type(fund_type: FundType | str) -> FundType:
    if isinstance(fund_type, FundType):
        return fund_type
    return FundType(str(fund_type).strip().upper())


class TefasClient:
    """
    TEFAS Pure-HTTP API Client

    Tarayıcı otomasyonu olmadan doğrudan TEFAS JSON API uçlarına istek atar.

    Kullanım (async):
        async with TefasClient() as client:
            funds = await client.get_funds()

    Kullanım (sync):
        client = TefasClient()
        funds = client.sync_get_funds()
    """

    BASE_URL = "https://www.tefas.gov.tr"

    def __init__(
        self,
        headless: bool = False,
        timeout: int = 60000,
        auto_start: bool = True,
    ):
        # headless parametresi geriye dönük uyumluluk için korunur (HTTP modunda kullanılmaz).
        self.headless = headless
        self.timeout = timeout
        self.auto_start = auto_start

        self._started = False
        self._cookie_jar = http.cookiejar.CookieJar()
        self._opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self._cookie_jar))
        self._latest_dates: dict[FundType, date] = {}
        self._sync_loop: Optional[asyncio.AbstractEventLoop] = None

    # ==================== Context Manager ====================

    async def __aenter__(self):
        if self.auto_start:
            await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def start(self):
        """HTTP oturumunu başlat."""
        self._started = True

    async def close(self):
        """Oturumu kapat."""
        self._started = False

    # ==================== Internal HTTP & API Call ====================

    def _resolve_url(self, endpoint: str) -> str:
        if endpoint.startswith("http://") or endpoint.startswith("https://"):
            return endpoint
        if endpoint.startswith("/api/"):
            return f"{self.BASE_URL}{endpoint}"
        cleaned = endpoint.lstrip("/")
        return f"{self.BASE_URL}/api/funds/{cleaned}"

    def _sync_http_post_json(self, url: str, params: dict) -> tuple[int, str]:
        payload = json.dumps(params, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers=dict(_DEFAULT_HEADERS),
            method="POST",
        )
        timeout_sec = max(1.0, self.timeout / 1000.0)
        try:
            with self._opener.open(request, timeout=timeout_sec) as response:
                raw = response.read().decode("utf-8", errors="replace")
                return response.status, raw
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
            return exc.code, raw
        except urllib.error.URLError as exc:
            if isinstance(exc.reason, (TimeoutError, socket.timeout)):
                raise TefasTimeoutError(f"API isteği zaman aşımına uğradı: {exc}") from exc
            raise TefasConnectionError(f"API bağlantısı başarısız: {exc}") from exc
        except (TimeoutError, socket.timeout) as exc:
            raise TefasTimeoutError(f"API isteği zaman aşımına uğradı: {exc}") from exc
        except Exception as exc:
            raise TefasConnectionError(f"API çağrısı başarısız: {exc}") from exc

    async def _http_post_json(self, url: str, params: dict) -> tuple[int, str]:
        return await asyncio.to_thread(self._sync_http_post_json, url, params)

    async def _call_api(
        self,
        endpoint: str,
        params: dict,
        method: str = "POST",
    ) -> dict:
        """Internal API çağrısı"""
        if not self._started:
            await self.start()

        if method.upper() != "POST":
            raise TefasError(f"Desteklenmeyen HTTP metodu: {method}")

        url = self._resolve_url(endpoint)

        for attempt in range(_MAX_RATE_LIMIT_RETRIES + 1):
            status, text = await self._http_post_json(url, params)
            lowered = text.lower()

            if any(marker in lowered for marker in _WAF_MARKERS) or text.lstrip().startswith("<"):
                raise TefasWAFError("İstek WAF tarafından engellendi")

            if status == 429:
                if attempt < _MAX_RATE_LIMIT_RETRIES:
                    await asyncio.sleep(1.5 * (2**attempt))
                    continue
                raise TefasConnectionError(f"Rate limit (HTTP 429): {text[:200]}")

            if status < 200 or status >= 300:
                raise TefasDataError(f"HTTP {status}: {text[:200]}")

            try:
                data = json.loads(text)
            except ValueError as exc:
                raise TefasDataError(f"JSON ayrıştırma hatası: {text[:200]}") from exc

            if not isinstance(data, dict):
                return {"resultList": data if isinstance(data, list) else []}

            error_code = data.get("errorCode")
            error_message = data.get("errorMessage")
            result_list = data.get("resultList")

            if _is_empty_result_message(error_code, error_message, result_list):
                return {"resultList": [], "toplamSayi": 0, "toplamSayfa": 0}

            if error_code or error_message:
                message = error_message or "TEFAS API hatası"
                if error_code:
                    message += f" (kod: {error_code})"
                raise TefasDataError(message)

            if result_list is None and "resultList" in data:
                data["resultList"] = []
            return data

        raise TefasConnectionError("API çağrısı rate limit nedeniyle tamamlanamadı")

    def _build_params(
        self,
        fund_type: FundType,
        fund_code: str = "",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        bit_sira: int = 100000,
    ) -> dict:
        """API parametrelerini oluştur"""
        if start_date is None:
            start_date = self._get_last_business_day()
        if end_date is None:
            end_date = start_date

        normalized_code = fund_code.strip().upper() if fund_code else ""
        return {
            "fonTipi": fund_type.value,
            "fonKodu": normalized_code or None,
            "aramaMetni": None,
            "fonTurKod": None,
            "fonGrubu": None,
            "sfonTurKod": None,
            "fonTurAciklama": None,
            "kurucuKod": None,
            "basTarih": start_date.strftime("%Y%m%d"),
            "bitTarih": end_date.strftime("%Y%m%d"),
            "basSira": 1,
            "bitSira": bit_sira,
            "dil": "TR",
            "sFonTurKod": "",
            "fonKod": "",
            "fonGrup": "",
            "fonUnvanTip": "",
        }

    async def _resolve_latest_date(
        self,
        fund_type: FundType,
        endpoint: str = "fonGnlBlgSiraliGetir",
    ) -> date:
        if fund_type in self._latest_dates:
            return self._latest_dates[fund_type]

        candidate = self._get_last_business_day()
        for _ in range(_MAX_FALLBACK_BUSINESS_DAYS):
            params = self._build_params(fund_type, "", candidate, candidate, bit_sira=1)
            if endpoint == "dagilimSiraliGetirT":
                params["fonKod"] = None
            result = await self._call_api(endpoint, params)
            if result.get("resultList"):
                self._latest_dates[fund_type] = candidate
                return candidate
            candidate = _previous_business_day(candidate)

        fallback = self._get_last_business_day()
        self._latest_dates[fund_type] = fallback
        return fallback

    # ==================== 7 Main API Methods ====================

    async def get_funds(
        self,
        fund_type: FundType | str = FundType.YAT,
        target_date: Optional[date] = None,
    ) -> list[Fund]:
        """1. Tüm fonları getir."""
        ft = _normalize_fund_type(fund_type)
        if target_date is not None:
            params = self._build_params(ft, "", target_date, target_date)
            result = await self._call_api("fonGnlBlgSiraliGetir", params)
            data = result.get("resultList") or []
            return [Fund.from_api_response(item, ft) for item in data]

        candidate = self._latest_dates.get(ft) or self._get_last_business_day()
        for _ in range(_MAX_FALLBACK_BUSINESS_DAYS):
            params = self._build_params(ft, "", candidate, candidate)
            result = await self._call_api("fonGnlBlgSiraliGetir", params)
            data = result.get("resultList") or []
            if data:
                self._latest_dates[ft] = candidate
                return [Fund.from_api_response(item, ft) for item in data]
            candidate = _previous_business_day(candidate)

        return []

    async def get_fund(
        self,
        code: str,
        fund_type: FundType | str = FundType.YAT,
        target_date: Optional[date] = None,
    ) -> Optional[Fund]:
        """2. Belirli bir fonu getir."""
        ft = _normalize_fund_type(fund_type)
        normalized_code = code.strip().upper()
        if not normalized_code:
            return None

        if target_date is not None:
            params = self._build_params(ft, normalized_code, target_date, target_date)
            result = await self._call_api("fonGnlBlgSiraliGetir", params)
            data = result.get("resultList") or []
            return Fund.from_api_response(data[0], ft) if data else None

        candidate = self._latest_dates.get(ft) or self._get_last_business_day()
        params = self._build_params(ft, normalized_code, candidate, candidate)
        result = await self._call_api("fonGnlBlgSiraliGetir", params)
        data = result.get("resultList") or []
        if data:
            self._latest_dates[ft] = candidate
            return Fund.from_api_response(data[0], ft)

        if ft in self._latest_dates:
            return None

        resolved = await self._resolve_latest_date(ft)
        if resolved == candidate:
            return None

        params = self._build_params(ft, normalized_code, resolved, resolved)
        result = await self._call_api("fonGnlBlgSiraliGetir", params)
        data = result.get("resultList") or []
        return Fund.from_api_response(data[0], ft) if data else None

    async def get_price_history(
        self,
        code: str,
        fund_type: FundType | str = FundType.YAT,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        days: Optional[int] = None,
    ) -> list[FundPrice]:
        """3. Fon fiyat geçmişini getir (uzun aralıkları otomatik 28 günlük parçalara böler)."""
        ft = _normalize_fund_type(fund_type)
        normalized_code = code.strip().upper()
        if not normalized_code:
            return []

        if end_date is None:
            end_date = self._get_last_business_day()

        if days is not None:
            start_date = end_date - timedelta(days=days)
        elif start_date is None:
            start_date = end_date - timedelta(days=30)

        if start_date > end_date:
            return []

        prices_by_date: dict[date, FundPrice] = {}
        chunks = list(_iter_date_chunks(start_date, end_date))
        for idx, (chunk_start, chunk_end) in enumerate(chunks):
            if idx > 0:
                await asyncio.sleep(0.35)
            params = self._build_params(ft, normalized_code, chunk_start, chunk_end)
            result = await self._call_api("fonGnlBlgSiraliGetir", params)
            for item in result.get("resultList") or []:
                price = FundPrice.from_api_response(item)
                prices_by_date[price.date] = price

        return sorted(prices_by_date.values(), key=lambda p: p.date, reverse=True)

    async def get_allocation(
        self,
        code: str = "",
        fund_type: FundType | str = FundType.YAT,
        target_date: Optional[date] = None,
    ) -> list[FundAllocation]:
        """4. Fon varlık dağılımını getir."""
        ft = _normalize_fund_type(fund_type)
        normalized_code = code.strip().upper()

        if target_date is not None:
            params = self._build_params(ft, normalized_code, target_date, target_date)
            params["fonKod"] = normalized_code or None
            result = await self._call_api("dagilimSiraliGetirT", params)
            data = result.get("resultList") or []
            return [FundAllocation.from_api_response(item) for item in data]

        if not normalized_code:
            candidate = self._latest_dates.get(ft) or self._get_last_business_day()
            for _ in range(_MAX_FALLBACK_BUSINESS_DAYS):
                params = self._build_params(ft, "", candidate, candidate)
                params["fonKod"] = None
                result = await self._call_api("dagilimSiraliGetirT", params)
                data = result.get("resultList") or []
                if data:
                    self._latest_dates[ft] = candidate
                    return [FundAllocation.from_api_response(item) for item in data]
                candidate = _previous_business_day(candidate)
            return []

        candidate = self._latest_dates.get(ft) or self._get_last_business_day()
        params = self._build_params(ft, normalized_code, candidate, candidate)
        params["fonKod"] = normalized_code
        result = await self._call_api("dagilimSiraliGetirT", params)
        data = result.get("resultList") or []
        if data:
            self._latest_dates[ft] = candidate
            return [FundAllocation.from_api_response(item) for item in data]

        if ft in self._latest_dates:
            return []

        resolved = await self._resolve_latest_date(ft, "dagilimSiraliGetirT")
        if resolved == candidate:
            return []

        params = self._build_params(ft, normalized_code, resolved, resolved)
        params["fonKod"] = normalized_code
        result = await self._call_api("dagilimSiraliGetirT", params)
        data = result.get("resultList") or []
        return [FundAllocation.from_api_response(item) for item in data]

    async def get_top_funds(
        self,
        fund_type: FundType | str = FundType.YAT,
        target_date: Optional[date] = None,
        by: str = "total_value",
        limit: int = 10,
        ascending: bool = False,
    ) -> list[Fund]:
        """5. En büyük/küçük fonları getir."""
        funds = await self.get_funds(fund_type, target_date)

        sort_key = {
            "total_value": lambda f: f.total_value,
            "investor_count": lambda f: f.investor_count,
            "price": lambda f: f.price,
            "share_count": lambda f: f.share_count,
        }.get(by, lambda f: f.total_value)

        sorted_funds = sorted(funds, key=sort_key, reverse=not ascending)
        return sorted_funds[:limit]

    async def get_market_summary(
        self,
        fund_type: FundType | str = FundType.YAT,
        target_date: Optional[date] = None,
    ) -> MarketSummary:
        """6. Piyasa özetini getir."""
        ft = _normalize_fund_type(fund_type)
        funds = await self.get_funds(ft, target_date)
        summary_date = target_date or (
            funds[0].date if funds else self._latest_dates.get(ft, self._get_last_business_day())
        )

        summary = MarketSummary(
            date=summary_date,
            fund_type=ft,
            total_funds=len(funds),
            total_value=sum(f.total_value for f in funds),
            total_investors=sum(f.investor_count for f in funds),
        )

        summary.top_funds_by_value = sorted(funds, key=lambda f: f.total_value, reverse=True)[:10]
        summary.top_funds_by_investors = sorted(funds, key=lambda f: f.investor_count, reverse=True)[:10]
        return summary

    async def search_funds(
        self,
        query: str,
        fund_type: FundType | str = FundType.YAT,
        target_date: Optional[date] = None,
    ) -> list[Fund]:
        """7. Fon ara (kod veya isimde)."""
        funds = await self.get_funds(fund_type, target_date)
        query_upper = query.upper()
        return [
            f
            for f in funds
            if query_upper in f.code.upper() or query_upper in f.name.upper()
        ]

    # ==================== Extended / Researched Endpoints ====================

    async def get_fund_codes(self, fund_type: FundType | str = FundType.YAT) -> list[str]:
        """Tüm fon kodlarını getir."""
        funds = await self.get_funds(fund_type)
        return [f.code for f in funds if f.code]

    async def get_fund_info(self, code: str, lang: str = "TR") -> Optional[FundInfo]:
        """Tekil fon özet ve kategori sıralama bilgisi (fonBilgiGetir)."""
        normalized_code = code.strip().upper()
        if not normalized_code:
            return None
        result = await self._call_api(
            "fonBilgiGetir",
            {"fonKodu": normalized_code, "dil": lang},
        )
        data = result.get("resultList") or []
        return FundInfo.from_api_response(data[0]) if data else None

    async def get_fund_profile(self, code: str, lang: str = "TR") -> Optional[FundProfile]:
        """Fon profil, ISIN, saat ve komisyon/valör bilgileri (fonProfilBilgiGetir)."""
        normalized_code = code.strip().upper()
        if not normalized_code:
            return None
        result = await self._call_api(
            "fonProfilBilgiGetir",
            {"fonKodu": normalized_code, "dil": lang},
        )
        data = result.get("resultList") or []
        return FundProfile.from_api_response(data[0]) if data else None

    async def get_period_price_history(
        self,
        code: str,
        period: str = "1",
        lang: str = "TR",
    ) -> list[FundPrice]:
        """Periyod bazlı hızlı fiyat geçmişi ('1', '3', '6', '12', '36', '60' ay) (fonFiyatBilgiGetir)."""
        normalized_code = code.strip().upper()
        if not normalized_code:
            return []
        result = await self._call_api(
            "fonFiyatBilgiGetir",
            {"fonKodu": normalized_code, "dil": lang, "periyod": str(period)},
        )
        prices = [FundPrice.from_api_response(item) for item in (result.get("resultList") or [])]
        return sorted(prices, key=lambda p: p.date, reverse=True)

    async def get_fund_sizes(
        self,
        fund_type: FundType | str = FundType.YAT,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        code: str = "",
        lang: str = "TR",
    ) -> list[FundSizeInfo]:
        """Tarih aralığında portföy büyüklüğü ve pay sayısı değişimi (fonBuyuklukBazliBilgiGetir)."""
        ft = _normalize_fund_type(fund_type)
        if end_date is None:
            end_date = self._get_last_business_day()
        if start_date is None:
            start_date = end_date - timedelta(days=7)

        result = await self._call_api(
            "fonBuyuklukBazliBilgiGetir",
            {
                "fonTipi": ft.value,
                "sFonTurKod": "",
                "fonKod": "",
                "fonGrup": "",
                "fonUnvanTip": "",
                "basTarih": start_date.strftime("%Y%m%d"),
                "bitTarih": end_date.strftime("%Y%m%d"),
                "basSira": 1,
                "bitSira": 100000,
                "dil": lang,
            },
        )
        items = [FundSizeInfo.from_api_response(item) for item in (result.get("resultList") or [])]
        normalized_code = code.strip().upper()
        if normalized_code:
            items = [item for item in items if item.code.upper() == normalized_code]
        return items

    async def get_management_fees(
        self,
        fund_type: FundType | str = FundType.YAT,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        code: str = "",
        lang: str = "TR",
    ) -> list[FundManagementFee]:
        """Fon yönetim ücreti ve toplam gider kesintisi karşılaştırması (fonYonetimBazliBilgiGetir)."""
        ft = _normalize_fund_type(fund_type)
        if end_date is None:
            end_date = self._get_last_business_day()
        if start_date is None:
            start_date = end_date - timedelta(days=7)

        result = await self._call_api(
            "fonYonetimBazliBilgiGetir",
            {
                "fonTipi": ft.value,
                "sFonTurKod": "",
                "fonKod": "",
                "fonGrup": "",
                "fonUnvanTip": "",
                "basTarih": start_date.strftime("%Y%m%d"),
                "bitTarih": end_date.strftime("%Y%m%d"),
                "basSira": 1,
                "bitSira": 100000,
                "dil": lang,
            },
        )
        items = [FundManagementFee.from_api_response(item) for item in (result.get("resultList") or [])]
        normalized_code = code.strip().upper()
        if normalized_code:
            items = [item for item in items if item.code.upper() == normalized_code]
        return items

    async def get_fund_founders(
        self,
        fund_type: FundType | str = FundType.YAT,
        lang: str = "TR",
    ) -> list[FundFounder]:
        """Fon kurucularını listele (fonKurucuGetir)."""
        ft = _normalize_fund_type(fund_type)
        result = await self._call_api(
            "fonKurucuGetir",
            {"fonTipi": ft.value, "dil": lang},
        )
        return [FundFounder.from_api_response(item) for item in (result.get("resultList") or [])]

    async def get_fund_categories(
        self,
        fund_type: FundType | str = FundType.YAT,
        lang: str = "TR",
    ) -> list[FundCategory]:
        """Şemsiye fon türlerini listele (fonTurGetir)."""
        ft = _normalize_fund_type(fund_type)
        result = await self._call_api(
            "fonTurGetir",
            {"fonTipi": ft.value, "dil": lang},
        )
        return [FundCategory.from_api_response(item) for item in (result.get("resultList") or [])]

    async def get_fund_groups(
        self,
        fund_type: FundType | str = FundType.YAT,
        lang: str = "TR",
    ) -> list[FundGroup]:
        """Fon gruplarını listele (fonGrupGetir)."""
        ft = _normalize_fund_type(fund_type)
        result = await self._call_api(
            "fonGrupGetir",
            {"fonTipi": ft.value, "dil": lang},
        )
        return [FundGroup.from_api_response(item) for item in (result.get("resultList") or [])]

    async def search_fund_names(
        self,
        query: str,
        fund_type: FundType | str = FundType.YAT,
        lang: str = "TR",
    ) -> list[FundNameSearchResult]:
        """Sunucu taraflı ünvan araması (fonUnvanAra)."""
        ft = _normalize_fund_type(fund_type)
        cleaned = query.strip()
        if not cleaned:
            return []
        result = await self._call_api(
            "fonUnvanAra",
            {"aramaMetni": cleaned, "fonTipi": ft.value, "dil": lang},
        )
        return [FundNameSearchResult.from_api_response(item) for item in (result.get("resultList") or [])]

    async def get_fund_type_code(self, code: str) -> Optional[str]:
        """Fon iç tipi kodunu getir (ör: 'F', 'E') (fonTipiGetir)."""
        normalized_code = code.strip().upper()
        if not normalized_code:
            return None
        result = await self._call_api("fonTipiGetir", {"fonKodu": normalized_code})
        return result.get("fonTipi")

    async def get_announcements(self, lang: str = "TR") -> list[Announcement]:
        """TEFAS resmi duyurularını getir (fonTefasDuyuruGetir)."""
        result = await self._call_api(
            "/api/announcements/fonTefasDuyuruGetir",
            {"dil": lang},
        )
        return [Announcement.from_api_response(item) for item in (result.get("resultList") or [])]

    # ==================== Sync Wrappers ====================

    def _run_sync(self, coro):
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            pass
        else:
            coro.close()
            raise TefasError(
                "Aktif bir async event loop içinde sync_* metodları çağrılamaz; "
                "bunun yerine await client.get_*() kullanın."
            )

        if self._sync_loop is None or self._sync_loop.is_closed():
            self._sync_loop = asyncio.new_event_loop()
        return self._sync_loop.run_until_complete(coro)

    def sync_get_funds(self, *args, **kwargs) -> list[Fund]:
        return self._run_sync(self.get_funds(*args, **kwargs))

    def sync_get_fund(self, *args, **kwargs) -> Optional[Fund]:
        return self._run_sync(self.get_fund(*args, **kwargs))

    def sync_get_price_history(self, *args, **kwargs) -> list[FundPrice]:
        return self._run_sync(self.get_price_history(*args, **kwargs))

    def sync_get_allocation(self, *args, **kwargs) -> list[FundAllocation]:
        return self._run_sync(self.get_allocation(*args, **kwargs))

    def sync_get_top_funds(self, *args, **kwargs) -> list[Fund]:
        return self._run_sync(self.get_top_funds(*args, **kwargs))

    def sync_get_market_summary(self, *args, **kwargs) -> MarketSummary:
        return self._run_sync(self.get_market_summary(*args, **kwargs))

    def sync_search_funds(self, *args, **kwargs) -> list[Fund]:
        return self._run_sync(self.search_funds(*args, **kwargs))

    def sync_get_fund_codes(self, *args, **kwargs) -> list[str]:
        return self._run_sync(self.get_fund_codes(*args, **kwargs))

    def sync_get_fund_info(self, *args, **kwargs) -> Optional[FundInfo]:
        return self._run_sync(self.get_fund_info(*args, **kwargs))

    def sync_get_fund_profile(self, *args, **kwargs) -> Optional[FundProfile]:
        return self._run_sync(self.get_fund_profile(*args, **kwargs))

    def sync_get_period_price_history(self, *args, **kwargs) -> list[FundPrice]:
        return self._run_sync(self.get_period_price_history(*args, **kwargs))

    def sync_get_fund_sizes(self, *args, **kwargs) -> list[FundSizeInfo]:
        return self._run_sync(self.get_fund_sizes(*args, **kwargs))

    def sync_get_management_fees(self, *args, **kwargs) -> list[FundManagementFee]:
        return self._run_sync(self.get_management_fees(*args, **kwargs))

    def sync_get_fund_founders(self, *args, **kwargs) -> list[FundFounder]:
        return self._run_sync(self.get_fund_founders(*args, **kwargs))

    def sync_get_fund_categories(self, *args, **kwargs) -> list[FundCategory]:
        return self._run_sync(self.get_fund_categories(*args, **kwargs))

    def sync_get_fund_groups(self, *args, **kwargs) -> list[FundGroup]:
        return self._run_sync(self.get_fund_groups(*args, **kwargs))

    def sync_search_fund_names(self, *args, **kwargs) -> list[FundNameSearchResult]:
        return self._run_sync(self.search_fund_names(*args, **kwargs))

    def sync_get_fund_type_code(self, *args, **kwargs) -> Optional[str]:
        return self._run_sync(self.get_fund_type_code(*args, **kwargs))

    def sync_get_announcements(self, *args, **kwargs) -> list[Announcement]:
        return self._run_sync(self.get_announcements(*args, **kwargs))

    def sync_close(self):
        if self._started:
            self._run_sync(self.close())
        if self._sync_loop and not self._sync_loop.is_closed():
            self._sync_loop.close()
            self._sync_loop = None

    # ==================== Helpers ====================

    def _get_last_business_day(self) -> date:
        """Son iş gününü bul (hafta sonu hariç)"""
        today = date.today()
        if today.weekday() == 5:
            return today - timedelta(days=1)
        elif today.weekday() == 6:
            return today - timedelta(days=2)
        return today
