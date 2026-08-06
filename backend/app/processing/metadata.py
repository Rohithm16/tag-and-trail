"""
Metadata extraction from URLs and PDF files.
Kept in processing/ as a clean utility — no heavy dependencies on the rest of the app.
"""
import os
import re

import fitz  # PyMuPDF
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse


# ── HTML helpers ───────────────────────────────────────────────────────────────

def _first_paragraph_html(soup: BeautifulSoup) -> str | None:
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    parents = soup.find_all(["article", "main"]) or soup.find_all(
        "div", class_=re.compile(r"(content|post|entry|article)", re.I)
    ) or [soup]

    best, max_len = None, 0
    for parent in parents:
        for p in parent.find_all("p", recursive=True):
            text = _clean(p.get_text(" ", strip=True))
            if len(text) <= 80:
                continue
            if text.startswith("by ") and len(text) < 120:
                continue
            if len(text) > 300:
                return text
            if len(text) > max_len:
                max_len, best = len(text), text

    if best:
        return best

    for p in soup.find_all("p"):
        text = _clean(p.get_text(" ", strip=True))
        if len(text) > 80:
            return text
    return None


def _first_paragraph_pdf(pdf_bytes: bytes, max_pages: int = 5) -> str | None:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        for page_num in range(min(doc.page_count, max_pages)):
            page = doc.load_page(page_num)
            text = page.get_text()
            for block in text.split("\n\n"):
                block = block.strip()
                if not block:
                    continue
                cleaned = _clean(block)
                if len(cleaned) <= 80:
                    continue
                if sum(c.isdigit() for c in cleaned) / max(len(cleaned), 1) > 0.3:
                    continue
                return cleaned
    finally:
        doc.close()
    return None


def _clean(text: str, keep_punctuation: bool = True) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"\[\d+\]", "", text)
    if keep_punctuation:
        text = re.sub(r"[^a-z0-9\s.,!?;:'\"\(\)\-]", " ", text)
    else:
        text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _title_from_url(url: str) -> str:
    parsed = urlparse(url)
    filename = os.path.splitext(os.path.basename(parsed.path))[0]
    if not filename:
        return ""
    parts = re.split(r"[-_/]", filename)
    words = [p for p in parts if p and not p.isdigit()]
    return _clean(" ".join(words), keep_punctuation=False)


def _is_bad_title(title: str) -> bool:
    if not title:
        return True
    bad = ["error", "not found", "404", "403", "access denied", "forbidden",
           "captcha", "just a moment", "enable javascript", "redirecting", "loading"]
    return any(phrase in title.lower() for phrase in bad)


# ── Public API ─────────────────────────────────────────────────────────────────

def extract_metadata_from_url(url: str) -> dict:
    meta = {"title": None, "description": None}
    try:
        r = requests.get(url, timeout=(5, 10), headers={"User-Agent": "Mozilla/5.0"},
                         allow_redirects=True)
        r.raise_for_status()
        r.encoding = r.apparent_encoding

        if "text/html" not in r.headers.get("Content-Type", "").lower():
            meta["title"] = _title_from_url(url)
            return meta

        soup = BeautifulSoup(r.text, "html.parser")

        # Title candidates
        for candidate_fn in [
            lambda: soup.find("meta", property="og:title") and soup.find("meta", property="og:title").get("content"),
            lambda: soup.title and soup.title.string,
            lambda: soup.find("h1") and soup.find("h1").get_text(),
            lambda: _title_from_url(url),
        ]:
            candidate = _clean(candidate_fn() or "")
            if candidate and not _is_bad_title(candidate):
                for sep in (" | ", " - "):
                    if sep in candidate:
                        candidate = candidate.split(sep)[0].strip()
                meta["title"] = candidate
                break

        # Description
        desc = None
        for attr, value in [
            ({"name": re.compile(r"^description$", re.I)}, "content"),
            ({"property": "og:description"}, "content"),
            ({"name": re.compile(r"^twitter:description$", re.I)}, "content"),
        ]:
            tag = soup.find("meta", attrs=attr)
            if tag and tag.get(value):
                desc = _clean(tag[value])
                break

        first_para = _first_paragraph_html(soup)
        if desc and first_para:
            meta["description"] = f"{desc} | {first_para}"
        else:
            meta["description"] = desc or first_para

    except requests.RequestException:
        meta["title"] = _title_from_url(url)

    return meta


def extract_metadata_from_pdf(file_path: str, source_name: str = "") -> dict:
    meta = {"title": None, "description": None}
    try:
        doc = fitz.open(file_path)
        try:
            pdf_title = _clean(doc.metadata.get("title", ""))
            if pdf_title and not _is_bad_title(pdf_title):
                meta["title"] = pdf_title
            else:
                meta["title"] = _title_from_url(source_name) or os.path.splitext(
                    os.path.basename(file_path)
                )[0]
        finally:
            doc.close()

        with open(file_path, "rb") as f:
            pdf_bytes = f.read()

        meta["description"] = _first_paragraph_pdf(pdf_bytes)
    except Exception:
        meta["title"] = _title_from_url(source_name) or os.path.splitext(os.path.basename(file_path))[0]

    return meta