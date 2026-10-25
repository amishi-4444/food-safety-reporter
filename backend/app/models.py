from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    case_number: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    concern_type: Mapped[str] = mapped_column(String(80))
    target_type: Mapped[str] = mapped_column(String(40))
    business_or_brand: Mapped[str] = mapped_column(String(200))
    product_name: Mapped[str] = mapped_column(String(200), default="")
    batch_number: Mapped[str] = mapped_column(String(100), default="")
    location: Mapped[str] = mapped_column(String(300), default="")
    observations: Mapped[str] = mapped_column(Text, default="")
    evidence_notes: Mapped[str] = mapped_column(Text, default="")
    actions_requested: Mapped[str] = mapped_column(String(80), default="official")
    ai_summary: Mapped[str] = mapped_column(Text, default="")
    ai_suggested_category: Mapped[str] = mapped_column(String(100), default="Needs human review")
    review_status: Mapped[str] = mapped_column(String(40), default="pending_human_review")
    reviewer_decision: Mapped[str] = mapped_column(String(80), default="")
    reviewer_notes: Mapped[str] = mapped_column(Text, default="")
    vendor_status: Mapped[str] = mapped_column(String(60), default="not_started")
    official_status: Mapped[str] = mapped_column(String(80), default="awaiting_human_review")
    lab_status: Mapped[str] = mapped_column(String(80), default="not_requested")
    assigned_authority: Mapped[str] = mapped_column(String(200), default="")
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    case_number: Mapped[str] = mapped_column(String(24), index=True)
    actor_role: Mapped[str] = mapped_column(String(60))
    action: Mapped[str] = mapped_column(String(120))
    details: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
