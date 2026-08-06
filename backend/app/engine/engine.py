"""Tag & Trail Categorisation Engine
NLP pipeline: POS tagging → SBERT scoring → MMR diversification.
Uses PostgreSQL (TagMemory table) instead of MongoDB for IDF memory.
"""
import math
import re
from collections import Counter
from datetime import datetime, timedelta
from typing import List

import numpy as np
import spacy
from sentence_transformers import SentenceTransformer, util
from sklearn.metrics.pairwise import cosine_similarity
from spellchecker import SpellChecker

spell = SpellChecker()

# ── NLP models (loaded once at import time) ────────────────────────────────────
nlp = spacy.load("en_core_web_sm", disable=["ner"])
embedder = SentenceTransformer("all-mpnet-base-v2")

# ── Constants ──────────────────────────────────────────────────────────────────
MIN_BLOCKLIST = {
    "introduction", "abstract", "summary", "conclusion", "discussion",
    "results", "method", "methods", "analysis", "evaluation", "experiment",
    "section", "chapter", "appendix", "figure", "table", "equation",
    "reference", "paper", "study", "article", "report", "overview",
    "background", "related", "work", "step", "procedure", "process",
    "read", "more", "cookie", "cookies", "newsletter", "subscribe",
    "password", "login", "policy", "privacy",
}

TECH_PATTERNS = [
    r"\b[A-Za-z0-9]+\.js\b",       # Node.js, React.js
    r"\b[A-Za-z]+[\+#]{1,2}\b",    # C++, C#
    r"(?i)(?<!\S)\.net\b",          # .NET
]


# ── PostgreSQL tag-memory helpers ──────────────────────────────────────────────

def prune_tag_memory(db, days_old: int = 30):
    """Delete stale tag entries so the engine forgets old habits."""
    from app.models.tag_memory import TagMemory
    cutoff = datetime.utcnow() - timedelta(days=days_old)
    db.query(TagMemory).filter(TagMemory.last_seen < cutoff).delete(synchronize_session=False)
    db.commit()


def get_df_counts(db, candidate_list: List[str]) -> dict:
    """Retrieve phrase frequencies from PostgreSQL."""
    from app.models.tag_memory import TagMemory
    if not candidate_list:
        return {}
    rows = db.query(TagMemory).filter(TagMemory.phrase.in_(candidate_list)).all()
    freq_map = {row.phrase: row.frequency for row in rows}
    return {phrase: freq_map.get(phrase, 0) for phrase in candidate_list}


def update_df_counts(db, winning_tags: List[str]):
    """Upsert frequency counts for the final selected tags."""
    from app.models.tag_memory import TagMemory
    now = datetime.utcnow()
    for tag in winning_tags:
        row = db.query(TagMemory).filter(TagMemory.phrase == tag).first()
        if row:
            row.frequency += 1
            row.last_seen = now
        else:
            db.add(TagMemory(phrase=tag, frequency=1, last_seen=now))
    db.commit()


# ── Text preparation ───────────────────────────────────────────────────────────

def dynamic_tech_shield(text: str):
    """Replace technical tokens (e.g. Node.js, C++) with placeholders so SpaCy doesn't split them."""
    tech_map: dict = {}
    counter = 0
    text = re.sub(r"\n\n+", ".\n\n", text)
    for pattern in TECH_PATTERNS:
        for match in set(re.findall(pattern, text)):
            placeholder = f"techtoken{counter}xyz"
            tech_map[placeholder] = match
            text = text.replace(match, placeholder)
            counter += 1
    return text, tech_map


def clean_and_truncate_chunk(chunk) -> str | None:
    """Clean a SpaCy noun chunk — remove stop words, determiners, bad tokens."""
    stop_pos = {"DET", "ADP", "CONJ", "CCONJ", "SCONJ", "PUNCT", "SPACE", "NUM"}
    words = [
        t.text.lower()
        for t in chunk
        if not t.is_stop
        and not t.is_punct
        and not t.is_space
        and t.pos_ not in stop_pos
        and len(t.text) > 1
    ]
    if not words:
        return None

    clean_words = []
    for w in words:
        safe = re.sub(r"[^a-z0-9]", "", w)
        if not safe or len(safe) < 2:
            continue
        if not re.search(r"[aeiouy]", safe) and len(safe) > 5:
            continue
        clean_words.append(safe)

    if len(clean_words) > 4 or not clean_words:
        return None
    if any(w in MIN_BLOCKLIST for w in clean_words):
        return None

    text = " ".join(clean_words)
    if text.isdigit() or (sum(c.isdigit() for c in text) / max(len(text), 1) > 0.5):
        return None
    return text


# ── Candidate pool ─────────────────────────────────────────────────────────────

def get_candidate_pool(raw_text: str) -> Counter:
    """Extract all valid noun-chunk n-grams from text."""
    text, tech_map = dynamic_tech_shield(raw_text)
    doc = nlp(text)
    candidate_counter: Counter = Counter()
    chunks_found = False

    for chunk in doc.noun_chunks:
        cleaned = clean_and_truncate_chunk(chunk)
        if not cleaned:
            continue
        chunks_found = True
        words = cleaned.split()
        for n in range(1, min(5, len(words) + 1)):
            for i in range(len(words) - n + 1):
                ngram = " ".join(words[i : i + n])
                if n == 1 and (len(ngram) < 3 or nlp(ngram)[0].pos_ in {"ADJ", "VERB"}):
                    continue
                if ngram not in MIN_BLOCKLIST:
                    candidate_counter[ngram] += 1

    if not chunks_found or len(text.split()) <= 5:
        for token in doc:
            if token.pos_ in {"NOUN", "PROPN"} and token.text.lower() not in MIN_BLOCKLIST:
                if not token.is_punct and not token.is_space:
                    candidate_counter[token.text.lower()] += 1

    # Spell-check filter
    final_pool: Counter = Counter()
    for phrase, count in candidate_counter.items():
        is_valid = True
        for word in phrase.split():
            if word in tech_map or word.isdigit():
                continue
            if not spell.known([word]):
                is_valid = False
                break
        if not is_valid:
            continue
        # Restore tech placeholders
        for placeholder, real in tech_map.items():
            phrase = phrase.replace(placeholder, real)
        final_pool[phrase] = count

    return final_pool


# ── Scoring ────────────────────────────────────────────────────────────────────

def score_candidates(candidate_pool: Counter, doc_text: str, title_text: str, df_counts: dict) -> list:
    candidates = list(candidate_pool.keys())
    if not candidates:
        return []

    doc_emb = embedder.encode(doc_text, convert_to_tensor=True)
    cand_embs = embedder.encode(candidates, convert_to_tensor=True)
    sim_scores = util.cos_sim(doc_emb, cand_embs)[0].cpu().numpy()
    title_lower = title_text.lower()

    scored = []
    for i, cand in enumerate(candidates):
        word_count = len(cand.split())
        year_penalty = 0.5 if re.search(r"\b(20\d{2})\b", cand) else 0.0
        phrase_bonus = 0.2 if word_count >= 2 else 0.0
        title_bonus = 0.10 if cand in title_lower else 0.0
        rareness_penalty = 0.1 * math.log10(df_counts.get(cand, 0) + 1)
        length_penalty = (word_count - 3) * 0.1 if word_count > 3 else 0.0

        final_score = sim_scores[i] + phrase_bonus + title_bonus - length_penalty - year_penalty - rareness_penalty
        scored.append({"phrase": cand, "score": float(final_score), "embedding": cand_embs[i]})

    return sorted(scored, key=lambda x: x["score"], reverse=True)


# ── MMR diversification ────────────────────────────────────────────────────────

def apply_mmr(scored_candidates: list, top_n: int = 4, diversity: float = 0.45) -> List[str]:
    if not scored_candidates:
        return []
    top = scored_candidates[:30]
    selected_tags: List[str] = []
    selected_embeddings: List[np.ndarray] = []

    first = top.pop(0)
    selected_tags.append(first["phrase"])
    selected_embeddings.append(first["embedding"].cpu().numpy())

    while len(selected_tags) < top_n and top:
        best_mmr, best_idx = -100.0, -1
        for i, cand in enumerate(top):
            phrase = cand["phrase"]
            if any(phrase in sel or sel in phrase for sel in selected_tags):
                continue
            emb = cand["embedding"].cpu().numpy().reshape(1, -1)
            max_sim = float(np.max(cosine_similarity(emb, selected_embeddings)))
            cand_words = set(phrase.split())
            overlap_penalty = 1.5 if any(
                len(cand_words & set(sel.split())) > 0 for sel in selected_tags
            ) else 0.0
            mmr_score = cand["score"] * (1 - diversity) - max_sim * diversity - overlap_penalty
            if mmr_score > best_mmr:
                best_mmr, best_idx = mmr_score, i

        if best_idx == -1:
            break
        winner = top.pop(best_idx)
        selected_tags.append(winner["phrase"])
        selected_embeddings.append(winner["embedding"].cpu().numpy())

    return selected_tags


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_tags(title: str, text: str, db) -> List[str]:
    """
    Main entry point: returns up to 4 diverse, semantically scored tags.
    Requires a live SQLAlchemy db session.
    """
    prune_tag_memory(db)

    combined = f"{title}. {text}"
    pool = get_candidate_pool(combined)
    df_counts = get_df_counts(db, list(pool.keys()))
    scored = score_candidates(pool, combined, title, df_counts)
    final_tags = apply_mmr(scored, top_n=4)
    update_df_counts(db, final_tags)

    return final_tags