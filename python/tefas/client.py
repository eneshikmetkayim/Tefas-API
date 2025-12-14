"""
TEFAS API Client
"""

import json
import asyncio
from datetime import date, datetime, timedelta
from typing import Optional, Union
from dataclasses import dataclass

from .models import Fund, FundPrice, FundAllocation, FundType, MarketSummary
from .exceptions import (
    TefasError, TefasConnectionError, TefasDataError, 
    TefasWAFError, TefasNotFoundError, TefasTimeoutError
)

try:
    from playwright.async_api import async_playwright, Page, Browser
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class TefasClient:
    """
    TEFAS API Client
    
    Türkiye Elektronik Fon Alım Satım Platformu için kapsamlı API client.
    
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
        auto_start: bool = True
    ):
        """
        Args:
            headless: Tarayıcıyı görünmez modda çalıştır (WAF tespit edebilir)
            timeout: İstek timeout süresi (ms)
            auto_start: Context manager ile otomatik başlat
        """
        if not PLAYWRIGHT_AVAILABLE:
            raise ImportError(
                "Playwright yüklü değil. Yüklemek için:\n"
                "  pip install playwright\n"
                "  playwright install chromium"
            )
        
        self.headless = headless
        self.timeout = timeout
        self.auto_start = auto_start
        
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._page: Optional[Page] = None
        self._started = False
    
    # ==================== Context Manager ====================
    
    async def __aenter__(self):
        if self.auto_start:
            await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def start(self):
        """Tarayıcıyı başlat"""
        if self._started:
            return
        
        try:
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=self.headless,
                args=['--no-sandbox', '--disable-dev-shm-usage']
            )
            self._page = await self._browser.new_page()
            
            # Timeout ayarla
            self._page.set_default_timeout(self.timeout)
            self._page.set_default_navigation_timeout(self.timeout)
            
            # Headers
            await self._page.set_extra_http_headers({
                "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
            })
            
            # İlk sayfa ziyareti (cookie için)
            await self._page.goto(
                f"{self.BASE_URL}/TarihselVeriler.aspx",
                wait_until="domcontentloaded"
            )
            await asyncio.sleep(1)
            
            self._started = True
            
        except Exception as e:
            raise TefasConnectionError(f"Tarayıcı başlatılamadı: {e}")
    
    async def close(self):
        """Tarayıcıyı kapat"""
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._started = False
    
    # ==================== Internal API Call ====================
    
    async def _call_api(
        self,
        endpoint: str,
        params: dict,
        method: str = "POST"
    ) -> dict:
        """Internal API çağrısı"""
        if not self._started:
            await self.start()
        
        try:
            params_json = json.dumps(params)
            
            result = await self._page.evaluate(f"""
                async () => {{
                    try {{
                        const params = new URLSearchParams({params_json});
                        const res = await fetch('/api/DB/{endpoint}', {{
                            method: '{method}',
                            headers: {{
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'X-Requested-With': 'XMLHttpRequest'
                            }},
                            body: params.toString()
                        }});
                        
                        const text = await res.text();
                        
                        // WAF kontrolü
                        if (text.includes('Erişim Engellendi') || text.includes('Web Application Firewall')) {{
                            return {{ error: 'WAF_BLOCKED', message: 'İstek WAF tarafından engellendi' }};
                        }}
                        
                        try {{
                            return {{ success: true, data: JSON.parse(text) }};
                        }} catch {{
                            return {{ error: 'PARSE_ERROR', message: text.substring(0, 200) }};
                        }}
                    }} catch (e) {{
                        return {{ error: 'FETCH_ERROR', message: e.message }};
                    }}
                }}
            """)
            
            if result.get("error") == "WAF_BLOCKED":
                raise TefasWAFError(result.get("message", "WAF engeli"))
            
            if result.get("error"):
                raise TefasDataError(result.get("message", "API hatası"))
            
            return result.get("data", {})
            
        except TefasError:
            raise
        except Exception as e:
            raise TefasConnectionError(f"API çağrısı başarısız: {e}")
    
    def _build_params(
        self,
        fund_type: FundType,
        fund_code: str = "",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        **kwargs
    ) -> dict:
        """API parametrelerini oluştur"""
        if start_date is None:
            start_date = date.today()
        if end_date is None:
            end_date = date.today()
        
        return {
            "fontip": fund_type.value,
            "sfontur": kwargs.get("sub_type", ""),
            "fonkod": fund_code,
            "fongrup": kwargs.get("fund_group", ""),
            "bastarih": start_date.strftime("%d.%m.%Y"),
            "bittarih": end_date.strftime("%d.%m.%Y"),
            "fonturkod": kwargs.get("fund_type_code", ""),
            "fonunvantip": kwargs.get("fund_title_type", ""),
            "kurucukod": kwargs.get("founder_code", "")
        }
    
    # ==================== Public API Methods ====================
    
    async def get_funds(
        self,
        fund_type: FundType = FundType.YAT,
        target_date: Optional[date] = None
    ) -> list[Fund]:
        """
        Tüm fonları getir.
        
        Args:
            fund_type: Fon tipi (YAT veya EMK)
            target_date: Hedef tarih (varsayılan: bugün)
        
        Returns:
            list[Fund]: Fon listesi
        
        Example:
            funds = await client.get_funds(FundType.YAT)
            for fund in funds[:5]:
                print(f"{fund.code}: {fund.formatted_total_value}")
        """
        if target_date is None:
            target_date = self._get_last_business_day()
        
        params = self._build_params(fund_type, "", target_date, target_date)
        result = await self._call_api("BindHistoryInfo", params)
        
        data = result.get("data", [])
        return [Fund.from_api_response(item, fund_type) for item in data]
    
    async def get_fund(
        self,
        code: str,
        fund_type: FundType = FundType.YAT,
        target_date: Optional[date] = None
    ) -> Optional[Fund]:
        """
        Belirli bir fonu getir.
        
        Args:
            code: Fon kodu (örn: "TI1", "AAK")
            fund_type: Fon tipi
            target_date: Hedef tarih
        
        Returns:
            Fund veya None
        
        Example:
            fund = await client.get_fund("TI1")
            print(f"{fund.name}: {fund.formatted_total_value}")
        """
        if target_date is None:
            target_date = self._get_last_business_day()
        
        params = self._build_params(fund_type, code.upper(), target_date, target_date)
        result = await self._call_api("BindHistoryInfo", params)
        
        data = result.get("data", [])
        if not data:
            return None
        
        return Fund.from_api_response(data[0], fund_type)
    
    async def get_price_history(
        self,
        code: str,
        fund_type: FundType = FundType.YAT,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        days: Optional[int] = None
    ) -> list[FundPrice]:
        """
        Fon fiyat geçmişini getir.
        
        Args:
            code: Fon kodu
            fund_type: Fon tipi
            start_date: Başlangıç tarihi
            end_date: Bitiş tarihi
            days: Son X gün (start_date yerine kullanılabilir)
        
        Returns:
            list[FundPrice]: Fiyat geçmişi (yeniden eskiye)
        
        Example:
            history = await client.get_price_history("AAK", days=30)
            for price in history[:5]:
                print(f"{price.date}: {price.price:.4f}")
        """
        if end_date is None:
            end_date = self._get_last_business_day()
        
        if days is not None:
            start_date = end_date - timedelta(days=days)
        elif start_date is None:
            start_date = end_date - timedelta(days=30)
        
        params = self._build_params(fund_type, code.upper(), start_date, end_date)
        result = await self._call_api("BindHistoryInfo", params)
        
        data = result.get("data", [])
        return [FundPrice.from_api_response(item) for item in data]
    
    async def get_allocation(
        self,
        code: str = "",
        fund_type: FundType = FundType.YAT,
        target_date: Optional[date] = None
    ) -> list[FundAllocation]:
        """
        Fon varlık dağılımını getir.
        
        Args:
            code: Fon kodu (boş = tüm fonlar)
            fund_type: Fon tipi
            target_date: Hedef tarih
        
        Returns:
            list[FundAllocation]: Varlık dağılımı listesi
        
        Example:
            alloc = await client.get_allocation("AAK")
            if alloc:
                print(f"Hisse: %{alloc[0].stock}")
        """
        if target_date is None:
            target_date = self._get_last_business_day()
        
        params = self._build_params(fund_type, code.upper(), target_date, target_date)
        result = await self._call_api("BindHistoryAllocation", params)
        
        data = result.get("data", [])
        return [FundAllocation.from_api_response(item) for item in data]
    
    async def get_top_funds(
        self,
        fund_type: FundType = FundType.YAT,
        target_date: Optional[date] = None,
        by: str = "total_value",
        limit: int = 10,
        ascending: bool = False
    ) -> list[Fund]:
        """
        En büyük/küçük fonları getir.
        
        Args:
            fund_type: Fon tipi
            target_date: Hedef tarih
            by: Sıralama kriteri ("total_value", "investor_count", "price")
            limit: Kaç fon döndürülsün
            ascending: Artan sıralama mı
        
        Returns:
            list[Fund]: Sıralanmış fon listesi
        
        Example:
            top = await client.get_top_funds(by="total_value", limit=5)
            for fund in top:
                print(f"{fund.code}: {fund.formatted_total_value}")
        """
        funds = await self.get_funds(fund_type, target_date)
        
        sort_key = {
            "total_value": lambda f: f.total_value,
            "investor_count": lambda f: f.investor_count,
            "price": lambda f: f.price,
            "share_count": lambda f: f.share_count
        }.get(by, lambda f: f.total_value)
        
        sorted_funds = sorted(funds, key=sort_key, reverse=not ascending)
        return sorted_funds[:limit]
    
    async def get_market_summary(
        self,
        fund_type: FundType = FundType.YAT,
        target_date: Optional[date] = None
    ) -> MarketSummary:
        """
        Piyasa özetini getir.
        
        Args:
            fund_type: Fon tipi
            target_date: Hedef tarih
        
        Returns:
            MarketSummary: Piyasa özeti
        
        Example:
            summary = await client.get_market_summary()
            print(f"Toplam: {summary.total_value_trillion:.2f} Trilyon TL")
        """
        if target_date is None:
            target_date = self._get_last_business_day()
        
        funds = await self.get_funds(fund_type, target_date)
        
        summary = MarketSummary(
            date=target_date,
            fund_type=fund_type,
            total_funds=len(funds),
            total_value=sum(f.total_value for f in funds),
            total_investors=sum(f.investor_count for f in funds)
        )
        
        # En büyük fonlar
        summary.top_funds_by_value = sorted(
            funds, key=lambda f: f.total_value, reverse=True
        )[:10]
        
        summary.top_funds_by_investors = sorted(
            funds, key=lambda f: f.investor_count, reverse=True
        )[:10]
        
        return summary
    
    async def search_funds(
        self,
        query: str,
        fund_type: FundType = FundType.YAT,
        target_date: Optional[date] = None
    ) -> list[Fund]:
        """
        Fon ara (kod veya isimde).
        
        Args:
            query: Arama terimi
            fund_type: Fon tipi
            target_date: Hedef tarih
        
        Returns:
            list[Fund]: Eşleşen fonlar
        
        Example:
            results = await client.search_funds("PARA PİYASASI")
        """
        funds = await self.get_funds(fund_type, target_date)
        query_upper = query.upper()
        
        return [
            f for f in funds
            if query_upper in f.code.upper() or query_upper in f.name.upper()
        ]
    
    async def get_fund_codes(self) -> list[str]:
        """
        Tüm fon kodlarını getir (hızlı endpoint).
        
        Returns:
            list[str]: Fon kodları
        """
        if not self._started:
            await self.start()
        
        result = await self._page.evaluate("""
            async () => {
                try {
                    const res = await fetch('/api/DB/');
                    const data = await res.json();
                    return data.map(item => item.FundCode);
                } catch {
                    return [];
                }
            }
        """)
        
        return result or []
    
    # ==================== Sync Wrappers ====================
    
    def sync_get_funds(self, *args, **kwargs) -> list[Fund]:
        """Senkron get_funds"""
        return asyncio.get_event_loop().run_until_complete(
            self.get_funds(*args, **kwargs)
        )
    
    def sync_get_fund(self, *args, **kwargs) -> Optional[Fund]:
        """Senkron get_fund"""
        return asyncio.get_event_loop().run_until_complete(
            self.get_fund(*args, **kwargs)
        )
    
    def sync_get_price_history(self, *args, **kwargs) -> list[FundPrice]:
        """Senkron get_price_history"""
        return asyncio.get_event_loop().run_until_complete(
            self.get_price_history(*args, **kwargs)
        )
    
    def sync_get_allocation(self, *args, **kwargs) -> list[FundAllocation]:
        """Senkron get_allocation"""
        return asyncio.get_event_loop().run_until_complete(
            self.get_allocation(*args, **kwargs)
        )
    
    def sync_get_market_summary(self, *args, **kwargs) -> MarketSummary:
        """Senkron get_market_summary"""
        return asyncio.get_event_loop().run_until_complete(
            self.get_market_summary(*args, **kwargs)
        )
    
    # ==================== Helpers ====================
    
    def _get_last_business_day(self) -> date:
        """Son iş gününü bul (hafta sonu hariç)"""
        today = date.today()
        
        # Bugün Cumartesi ise Cuma'ya git
        if today.weekday() == 5:
            return today - timedelta(days=1)
        # Bugün Pazar ise Cuma'ya git
        elif today.weekday() == 6:
            return today - timedelta(days=2)
        
        return today
