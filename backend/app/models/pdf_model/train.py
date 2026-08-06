import pandas as pd
import joblib
import re
import numpy as np
import os
import sys
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score, f1_score
import warnings
warnings.filterwarnings('ignore')

# ------------------------------------------------------------
#  PATHS – now relative to the script's location
# ------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Possible locations for the dataset
CANDIDATE_PATHS = [
    os.path.join(SCRIPT_DIR, "data", "PDFMalware2022.csv"),       # next to script in a 'data' folder
    os.path.join(SCRIPT_DIR, "..", "data", "PDFMalware2022.csv") # in a 'data' folder one level up (backend/data)
]

DATA_PATH = None
for p in CANDIDATE_PATHS:
    if os.path.exists(p):
        DATA_PATH = p
        break

if DATA_PATH is None:
    print("❌ Could not find PDFMalware2022.csv in any expected location:")
    for p in CANDIDATE_PATHS:
        print(f"   {p}")
    print("\nPlease place the dataset in one of those folders or adjust CANDIDATE_PATHS in the script.")
    sys.exit(1)

print(f"✅ Using dataset at: {DATA_PATH}")

# Model will be saved right next to this script (so predict.py can load it)
MODEL_PATH = os.path.join(SCRIPT_DIR, "model.joblib")
METADATA_PATH = os.path.join(SCRIPT_DIR, "model_metadata.joblib")

# ------------------------------------------------------------
#  FEATURE COLUMNS (unchanged)
# ------------------------------------------------------------
FEATURE_COLUMNS = [
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

def clean_numeric(val):
    if pd.isna(val):
        return 0
    if isinstance(val, (int, float)):
        return float(val)
    
    val_str = str(val).strip()
    match = re.match(r"(\d+\.?\d*)", val_str)
    if match:
        return float(match.group(1))
    
    if '%' in val_str:
        num = re.findall(r"(\d+\.?\d*)", val_str)
        if num:
            return float(num[0]) / 100
    
    return 0.0

def evaluate_model(model, X_train, X_test, y_train, y_test, model_name, cv_scores=None):
    """Train model, evaluate on test set, return metrics dict."""
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    
    print(f"\n{'='*50}")
    print(f"{model_name} Performance:")
    print(f"{'='*50}")
    if cv_scores is not None:
        print(f"Cross-validation ROC-AUC (mean ± std): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(f"Test Accuracy: {accuracy:.4f}")
    print(f"Test F1-Score: {f1:.4f}")
    print(f"Test ROC-AUC: {auc:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Benign", "Malicious"], digits=4))
    
    return {
        'model': model,
        'name': model_name,
        'accuracy': accuracy,
        'f1': f1,
        'auc': auc,
        'cv_mean': cv_scores.mean() if cv_scores is not None else None,
        'cv_std': cv_scores.std() if cv_scores is not None else None
    }

def main():
    print("Loading data...")
    df = pd.read_csv(DATA_PATH)
    
    # Preprocess labels
    df["Class"] = df["Class"].astype(str).str.strip().str.capitalize()
    df["label"] = df["Class"].map({"Benign": 0, "Malicious": 1})
    df = df.dropna(subset=["label"])
    
    print(f"Dataset size: {len(df)}")
    print(f"Benign: {len(df[df['label']==0])}")
    print(f"Malicious: {len(df[df['label']==1])}")
    
    # Identify available features
    actual_features = []
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            df[col] = df[col].apply(clean_numeric)
            actual_features.append(col)
        else:
            possible_cols = [c for c in df.columns if col.lower() in c.lower()]
            if possible_cols:
                df[col] = df[possible_cols[0]].apply(clean_numeric)
                actual_features.append(col)
    
    if "entropy" not in actual_features and "metadata size" in df.columns:
        df["entropy"] = df["metadata size"].apply(clean_numeric)
        actual_features.append("entropy")
    
    print(f"\nUsing {len(actual_features)} features: {actual_features}")
    
    # Prepare feature matrix and labels
    X = df[actual_features].astype(float)
    y = df["label"].astype(int)
    
    # Handle inf/nan
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train/test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.3, stratify=y, random_state=42
    )
    
    print(f"\nTraining samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")
    
    # Define models to compare (ensemble focus)
    # Base models
    logistic = LogisticRegression(
        max_iter=2000,
        class_weight='balanced',
        solver='liblinear',
        random_state=42
    )
    
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    gb = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    
    svm = SVC(
        kernel='rbf',
        probability=True,          # needed for predict_proba
        class_weight='balanced',
        random_state=42
    )
    
    # Voting ensemble (soft voting) combining all above
    voting = VotingClassifier(
        estimators=[
            ('lr', logistic),
            ('rf', rf),
            ('gb', gb),
            ('svm', svm)
        ],
        voting='soft',
        weights=[1, 2, 2, 1]       # give more weight to tree-based models
    )
    
    models = {
        'Logistic Regression': logistic,
        'Random Forest': rf,
        'Gradient Boosting': gb,
        'SVM': svm,
        'Voting Ensemble': voting
    }
    
    # Cross-validation setup (5-fold stratified)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    results = []
    best_model_info = None
    best_auc = -1
    
    print("\n" + "="*60)
    print("Starting model comparison with cross-validation...")
    print("="*60)
    
    for name, model in models.items():
        print(f"\n--- Evaluating {name} ---")
        
        # Cross-validation on training set (ROC-AUC)
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, 
                                    scoring='roc_auc', n_jobs=-1)
        
        # Train on full training set and evaluate on test set
        metrics = evaluate_model(model, X_train, X_test, y_train, y_test, name, cv_scores)
        results.append(metrics)
        
        # Track best model based on test ROC-AUC
        if metrics['auc'] > best_auc:
            best_auc = metrics['auc']
            best_model_info = metrics
    
    # Print comparison summary
    print("\n" + "="*60)
    print("MODEL COMPARISON SUMMARY")
    print("="*60)
    summary_df = pd.DataFrame([
        {
            'Model': r['name'],
            'CV ROC-AUC': f"{r['cv_mean']:.4f} ± {r['cv_std']:.4f}",
            'Test Acc': f"{r['accuracy']:.4f}",
            'Test F1': f"{r['f1']:.4f}",
            'Test AUC': f"{r['auc']:.4f}"
        }
        for r in results
    ])
    print(summary_df.to_string(index=False))
    
    print(f"\n🏆 Best model: {best_model_info['name']} with Test ROC-AUC = {best_model_info['auc']:.4f}")
    
    # Save the best model, scaler, and feature list
    best_model = best_model_info['model']
    # Retrain best model on entire training set (already done in evaluate, but ensure it's fitted)
    best_model.fit(X_train, y_train)
    
    bundle = {
        "model": best_model,
        "features": actual_features,
        "scaler": scaler
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"\n✅ Best model saved to: {MODEL_PATH}")
    
    # Optionally save metadata
    metadata = {
        'best_model_name': best_model_info['name'],
        'test_accuracy': best_model_info['accuracy'],
        'test_f1': best_model_info['f1'],
        'test_auc': best_model_info['auc'],
        'cv_mean': best_model_info['cv_mean'],
        'cv_std': best_model_info['cv_std'],
        'all_results': results
    }
    joblib.dump(metadata, METADATA_PATH)
    print(f"📊 Model metadata saved to: {METADATA_PATH}")

if __name__ == "__main__":
    main()