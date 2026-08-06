import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database.base import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Content identity
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    source_type = Column(String, nullable=False)   # "pdf" | "link"
    source_url = Column(String, nullable=True)      # original URL or uploaded filename

    # ML results
    tags = Column(JSONB, default=list)              # list of tag strings
    is_malicious = Column(Boolean, default=False)
    prediction = Column(String, nullable=True)      # "Safe" | "Malicious" | class label
    risk_level = Column(String, nullable=True)      # "SAFE" | "LOW" | "MEDIUM" | "HIGH"
    malicious_probability = Column(Float, nullable=True)
    vt_stats = Column(JSONB, nullable=True)         # VirusTotal stats dict
    flags = Column(JSONB, default=list)             # PDF suspicious flags

    # Soft delete / trash
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
