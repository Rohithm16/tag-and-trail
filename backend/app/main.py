from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.database.base import Base, engine

# ── Create tables on startup ──────────────────────────────────────────────────
# Import all models so Base knows about them
import app.models.user          # noqa: F401
import app.models.document      # noqa: F401
import app.models.tag_memory    # noqa: F401

Base.metadata.create_all(bind=engine)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Tag & Trail API",
    version="1.0.0",
    description="Security scanning + smart tag generation for PDFs and URLs.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.FRONTEND_ORIGIN.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(documents_router)


@app.get("/")
def root():
    return {"message": f"Welcome to {settings.APP_NAME}!"}