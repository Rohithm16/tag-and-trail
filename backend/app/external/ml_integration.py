"""ML model integration — runs URL or PDF through the local models + optional VirusTotal."""
import os

from app.models.pdf_model.processing import predict_pdf
from app.models.url_model.processing import tag_and_trail_inference
from app.external.virustotal import scan_file, scan_url

# Labels that trigger a VirusTotal follow-up scan
_MALICIOUS_URL_LABELS = {"Defacement", "Malware", "Phishing"}


def run_url_model(url: str) -> dict:
    """Run LSTM+CNN ensemble on a URL. Returns prediction dict."""
    try:
        result = tag_and_trail_inference(url)
        label = result["class"]
        confidence = result["confidence"]
        print("Predicted label:", label)

        malicious_probability = (1 - confidence) if label == "Safe" else confidence
        is_malicious = label != "Safe"

        response = {
            "prediction": label,
            "is_malicious": is_malicious,
            "malicious_probability": round(malicious_probability, 4),
            "risk_level": _risk_from_prob(malicious_probability),
        }

        # Override with VirusTotal if available
        if label in _MALICIOUS_URL_LABELS:
            vt = scan_url(url)
            response.update(vt)

            if "virustotal" in vt:
                stats = vt["virustotal"]

                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)

                if malicious > 0 or suspicious > 0:
                    response["prediction"] = "Malicious"
                    response["is_malicious"] = True
                    response["risk_level"] = "HIGH"
                else:
                    response["prediction"] = "Safe"
                    response["is_malicious"] = False
                    response["risk_level"] = "SAFE"
                    response["malicious_probability"] = 0.0

        return response

    except Exception as e:
        return {
            "prediction": "UNKNOWN",
            "is_malicious": False,
            "malicious_probability": 0.0,
            "risk_level": "UNKNOWN",
            "model_error": str(e),
        }


def run_pdf_model(pdf_path: str) -> dict:
    """Run feature-based ML on a PDF file. Returns prediction dict."""
    try:
        result = predict_pdf(pdf_path)
        result["is_malicious"] = result.get("prediction") == "Malicious"

        if result.get("risk_level") == "HIGH":
            result.update(scan_file(pdf_path))

        return result

    except Exception as e:
        return {
            "prediction": "UNKNOWN",
            "is_malicious": False,
            "malicious_probability": 0.0,
            "risk_level": "UNKNOWN",
            "flags": [],
            "model_error": str(e),
        }


def _risk_from_prob(prob: float) -> str:
    if prob >= 0.7:
        return "HIGH"
    if prob >= 0.4:
        return "MEDIUM"
    if prob >= 0.2:
        return "LOW"
    return "SAFE"