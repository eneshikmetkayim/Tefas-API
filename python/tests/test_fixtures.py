import json
import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from tefas.models import Fund, FundAllocation, FundPrice


FIXTURES = Path(__file__).parents[2] / "fixtures"


class FixtureParsingTests(unittest.TestCase):
    def test_current_fund_fixture(self):
        payload = json.loads((FIXTURES / "current-fund.json").read_text())
        fund = Fund.from_api_response(payload["resultList"][0])
        self.assertEqual(fund.code, "AAL")
        self.assertEqual(fund.date, date(2026, 11, 10))
        self.assertEqual(fund.price, 3.1415)
        self.assertEqual(fund.investor_count, 4200)
        price = FundPrice.from_api_response(payload["resultList"][0])
        self.assertEqual(price.total_value, 3770000)

    def test_current_allocation_fixture(self):
        payload = json.loads((FIXTURES / "current-allocation.json").read_text())
        allocation = FundAllocation.from_api_response(payload["resultList"][0])
        self.assertEqual(allocation.code, "AAL")
        self.assertEqual(allocation.deposit, 30)
        self.assertEqual(allocation.stock, 42.5)


if __name__ == "__main__":
    unittest.main()
