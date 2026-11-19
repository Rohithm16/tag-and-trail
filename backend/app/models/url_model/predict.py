"""Runtime scoring helpers for the trained LightGBM URL classifier."""
import sys
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

from .features import encode, extract_features

MODEL_FILE = Path(__file__).with_name("model.joblib")


@lru_cache(maxsize=1)
def _bundle() -> dict:
    """Load the model once per worker, independent of its working directory."""
    if not MODEL_FILE.is_file():
        raise FileNotFoundError(f"LightGBM URL model not found: {MODEL_FILE}")
    bundle = joblib.load(MODEL_FILE)
    required = {"model", "tld_categories", "threshold"}
    missing = required.difference(bundle)
    if missing:
        raise ValueError(f"Invalid LightGBM URL model bundle; missing: {sorted(missing)}")
    return bundle


def get_threshold() -> float:
    return float(_bundle()["threshold"])


def score_features(X) -> np.ndarray:
    """X is a raw feature frame (tld as a string), e.g. rows of features_cache.pkl."""
    b = _bundle()
    return b["model"].predict_proba(encode(X, b["tld_categories"]))[:, 1]


def score_urls(urls) -> np.ndarray:
    return score_features(extract_features(list(urls)))


def predict_urls(urls, threshold=None) -> np.ndarray:
    thr = get_threshold() if threshold is None else threshold
    return (score_urls(urls) >= thr).astype(int)


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print("usage: python predict.py URL [URL ...]")
        sys.exit(1)
    thr = get_threshold()
    for url, s in zip(args, score_urls(args)):
        print(f"{s:.3f}  {'MALICIOUS' if s >= thr else 'ok       '}  {url}")
