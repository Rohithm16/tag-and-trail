"""SSRF protection + login-wall detection helpers (kept separate from JWT security)."""
import re
import socket

import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse


def is_private_ip(hostname: str) -> bool:
    try:
        ip = socket.gethostbyname(hostname)
        return ip.startswith(("127.", "10.", "172.", "192.168."))
    except Exception:
        return True


def safe_request_get(url: str, **kwargs):
    parsed = urlparse(url)
    if parsed.hostname and is_private_ip(parsed.hostname):
        raise ValueError("Blocked internal/private IP access.")
    return requests.get(url, **kwargs)


def is_public_resource(url: str) -> bool:
    """Return True if the URL is publicly accessible (no login wall / captcha)."""
    original_parsed = urlparse(url)
    original_path_is_root = original_parsed.path in ("", "/")

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "DNT": "1",
        "Connection": "keep-alive",
    }

    try:
        r = requests.get(url, allow_redirects=True, timeout=10, stream=True, headers=headers)

        if original_path_is_root:
            return True

        if r.status_code != 200:
            content = b""
            for chunk in r.iter_content(chunk_size=8192):
                content += chunk
                if len(content) > 50 * 1024:
                    break
            html = content.decode(r.encoding or "utf-8", errors="ignore").lower()
            bot_indicators = [
                "captcha", "just a moment", "checking your browser",
                "access denied", "please turn javascript on",
                "enable javascript", "cf-browser-verification",
                "cloudflare", "ddos protection", "bot detection",
            ]
            return not any(ind in html for ind in bot_indicators)

        content_type = r.headers.get("Content-Type", "").lower()
        if "text/html" not in content_type:
            return True

        content = b""
        for chunk in r.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > 1024 * 1024:
                break

        html = content.decode(r.encoding or "utf-8", errors="ignore")
        visible = re.sub(r"<script.*?>.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
        visible = re.sub(r"<style.*?>.*?</style>", " ", visible, flags=re.DOTALL | re.IGNORECASE)
        visible = re.sub(r"<[^>]+>", " ", visible)
        visible = re.sub(r"\s+", " ", visible).strip().lower()

        login_phrases = [
            "sign in to continue", "subscribe to read", "members only",
            "log in to view", "you must be logged in", "please log in",
            "access for subscribers only",
        ]
        if any(phrase in visible for phrase in login_phrases):
            return False

        final_domain = urlparse(r.url).hostname or ""
        auth_subdomains = ["login.", "signin.", "auth.", "account.", "secure."]
        if any(sub in final_domain for sub in auth_subdomains):
            return False

        soup = BeautifulSoup(html, "html.parser")
        has_password = bool(re.search(r'<input[^>]*type=["\']password["\']', html, re.IGNORECASE))
        has_login_form = bool(
            re.search(r'<form[^>]*action=["\'][^"\']*(login|signin|auth)[^"\']*["\']', html, re.IGNORECASE)
        )
        forgot_password = bool(re.search(r"forgot (password|passcode|pin)", html, re.IGNORECASE))

        if (has_password or has_login_form) and forgot_password:
            return False
        if (has_password or has_login_form) and len(visible) < 800:
            return False

        return True

    except Exception:
        return True
