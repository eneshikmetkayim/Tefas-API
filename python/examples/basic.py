"""
TEFAS API Python Temel Kullanım Örneği (Pure HTTP)
"""

import asyncio
from tefas import FundType, TefasClient


async def main():
    async with TefasClient() as client:
        # 1. Piyasa özeti
        print("=== PİYASA ÖZETİ ===")
        summary = await client.get_market_summary(FundType.YAT)
        print(summary)

        # 2. En büyük 5 fon
        print("\n=== EN BÜYÜK 5 FON ===")
        for fund in await client.get_top_funds(limit=5):
            print(f"{fund.code}: {fund.name[:40]} - {fund.formatted_total_value}")

        # 3. Tek fon detayı + özet bilgi + profil
        print("\n=== FON DETAYI (AAL) ===")
        info = await client.get_fund_info("AAL")
        profile = await client.get_fund_profile("AAL")
        if info:
            print(f"{info.code} - {info.name} | Fiyat: {info.last_price:.6f} TL | Kategori: {info.category} ({info.category_rank}/{info.category_fund_count})")
        if profile:
            print(f"ISIN: {profile.isin_code} | İşlem: {profile.start_trading_hour}-{profile.end_trading_hour} | Risk: {profile.risk_level}")

        # 4. Portföy dağılımı
        print("\n=== PORTFÖY DAĞILIMI (GTA) ===")
        allocs = await client.get_allocation("GTA")
        if allocs:
            print(allocs[0], "| Toplam %:", round(allocs[0].total, 2))

        # 5. Duyurular
        print("\n=== SON DUYURULAR ===")
        for ann in (await client.get_announcements())[:3]:
            print(f"- [{ann.sequence_no}] {ann.title}")


if __name__ == "__main__":
    asyncio.run(main())
