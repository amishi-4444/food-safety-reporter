from pydantic import BaseModel, Field
from typing import Literal

class CaseCreate(BaseModel):
    concern_type: str = Field(min_length=2, max_length=80)
    target_type: Literal["local_vendor", "packaged_brand", "both", "unsure"]
    business_or_brand: str = Field(min_length=1, max_length=200)
    product_name: str = Field(default="", max_length=200)
    batch_number: str = Field(default="", max_length=100)
    location: str = Field(default="", max_length=300)
    observations: str = Field(min_length=3, max_length=4000)
    evidence_notes: str = Field(default="", max_length=2000)
    actions_requested: Literal["vendor", "official", "both"] = "official"

class ReviewDecision(BaseModel):
    decision: Literal["request_more_info", "route_for_official_review", "vendor_contact_only", "both_routes", "close_with_reason"]
    notes: str = Field(min_length=3, max_length=2000)
    reviewer_role: str = "human_reviewer"

class WorkflowUpdate(BaseModel):
    action: Literal["assign_authority", "inspection_consideration", "sample_collected", "lab_referred", "lab_result_received", "official_assessment_complete", "vendor_contact_prepared"]
    notes: str = Field(default="", max_length=2000)
    authority: str = Field(default="", max_length=200)

class CaseOut(BaseModel):
    id: int
    case_number: str
    created_at: str
    concern_type: str
    target_type: str
    business_or_brand: str
    product_name: str
    batch_number: str
    location: str
    observations: str
    evidence_notes: str
    actions_requested: str
    ai_summary: str
    ai_suggested_category: str
    review_status: str
    reviewer_decision: str
    reviewer_notes: str
    vendor_status: str
    official_status: str
    lab_status: str
    assigned_authority: str
    last_updated: str

    @classmethod
    def from_case(cls, c):
        return cls(
            id=c.id, case_number=c.case_number,
            created_at=c.created_at.isoformat() if c.created_at else "",
            concern_type=c.concern_type, target_type=c.target_type,
            business_or_brand=c.business_or_brand, product_name=c.product_name,
            batch_number=c.batch_number, location=c.location,
            observations=c.observations, evidence_notes=c.evidence_notes,
            actions_requested=c.actions_requested, ai_summary=c.ai_summary,
            ai_suggested_category=c.ai_suggested_category,
            review_status=c.review_status, reviewer_decision=c.reviewer_decision,
            reviewer_notes=c.reviewer_notes, vendor_status=c.vendor_status,
            official_status=c.official_status, lab_status=c.lab_status,
            assigned_authority=c.assigned_authority,
            last_updated=c.last_updated.isoformat() if c.last_updated else ""
        )
