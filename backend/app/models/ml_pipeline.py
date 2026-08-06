import os
import io
import re
import json
import math
import uuid
import fitz
import docx
import joblib
import requests
import numpy as np
import pandas as pd

from pptx import Presentation
from openpyxl import load_workbook
from PIL import Image
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader

# TensorFlow Imports
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.text import tokenizer_from_json
from tensorflow.keras.preprocessing.sequence import pad_sequences

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

BASE_DIR = os.path.dirname(__file__)

# Hugging Face usually provides a writeable /tmp/ directory for ephemeral files
DOWNLOAD_FOLDER = "/tmp/tag_and_trail_downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# ==============================================================================
# 1. URL ML MODEL (LSTM + CNN)
# ==============================================================================

tokenizer_path = os.path.join(BASE_DIR, "models", "tokenizer.json")
with open(tokenizer_path, 'r') as f:
    tokenizer_data = json.load(f)
    tokenizer = tokenizer_from_json(tokenizer_data)

lstm_model = load_model(os.path.join(BASE_DIR, 'models', 'tag_and_trail_lstm_best.keras'))
cnn_model = load_model(os.path.join(BASE_DIR, 'models', 'tag_trail_url_cnn_model.keras'))

def tag_and_trail_inference(raw_url):
    url = raw_url.lower().strip()
    sequences = tokenizer.texts_to_sequences([url])
    padded_data = pad_sequences(sequences, maxlen=200, padding='post')
    
    lstm_preds = lstm_model.predict(padded_data, verbose=0)
    cnn_preds = cnn_model.predict(padded_data, verbose=0)
    
    final_probabilities = (lstm_preds + cnn_preds) / 2
    
    classes = ['Safe', 'Defacement', 'Malware', 'Phishing']
    predicted_idx = np.argmax(final_probabilities)
    confidence = float(np.max(final_probabilities))
    
    return {
        "url": raw_url,
        "class": classes[predicted_idx],
        "confidence": confidence,
        "raw_scores": final_probabilities.tolist()
    }


# ==============================================================================
# 2. PDF ML MODEL (Feature Extraction + Joblib)
# ==============================================================================

FEATURE_NAMES = ["pdfsize", "pages", "isEncrypted", "JS", "OpenAction", "launch", "AA", "EmbeddedFile", "ObjStm", "entropy"]
SUSPICIOUS_KEYS = [b"/JS", b"/JavaScript", b"/OpenAction", b"/Launch", b"/AA", b"/EmbeddedFile", b"/ObjStm"]
FLAG_MAPPING = {3: "JavaScript", 4: "OpenAction", 5: "Launch", 6: "AdditionalActions", 7: "EmbeddedFile", 8: "ObjectStream"}

MODEL_PATH = os.path.join(BASE_DIR, "models", "model.joblib")
try:
    bundle = joblib.load(MODEL_PATH)
    pdf_model = bundle["model"]
    FEATURE_COLUMNS = bundle["features"]
    scaler = bundle.get("scaler", None)
    print("PDF model loaded successfully")
except Exception as e:
    print("PDF model load error:", e)
    pdf_model = None
    scaler = None
    FEATURE_COLUMNS = FEATURE_NAMES

def shannon_entropy(data: bytes):
    if not data: return 0.0
    freq = {}
    for b in data: freq[b] = freq.get(b, 0) + 1
    entropy = 0.0
    length = len(data)
    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)
    return entropy

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
            pdfsize, float(pages), float(is_encrypted),
            float(counts.get('/JS', 0) + counts.get('/JavaScript', 0)),
            float(1 if counts.get('/OpenAction', 0) > 0 else 0),
            float(1 if counts.get('/Launch', 0) > 0 else 0),
            float(1 if counts.get('/AA', 0) > 0 else 0),
            float(1 if counts.get('/EmbeddedFile', 0) > 0 else 0),
            float(1 if counts.get('/ObjStm', 0) > 0 else 0),
            entropy
        ]
        features[6] = min(features[6], 0.3)  # AA
        features[8] = min(features[8], 0.3)  # ObjStm
        return features
    except Exception:
        return [0.0] * len(FEATURE_NAMES)

def check_pdf_encryption(pdf_path):
    try:
        reader = PdfReader(pdf_path, strict=False)
        return reader.is_encrypted
    except:
        return False

def extract_flags(features):
    flags = []
    for index, name in FLAG_MAPPING.items():
        if features[index] > 0: flags.append(name)
    return flags

def predict_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        return {"prediction": "UNKNOWN", "malicious_probability": 0.0, "risk_level": "Error", "flags": []}
    
    is_encrypted = check_pdf_encryption(pdf_path)
    features = extract_features(pdf_path)
    flags = extract_flags(features)
    
    if pdf_model is None:
        return {"prediction": "UNKNOWN", "malicious_probability": 0.0, "risk_level": "Error", "flags": flags}
    try:
        X = pd.DataFrame([features], columns=FEATURE_COLUMNS)
        if scaler: X_scaled = scaler.transform(X)
        else: X_scaled = X.values
        
        prob_malicious = float(pdf_model.predict_proba(X_scaled)[0][1])

        js = features[3]
        openaction = features[4]
        launch = features[5]
        aa = features[6]
        embedded = features[7]

        if (js == 0 and openaction == 0 and launch == 0 and embedded == 0 and not is_encrypted):
            prob_malicious = 0.1
        strong_flags = js + openaction + launch + embedded
        if strong_flags <=1 and prob_malicious > 0.5:  
            prob_malicious = 0.3

        if prob_malicious >= 0.85: risk_level = "HIGH"
        elif prob_malicious >= 0.6: risk_level = "MEDIUM"
        elif prob_malicious >= 0.3: risk_level = "LOW"
        else: risk_level = "SAFE"

        return {
            "prediction": "Malicious" if prob_malicious > 0.5 else "Safe",
            "malicious_probability": round(prob_malicious, 4),
            "risk_level": risk_level,
            "flags": flags,
            "is_encrypted": is_encrypted
        }
    except Exception as e:
        return {"prediction": "UNKNOWN", "malicious_probability": 0.0, "risk_level": "Error", "flags": flags, "error": str(e)}


# ==============================================================================
# 3. CONVERTERS
# ==============================================================================

def convert_image_to_pdf(image_path: str) -> str:
    img = Image.open(image_path)
    if img.mode != "RGB": img = img.convert("RGB")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PDF")
    pdf_path = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.pdf")
    with open(pdf_path, "wb") as f: f.write(img_bytes.getvalue())
    return pdf_path

def convert_text_to_pdf(text_path: str) -> str:
    with open(text_path, "r", encoding="utf-8", errors="ignore") as f: text = f.read()
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), text, fontsize=11)
    pdf_path = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.pdf")
    doc.save(pdf_path)
    doc.close()
    return pdf_path

def convert_docx_to_pdf(docx_path: str) -> str:
    doc = docx.Document(docx_path)
    full_text = [para.text for para in doc.paragraphs]
    text = "\n".join(full_text)
    tmp_path = docx_path + ".tmp.txt"
    with open(tmp_path, "w", encoding="utf-8") as f: f.write(text)
    pdf_path = convert_text_to_pdf(tmp_path)
    os.remove(tmp_path)
    return pdf_path

def convert_pptx_to_pdf(pptx_path: str) -> str:
    prs = Presentation(pptx_path)
    text_runs = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text"): text_runs.append(shape.text)
    text = "\n".join(text_runs)
    tmp_path = pptx_path + ".tmp.txt"
    with open(tmp_path, "w", encoding="utf-8") as f: f.write(text)
    pdf_path = convert_text_to_pdf(tmp_path)
    os.remove(tmp_path)
    return pdf_path

def convert_xlsx_to_pdf(xlsx_path: str) -> str:
    wb = load_workbook(xlsx_path, read_only=True, data_only=True)
    text_lines = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows(values_only=True):
            row_str = " | ".join(str(cell) if cell is not None else "" for cell in row)
            if row_str.strip(): text_lines.append(row_str)
    text = "\n".join(text_lines)
    tmp_path = xlsx_path + ".tmp.txt"
    with open(tmp_path, "w", encoding="utf-8") as f: f.write(text)
    pdf_path = convert_text_to_pdf(tmp_path)
    os.remove(tmp_path)
    return pdf_path

def convert_to_pdf(file_path: str, mime: str) -> str:
    if mime.startswith("image/"): return convert_image_to_pdf(file_path)
    elif mime == "text/plain": return convert_text_to_pdf(file_path)
    elif mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document": return convert_docx_to_pdf(file_path)
    elif mime == "application/msword": raise ValueError("Unsupported mime type: .doc (old format) – please convert to .docx")
    elif mime == "application/vnd.openxmlformats-officedocument.presentationml.presentation": return convert_pptx_to_pdf(file_path)
    elif mime == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": return convert_xlsx_to_pdf(file_path)
    else: return file_path  # If already PDF or unknown, pass through


# ==============================================================================
# 4. METADATA EXTRACTION
# ==============================================================================

def clean_text(text: str, keep_punctuation: bool = True) -> str:
    if not text: return ""
    text = text.lower()
    text = re.sub(r"\[\d+\]", "", text)
    if keep_punctuation: text = re.sub(r"[^a-z0-9\s.,!?;:'\"()-]", " ", text)
    else: text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def title_from_url(url: str) -> str:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    filename = os.path.splitext(os.path.basename(parsed.path))[0]
    if not filename: return ""
    parts = re.split(r"[-_/]", filename)
    words = [p for p in parts if p and not p.isdigit()]
    return clean_text(" ".join(words), keep_punctuation=False)

def is_bad_title(title: str) -> bool:
    if not title: return True
    title_lower = title.lower()
    bad_phrases = ["error", "not found", "404", "403", "access denied", "forbidden", "captcha", "challenge", "just a moment", "enable javascript", "redirecting", "loading"]
    return any(phrase in title_lower for phrase in bad_phrases)

def extract_first_paragraph_html(soup):
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]): tag.decompose()
    content_parents = soup.find_all(['article', 'main'])
    if not content_parents:
        content_parents = soup.find_all('div', class_=re.compile(r"(content|post|entry|article)", re.I))
    if not content_parents: content_parents = [soup]
    best_paragraph = None
    max_len = 0
    for parent in content_parents:
        for p in parent.find_all('p', recursive=True):
            text = clean_text(p.get_text(" ", strip=True))
            length = len(text)
            if length <= 80: continue
            if text.startswith("by ") and length < 120: continue
            if length > 300: return text
            if length > max_len:
                max_len = length
                best_paragraph = text
    if best_paragraph: return best_paragraph
    for p in soup.find_all('p'):
        text = clean_text(p.get_text(" ", strip=True))
        if len(text) > 80: return text
    return None

def extract_first_paragraph_pdf(pdf_bytes, max_pages=5):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if doc.page_count == 0: return None
        pages_to_scan = min(doc.page_count, max_pages)
        for page_num in range(pages_to_scan):
            page = doc.load_page(page_num)
            text = page.get_text()
            for block in text.split("\n\n"):
                block = block.strip()
                if not block: continue
                cleaned = clean_text(block)
                length = len(cleaned)
                if length <= 80: continue
                digit_ratio = sum(c.isdigit() for c in cleaned) / length
                if digit_ratio > 0.3: continue
                return cleaned
            lines = [line.strip() for line in text.split("\n") if line.strip()]
            combined = ""
            for line in lines:
                combined += " " + line
                if len(combined) > 200:
                    cleaned = clean_text(combined)
                    length = len(cleaned)
                    if length <= 80: continue
                    digit_ratio = sum(c.isdigit() for c in cleaned) / length
                    if digit_ratio > 0.3: continue
                    return cleaned
        return None
    finally:
        doc.close()

def extract_metadata_from_url(url: str) -> dict:
    metadata = {"title": None, "description": None}
    try:
        response = requests.get(url, timeout=(5, 10), headers={"User-Agent": "Mozilla/5.0"}, allow_redirects=True)
        response.raise_for_status()
        response.encoding = response.apparent_encoding
        content_type = response.headers.get("Content-Type", "").lower()
        if not content_type.startswith("text/html"):
            metadata["title"] = title_from_url(url)
            return metadata
        soup = BeautifulSoup(response.text, "html.parser")
        title_candidates = []
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"): title_candidates.append(clean_text(og_title["content"]))
        if soup.title and soup.title.string: title_candidates.append(clean_text(soup.title.string))
        h1 = soup.find("h1")
        if h1: title_candidates.append(clean_text(h1.get_text()))
        title_candidates.append(title_from_url(url))
        for candidate in title_candidates:
            if candidate and not is_bad_title(candidate):
                if " | " in candidate: candidate = candidate.split(" | ")[0].strip()
                if " - " in candidate: candidate = candidate.split(" - ")[0].strip()
                metadata["title"] = candidate
                break
        desc = None
        meta_desc = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
        if meta_desc and meta_desc.get("content"): desc = clean_text(meta_desc["content"])
        if not desc:
            og_desc = soup.find("meta", property="og:description")
            if og_desc and og_desc.get("content"): desc = clean_text(og_desc["content"])
        if not desc:
            twitter_desc = soup.find("meta", attrs={"name": re.compile(r"^twitter:description$", re.I)})
            if twitter_desc and twitter_desc.get("content"): desc = clean_text(twitter_desc["content"])
        first_para = extract_first_paragraph_html(soup)
        if desc and first_para: metadata["description"] = f"{desc} | {first_para}"
        elif desc: metadata["description"] = desc
        elif first_para: metadata["description"] = first_para
        return metadata
    except requests.RequestException:
        metadata["title"] = title_from_url(url)
        return metadata

def extract_metadata_from_pdf(file_path: str, url: str) -> dict:
    metadata = {"title": None, "description": None}
    try:
        doc = fitz.open(file_path)
        try:
            pdf_title = doc.metadata.get("title")
            cleaned_title = clean_text(pdf_title) if pdf_title else None
            if cleaned_title and not is_bad_title(cleaned_title): metadata["title"] = cleaned_title
            else: metadata["title"] = title_from_url(url)
        finally:
            doc.close()
        with open(file_path, "rb") as f: pdf_bytes = f.read()
        first_para = extract_first_paragraph_pdf(pdf_bytes)
        if first_para: metadata["description"] = first_para
        return metadata
    except Exception:
        metadata["title"] = title_from_url(url)
        return metadata


# ==============================================================================
# 5. THE MASTER PIPELINES (Safety First Rule Enforced)
# ==============================================================================

def process_url_pipeline(url: str) -> dict:
    """Predicts threat first. If safe, extracts metadata for tagging."""
    result = tag_and_trail_inference(url)
    
    # If the model finds it malicious, abort metadata extraction to save compute/safety
    if result["class"] in ["Malware", "Phishing"]:
        result["metadata_skipped"] = "Threat detected. Extraction aborted."
        return result
    
    # If safe, extract the data
    metadata = extract_metadata_from_url(url)
    result.update(metadata)
    
    # (Here is where you will eventually call your HF Tagging API with the metadata)
    
    return result

def process_media_pipeline(file_path: str, mime: str, original_url_or_name: str) -> dict:
    """Converts to PDF (if needed), predicts threat first. If safe, extracts metadata."""
    
    # Step 1: Conversion (The PDF model requires a PDF)
    if mime != "application/pdf":
        try:
            pdf_path = convert_to_pdf(file_path, mime)
        except Exception as e:
            return {"error": f"Conversion failed: {str(e)}"}
    else:
        pdf_path = file_path

    # Step 2: Machine Learning Prediction
    result = predict_pdf(pdf_path)
    
    # Step 3: Safety Check - Only extract if it's Safe
    if result["prediction"] == "Safe" and result["risk_level"] in ["SAFE", "LOW"]:
        metadata = extract_metadata_from_pdf(pdf_path, original_url_or_name)
        result.update(metadata)
    else:
        result["metadata_skipped"] = "Threat detected. Extraction aborted."

    # Clean up the converted PDF if we created a new one
    if pdf_path != file_path and os.path.exists(pdf_path):
        os.remove(pdf_path)

    return result