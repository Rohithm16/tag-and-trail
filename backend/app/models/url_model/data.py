"""Load PhreshPhish URLs without downloading the HTML.

Parquet stores each column in its own chunks, so reading only url/label/date
fetches those byte ranges and skips the huge html column.
"""
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq
from huggingface_hub import HfFileSystem

REPO = "datasets/phreshphish/phreshphish"
CONVERT_REPO = "datasets/phreshphish/phreshphish@refs%2Fconvert%2Fparquet"
CACHE = Path("phreshphish_urls.parquet")
COLUMNS = ["url", "label", "date"]


def _find_files(fs):
    files = sorted(fs.glob(f"{REPO}/**/*.parquet"))
    if files:
        return files
    # Fallback to the auto-converted parquet branch
    return sorted(fs.glob(f"{CONVERT_REPO}/**/*.parquet"))


def _fetch():
    fs = HfFileSystem()
    files = _find_files(fs)
    if not files:
        raise RuntimeError(
            "No parquet files found for PhreshPhish. Check the repo name, your "
            "network, or run `huggingface-cli login` if the dataset is gated."
        )
    frames = []
    for path in files:
        split = "test" if "test" in path.lower() else "train"
        print(f"reading columns {COLUMNS} from {path}")
        with fs.open(path, "rb") as fh:
            table = pq.read_table(fh, columns=COLUMNS)
        part = table.to_pandas()
        part["split"] = split
        frames.append(part)
    return pd.concat(frames, ignore_index=True)


def load_phreshphish_urls(refresh=False):
    """Return a DataFrame with url, y (0 benign, 1 phish), date, split."""
    if CACHE.exists() and not refresh:
        return pd.read_parquet(CACHE)

    df = _fetch()
    df = df.dropna(subset=["url", "label"]).copy()
    df["url"] = df["url"].astype(str).str.strip()
    df = df[df["url"].str.len() > 3]
    df["y"] = (df["label"].str.lower() == "phish").astype("int8")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.drop(columns=["label"])

    # Drop exact duplicate URLs, preferring train rows so test stays clean
    df["_order"] = (df["split"] == "test").astype(int)
    df = df.sort_values("_order").drop_duplicates("url", keep="first").drop(columns="_order")
    df = df.sort_values(["split", "date"]).reset_index(drop=True)

    df.to_parquet(CACHE, index=False)
    return df


if __name__ == "__main__":
    d = load_phreshphish_urls(refresh=True)
    print(d.groupby(["split", "y"]).size())
    print(d.groupby("split")["date"].agg(["min", "max"]))