"""
Document service — orchestrates the full pipeline:
  upload/URL → security scan → metadata → tag generation → DB save
"""
import os
import shutil
import tempfile
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.engine.engine import generate_tags
from app.external.ml_integration import run_pdf_model, run_url_model
from app.processing.metadata import extract_metadata_from_pdf, extract_metadata_from_url
from app.repositories import document_repository
from app.core.url_safety import is_public_resource


MAX_FILE_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def process_url(url: str, user_id: UUID, db: Session) -> dict:
    """Run the full pipeline for a submitted URL."""

    # 1. Security scan
    ml_result = run_url_model(url)
    is_malicious = ml_result.get("is_malicious", False)

    # 2. Metadata extraction (always, even if malicious — good to know title)
    meta = extract_metadata_from_url(url)
    title = meta.get("title") or url
    description = meta.get("description") or ""

    # 3. Tag generation (only if safe)
    tags: list = []
    if not is_malicious and description:
        try:
            tags = generate_tags(title, description, db)
        except Exception as e:
            tags = []

    # 4. Persist
    doc = document_repository.create(
        db,
        user_id=user_id,
        source_type="link",
        source_url=url,
        title=title,
        description=description,
        tags=tags,
        is_malicious=is_malicious,
        prediction=ml_result.get("prediction"),
        risk_level=ml_result.get("risk_level"),
        malicious_probability=ml_result.get("malicious_probability"),
        vt_stats=ml_result.get("virustotal"),
        flags=[],
    )

    return _doc_to_dict(doc)


def process_pdf(file_bytes: bytes, filename: str, user_id: UUID, db: Session) -> dict:
    """Run the full pipeline for an uploaded PDF."""
    if len(file_bytes) > MAX_FILE_BYTES:
        raise ValueError(f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit")

    # Write to temp file for model processing
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp.write(file_bytes)
    tmp.flush()
    tmp.close()

    try:
        # 1. Security scan
        ml_result = run_pdf_model(tmp.name)
        is_malicious = ml_result.get("is_malicious", False)

        # 2. Metadata
        meta = extract_metadata_from_pdf(tmp.name, source_name=filename)
        title = meta.get("title") or os.path.splitext(filename)[0]
        description = meta.get("description") or ""

        # 3. Tag generation (safe only)
        tags: list = []
        if not is_malicious and description:
            try:
                tags = generate_tags(title, description, db)
            except Exception:
                tags = []

        # 4. Persist
        doc = document_repository.create(
            db,
            user_id=user_id,
            source_type="pdf",
            source_url=filename,
            title=title,
            description=description,
            tags=tags,
            is_malicious=is_malicious,
            prediction=ml_result.get("prediction"),
            risk_level=ml_result.get("risk_level"),
            malicious_probability=ml_result.get("malicious_probability"),
            vt_stats=ml_result.get("virustotal"),
            flags=ml_result.get("flags", []),
        )

        return _doc_to_dict(doc)

    finally:
        os.unlink(tmp.name)


def _doc_to_dict(doc) -> dict:
    return {
        "id": str(doc.id),
        "title": doc.title,
        "description": doc.description,
        "source_type": doc.source_type,
        "source_url": doc.source_url,
        "tags": doc.tags or [],
        "is_malicious": doc.is_malicious,
        "prediction": doc.prediction,
        "risk_level": doc.risk_level,
        "malicious_probability": doc.malicious_probability,
        "vt_stats": doc.vt_stats,
        "flags": doc.flags or [],
        "is_deleted": doc.is_deleted,
        "created_at": doc.created_at.isoformat(),
    }
