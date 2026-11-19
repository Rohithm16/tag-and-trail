"""Train the LightGBM URL model on PhreshPhish (URL column only).

Run from the project folder:  python train.py
Needs data.py and features.py next to it.
"""
import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score, roc_curve
from sklearn.model_selection import GroupShuffleSplit

import data as data_mod
from data import load_phreshphish_urls
from features import FEATURES, encode, fit_tld_categories, get_features, registered_domain

MODEL_FILE = "model.joblib"
TARGET_FPR = 0.01   # threshold is chosen on validation so legit URLs are flagged ~1% of the time
SEED = 42


def load_data():
    """DataFrame with url, y (0 legit, 1 malicious), date, split, domain."""
    df = load_phreshphish_urls()
    if "domain" not in df.columns:
        print("computing registered domains ...")
        df["domain"] = [registered_domain(u) for u in df["url"]]
        df.to_parquet(data_mod.CACHE, index=False)
    return df


def tpr_at_fpr(y, s, target):
    fpr, tpr, _ = roc_curve(y, s)
    ok = fpr <= target
    return float(tpr[ok].max()) if ok.any() else 0.0


def pick_threshold(y, s, max_fpr):
    fpr, _, thr = roc_curve(y, s)
    t = float(thr[np.where(fpr <= max_fpr)[0][-1]])
    return t if np.isfinite(t) else 1.0


def report(name, y, s, thr):
    y, s = np.asarray(y), np.asarray(s)
    if len(y) == 0 or len(np.unique(y)) < 2:
        print(f"{name:<30} n={len(y):>7,}  (single class, skipped)")
        return
    pred = s >= thr
    tp = int((pred & (y == 1)).sum()); fn = int((~pred & (y == 1)).sum())
    fp = int((pred & (y == 0)).sum()); tn = int((~pred & (y == 0)).sum())
    print(
        f"{name:<30} n={len(y):>7,} AUC={roc_auc_score(y, s):.4f} AP={average_precision_score(y, s):.4f} "
        f"TPR@0.1%FPR={tpr_at_fpr(y, s, 0.001):.3f} TPR@1%FPR={tpr_at_fpr(y, s, 0.01):.3f} "
        f"TPR@5%FPR={tpr_at_fpr(y, s, 0.05):.3f} | thr={thr:.3f} "
        f"recall={tp / max(tp + fn, 1):.3f} FPR={fp / max(fp + tn, 1):.3f} precision={tp / max(tp + fp, 1):.3f}"
    )


def main():
    df = load_data()
    X = get_features(df)

    print("\nclass balance by split")
    print(df.groupby(["split", "y"]).size().unstack(fill_value=0))
    print(df.groupby("split")["date"].agg(["min", "max"]))

    is_test = (df["split"] == "test").values
    if is_test.sum() == 0:
        print("no test split found, falling back to the latest 20% by date as test")
        cutoff = df["date"].quantile(0.8)
        is_test = (df["date"] >= cutoff).values
    tr_idx = np.where(~is_test)[0]
    te_idx = np.where(is_test)[0]

    gss = GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=SEED)
    a, b = next(gss.split(tr_idx, groups=df["domain"].values[tr_idx]))
    fit_idx, val_idx = tr_idx[a], tr_idx[b]

    cats = fit_tld_categories(X["tld"].iloc[fit_idx])
    Xe = encode(X, cats)
    y = df["y"].values

    model = lgb.LGBMClassifier(
        objective="binary",
        n_estimators=3000,
        learning_rate=0.05,
        num_leaves=63,
        min_child_samples=50,
        subsample=0.8,
        subsample_freq=1,
        colsample_bytree=0.8,
        reg_lambda=1.0,
        n_jobs=-1,
        random_state=SEED,
        verbose=-1,
    )
    model.fit(
        Xe.iloc[fit_idx], y[fit_idx],
        eval_set=[(Xe.iloc[val_idx], y[val_idx])],
        eval_metric="auc",
        callbacks=[lgb.early_stopping(100, verbose=False), lgb.log_evaluation(0)],
    )
    print(f"\nbest iteration: {model.best_iteration_}")

    s_val = model.predict_proba(Xe.iloc[val_idx])[:, 1]
    thr = pick_threshold(y[val_idx], s_val, TARGET_FPR)
    print(f"threshold chosen on validation for FPR <= {TARGET_FPR:.1%}: {thr:.4f}\n")

    s_te = model.predict_proba(Xe.iloc[te_idx])[:, 1]
    te = df.iloc[te_idx].reset_index(drop=True)
    Xt = X.iloc[te_idx].reset_index(drop=True)
    bare = ((Xt["path_len"] <= 1) & (Xt["query_len"] == 0)).values
    seen_domains = set(df["domain"].values[tr_idx])
    unseen = ~te["domain"].isin(seen_domains).values

    report("validation (grouped)", y[val_idx], s_val, thr)
    report("test (all)", te["y"], s_te, thr)
    report("test (domains unseen in train)", te["y"][unseen], s_te[unseen], thr)
    report("test (bare domains only)", te["y"][bare], s_te[bare], thr)
    report("test (URLs with path/query)", te["y"][~bare], s_te[~bare], thr)

    gain = model.booster_.feature_importance(importance_type="gain")
    imp = pd.Series(gain / gain.sum(), index=model.booster_.feature_name()).sort_values(ascending=False)
    print("\ntop feature importance (share of gain)")
    print(imp.head(15).round(3).to_string())

    err = pd.DataFrame({"url": te["url"], "y": te["y"], "score": s_te})
    fp_rows = err[err["y"] == 0].sort_values("score", ascending=False).head(200).assign(kind="false_positive")
    fn_rows = err[err["y"] == 1].sort_values("score", ascending=True).head(200).assign(kind="false_negative")
    pd.concat([fp_rows, fn_rows]).to_csv("test_errors.csv", index=False)
    print("\nwrote test_errors.csv (top 200 legit flagged, then top 200 phishing missed)")

    joblib.dump(
        {"model": model, "tld_categories": cats, "threshold": float(thr),
         "features": FEATURES, "target_fpr": TARGET_FPR},
        MODEL_FILE,
    )
    print(f"saved {MODEL_FILE}")


if __name__ == "__main__":
    main()