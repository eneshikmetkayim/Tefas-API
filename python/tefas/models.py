"""
TEFAS Data Models
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional


def _value(data: dict, *keys, default=None):
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def _to_float(value, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return default
    if "," in text and "." not in text:
        text = text.replace(",", ".")
    try:
        return float(text)
    except (ValueError, TypeError):
        return default


def _to_opt_float(value) -> Optional[float]:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return None
    if "," in text and "." not in text:
        text = text.replace(",", ".")
    try:
        return float(text)
    except (ValueError, TypeError):
        return None


def _to_int(value, default: int = 0) -> int:
    if value is None or value == "":
        return default
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


def _to_opt_int(value) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def _to_bool(value, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    text = str(value).strip().lower()
    if text in {"true", "1", "evet", "yes"}:
        return True
    if text in {"false", "0", "hayır", "hayir", "no"}:
        return False
    return default


def _sum_fields(data: dict, *key_groups: tuple[str, ...]) -> float:
    total = 0.0
    for keys in key_groups:
        total += _to_float(_value(data, *keys))
    return total


def _parse_api_date(value) -> date:
    if value is None or value == "":
        return date.today()
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000).date()
    text = str(value).strip()
    for fmt, length in (
        ("%Y-%m-%d", 10),
        ("%Y%m%d", 8),
        ("%d.%m.%Y", 10),
        ("%Y-%m-%dT%H:%M:%S", 19),
    ):
        try:
            return datetime.strptime(text[:length], fmt).date()
        except ValueError:
            pass
    try:
        return datetime.fromtimestamp(int(text) / 1000).date()
    except (ValueError, TypeError):
        return date.today()


class FundType(str, Enum):
    """Fon tipleri"""

    YAT = "YAT"    # Yatırım Fonları
    EMK = "EMK"    # Emeklilik Fonları
    BYF = "BYF"    # Borsa Yatırım Fonları
    GYF = "GYF"    # Gayrimenkul Yatırım Fonları
    GSYF = "GSYF"  # Girişim Sermayesi Yatırım Fonları

    @property
    def description(self) -> str:
        descriptions = {
            "YAT": "Yatırım Fonları",
            "EMK": "Emeklilik Fonları",
            "BYF": "Borsa Yatırım Fonları",
            "GYF": "Gayrimenkul Yatırım Fonları",
            "GSYF": "Girişim Sermayesi Yatırım Fonları",
        }
        return descriptions.get(self.value, self.value)


@dataclass
class Fund:
    """Fon bilgisi"""

    code: str
    name: str
    price: float
    date: date
    fund_type: FundType = FundType.YAT

    # Portföy bilgileri
    total_value: float = 0.0  # Portföy büyüklüğü (TL)
    share_count: int = 0  # Tedavüldeki pay sayısı
    investor_count: int = 0  # Yatırımcı sayısı
    exchange_bulletin_price: Optional[float] = None  # Borsa bülten fiyatı (BYF vb.)

    # Getiri bilgileri (%)
    daily_return: Optional[float] = None
    weekly_return: Optional[float] = None
    monthly_return: Optional[float] = None
    three_month_return: Optional[float] = None
    six_month_return: Optional[float] = None
    yearly_return: Optional[float] = None
    ytd_return: Optional[float] = None  # Year to date

    # Ham veri
    raw_data: dict = field(default_factory=dict)

    @property
    def total_value_billion(self) -> float:
        """Portföy büyüklüğü (Milyar TL)"""
        return self.total_value / 1e9

    @property
    def total_value_million(self) -> float:
        """Portföy büyüklüğü (Milyon TL)"""
        return self.total_value / 1e6

    @property
    def formatted_total_value(self) -> str:
        """Formatlanmış portföy büyüklüğü"""
        if self.total_value >= 1e9:
            return f"{self.total_value_billion:.2f} Milyar TL"
        elif self.total_value >= 1e6:
            return f"{self.total_value_million:.0f} Milyon TL"
        else:
            return f"{self.total_value:,.0f} TL"

    @classmethod
    def from_api_response(cls, data: dict, fund_type: FundType = FundType.YAT) -> "Fund":
        """API yanıtından Fund nesnesi oluştur"""
        fund_date = _parse_api_date(_value(data, "tarih", "TARIH"))

        return cls(
            code=_value(data, "fonKodu", "FONKODU", default="") or "",
            name=_value(data, "fonUnvan", "FONUNVAN", default="") or "",
            price=_to_float(_value(data, "fiyat", "FIYAT")),
            date=fund_date,
            fund_type=fund_type,
            total_value=_to_float(_value(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK")),
            share_count=_to_int(_value(data, "tedPaySayisi", "TEDPAYSAYISI")),
            investor_count=_to_int(_value(data, "kisiSayisi", "KISISAYISI")),
            exchange_bulletin_price=_to_opt_float(_value(data, "borsaBultenFiyat", "BORSABULTENFIYAT")),
            raw_data=data,
        )

    def __str__(self) -> str:
        return f"{self.code} - {self.name[:40]}"

    def __repr__(self) -> str:
        return f"Fund(code='{self.code}', price={self.price}, total_value={self.formatted_total_value})"


@dataclass
class FundPrice:
    """Fon fiyat geçmişi"""

    code: str
    date: date
    price: float
    share_count: int = 0
    investor_count: int = 0
    total_value: float = 0.0
    name: str = ""
    category_rank: Optional[int] = None
    category_fund_count: Optional[int] = None

    @classmethod
    def from_api_response(cls, data: dict) -> "FundPrice":
        """API yanıtından FundPrice nesnesi oluştur"""
        price_date = _parse_api_date(_value(data, "tarih", "TARIH"))

        return cls(
            code=_value(data, "fonKodu", "FONKODU", default="") or "",
            date=price_date,
            price=_to_float(_value(data, "fiyat", "FIYAT")),
            share_count=_to_int(_value(data, "tedPaySayisi", "TEDPAYSAYISI")),
            investor_count=_to_int(_value(data, "kisiSayisi", "KISISAYISI")),
            total_value=_to_float(_value(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK")),
            name=_value(data, "fonUnvan", "FONUNVAN", default="") or "",
            category_rank=_to_opt_int(_value(data, "kategoriDerece")),
            category_fund_count=_to_opt_int(_value(data, "kategoriFonSay")),
        )

    def __str__(self) -> str:
        return f"{self.date}: {self.price:.6f}"


@dataclass
class FundAllocation:
    """Fon varlık dağılımı"""

    code: str
    name: str
    date: date

    # Ana varlık sınıfları (%)
    stock: float = 0.0  # Hisse Senedi (HS)
    government_bond: float = 0.0  # Devlet Tahvili (DT)
    corporate_bond: float = 0.0  # Özel Sektör Tahvili (OST)
    eurobond: float = 0.0  # Eurobond (EUT)
    repo: float = 0.0  # Ters Repo / TPP (TR + TPP + R)
    deposit: float = 0.0  # Mevduat (VDM + VM + VMTL + VMD + VMAU)
    fund: float = 0.0  # Yatırım Fonu / BYF (BYF + YYF)
    foreign_stock: float = 0.0  # Yabancı Hisse (YHS)
    foreign_bond: float = 0.0  # Yabancı Tahvil (YBA)
    gold: float = 0.0  # Kıymetli Madenler / Altın (KM + KMBYF + KMKBA + KMKKS)
    viop_collateral: float = 0.0  # Vadeli İşlemler Nakit Teminatları (VINT)
    other: float = 0.0  # Diğer (D)

    # Ham veri
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundAllocation":
        """API yanıtından FundAllocation nesnesi oluştur"""
        alloc_date = _parse_api_date(_value(data, "tarih", "TARIH"))

        deposit = _sum_fields(
            data,
            ("vdm", "VDM"),
            ("vm", "VM"),
            ("vmtl", "VMTL"),
            ("vmd", "VMD"),
            ("vmau", "VMAU"),
            ("MEVDUAT", "mevduat"),
        )
        repo = _sum_fields(
            data,
            ("tr", "TR"),
            ("tpp", "TPP", "tp"),
            ("r", "R", "REPO", "repo"),
        )
        fund = _sum_fields(
            data,
            ("byf", "BYF", "FON"),
            ("yyf", "YYF"),
        )
        gold = _sum_fields(
            data,
            ("km", "KM"),
            ("kmbyf", "KMBYF"),
            ("kmkba", "KMKBA"),
            ("kmkks", "KMKKS"),
        )

        return cls(
            code=_value(data, "fonKodu", "FONKODU", default="") or "",
            name=_value(data, "fonUnvan", "FONUNVAN", "PIESSION", default="") or "",
            date=alloc_date,
            stock=_to_float(_value(data, "hs", "HS", "HISSE", "hisse")),
            government_bond=_to_float(_value(data, "dt", "DT", "DEVLET", "devlet")),
            corporate_bond=_to_float(_value(data, "ost", "OST")),
            eurobond=_to_float(_value(data, "eut", "EUT", "EUROBOND", "eurobond")),
            repo=repo,
            deposit=deposit,
            fund=fund,
            foreign_stock=_to_float(_value(data, "yhs", "YHS", "YABANCIHISSE")),
            foreign_bond=_to_float(_value(data, "yba", "YBA", "YABANCITAHVIL")),
            gold=gold,
            viop_collateral=_to_float(_value(data, "vint", "VINT")),
            other=_sum_fields(data, ("d", "D", "DIGER"), ("fb", "FB"), ("hb", "HB"), ("khtl", "KHTL")),
            raw_data=data,
        )

    @property
    def total(self) -> float:
        """Toplam dağılım (yaklaşık 100 olmalı)"""
        return (
            self.stock
            + self.government_bond
            + self.corporate_bond
            + self.eurobond
            + self.repo
            + self.deposit
            + self.fund
            + self.foreign_stock
            + self.foreign_bond
            + self.gold
            + self.viop_collateral
            + self.other
        )

    def to_dict(self) -> dict:
        """Dağılımı dict olarak döndür"""
        return {
            "Hisse Senedi": self.stock,
            "Devlet Tahvili": self.government_bond,
            "Özel Sektör Tahvili": self.corporate_bond,
            "Eurobond": self.eurobond,
            "Ters Repo": self.repo,
            "Mevduat": self.deposit,
            "Yatırım Fonu": self.fund,
            "Yabancı Hisse": self.foreign_stock,
            "Yabancı Tahvil": self.foreign_bond,
            "Kıymetli Madenler": self.gold,
            "VİOP Nakit Teminatı": self.viop_collateral,
            "Diğer": self.other,
        }

    def __str__(self) -> str:
        parts = []
        if self.stock > 0:
            parts.append(f"Hisse: %{self.stock:.1f}")
        if self.government_bond > 0:
            parts.append(f"DT: %{self.government_bond:.1f}")
        if self.deposit > 0:
            parts.append(f"Mevduat: %{self.deposit:.1f}")
        if self.gold > 0:
            parts.append(f"Altın/KM: %{self.gold:.1f}")
        return f"{self.code}: " + ", ".join(parts) if parts else f"{self.code}: Veri yok"


@dataclass
class MarketSummary:
    """Piyasa özeti"""

    date: date
    fund_type: FundType

    total_funds: int = 0
    total_value: float = 0.0  # TL
    total_investors: int = 0

    # En büyük fonlar
    top_funds_by_value: list[Fund] = field(default_factory=list)
    top_funds_by_investors: list[Fund] = field(default_factory=list)

    @property
    def total_value_trillion(self) -> float:
        """Toplam değer (Trilyon TL)"""
        return self.total_value / 1e12

    def __str__(self) -> str:
        return (
            f"{self.fund_type.description}: {self.total_funds} fon, "
            f"{self.total_value_trillion:.2f} Trilyon TL, "
            f"{self.total_investors:,} yatırımcı"
        )


@dataclass
class FundInfo:
    """Tekil fon özet ve kategori sıralama bilgisi (fonBilgiGetir)"""

    code: str
    name: str
    last_price: float = 0.0
    daily_return: float = 0.0
    share_count: int = 0
    total_value: float = 0.0
    category: str = ""
    category_rank: int = 0
    category_fund_count: int = 0
    investor_count: int = 0
    market_share: float = 0.0
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundInfo":
        return cls(
            code=_value(data, "fonKodu", default="") or "",
            name=_value(data, "fonUnvan", default="") or "",
            last_price=_to_float(_value(data, "sonFiyat")),
            daily_return=_to_float(_value(data, "gunlukGetiri")),
            share_count=_to_int(_value(data, "payAdet")),
            total_value=_to_float(_value(data, "portBuyukluk")),
            category=_value(data, "fonKategori", default="") or "",
            category_rank=_to_int(_value(data, "kategoriDerece")),
            category_fund_count=_to_int(_value(data, "kategoriFonSay")),
            investor_count=_to_int(_value(data, "yatirimciSayi")),
            market_share=_to_float(_value(data, "pazarPayi")),
            raw_data=data,
        )


@dataclass
class FundProfile:
    """Fon profil ve işlem kuralları bilgisi (fonProfilBilgiGetir)"""

    code: str
    name: str
    isin_code: str = ""
    start_trading_hour: str = ""
    end_trading_hour: str = ""
    min_buy: Optional[float] = None
    min_sell: Optional[float] = None
    max_buy: Optional[float] = None
    max_sell: Optional[float] = None
    kap_link: str = ""
    tefas_status: str = ""
    entry_fee: Optional[float] = None
    exit_fee: Optional[float] = None
    buy_value_date: Optional[int] = None
    sell_value_date: Optional[int] = None
    interest_content: Optional[str] = None
    risk_level: str = ""
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundProfile":
        return cls(
            code=_value(data, "fonKodu", default="") or "",
            name=_value(data, "fonUnvan", default="") or "",
            isin_code=_value(data, "isinKodu", default="") or "",
            start_trading_hour=_value(data, "basIsSaat", default="") or "",
            end_trading_hour=_value(data, "sonIsSaat", default="") or "",
            min_buy=_to_opt_float(_value(data, "minAlis")),
            min_sell=_to_opt_float(_value(data, "minSatis")),
            max_buy=_to_opt_float(_value(data, "maxAlis")),
            max_sell=_to_opt_float(_value(data, "maxSatis")),
            kap_link=_value(data, "kapLink", default="") or "",
            tefas_status=_value(data, "tefasDurum", default="") or "",
            entry_fee=_to_opt_float(_value(data, "girisKomisyonu")),
            exit_fee=_to_opt_float(_value(data, "cikisKomisyonu")),
            buy_value_date=_to_opt_int(_value(data, "fonSatisValor")),
            sell_value_date=_to_opt_int(_value(data, "fonGeriAlisValor")),
            interest_content=_value(data, "faizIcerigi"),
            risk_level=str(_value(data, "riskDegeri", default="") or ""),
            raw_data=data,
        )


@dataclass
class FundSizeInfo:
    """Tarih aralığında fon büyüklük ve pay değişim verisi (fonBuyuklukBazliBilgiGetir)"""

    code: str
    name: str
    category_description: str = ""
    is_tefas_traded: bool = False
    founder_code: str = ""
    fund_type_code: str = ""
    initial_total_value: float = 0.0
    final_total_value: float = 0.0
    total_value_change_pct: float = 0.0
    initial_share_count: int = 0
    final_share_count: int = 0
    share_count_change_pct: float = 0.0
    net_return_rate: float = 0.0
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundSizeInfo":
        return cls(
            code=_value(data, "fonKodu", default="") or "",
            name=_value(data, "fonUnvan", default="") or "",
            category_description=_value(data, "fonTurAciklama", default="") or "",
            is_tefas_traded=_to_bool(_value(data, "tefasDurum")),
            founder_code=_value(data, "kurucuKodu", "kurucuKod", default="") or "",
            fund_type_code=str(_value(data, "fonTurkod", "fonTurKod", default="") or ""),
            initial_total_value=_to_float(_value(data, "ilkPortfoyDegeri")),
            final_total_value=_to_float(_value(data, "sonPortfoyDegeri")),
            total_value_change_pct=_to_float(_value(data, "portBuyuklukDegisim")),
            initial_share_count=_to_int(_value(data, "ilkPayAdedi")),
            final_share_count=_to_int(_value(data, "sonPayAdedi")),
            share_count_change_pct=_to_float(_value(data, "payAdetDegisim")),
            net_return_rate=_to_float(_value(data, "netGetiriOrani")),
            raw_data=data,
        )


@dataclass
class FundManagementFee:
    """Fon yönetim ücreti ve toplam gider kesintisi bilgisi (fonYonetimBazliBilgiGetir)"""

    code: str
    name: str
    umbrella_fund_type: str = ""
    is_tefas_traded: bool = False
    fund_type_code: str = ""
    founder_code: str = ""
    applied_fee: Optional[float] = None
    prospectus_fee: Optional[float] = None
    yearly_return: float = 0.0
    max_expense_ratio: Optional[float] = None
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundManagementFee":
        return cls(
            code=_value(data, "fonKodu", default="") or "",
            name=_value(data, "fonUnvan", default="") or "",
            umbrella_fund_type=_value(data, "fonTurAciklama", default="") or "",
            is_tefas_traded=_to_bool(_value(data, "tefasDurum")),
            fund_type_code=str(_value(data, "fonTurKod", "fonTurkod", default="") or ""),
            founder_code=_value(data, "kurucuKod", "kurucuKodu", default="") or "",
            applied_fee=_to_opt_float(_value(data, "uygulananYu1Y")),
            prospectus_fee=_to_opt_float(_value(data, "fonIcTuzukYu1G")),
            yearly_return=_to_float(_value(data, "yillikGetiri")),
            max_expense_ratio=_to_opt_float(_value(data, "fonTopGiderKesoran")),
            raw_data=data,
        )


@dataclass
class FundFounder:
    """Fon kurucusu (fonKurucuGetir)"""

    code: str
    name: str
    fund_type: str = ""
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundFounder":
        return cls(
            code=_value(data, "kurucuKodu", default="") or "",
            name=_value(data, "kurucuUnvan", default="") or "",
            fund_type=_value(data, "fonTipi", default="") or "",
            raw_data=data,
        )


@dataclass
class FundCategory:
    """Fon türü / şemsiye fon tanımı (fonTurGetir)"""

    code: str
    name: str
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundCategory":
        return cls(
            code=str(_value(data, "sfonTuru", "fonTuru", default="") or ""),
            name=_value(data, "sfonTurAciklama", "fonTurAciklama", default="") or "",
            raw_data=data,
        )


@dataclass
class FundGroup:
    """Fon grubu tanımı (fonGrupGetir)"""

    code: str
    name: str
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundGroup":
        return cls(
            code=str(_value(data, "fonGrubu", default="") or ""),
            name=_value(data, "fongrupaciklama", "fonGrupAciklama", default="") or "",
            raw_data=data,
        )


@dataclass
class FundNameSearchResult:
    """Ünvan araması sonucu (fonUnvanAra)"""

    code: str
    name: str
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "FundNameSearchResult":
        return cls(
            code=_value(data, "fonKodu", default="") or "",
            name=_value(data, "fonUnvan", default="") or "",
            raw_data=data,
        )


@dataclass
class Announcement:
    """TEFAS duyurusu (fonTefasDuyuruGetir)"""

    title: str
    sequence_no: int = 0
    detail_html: str = ""
    raw_data: dict = field(default_factory=dict)

    @classmethod
    def from_api_response(cls, data: dict) -> "Announcement":
        return cls(
            title=_value(data, "duyuruBaslik", default="") or "",
            sequence_no=_to_int(_value(data, "siraNo")),
            detail_html=_value(data, "duyuruDetay", default="") or "",
            raw_data=data,
        )
