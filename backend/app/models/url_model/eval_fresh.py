"""Fresh-feed check. Recall on new OpenPhish URLs and false-positive rate on Tranco domains.

Caveat. The Tranco list only gives bare domains, so its FPR is measured on one
URL shape. Read it next to the 'bare domains only' line printed by train.py."""
import io
import zipfile

import numpy as np
import pandas as pd
import requests

from features import normalize
from predict import get_threshold, score_urls
from train import load_data

df = load_data()
seen = set(df["url"].map(lambda u: normalize(u).lower()))

feed = requests.get("https://openphish.com/feed.txt", timeout=30).text.split()
phish = [u for u in feed if normalize(u).lower() not in seen]
print(f"OpenPhish: {len(feed)} urls, {len(phish)} not in training data")

z = zipfile.ZipFile(io.BytesIO(requests.get("https://tranco-list.eu/top-1m.csv.zip", timeout=60).content))
tr = pd.read_csv(z.open("top-1m.csv"), names=["rank", "domain"], nrows=100_000)
benign = ["https://" + d for d in tr["domain"].sample(5000, random_state=42)]

p_ph, p_bn = score_urls(phish), score_urls(benign)
thr = get_threshold()

print(f"\n{'thr':>7} {'OpenPhish recall':>18} {'Tranco FPR (bare)':>19}")
for t in [thr, 0.3, 0.5, 0.7, 0.9]:
    print(f"{t:>7.3f} {np.mean(p_ph >= t):>18.3f} {np.mean(p_bn >= t):>19.3f}")
print("\nMedian score  OpenPhish =", round(float(np.median(p_ph)), 3), " Tranco =", round(float(np.median(p_bn)), 3))