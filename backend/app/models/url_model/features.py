"""Lexical URL features. Scheme and leading www are stripped before anything is
computed, because PhreshPhish mixes URLs with and without a scheme and those
differences are collection artifacts, not signal."""
import math
import re
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import tldextract

_EXTRACT = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None)  # bundled suffix list, no network
_SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://")
_WWW = re.compile(r"^www\d*\.", re.I)
_SPLIT = re.compile(r"^([^/?#]*)(.*)$", re.S)
_IP = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
_TOKEN = re.compile(r"[A-Za-z0-9]+")

KEYWORDS = (
    "login", "signin", "log-in", "sign-in", "verify", "verification", "secure", "account",
    "update", "confirm", "password", "banking", "bank", "wallet", "invoice", "payment",
    "billing", "support", "helpdesk", "unlock", "suspend", "recover", "security", "webmail",
    "paypal", "apple", "microsoft", "google", "amazon", "netflix", "facebook", "meta",
)

NUMERIC_FEATURES = [
    "url_len", "host_len", "path_len", "query_len", "frag_len",
    "n_dots_host", "n_hyphens_host", "n_digits_host", "digit_ratio_host",
    "n_digits_path", "n_slashes", "path_depth", "n_hyphens_path", "n_underscores_path",
    "n_params", "n_eq", "n_amp", "n_pct", "n_at", "double_slash_in_path",
    "subdomain_count", "sld_len", "tld_len", "max_label_len", "longest_token_len",
    "has_ip", "has_port", "is_punycode", "host_entropy", "path_entropy",
    "kw_host", "kw_path", "kw_query",
]
FEATURES = NUMERIC_FEATURES + ["tld"]
TLD_TOP_N = 200
CACHE_FILE = Path("features_cache.pkl")


def normalize(url: str) -> str:
    u = _SCHEME.sub("", url.strip())
    return _WWW.sub("", u)


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    n = len(s)
    return -sum(c / n * math.log2(c / n) for c in Counter(s).values())


def _kw(s: str) -> int:
    s = s.lower()
    return sum(1 for k in KEYWORDS if k in s)


def _one(url: str) -> dict:
    u = normalize(url)
    netloc, rest = _SPLIT.match(u).groups()
    rest, _, frag = rest.partition("#")
    path, _, query = rest.partition("?")

    has_at = "@" in netloc
    hostport = netloc.rsplit("@", 1)[-1]
    host, _, port = hostport.partition(":")
    host = host.lower()

    is_ip = bool(_IP.match(host))
    if is_ip:
        sub, sld, tld = "", host, ""
    else:
        ext = _EXTRACT(host)
        sub, sld, tld = ext.subdomain, ext.domain, ext.suffix
    labels = [l for l in host.split(".") if l]
    path_tokens = _TOKEN.findall(u)

    host_digits = sum(ch.isdigit() for ch in host)
    return {
        "url_len": len(u),
        "host_len": len(host),
        "path_len": len(path),
        "query_len": len(query),
        "frag_len": len(frag),
        "n_dots_host": host.count("."),
        "n_hyphens_host": host.count("-"),
        "n_digits_host": host_digits,
        "digit_ratio_host": host_digits / max(len(host), 1),
        "n_digits_path": sum(ch.isdigit() for ch in path),
        "n_slashes": path.count("/"),
        "path_depth": len([p for p in path.split("/") if p]),
        "n_hyphens_path": path.count("-"),
        "n_underscores_path": path.count("_"),
        "n_params": (query.count("&") + 1) if query else 0,
        "n_eq": query.count("="),
        "n_amp": query.count("&"),
        "n_pct": u.count("%"),
        "n_at": int(has_at),
        "double_slash_in_path": int("//" in path),
        "subdomain_count": (sub.count(".") + 1) if sub else 0,
        "sld_len": len(sld),
        "tld_len": len(tld),
        "max_label_len": max((len(l) for l in labels), default=0),
        "longest_token_len": max((len(t) for t in path_tokens), default=0),
        "has_ip": int(is_ip),
        "has_port": int(bool(port)),
        "is_punycode": int("xn--" in host),
        "host_entropy": _entropy(host),
        "path_entropy": _entropy(path + query),
        "kw_host": _kw(host),
        "kw_path": _kw(path),
        "kw_query": _kw(query),
        "tld": tld.lower() if tld else ("ip" if is_ip else "none"),
    }


def registered_domain(url: str) -> str:
    """Grouping key for domain-grouped splits."""
    u = normalize(url)
    host = _SPLIT.match(u).group(1).rsplit("@", 1)[-1].partition(":")[0].lower()
    if _IP.match(host):
        return host
    ext = _EXTRACT(host)
    return ext.registered_domain or host


def extract_features(urls) -> pd.DataFrame:
    """Raw features with tld as a plain string (this is what features_cache.pkl holds)."""
    return pd.DataFrame([_one(u) for u in urls], columns=FEATURES)


def fit_tld_categories(tld_series: pd.Series) -> list:
    return list(tld_series.value_counts().head(TLD_TOP_N).index)


def encode(X: pd.DataFrame, tld_categories: list) -> pd.DataFrame:
    """Return model-ready frame with tld as a fixed-category column."""
    out = X[FEATURES].copy()
    cats = list(tld_categories) + ["other"]
    out["tld"] = pd.Categorical(
        out["tld"].where(out["tld"].isin(tld_categories), "other"), categories=cats
    )
    return out


def get_features(df: pd.DataFrame, refresh: bool = False) -> pd.DataFrame:
    """Cached features aligned to df row order."""
    if CACHE_FILE.exists() and not refresh:
        X = pd.read_pickle(CACHE_FILE)
        if len(X) == len(df):
            return X
    print(f"extracting features for {len(df):,} urls ...")
    X = extract_features(df["url"].tolist())
    X.to_pickle(CACHE_FILE)
    return X