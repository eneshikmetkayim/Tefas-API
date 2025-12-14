"""
TEFAS API Client
================

Türkiye Elektronik Fon Alım Satım Platformu için Python API client.

Kullanım:
    from tefas import TefasClient
    
    async with TefasClient() as client:
        # Tüm fonları al
        funds = await client.get_funds()
        
        # Fon detayı
        fund = await client.get_fund("TI1")
        
        # Fiyat geçmişi
        history = await client.get_price_history("AAK", days=30)

Senkron kullanım:
    from tefas import TefasClient
    
    client = TefasClient()
    funds = client.sync_get_funds()
"""

from .client import TefasClient
from .models import Fund, FundPrice, FundAllocation, FundType
from .exceptions import TefasError, TefasConnectionError, TefasDataError

__version__ = "1.0.0"
__author__ = "TEFAS API Contributors"
__all__ = [
    "TefasClient",
    "Fund",
    "FundPrice", 
    "FundAllocation",
    "FundType",
    "TefasError",
    "TefasConnectionError",
    "TefasDataError",
]
