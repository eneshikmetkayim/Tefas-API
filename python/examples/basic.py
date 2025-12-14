"""
TEFAS API - Python Örnek
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tefas import TefasClient, FundType


async def main():
    print("TEFAS API - Python Client")
    print("=" * 50)
    
    async with TefasClient() as client:
        # Piyasa özeti
        print("\n📊 Piyasa Özeti")
        summary = await client.get_market_summary(FundType.YAT)
        print(f"  Fon Sayısı: {summary.total_funds:,}")
        print(f"  Toplam Değer: {summary.total_value_trillion:.2f} Trilyon TL")
        print(f"  Yatırımcı: {summary.total_investors:,}")
        
        # En büyük 5 fon
        print("\n🏆 En Büyük 5 Fon")
        top = await client.get_top_funds(limit=5)
        for i, fund in enumerate(top, 1):
            print(f"  {i}. {fund.code}: {fund.formatted_total_value}")
        
        # Fiyat geçmişi
        print("\n📈 AAK Fiyat Geçmişi")
        history = await client.get_price_history("AAK", days=5)
        for price in history:
            print(f"  {price.date}: {price.price:.6f}")
    
    print("\n✅ Tamamlandı!")


if __name__ == "__main__":
    asyncio.run(main())
