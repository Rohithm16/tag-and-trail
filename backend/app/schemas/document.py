from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: UUID
    title: Optional[str]
    description: Optional[str]
    source_type: str          # "pdf" | "link"
    source_url: Optional[str]
    tags: List[str]
    is_malicious: bool
    prediction: Optional[str]
    risk_level: Optional[str]
    malicious_probability: Optional[float]
    vt_stats: Optional[Any]
    flags: List[str]
    is_deleted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StatsOut(BaseModel):
    total_indexed: int
    links: int
    documents: int
    open_count: int
    private_count: int
    malicious_count: int
