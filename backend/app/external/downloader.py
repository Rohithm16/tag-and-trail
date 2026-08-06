import os
import uuid
import requests
import re

from urllib.parse import urlparse, unquote
from app.config import DOWNLOAD_FOLDER, MAX_FILE_SIZE


def sanitize_filename(name: str) -> str:
    """Remove unsafe characters from filename."""
    name = unquote(name)
    name = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
    return name[:80] if name else "download"


def extract_filename(url, headers):
    """Extract filename from headers or URL."""
    cd = headers.get("Content-Disposition")

    if cd and "filename=" in cd:
        filename = cd.split("filename=")[-1].strip('"')
    else:
        filename = os.path.basename(urlparse(url).path)

    filename = sanitize_filename(filename)

    if not filename:
        filename = "download"

    name, _ = os.path.splitext(filename)

    return name


def detect_file_type(path: str) -> str:
    """Detect file type using magic bytes."""
    with open(path, "rb") as f:
        header = f.read(16)

    if header.startswith(b"%PDF"):
        return "application/pdf"

    if header.startswith(b"\xff\xd8"):
        return "image/jpeg"

    if header.startswith(b"\x89PNG"):
        return "image/png"

    if header.startswith(b"GIF"):
        return "image/gif"

    if header.startswith(b"PK"):
        return "application/zip"

    return "unknown"


def download_file(url: str, auth=None) -> tuple:
    """Download file and return (path, detected_mime, base_name)."""

    r = requests.get(url, auth=auth, stream=True, timeout=10)
    r.raise_for_status()

    content_type = r.headers.get("Content-Type", "").lower()
    content_length = int(r.headers.get("Content-Length", 0))

    if content_length and content_length > MAX_FILE_SIZE:
        raise ValueError("File too large")

    base_name = extract_filename(url, r.headers)

    unique = uuid.uuid4().hex[:8]

    filename = f"{base_name}_{unique}.bin"

    path = os.path.join(DOWNLOAD_FOLDER, filename)

    total = 0
    with open(path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                total += len(chunk)
                if total > MAX_FILE_SIZE:
                    f.close()
                    os.remove(path)
                    raise ValueError("Exceeded max file size")
                f.write(chunk)

    detected_type = detect_file_type(path)

    if detected_type == "unknown":
        detected_type = content_type

    return path, detected_type, base_name


def normalize_url(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        return "https://" + url
    return url