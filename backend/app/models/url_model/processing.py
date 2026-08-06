"""LSTM + CNN ensemble classifier for URL maliciousness detection."""
import json
import os

import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import tokenizer_from_json

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

_BASE = os.path.dirname(__file__)
# tokenizer.json lives one level up in app/models/
_TOKENIZER_PATH = os.path.join(_BASE, "..", "tokenizer.json")

with open(_TOKENIZER_PATH, "r") as f:
    tokenizer = tokenizer_from_json(json.load(f))

lstm_model = load_model(os.path.join(_BASE, "tag_and_trail_lstm_best.keras"))
cnn_model = load_model(os.path.join(_BASE, "tag_trail_url_cnn_model.keras"))

_CLASSES = ["Safe", "Defacement", "Malware", "Phishing"]
_MAX_LEN = 200


def tag_and_trail_inference(raw_url: str) -> dict:
    """Return ensemble classification for a raw URL string."""
    url = raw_url.lower().strip()
    sequences = tokenizer.texts_to_sequences([url])
    padded = pad_sequences(sequences, maxlen=_MAX_LEN, padding="post")

    lstm_preds = lstm_model.predict(padded, verbose=0)
    cnn_preds = cnn_model.predict(padded, verbose=0)
    final = (lstm_preds + cnn_preds) / 2

    predicted_idx = int(np.argmax(final))
    confidence = float(np.max(final))

    return {
        "url": raw_url,
        "class": _CLASSES[predicted_idx],
        "confidence": confidence,
        "raw_scores": final.tolist(),
    }