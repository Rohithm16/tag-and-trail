"""VirusTotal API integration."""
import time
import os
import requests

from app.core.config import settings


VT_FILE_URL = "https://www.virustotal.com/api/v3/files"
VT_URL_SCAN = "https://www.virustotal.com/api/v3/urls"


def _vt_headers():
    return {"x-apikey": settings.VT_API_KEY}


def scan_file(file_path: str) -> dict:
    if not settings.VT_API_KEY or settings.VT_API_KEY == "your_virustotal_api_key_here":
        return {"virustotal_skipped": "No VT API key configured"}
    try:
        with open(file_path, "rb") as f:
            upload = requests.post(
                VT_FILE_URL,
                headers=_vt_headers(),
                files={"file": (os.path.basename(file_path), f)},
                timeout=30,
            )
        if upload.status_code != 200:
            return {"virustotal_error": f"Upload failed: {upload.status_code}"}
        analysis_id = upload.json()["data"]["id"]
        time.sleep(15)
        report = requests.get(
            f"https://www.virustotal.com/api/v3/analyses/{analysis_id}",
            headers=_vt_headers(),
            timeout=15,
        )
        stats = report.json()["data"]["attributes"]["stats"]
        return {"virustotal": {k: stats.get(k, 0) for k in ("malicious", "suspicious", "harmless", "undetected")}}
    except Exception as e:
        return {"virustotal_error": str(e)}


def scan_url(url: str) -> dict:
    print("scan_url() called")
    if not settings.VT_API_KEY or settings.VT_API_KEY == "your_virustotal_api_key_here":
        return {"virustotal_skipped": "No VT API key configured"}
    try:
        submit = requests.post(VT_URL_SCAN, headers=_vt_headers(), data={"url": url}, timeout=15)
        analysis_id = submit.json()["data"]["id"]
        time.sleep(15)
        report = requests.get(
            f"https://www.virustotal.com/api/v3/analyses/{analysis_id}",
            headers=_vt_headers(),
            timeout=15,
        )
        print("Submit status:", submit.status_code)
        print("Submit response:", submit.text)
        
        print("Report status:", report.status_code)
        print(report.text)
        stats = report.json()["data"]["attributes"]["stats"]
        return {"virustotal": {k: stats.get(k, 0) for k in ("malicious", "suspicious", "harmless", "undetected")}}
    except Exception as e:
        return {"virustotal_error": str(e)}