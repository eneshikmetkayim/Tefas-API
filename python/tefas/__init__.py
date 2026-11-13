"""
TEFAS API Client
================

Türkiye Elektronik Fon Alım Satım Platformu için pure-HTTP Python API client.
"""

from .client import TefasClient
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
from .exceptions import (
    TefasConnectionError,
    TefasDataError,
    TefasError,
    TefasNotFoundError,
    TefasTimeoutError,
    TefasWAFError,
)

__version__ = "1.0.0"
__author__ = "TEFAS API Contributors"
__all__ = [
    "TefasClient",
    "Fund",
    "FundPrice",
    "FundAllocation",
    "FundType",
    "MarketSummary",
    "FundInfo",
    "FundProfile",
    "FundSizeInfo",
    "FundManagementFee",
    "FundFounder",
    "FundCategory",
    "FundGroup",
    "FundNameSearchResult",
    "Announcement",
    "TefasError",
    "TefasConnectionError",
    "TefasDataError",
    "TefasWAFError",
    "TefasNotFoundError",
    "TefasTimeoutError",
]
