import json
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import AsyncMock

sys.path.insert(0, str(Path(__file__).parents[1]))

from tefas import FundType, TefasClient, TefasDataError, TefasWAFError
from tefas.client import _is_empty_result_message, _iter_date_chunks


FIXTURES = Path(__file__).parents[2] / "fixtures"


class _FakeHttpClient(TefasClient):
    def __init__(self, responses):
        super().__init__(auto_start=False)
        self.responses = list(responses)
        self.calls = []

    async def _http_post_json(self, url: str, params: dict) -> tuple[int, str]:
        self.calls.append((url, params))
        status, payload = self.responses.pop(0)
        if not isinstance(payload, str):
            payload = json.dumps(payload)
        return status, payload


class ClientUnitTests(unittest.IsolatedAsyncioTestCase):
    def test_date_chunking_splits_long_ranges_into_28_day_windows(self):
        chunks = list(_iter_date_chunks(date(2026, 1, 1), date(2026, 3, 1)))
        self.assertEqual(len(chunks), 3)
        for start, end in chunks:
            self.assertLessEqual((end - start).days, 27)
        self.assertEqual(chunks[0][1], date(2026, 3, 1))
        self.assertEqual(chunks[-1][0], date(2026, 1, 1))

    def test_empty_result_detection(self):
        empty = json.loads((FIXTURES / "empty-result.json").read_text(encoding="utf-8"))
        self.assertTrue(
            _is_empty_result_message(empty["errorCode"], empty["errorMessage"], empty["resultList"])
        )
        self.assertFalse(
            _is_empty_result_message(None, "Geçersiz veri: Tarih aralığı 1 ayı aşamaz", None)
        )

    async def test_call_api_handles_empty_result_and_rate_limit_retry(self):
        empty = json.loads((FIXTURES / "empty-result.json").read_text(encoding="utf-8"))
        client = _FakeHttpClient([
            (429, {"faultCode": "ERR-224", "faultStatusCode": "429"}),
            (200, empty),
        ])

        orig_sleep = __import__("asyncio").sleep
        __import__("asyncio").sleep = AsyncMock()
        try:
            res = await client._call_api("fonGnlBlgSiraliGetir", {})
        finally:
            __import__("asyncio").sleep = orig_sleep

        self.assertEqual(res["resultList"], [])
        self.assertEqual(len(client.calls), 2)
        self.assertEqual(client.calls[0][0], "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir")

    async def test_call_api_detects_waf_html_and_real_api_error(self):
        waf_client = _FakeHttpClient([(200, "<html><title>Erişim Engellendi</title></html>")])
        with self.assertRaises(TefasWAFError):
            await waf_client._call_api("fonGnlBlgSiraliGetir", {})

        err_client = _FakeHttpClient([
            (
                200,
                {
                    "errorCode": None,
                    "errorMessage": "Geçersiz veri: Tarih aralığı 1 ayı aşamaz",
                    "resultList": None,
                },
            )
        ])
        with self.assertRaises(TefasDataError):
            await err_client._call_api("fonGnlBlgSiraliGetir", {})

    async def test_get_funds_falls_back_when_latest_business_day_unpublished(self):
        fund_fixture = json.loads((FIXTURES / "current-fund.json").read_text(encoding="utf-8"))
        empty = json.loads((FIXTURES / "empty-result.json").read_text(encoding="utf-8"))
        client = _FakeHttpClient([
            (200, empty),
            (200, fund_fixture),
        ])

        funds = await client.get_funds(FundType.YAT)
        self.assertEqual(len(funds), 1)
        self.assertEqual(funds[0].code, "AAL")
        self.assertEqual(len(client.calls), 2)

    async def test_get_fund_distinguishes_missing_code_from_unpublished_day(self):
        fund_fixture = json.loads((FIXTURES / "current-fund.json").read_text(encoding="utf-8"))
        empty = json.loads((FIXTURES / "empty-result.json").read_text(encoding="utf-8"))
        client = _FakeHttpClient([
            (200, empty),
            (200, fund_fixture),
        ])

        fund = await client.get_fund("NOPE")
        self.assertIsNone(fund)
        self.assertEqual(len(client.calls), 2)

    async def test_get_price_history_chunks_and_sorts_descending(self):
        client = _FakeHttpClient([
            (
                200,
                {
                    "resultList": [
                        {"fonKodu": "AAL", "tarih": "2026-11-10", "fiyat": 3.77},
                        {"fonKodu": "AAL", "tarih": "2026-10-20", "fiyat": 3.60},
                    ]
                },
            ),
            (
                200,
                {
                    "resultList": [
                        {"fonKodu": "AAL", "tarih": "2026-10-05", "fiyat": 3.50},
                    ]
                },
            ),
        ])

        orig_sleep = __import__("asyncio").sleep
        __import__("asyncio").sleep = AsyncMock()
        try:
            history = await client.get_price_history(
                "AAL",
                start_date=date(2026, 10, 1),
                end_date=date(2026, 11, 10),
            )
        finally:
            __import__("asyncio").sleep = orig_sleep

        self.assertEqual(len(client.calls), 2)
        self.assertEqual([p.date for p in history], [date(2026, 11, 10), date(2026, 10, 20), date(2026, 10, 5)])

    async def test_extended_endpoints_and_announcements_url(self):
        info_fixture = json.loads((FIXTURES / "fund-info.json").read_text(encoding="utf-8"))
        profile_fixture = json.loads((FIXTURES / "fund-profile.json").read_text(encoding="utf-8"))
        ann_fixture = json.loads((FIXTURES / "announcements.json").read_text(encoding="utf-8"))
        client = _FakeHttpClient([
            (200, info_fixture),
            (200, profile_fixture),
            (200, {"errorCode": None, "errorMessage": None, "fonTipi": "F"}),
            (200, ann_fixture),
        ])

        info = await client.get_fund_info("aal")
        profile = await client.get_fund_profile("AAL")
        type_code = await client.get_fund_type_code("AAL")
        announcements = await client.get_announcements()

        self.assertEqual(info.category, "Para Piyasası Fonu")
        self.assertEqual(profile.isin_code, "TRMAALWWWWW5")
        self.assertEqual(type_code, "F")
        self.assertEqual(len(announcements), 1)
        self.assertEqual(
            client.calls[3][0],
            "https://www.tefas.gov.tr/api/announcements/fonTefasDuyuruGetir",
        )

    def test_sync_wrappers_work_sequentially(self):
        fund_fixture = json.loads((FIXTURES / "current-fund.json").read_text(encoding="utf-8"))
        client = _FakeHttpClient([
            (200, fund_fixture),
            (200, fund_fixture),
        ])
        funds = client.sync_get_funds(target_date=date(2026, 11, 10))
        summary = client.sync_get_market_summary(target_date=date(2026, 11, 10))
        client.sync_close()

        self.assertEqual(len(funds), 1)
        self.assertEqual(summary.total_funds, 1)


if __name__ == "__main__":
    unittest.main()
