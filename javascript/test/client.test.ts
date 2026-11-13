import { deepStrictEqual, rejects, strictEqual } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { TefasClient, isEmptyResultMessage } from "../src/client.ts";
import { FundType } from "../src/types.ts";
import { iterDateChunks } from "../src/utils.ts";

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), "utf8"));

function mockFetchSequence(items: Array<{ status: number; body: unknown }>): {
  fetchFn: typeof fetch;
  calls: Array<{ url: string; body: Record<string, unknown> }>;
} {
  const queue = [...items];
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchFn: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push({ url, body });
    const next = queue.shift();
    if (!next) throw new Error("Unexpected fetch call");
    const text = typeof next.body === "string" ? next.body : JSON.stringify(next.body);
    return new Response(text, { status: next.status });
  };
  return { fetchFn, calls };
}

describe("TefasClient pure-HTTP tests", () => {
  it("splits long ranges into 28-day chunks", () => {
    const chunks = iterDateChunks(
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 2, 1)),
      28
    );
    strictEqual(chunks.length, 3);
    strictEqual(chunks[0].end.toISOString().slice(0, 10), "2026-03-01");
    strictEqual(chunks[chunks.length - 1].start.toISOString().slice(0, 10), "2026-01-01");
  });

  it("recognizes TEFAS empty result markers", () => {
    const empty = fixture("empty-result.json");
    strictEqual(isEmptyResultMessage(empty.errorCode, empty.errorMessage, empty.resultList), true);
    strictEqual(isEmptyResultMessage(null, "Geçersiz veri: Tarih aralığı 1 ayı aşamaz", null), false);
  });

  it("falls back when latest business day is unpublished", async () => {
    const empty = fixture("empty-result.json");
    const current = fixture("current-fund.json");
    const { fetchFn, calls } = mockFetchSequence([
      { status: 200, body: empty },
      { status: 200, body: current },
    ]);
    const client = new TefasClient({ fetchFn });
    const funds = await client.getFunds(FundType.YAT);
    strictEqual(funds.length, 1);
    strictEqual(funds[0].code, "AAL");
    strictEqual(calls.length, 2);
  });

  it("detects WAF HTML response and API errors", async () => {
    const waf = mockFetchSequence([
      { status: 200, body: "<html><title>Erişim Engellendi</title></html>" },
    ]);
    const wafClient = new TefasClient({ fetchFn: waf.fetchFn });
    await rejects(() => wafClient.getFunds(FundType.YAT), /WAF_BLOCKED/);

    const err = mockFetchSequence([
      {
        status: 200,
        body: {
          errorCode: null,
          errorMessage: "Geçersiz veri: Tarih aralığı 1 ayı aşamaz",
          resultList: null,
        },
      },
    ]);
    const errClient = new TefasClient({ fetchFn: err.fetchFn });
    await rejects(
      () => errClient.getFunds(FundType.YAT, new Date(Date.UTC(2026, 10, 10))),
      /Tarih aralığı/
    );
  });

  it("chunks price history and sorts descending", async () => {
    const { fetchFn, calls } = mockFetchSequence([
      {
        status: 200,
        body: {
          resultList: [
            { fonKodu: "AAL", tarih: "2026-11-10", fiyat: 3.77 },
            { fonKodu: "AAL", tarih: "2026-10-20", fiyat: 3.6 },
          ],
        },
      },
      {
        status: 200,
        body: {
          resultList: [{ fonKodu: "AAL", tarih: "2026-10-05", fiyat: 3.5 }],
        },
      },
    ]);
    const client = new TefasClient({ fetchFn });
    const history = await client.getPriceHistory("aal", {
      startDate: new Date(Date.UTC(2026, 9, 1)),
      endDate: new Date(Date.UTC(2026, 10, 10)),
    });
    strictEqual(calls.length, 2);
    deepStrictEqual(
      history.map((h) => h.date.toISOString().slice(0, 10)),
      ["2026-11-10", "2026-10-20", "2026-10-05"]
    );
  });

  it("supports extended endpoints and announcements path", async () => {
    const { fetchFn, calls } = mockFetchSequence([
      { status: 200, body: fixture("fund-info.json") },
      { status: 200, body: fixture("fund-profile.json") },
      { status: 200, body: { errorCode: null, errorMessage: null, fonTipi: "F" } },
      { status: 200, body: fixture("announcements.json") },
    ]);
    const client = new TefasClient({ fetchFn });
    const info = await client.getFundInfo("AAL");
    const profile = await client.getFundProfile("AAL");
    const typeCode = await client.getFundTypeCode("AAL");
    const anns = await client.getAnnouncements();

    strictEqual(info?.category, "Para Piyasası Fonu");
    strictEqual(profile?.isinCode, "TRMAALWWWWW5");
    strictEqual(typeCode, "F");
    strictEqual(anns.length, 1);
    strictEqual(
      calls[3].url,
      "https://www.tefas.gov.tr/api/announcements/fonTefasDuyuruGetir"
    );
  });
});
