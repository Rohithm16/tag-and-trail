"""
Document repository — all database CRUD for Document records.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document


def create(db: Session, **kwargs) -> Document:
    doc = Document(**kwargs)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_by_id(db: Session, doc_id: UUID, user_id: UUID) -> Optional[Document]:
    return (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == user_id)
        .first()
    )


def list_active(db: Session, user_id: UUID) -> List[Document]:
    return (
        db.query(Document)
        .filter(Document.user_id == user_id, Document.is_deleted == False)
        .order_by(Document.created_at.desc())
        .all()
    )


def list_trash(db: Session, user_id: UUID) -> List[Document]:
    return (
        db.query(Document)
        .filter(Document.user_id == user_id, Document.is_deleted == True)
        .order_by(Document.deleted_at.desc())
        .all()
    )


def soft_delete(db: Session, doc_id: UUID, user_id: UUID) -> Optional[Document]:
    doc = get_by_id(db, doc_id, user_id)
    if not doc:
        return None
    doc.is_deleted = True
    doc.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)
    return doc


def restore(db: Session, doc_id: UUID, user_id: UUID) -> Optional[Document]:
    doc = get_by_id(db, doc_id, user_id)
    if not doc:
        return None
    doc.is_deleted = False
    doc.deleted_at = None
    db.commit()
    db.refresh(doc)
    return doc


def hard_delete(db: Session, doc_id: UUID, user_id: UUID) -> bool:
    doc = get_by_id(db, doc_id, user_id)
    if not doc:
        return False
    db.delete(doc)
    db.commit()
    return True


def get_stats(db: Session, user_id: UUID) -> dict:
    all_docs = (
        db.query(Document)
        .filter(Document.user_id == user_id, Document.is_deleted == False)
        .all()
    )
    total = len(all_docs)
    links = sum(1 for d in all_docs if d.source_type == "link")
    pdfs = total - links
    malicious = sum(1 for d in all_docs if d.is_malicious)
    return {
        "total_indexed": total,
        "links": links,
        "documents": pdfs,
        "open_count": total - malicious,
        "private_count": 0,
        "malicious_count": malicious,
    }
