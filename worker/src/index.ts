const UPSTREAM_ENDPOINTS = new Map<string, string>([
  ["/api/funds/fonGnlBlgSiraliGetir", "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir"],
  ["/api/funds/dagilimSiraliGetirT", "https://www.tefas.gov.tr/api/funds/dagilimSiraliGetirT"],
  ["/api/funds/fonBilgiGetir", "https://www.tefas.gov.tr/api/funds/fonBilgiGetir"],
  ["/api/funds/fonProfilBilgiGetir", "https://www.tefas.gov.tr/api/funds/fonProfilBilgiGetir"],
  ["/api/funds/fonFiyatBilgiGetir", "https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir"],
  ["/api/funds/fonBuyuklukBazliBilgiGetir", "https://www.tefas.gov.tr/api/funds/fonBuyuklukBazliBilgiGetir"],
  ["/api/funds/fonYonetimBazliBilgiGetir", "https://www.tefas.gov.tr/api/funds/fonYonetimBazliBilgiGetir"],
  ["/api/funds/fonKurucuGetir", "https://www.tefas.gov.tr/api/funds/fonKurucuGetir"],
  ["/api/funds/fonTurGetir", "https://www.tefas.gov.tr/api/funds/fonTurGetir"],
  ["/api/funds/fonGrupGetir", "https://www.tefas.gov.tr/api/funds/fonGrupGetir"],
  ["/api/funds/fonUnvanAra", "https://www.tefas.gov.tr/api/funds/fonUnvanAra"],
  ["/api/funds/fonTipiGetir", "https://www.tefas.gov.tr/api/funds/fonTipiGetir"],
  ["/api/announcements/fonTefasDuyuruGetir", "https://www.tefas.gov.tr/api/announcements/fonTefasDuyuruGetir"],
]);

const DEFAULT_ORIGIN = "https://eneshikmetkayim.github.io";
const ALLOWED_ORIGINS = new Map<string, string>([
  ["https://eneshikmetkayim.github.io", "https://eneshikmetkayim.github.io"],
  ["http://127.0.0.1:8787", "http://127.0.0.1:8787"],
  ["http://localhost:8787", "http://localhost:8787"],
  ["http://127.0.0.1:8080", "http://127.0.0.1:8080"],
  ["http://localhost:8080", "http://localhost:8080"],
  ["http://127.0.0.1:5173", "http://127.0.0.1:5173"],
  ["http://localhost:5173", "http://localhost:5173"],
  ["http://127.0.0.1:4173", "http://127.0.0.1:4173"],
  ["http://localhost:4173", "http://localhost:4173"],
  ["http://127.0.0.1:5500", "http://127.0.0.1:5500"],
  ["http://localhost:5500", "http://localhost:5500"],
  ["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
  ["http://localhost:3000", "http://localhost:3000"],
]);

const MAX_BODY_BYTES = 65_536;

function buildCorsHeaders(request: Request): Record<string, string> {
  const reqOrigin = request.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.get(reqOrigin) ?? DEFAULT_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request);
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "GET" && (pathname === "/" || pathname === "/health")) {
      return jsonResponse(
        {
          ok: true,
          service: "tefasapi",
          endpoints: UPSTREAM_ENDPOINTS.size,
        },
        200,
        corsHeaders,
      );
    }

    const upstreamUrl = UPSTREAM_ENDPOINTS.get(pathname);
    if (!upstreamUrl) {
      return jsonResponse({ error: "Unsupported TEFAS endpoint" }, 404, corsHeaders);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed; use POST" }, 405, corsHeaders);
    }

    const rawText = await request.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Payload too large" }, 413, corsHeaders);
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON" }, 400, corsHeaders);
    }

    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return jsonResponse({ error: "Request body must be a JSON object" }, 400, corsHeaders);
    }

    try {
      const upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Origin": "https://www.tefas.gov.tr",
          "Referer": "https://www.tefas.gov.tr/tr/fon-karsilastirma",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(parsedBody),
      });

      const contentType = upstream.headers.get("Content-Type") ?? "";
      if (!contentType.toLowerCase().includes("json")) {
        return jsonResponse(
          { error: "TEFAS upstream returned non-JSON response (possible WAF challenge)" },
          502,
          corsHeaders,
        );
      }

      const upstreamText = await upstream.text();
      return new Response(upstreamText, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("[tefasapi] upstream fetch failed:", err);
      return jsonResponse({ error: "Upstream TEFAS request failed" }, 502, corsHeaders);
    }
  },
} satisfies ExportedHandler;
