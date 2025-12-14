"""
TEFAS API Exceptions
"""


class TefasError(Exception):
    """Base exception for TEFAS API errors"""
    pass


class TefasConnectionError(TefasError):
    """Connection or network related errors"""
    pass


class TefasDataError(TefasError):
    """Data parsing or validation errors"""
    pass


class TefasWAFError(TefasError):
    """WAF (Web Application Firewall) blocked the request"""
    pass


class TefasNotFoundError(TefasError):
    """Requested fund or data not found"""
    pass


class TefasTimeoutError(TefasError):
    """Request timeout"""
    pass
