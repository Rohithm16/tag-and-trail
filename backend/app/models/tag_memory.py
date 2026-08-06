from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime

from app.database.base import Base


class TagMemory(Base):
    """Replaces MongoDB tag_memory collection — stores per-phrase frequency for IDF scoring."""

    __tablename__ = "tag_memory"

    phrase = Column(String, primary_key=True, nullable=False)
    frequency = Column(Integer, default=0, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
