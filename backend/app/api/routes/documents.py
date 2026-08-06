from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories import document_repository
from app.schemas.document import DocumentOut, StatsOut
from app.services import document_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload(
    url: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept either a URL or a PDF file upload and run the full pipeline."""
    if not url and not file:
        raise HTTPException(status_code=400, detail="Provide either a URL or a PDF file")
    if url and file:
        raise HTTPException(status_code=400, detail="Provide only one: URL or file")

    if url:
        result = document_service.process_url(url.strip(), current_user.id, db)
    else:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        contents = await file.read()
        result = document_service.process_pdf(contents, file.filename, current_user.id, db)

    return result


@router.get("/", response_model=List[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return document_repository.list_active(db, current_user.id)


@router.get("/stats", response_model=StatsOut)
def stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return document_repository.get_stats(db, current_user.id)


@router.get("/trash", response_model=List[DocumentOut])
def trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return document_repository.list_trash(db, current_user.id)


@router.delete("/{doc_id}")
def soft_delete(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = document_repository.soft_delete(db, doc_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Moved to trash"}


@router.post("/{doc_id}/restore", response_model=DocumentOut)
def restore(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = document_repository.restore(db, doc_id, current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{doc_id}/permanent")
def hard_delete(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = document_repository.hard_delete(db, doc_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Permanently deleted"}
