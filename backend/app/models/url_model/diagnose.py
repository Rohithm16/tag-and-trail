import io
import zipfile

import numpy as np
import pandas as pd
import requests

from features import get_features, normalize
from predict import get_threshold, score_features, score_urls
from train import load_data, report

df = load_data()
X = get_features(df).copy()                          # same row order as df
X["y"] = df["y"].values
X["split"] = df["split"].values
raw = df["url"]
X["has_scheme"] = raw.str.contains(r"^[a-z][a-z0-9+.\-]*://", case=False, regex=True).values
X["has_www"] = raw.str.contains(r"^(?:[a-z]+://)?www\d*\.", case=False, regex=True).values
X["https"] = raw.str.lower().str.startswith("https").values
X["bare"] = ((X["path_len"] <= 1) & (X["query_len"] == 0)).values   # no path or query
X["has_query"] = (X["query_len"] > 0).values
X["has_subdomain"] = (X["subdomain_count"] > 0).values

print("=== Split sizes and dates ===")
print(df.groupby(["split", "y"]).size().unstack(fill_value=0))
print(df.groupby("split")["date"].agg(["min", "max"]))

print("\n=== Class profile in training data (y: 0 = legit, 1 = malicious) ===")
print(X.groupby("y").agg(
    url_len_median=("url_len", "median"),
    path_len_median=("path_len", "median"),
    bare_domain_frac=("bare", "mean"),
    has_query_frac=("has_query", "mean"),
    scheme_present_frac=("has_scheme", "mean"),
    www_frac=("has_www", "mean"),
    https_frac=("https", "mean"),
    subdomain_frac=("has_subdomain", "mean"),
).round(3))

for y, name in [(0, "legit"), (1, "malicious")]:
    print(f"\nTop TLDs, {name}:")
    print(X[X["y"] == y]["tld"].value_counts(normalize=True).head(8).round(3))

thr = get_threshold()
print(f"\n=== Test set by URL shape (saved threshold {thr:.3f}) ===")
te = (X["split"] == "test").values
if te.sum() == 0:
    te = np.zeros(len(X), dtype=bool)
    te[int(len(X) * 0.8):] = True
Xt = X[te]
s = score_features(Xt)
report("test (all)", Xt["y"], s, thr)
report("test (bare domains only)", Xt["y"][Xt["bare"]], s[Xt["bare"].values], thr)
report("test (with path/query)", Xt["y"][~Xt["bare"]], s[~Xt["bare"].values], thr)

print("\n=== Fresh feeds at different thresholds ===")
seen = set(raw.map(lambda u: normalize(u).lower()))
feed = requests.get("https://openphish.com/feed.txt", timeout=30).text.split()
phish = [u for u in feed if normalize(u).lower() not in seen]
z = zipfile.ZipFile(io.BytesIO(requests.get("https://tranco-list.eu/top-1m.csv.zip", timeout=60).content))
tr = pd.read_csv(z.open("top-1m.csv"), names=["rank", "domain"], nrows=100_000)
benign = ["https://" + d for d in tr["domain"].sample(5000, random_state=42)]
p_ph, p_bn = score_urls(phish), score_urls(benign)

ph_bare = np.array([(len(normalize(u).partition("/")[2]) == 0) for u in phish])
print(f"OpenPhish urls not in training data: {len(phish)} (bare {ph_bare.mean():.1%})")
print(f"\n{'thr':>7} {'OpenPhish recall':>18} {'recall bare':>12} {'recall path':>12} {'Tranco FPR (bare)':>19}")
for t in [thr, 0.3, 0.5, 0.7, 0.9]:
    rb = np.mean(p_ph[ph_bare] >= t) if ph_bare.any() else float("nan")
    rp = np.mean(p_ph[~ph_bare] >= t) if (~ph_bare).any() else float("nan")
    print(f"{t:>7.3f} {np.mean(p_ph >= t):>18.3f} {rb:>12.3f} {rp:>12.3f} {np.mean(p_bn >= t):>19.3f}")

print("\nMedian score: OpenPhish =", round(float(np.median(p_ph)), 3), " Tranco =", round(float(np.median(p_bn)), 3))