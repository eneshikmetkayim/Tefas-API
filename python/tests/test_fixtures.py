import json
import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from tefas.models import (
    Announcement,
    Fund,
    FundAllocation,
    FundFounder,
    FundInfo,
    FundManagementFee,
    FundPrice,
    FundProfile,
    FundSizeInfo,
    FundType,
)


FIXTURES = Path(__file__).parents[2] / "fixtures"


class FixtureParsingTests(unittest.TestCase):
    def test_current_fund_fixture(self):
        payload = json.loads((FIXTURES / "current-fund.json").read_text(encoding="utf-8"))
        fund = Fund.from_api_response(payload["resultList"][0])
        self.assertEqual(fund.code, "AAL")
        self.assertEqual(fund.date, date(2026, 11, 10))
        self.assertAlmostEqual(fund.price, 3.777852)
        self.assertEqual(fund.investor_count, 4164)
        self.assertEqual(fund.share_count, 453900688)
        price = FundPrice.from_api_response(payload["resultList"][0])
        self.assertAlmostEqual(price.total_value, 1714769704.17)

    def test_live_emk_float_share_count(self):
        payload = json.loads((FIXTURES / "live-fund-emk.json").read_text(encoding="utf-8"))
        fund = Fund.from_api_response(payload["resultList"][0], FundType.EMK)
        self.assertEqual(fund.code, "AAJ")
        self.assertEqual(fund.fund_type, FundType.EMK)
        self.assertEqual(fund.date, date(2026, 11, 10))
        self.assertEqual(fund.share_count, 49217355066)
        self.assertEqual(fund.investor_count, 669644)

    def test_legacy_fund_dd_mm_yyyy_and_compact_date(self):
        payload = json.loads((FIXTURES / "legacy-fund.json").read_text(encoding="utf-8"))
        fund = Fund.from_api_response(payload["resultList"][0])
        self.assertEqual(fund.code, "AAK")
        self.assertEqual(fund.date, date(2024, 12, 13))
        compact = Fund.from_api_response({"fonKodu": "TST", "tarih": "20261110", "fiyat": 1.25})
        self.assertEqual(compact.date, date(2026, 11, 10))

    def test_current_allocation_fixture(self):
        payload = json.loads((FIXTURES / "current-allocation.json").read_text(encoding="utf-8"))
        allocation = FundAllocation.from_api_response(payload["resultList"][0])
        self.assertEqual(allocation.code, "AAL")
        self.assertEqual(allocation.date, date(2026, 11, 10))
        self.assertEqual(allocation.deposit, 30.0)
        self.assertEqual(allocation.stock, 42.5)
        self.assertEqual(allocation.repo, 4.0)
        self.assertEqual(allocation.corporate_bond, 2.0)
        self.assertAlmostEqual(allocation.total, 100.0)

    def test_live_gold_allocation_fixture(self):
        payload = json.loads((FIXTURES / "live-allocation-gta.json").read_text(encoding="utf-8"))
        allocation = FundAllocation.from_api_response(payload["resultList"][0])
        self.assertEqual(allocation.code, "GTA")
        self.assertEqual(allocation.date, date(2026, 11, 12))
        self.assertAlmostEqual(allocation.gold, 99.02)
        self.assertAlmostEqual(allocation.deposit, 0.97)
        self.assertAlmostEqual(allocation.viop_collateral, 0.01)
        self.assertAlmostEqual(allocation.total, 100.0)

    def test_extended_endpoint_fixtures(self):
        info_payload = json.loads((FIXTURES / "fund-info.json").read_text(encoding="utf-8"))
        info = FundInfo.from_api_response(info_payload["resultList"][0])
        self.assertEqual(info.code, "AAL")
        self.assertAlmostEqual(info.last_price, 3.732282)
        self.assertEqual(info.category_rank, 65)
        self.assertEqual(info.category_fund_count, 86)

        profile_payload = json.loads((FIXTURES / "fund-profile.json").read_text(encoding="utf-8"))
        profile = FundProfile.from_api_response(profile_payload["resultList"][0])
        self.assertEqual(profile.isin_code, "TRMAALWWWWW5")
        self.assertEqual(profile.risk_level, "1")
        self.assertEqual(profile.start_trading_hour, "09:00")

        sizes_payload = json.loads((FIXTURES / "fund-sizes.json").read_text(encoding="utf-8"))
        size_item = FundSizeInfo.from_api_response(sizes_payload["resultList"][0])
        self.assertEqual(size_item.code, "HAI")
        self.assertTrue(size_item.is_tefas_traded)
        self.assertAlmostEqual(size_item.total_value_change_pct, 1.51)

        fees_payload = json.loads((FIXTURES / "management-fees.json").read_text(encoding="utf-8"))
        fee_item = FundManagementFee.from_api_response(fees_payload["resultList"][0])
        self.assertAlmostEqual(fee_item.applied_fee, 1.8)
        self.assertAlmostEqual(fee_item.prospectus_fee, 2.04)
        self.assertAlmostEqual(fee_item.max_expense_ratio, 2.19)

        founders_payload = json.loads((FIXTURES / "founders.json").read_text(encoding="utf-8"))
        founder = FundFounder.from_api_response(founders_payload["resultList"][0])
        self.assertEqual(founder.code, "LAT")

        ann_payload = json.loads((FIXTURES / "announcements.json").read_text(encoding="utf-8"))
        ann = Announcement.from_api_response(ann_payload["resultList"][0])
        self.assertEqual(ann.sequence_no, 299)
        self.assertIn("HNC", ann.title)


if __name__ == "__main__":
    unittest.main()
