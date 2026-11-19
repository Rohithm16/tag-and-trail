from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories import document_repository
from app.schemas.document import DocumentOut, StatsOut
from app.services import document_service
from app.core.url_safety import normalize_url

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
        try:
            normalized_url = normalize_url(url)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        # CPU-bound pipeline (ML inference + NLP tagging) — must be offloaded
        # to a worker thread, otherwise it blocks the entire event loop and
        # every other request (dashboard list, trash, auth/me) stalls until
        # this finishes.
        result = await run_in_threadpool(
            document_service.process_url, normalized_url, current_user.id, db
        )
    else:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        contents = await file.read()
        result = await run_in_threadpool(
            document_service.process_pdf, contents, file.filename, current_user.id, db
        )

    return result


@router.post("/guest-scan", response_model=DocumentOut, status_code=201)
async def guest_scan(
    url: str = Form(...),
    db: Session = Depends(get_db),
):
    """Unauthenticated, ephemeral URL scan for guest mode.

    Runs the exact same security/tagging pipeline as a normal upload, but
    requires no login and never writes to the database — there's no user
    to attach a row to. The frontend keeps the result client-side only
    (guestDocs), which is why guest results disappear on refresh.

    NOTE: this endpoint has no auth and triggers real ML inference plus an
    external VirusTotal lookup on every call — worth adding rate limiting
    before this is exposed publicly, to avoid cost/abuse from anonymous
    traffic. Not implemented here since it's a separate concern from the
    bug being fixed, but flagging it so it doesn't get forgotten.
    """
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="Provide a URL")
    try:
        normalized_url = normalize_url(url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = await run_in_threadpool(
        document_service.process_url, normalized_url, None, db, False
    )
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


@router.get("/{doc_id}/file")
def get_file(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve a stored PDF for viewing or downloading.

    Only ever available for safe PDFs — malicious files are never written
    to disk (see document_service.process_pdf), so this 404s for them the
    same as if the file simply didn't exist. Uses inline disposition so a
    plain new-tab open renders the PDF instead of forcing a download; the
    frontend's explicit "Download" action sets its own filename via the
    HTML `download` attribute on the client side.
    """
    doc = document_repository.get_by_id(db, doc_id, current_user.id)
    if not doc or doc.source_type != "pdf" or not doc.file_path:
        raise HTTPException(status_code=404, detail="File not available")

    import os
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not available")

    safe_name = (doc.source_url or "document.pdf").replace('"', "")
    return FileResponse(
        doc.file_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
    )