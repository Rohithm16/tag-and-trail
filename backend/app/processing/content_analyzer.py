import re
import requests
from requests.exceptions import RequestException
from PIL import Image
import os

from app.external.downloader import download_file
from app.external.downloader import normalize_url
from app.external.ml_integration import run_url_model, run_pdf_model
from app.processing.metadata import (
    extract_metadata_from_url,
    extract_metadata_from_pdf
)
from app.processing.converters import convert_to_pdf
from app.core.security import is_public_resource, is_pdf_public
from app.config import TWILIO_SID, TWILIO_TOKEN


def get_unique_filename(directory, base_name, ext):
    filename = f"{base_name}{ext}"
    filepath = os.path.join(directory, filename)

    counter = 1

    while os.path.exists(filepath):
        filename = f"{base_name}-{counter}{ext}"
        filepath = os.path.join(directory, filename)
        counter += 1

    return filepath


def is_link_or_pdf(text):
    url_pattern = r'((https?://)?(www\.)?([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}(/\S*)?)'
    match = re.search(url_pattern, text)

    if not match:
        return None

    link = match.group(0)
    link = re.sub(r'[.,!?;:()\[\]"\']+$', '', link)

    if not link.startswith("http"):
        link = "https://" + link

    try:
        head = requests.head(link, allow_redirects=True, timeout=5)
        content_type = head.headers.get("Content-Type", "").lower()

        if "application/pdf" in content_type:
            return "pdf"

    except Exception:
        pass

    if link.lower().endswith(".pdf"):
        return "pdf"

    return "link"


def risk_from_probability(prob: float) -> str:

    if prob >= 0.7:
        return "HIGH"

    elif prob >= 0.4:
        return "MEDIUM"

    elif prob >= 0.2:
        return "LOW"

    else:
        return "SAFE"


def handle_link(url: str) -> dict:

    url = normalize_url(url)

    result = {
        "type": "link",
        "url": url,
        "public": False
    }

    try:
        result["public"] = is_public_resource(url)

    except Exception as e:
        result["error"] = str(e)

    try:
        metadata = extract_metadata_from_url(url)

        if isinstance(metadata, dict):
            result.update(metadata)

    except Exception:
        result["metadata_error"] = True

    try:
        model_result = run_url_model(url)
        result.update(model_result)

    except Exception as e:
        result["model_error"] = str(e)

    return result


def handle_media_conversion(url: str, mime: str, auth=None) -> dict:
    """Download non-PDF media, convert to PDF, and run PDF model."""

    url = normalize_url(url)

    result = {
        "type": "media",
        "original_mime": mime,
        "url": url
    }

    try:

        path, mime, base_name = download_file(url, auth=auth)
        result["downloaded"] = path

        extra_info = {}

        if mime.startswith("image/"):

            try:
                img = Image.open(path)

                extra_info["image_dimensions"] = f"{img.width}x{img.height}"
                extra_info["image_format"] = img.format

            except Exception:
                pass

        if mime == "application/pdf":

            pdf_path = get_unique_filename(
                os.path.dirname(path),
                base_name,
                ".pdf"
            )

            os.rename(path, pdf_path)

        else:

            pdf_path = convert_to_pdf(path, mime)

            try:
                os.remove(path)
            except Exception:
                pass

        result["converted_to_pdf"] = pdf_path

        result["public"] = is_pdf_public(pdf_path)

        metadata_success = False

        try:

            metadata = extract_metadata_from_pdf(pdf_path, url)

            if isinstance(metadata, dict):

                result.update(metadata)
                metadata_success = True

        except Exception:
            result["metadata_error"] = True

        if not metadata_success or not result.get("title"):

            if mime.startswith("image/"):

                dims = extra_info.get("image_dimensions", "unknown")
                fmt = extra_info.get("image_format", "image")

                result["title"] = f"{fmt} Image"
                result["description"] = f"Image dimensions: {dims}"

            else:

                mime_to_name = {
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
                    "application/msword": "Word Document (old)",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint Presentation",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
                    "text/plain": "Text Document",
                }

                result["title"] = mime_to_name.get(mime, "Document")
                result["description"] = f"Converted from {mime}"

        try:

            model_result = run_pdf_model(pdf_path)
            result.update(model_result)

        except Exception as e:
            result["model_error"] = str(e)

    except Exception as e:
        result["error"] = str(e)

    return result


def handle_pdf(url: str) -> dict:

    url = normalize_url(url)

    result = {
        "type": "pdf"
    }

    try:

        path, mime, base_name = download_file(url)

        if mime == "application/pdf":

            pdf_path = get_unique_filename(
                os.path.dirname(path),
                base_name,
                ".pdf"
            )

            os.rename(path, pdf_path)

        else:
            pdf_path = path

        result["public"] = is_pdf_public(pdf_path)

        try:

            metadata = extract_metadata_from_pdf(pdf_path, url)

            if isinstance(metadata, dict):
                result.update(metadata)

        except Exception:
            result["metadata_error"] = True

        try:

            model_result = run_pdf_model(pdf_path)
            result.update(model_result)

        except Exception as e:
            result["model_error"] = str(e)

        return result

    except RequestException as e:
        result["error"] = str(e)
        return result


def handle_twilio_pdf(url: str) -> dict:

    if not TWILIO_SID or not TWILIO_TOKEN:
        return {"type": "pdf", "error": "Missing Twilio credentials"}

    url = normalize_url(url)

    result = {
        "type": "pdf"
    }

    try:

        path, mime, base_name = download_file(
            url,
            auth=(TWILIO_SID, TWILIO_TOKEN)
        )

        if mime == "application/pdf":

            pdf_path = get_unique_filename(
                os.path.dirname(path),
                base_name,
                ".pdf"
            )

            os.rename(path, pdf_path)

        else:
            pdf_path = path

        result["public"] = is_pdf_public(pdf_path)

        try:

            metadata = extract_metadata_from_pdf(pdf_path, url)

            if isinstance(metadata, dict):
                result.update(metadata)

        except Exception:
            result["metadata_error"] = True

        try:

            model_result = run_pdf_model(pdf_path)
            result.update(model_result)

        except Exception as e:
            result["model_error"] = str(e)

        return result

    except RequestException as e:
        result["error"] = str(e)
        return result


def input_handler(string=None):

    if string is None:
        return None

    detected = is_link_or_pdf(string)

    if detected == "link":
        return handle_link(string)

    elif detected == "pdf":
        return handle_pdf(string)

    return {"type": "text", "content": string}