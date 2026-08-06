import joblib
import os
import pandas as pd
import math
from PyPDF2 import PdfReader


FEATURE_NAMES = [
    "pdfsize",
    "pages",
    "isEncrypted",
    "JS",
    "OpenAction",
    "launch",
    "AA",
    "EmbeddedFile",
    "ObjStm",
    "entropy"
]


SUSPICIOUS_KEYS = [
    b"/JS", b"/JavaScript", b"/OpenAction",
    b"/Launch", b"/AA", b"/EmbeddedFile", b"/ObjStm"
]


FLAG_MAPPING = {
    3: "JavaScript",
    4: "OpenAction",
    5: "Launch",
    6: "AdditionalActions",
    7: "EmbeddedFile",
    8: "ObjectStream"
}


# -------------------------
# Entropy
# -------------------------

def shannon_entropy(data: bytes):

    if not data:
        return 0.0

    freq = {}

    for b in data:
        freq[b] = freq.get(b, 0) + 1

    entropy = 0.0
    length = len(data)

    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)

    return entropy


# -------------------------
# Feature extraction
# -------------------------

def extract_features(pdf_path):

    try:

        pdfsize = os.path.getsize(pdf_path) / 1024.0

        with open(pdf_path, "rb") as f:
            raw = f.read(1024 * 1024)

        entropy = shannon_entropy(raw)

        reader = PdfReader(pdf_path, strict=False)

        pages = len(reader.pages)

        is_encrypted = 1 if reader.is_encrypted else 0

        counts = {k.decode('latin-1'): raw.count(k) for k in SUSPICIOUS_KEYS}

        features = [
            pdfsize,
            float(pages),
            float(is_encrypted),
            float(counts.get('/JS', 0) + counts.get('/JavaScript', 0)),
            float(1 if counts.get('/OpenAction', 0) > 0 else 0),
            float(1 if counts.get('/Launch', 0) > 0 else 0),
            float(1 if counts.get('/AA', 0) > 0 else 0),
            float(1 if counts.get('/EmbeddedFile', 0) > 0 else 0),
            float(1 if counts.get('/ObjStm', 0) > 0 else 0),
            entropy
        ]

            # Reduce weight of weak indicators
        features[6] = min(features[6], 0.3)  # AA
        features[8] = min(features[8], 0.3)  # ObjStm
        return features

    except Exception:

        return [0.0] * len(FEATURE_NAMES)


# -------------------------
# Load model
# -------------------------

_MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(_MODEL_DIR, "model.joblib")

try:

    bundle = joblib.load(MODEL_PATH)

    model = bundle["model"]
    FEATURE_COLUMNS = bundle["features"]
    scaler = bundle.get("scaler", None)

    print("PDF model loaded successfully")

except Exception as e:

    print("PDF model load error:", e)

    model = None
    scaler = None
    FEATURE_COLUMNS = FEATURE_NAMES


# -------------------------
# Encryption check
# -------------------------

def check_pdf_encryption(pdf_path):

    try:

        reader = PdfReader(pdf_path, strict=False)

        return reader.is_encrypted

    except:

        return False


# -------------------------
# Flag extraction
# -------------------------

def extract_flags(features):

    flags = []

    for index, name in FLAG_MAPPING.items():

        if features[index] > 0:
            flags.append(name)

    return flags


# -------------------------
# Prediction
# -------------------------

def predict_pdf(pdf_path):

    if not os.path.exists(pdf_path):

        return {
            "prediction": "UNKNOWN",
            "malicious_probability": 0.0,
            "risk_level": "Error",
            "flags": []
        }

    is_encrypted = check_pdf_encryption(pdf_path)

    features = extract_features(pdf_path)

    flags = extract_flags(features)

    if model is None:

        return {
            "prediction": "UNKNOWN",
            "malicious_probability": 0.0,
            "risk_level": "Error",
            "flags": flags
        }

    try:

        X = pd.DataFrame([features], columns=FEATURE_COLUMNS)

        if scaler:
            X_scaled = scaler.transform(X)
        else:
            X_scaled = X.values

        prob_malicious = float(model.predict_proba(X_scaled)[0][1])

         # -------------------------
        # False positive override
        # -------------------------

        js = features[3]
        openaction = features[4]
        launch = features[5]
        aa = features[6]
        embedded = features[7]

        if (
            js == 0 and
            openaction == 0 and
            launch == 0 and
            embedded == 0 and
            not is_encrypted
        ):
            prob_malicious = 0.1

        strong_flags = js + openaction + launch + embedded
        if strong_flags <=1 and prob_malicious > 0.5:  
            prob_malicious = 0.3

        # Default risk level

        if prob_malicious >= 0.85:
            risk_level = "HIGH"

        elif prob_malicious >= 0.6:
            risk_level = "MEDIUM"

        elif prob_malicious >= 0.3:
            risk_level = "LOW"

        else:
            risk_level = "SAFE"


        return {

            "prediction": "Malicious" if prob_malicious > 0.5 else "Safe",

            "malicious_probability": round(prob_malicious, 4),

            "risk_level": risk_level,

            "flags": flags,

            "is_encrypted": is_encrypted
        }

    except Exception as e:

        return {

            "prediction": "UNKNOWN",

            "malicious_probability": 0.0,

            "risk_level": "Error",

            "flags": flags,

            "error": str(e)
        }
    