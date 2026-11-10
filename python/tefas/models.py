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

def _parse_api_date(value) -> date:
    if not value:
        return date.today()
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000).date()
    text = str(value)
    for fmt in ("%Y%m%d", "%Y-%m-%d", "%d.%m.%Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text[:19], fmt).date()
        except ValueError:
            pass
    try:
        return datetime.fromtimestamp(int(text) / 1000).date()
    except (ValueError, TypeError):
        return date.today()


class FundType(str, Enum):
    """Fon tipleri"""
    YAT = "YAT"  # Yatırım Fonları
    EMK = "EMK"  # Emeklilik Fonları
    
    @property
    def description(self) -> str:
        descriptions = {
            "YAT": "Yatırım Fonları",
            "EMK": "Emeklilik Fonları"
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
        # Timestamp'i date'e çevir
        fund_date = _parse_api_date(_value(data, "tarih", "TARIH"))
        
        return cls(
            code=_value(data, "fonKodu", "FONKODU", default=""),
            name=_value(data, "fonUnvan", "FONUNVAN", default=""),
            price=float(_value(data, "fiyat", "FIYAT", default=0) or 0),
            date=fund_date,
            fund_type=fund_type,
            total_value=float(_value(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK", default=0) or 0),
            share_count=int(_value(data, "tedPaySayisi", "TEDPAYSAYISI", default=0) or 0),
            investor_count=int(_value(data, "kisiSayisi", "KISISAYISI", default=0) or 0),
            raw_data=data
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
    
    @classmethod
    def from_api_response(cls, data: dict) -> "FundPrice":
        """API yanıtından FundPrice nesnesi oluştur"""
        price_date = _parse_api_date(_value(data, "tarih", "TARIH"))
        
        return cls(
            code=_value(data, "fonKodu", "FONKODU", default=""),
            date=price_date,
            price=float(_value(data, "fiyat", "FIYAT", default=0) or 0),
            share_count=int(_value(data, "tedPaySayisi", "TEDPAYSAYISI", default=0) or 0),
            investor_count=int(_value(data, "kisiSayisi", "KISISAYISI", default=0) or 0),
            total_value=float(_value(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK", default=0) or 0)
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
    corporate_bond: float = 0.0  # Özel Sektör Tahvili
    eurobond: float = 0.0  # Eurobond (EUT)
    repo: float = 0.0  # Ters Repo (TPP)
    deposit: float = 0.0  # Mevduat (VDM + VM)
    fund: float = 0.0  # Yatırım Fonu (BYF)
    foreign_stock: float = 0.0  # Yabancı Hisse (YHS)
    foreign_bond: float = 0.0  # Yabancı Tahvil (YBA)
    gold: float = 0.0  # Altın
    other: float = 0.0  # Diğer (D)
    
    # Ham veri
    raw_data: dict = field(default_factory=dict)
    
    @classmethod
    def from_api_response(cls, data: dict) -> "FundAllocation":
        """API yanıtından FundAllocation nesnesi oluştur"""
        alloc_date = _parse_api_date(_value(data, "tarih", "TARIH"))
        
        # Mevduat toplamı
        deposit = (float(_value(data, "vdm", "VDM", default=0) or 0) +
                   float(_value(data, "vm", "VM", default=0) or 0) +
                   float(_value(data, "vmtl", "VMTL", default=0) or 0) +
                   float(_value(data, "vmd", "VMD", default=0) or 0))
        
        return cls(
            code=_value(data, "fonKodu", "FONKODU", default=""),
            name=_value(data, "fonUnvan", "FONUNVAN", "PIESSION", default=""),
            date=alloc_date,
            stock=float(_value(data, "hs", "HS", "hisse", default=0) or 0),
            government_bond=float(_value(data, "dt", "DT", "devlet", default=0) or 0),
            eurobond=float(_value(data, "eut", "EUT", "eurobond", default=0) or 0),
            repo=float(_value(data, "tr", "TPP", "tp", "repo", default=0) or 0),
            deposit=deposit,
            fund=float(_value(data, "byf", "BYF", default=0) or 0),
            foreign_stock=float(_value(data, "yhs", "YHS", default=0) or 0),
            foreign_bond=float(_value(data, "yba", "YBA", default=0) or 0),
            other=float(_value(data, "d", "D", default=0) or 0),
            raw_data=data
        )
    
    @property
    def total(self) -> float:
        """Toplam dağılım (yaklaşık 100 olmalı)"""
        return (self.stock + self.government_bond + self.corporate_bond +
                self.eurobond + self.repo + self.deposit + self.fund +
                self.foreign_stock + self.foreign_bond + self.gold + self.other)
    
    def to_dict(self) -> dict:
        """Dağılımı dict olarak döndür"""
        return {
            "Hisse Senedi": self.stock,
            "Devlet Tahvili": self.government_bond,
            "Eurobond": self.eurobond,
            "Ters Repo": self.repo,
            "Mevduat": self.deposit,
            "Yatırım Fonu": self.fund,
            "Yabancı Hisse": self.foreign_stock,
            "Yabancı Tahvil": self.foreign_bond,
            "Diğer": self.other
        }
    
    def __str__(self) -> str:
        parts = []
        if self.stock > 0:
            parts.append(f"Hisse: %{self.stock:.1f}")
        if self.government_bond > 0:
            parts.append(f"DT: %{self.government_bond:.1f}")
        if self.deposit > 0:
            parts.append(f"Mevduat: %{self.deposit:.1f}")
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
        return (f"{self.fund_type.description}: {self.total_funds} fon, "
                f"{self.total_value_trillion:.2f} Trilyon TL, "
                f"{self.total_investors:,} yatırımcı")
