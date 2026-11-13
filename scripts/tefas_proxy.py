"""Local static server and strict TEFAS CORS relay for the API documentation playground."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Final

DOCS_DIR: Final[Path] = Path(__file__).resolve().parent.parent / "docs"
MAX_BODY_BYTES: Final[int] = 65_536
REQUEST_TIMEOUT_SEC: Final[int] = 20

# Strict static path allowlist for local docs files (no path traversal possible).
STATIC_FILES: Final[dict[str, tuple[str, str]]] = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/assets/style.css": ("assets/style.css", "text/css; charset=utf-8"),
    "/assets/app.js": ("assets/app.js", "application/javascript; charset=utf-8"),
    "/assets/docs-data.js": ("assets/docs-data.js", "application/javascript; charset=utf-8"),
}

# Strict allowlist mapping each TEFAS route path to a fixed upstream HTTPS URL.
UPSTREAM_ENDPOINTS: Final[dict[str, str]] = {
    "/api/funds/fonGnlBlgSiraliGetir": "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir",
    "/api/funds/dagilimSiraliGetirT": "https://www.tefas.gov.tr/api/funds/dagilimSiraliGetirT",
    "/api/funds/fonBilgiGetir": "https://www.tefas.gov.tr/api/funds/fonBilgiGetir",
    "/api/funds/fonProfilBilgiGetir": "https://www.tefas.gov.tr/api/funds/fonProfilBilgiGetir",
    "/api/funds/fonFiyatBilgiGetir": "https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir",
    "/api/funds/fonBuyuklukBazliBilgiGetir": "https://www.tefas.gov.tr/api/funds/fonBuyuklukBazliBilgiGetir",
    "/api/funds/fonYonetimBazliBilgiGetir": "https://www.tefas.gov.tr/api/funds/fonYonetimBazliBilgiGetir",
    "/api/funds/fonKurucuGetir": "https://www.tefas.gov.tr/api/funds/fonKurucuGetir",
    "/api/funds/fonTurGetir": "https://www.tefas.gov.tr/api/funds/fonTurGetir",
    "/api/funds/fonGrupGetir": "https://www.tefas.gov.tr/api/funds/fonGrupGetir",
    "/api/funds/fonUnvanAra": "https://www.tefas.gov.tr/api/funds/fonUnvanAra",
    "/api/funds/fonTipiGetir": "https://www.tefas.gov.tr/api/funds/fonTipiGetir",
    "/api/announcements/fonTefasDuyuruGetir": "https://www.tefas.gov.tr/api/announcements/fonTefasDuyuruGetir",
}

# Explicit allowed origins mapped to constant literal strings.
ALLOWED_ORIGINS: Final[dict[str, str]] = {
    "https://eneshikmetkayim.github.io": "https://eneshikmetkayim.github.io",
    "http://127.0.0.1:8787": "http://127.0.0.1:8787",
    "http://localhost:8787": "http://localhost:8787",
    "http://127.0.0.1:8080": "http://127.0.0.1:8080",
    "http://localhost:8080": "http://localhost:8080",
}

TEFAS_HEADERS: Final[dict[str, str]] = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Origin": "https://www.tefas.gov.tr",
    "Referer": "https://www.tefas.gov.tr/tr/fon-karsilastirma",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
}


class TefasDocsProxyHandler(BaseHTTPRequestHandler):
    """Serves static docs assets and relays allowlisted TEFAS POST endpoints."""

    def _add_cors_headers(self) -> None:
        origin = self.headers.get("Origin", "")
        allowed_origin = ALLOWED_ORIGINS.get(origin)
        if allowed_origin:
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Accept")

    def _send_json(self, status: int, payload: bytes) -> None:
        self.send_response(status)
        self._add_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(payload)

    def _send_json_obj(self, status: int, data: dict[str, object]) -> None:
        self._send_json(status, json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self) -> None:
        clean_path = self.path.split("?", 1)[0]
        if clean_path in UPSTREAM_ENDPOINTS or clean_path == "/health":
            self.send_response(HTTPStatus.NO_CONTENT)
            self._add_cors_headers()
            self.end_headers()
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_GET(self) -> None:
        clean_path = self.path.split("?", 1)[0]
        if clean_path == "/health":
            self._send_json_obj(
                HTTPStatus.OK,
                {"ok": True, "mode": "tefas-proxy", "endpoints": len(UPSTREAM_ENDPOINTS)},
            )
            return

        asset = STATIC_FILES.get(clean_path)
        if asset is None:
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        rel_name, content_type = asset
        target_file = DOCS_DIR / rel_name
        if not target_file.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        content = target_file.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        clean_path = self.path.split("?", 1)[0]
        upstream_url = UPSTREAM_ENDPOINTS.get(clean_path)
        if upstream_url is None:
            self._send_json_obj(HTTPStatus.NOT_FOUND, {"error": "Unsupported TEFAS endpoint"})
            return

        raw_len = self.headers.get("Content-Length")
        if raw_len is None:
            self._send_json_obj(HTTPStatus.LENGTH_REQUIRED, {"error": "Content-Length required"})
            return

        try:
            content_length = int(raw_len)
        except ValueError:
            self._send_json_obj(HTTPStatus.BAD_REQUEST, {"error": "Invalid Content-Length"})
            return

        if content_length < 0 or content_length > MAX_BODY_BYTES:
            self._send_json_obj(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "Payload too large"})
            return

        raw_body = self.rfile.read(content_length)
        try:
            parsed = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json_obj(HTTPStatus.BAD_REQUEST, {"error": "Request body must be valid JSON"})
            return

        if not isinstance(parsed, dict):
            self._send_json_obj(HTTPStatus.BAD_REQUEST, {"error": "Request body must be a JSON object"})
            return

        normalized_body = json.dumps(parsed, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            upstream_url,
            data=normalized_body,
            method="POST",
            headers=TEFAS_HEADERS,
        )

        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SEC) as resp:
                resp_bytes = resp.read()
                resp_status = resp.status
                content_type = resp.headers.get("Content-Type", "")
        except urllib.error.HTTPError as exc:
            print(f"[tefas-proxy] upstream HTTP error {exc.code} on {clean_path}", file=sys.stderr)
            self._send_json_obj(exc.code, {"error": f"TEFAS upstream returned HTTP {exc.code}"})
            return
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            print(f"[tefas-proxy] upstream network error on {clean_path}: {exc}", file=sys.stderr)
            self._send_json_obj(HTTPStatus.BAD_GATEWAY, {"error": "Upstream TEFAS request failed"})
            return

        if "json" not in content_type.lower():
            self._send_json_obj(
                HTTPStatus.BAD_GATEWAY,
                {"error": "TEFAS returned non-JSON response (possible WAF challenge or maintenance)"},
            )
            return

        self._send_json(resp_status, resp_bytes)

    def log_message(self, format: str, *args: object) -> None:
        print(f"[tefas-proxy] {self.address_string()} - {format % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local docs server and TEFAS API proxy.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8787, help="Bind port (default: 8787)")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), TefasDocsProxyHandler)
    print(f"TEFAS Docs & Live Proxy listening on http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
