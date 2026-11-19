"""ML model integration — runs URL or PDF through the local models + optional VirusTotal."""
from app.models.pdf_model.processing import predict_pdf
from app.models.url_model.predict import get_threshold, score_urls
from app.external.virustotal import scan_file, scan_url


def run_url_model(url: str) -> dict:
    """Score a URL with LightGBM and enrich malicious results with VirusTotal.

    The CNN/LSTM artifacts remain available in ``url_model`` but are no longer
    imported or loaded by the application.
    """
    try:
        malicious_probability = float(score_urls([url])[0])
        threshold = get_threshold()
        is_malicious = malicious_probability >= threshold

        response = {
            "prediction": "Malicious" if is_malicious else "Safe",
            "is_malicious": is_malicious,
            "malicious_probability": round(malicious_probability, 4),
            "risk_level": _risk_from_prob(malicious_probability),
            "model": "lightgbm",
            "model_threshold": round(threshold, 4),
        }

        # VirusTotal is the reputation confirmation for local positives.
        # A completed clean result prevents false positives from the lexical
        # model; errors or an unavailable API leave the local verdict intact.
        if is_malicious:
            vt = scan_url(url)
            response.update(vt)
            stats = vt.get("virustotal")
            if stats:
                if stats.get("malicious", 0) > 0 or stats.get("suspicious", 0) > 0:
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
