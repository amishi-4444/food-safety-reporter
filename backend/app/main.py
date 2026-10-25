from datetime import datetime, timezone
from uuid import uuid4
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from .database import Base, engine, get_db
from .models import Case, AuditEvent
from .schemas import CaseCreate, ReviewDecision, WorkflowUpdate, CaseOut

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Food Safety & Quality Reporter API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

def audit(db: Session, case_number: str, role: str, action: str, details: str = ""):
    db.add(AuditEvent(case_number=case_number, actor_role=role, action=action, details=details))

def assistive_summary(data: CaseCreate) -> tuple[str, str]:
    # Deliberately transparent, deterministic placeholder. It is NOT a legal classifier.
    bits = [
        f"Reported concern: {data.concern_type}.",
        f"Reported target: {data.target_type.replace('_', ' ')} — {data.business_or_brand}.",
    ]
    if data.product_name:
        bits.append(f"Product: {data.product_name}.")
    if data.batch_number:
        bits.append(f"Batch/lot supplied: {data.batch_number}.")
    if data.location:
        bits.append(f"Reported location: {data.location}.")
    bits.append(f"Consumer observations: {data.observations}")
    missing = []
    if not data.evidence_notes.strip():
        missing.append("additional evidence details")
    if data.target_type in ("local_vendor", "both", "unsure") and not data.location.strip():
        missing.append("vendor location")
    if data.target_type in ("packaged_brand", "both") and not data.batch_number.strip():
        missing.append("batch/lot number if available")
    if missing:
        bits.append("Possible follow-up information to consider: " + ", ".join(missing) + ".")
    bits.append("This is an administrative summary of user-provided information, not a food-safety finding. Mandatory human review is required.")
    return " ".join(bits), "Human review required"

@app.get("/")
def root():
    return {"message": "Food Safety & Quality Reporter API", "demo": True, "government_integration": False}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/cases", response_model=CaseOut)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    summary, category = assistive_summary(payload)
    number = "FSR-" + datetime.now(timezone.utc).strftime("%y%m%d") + "-" + uuid4().hex[:6].upper()
    case = Case(
        case_number=number, concern_type=payload.concern_type,
        target_type=payload.target_type, business_or_brand=payload.business_or_brand,
        product_name=payload.product_name, batch_number=payload.batch_number,
        location=payload.location, observations=payload.observations,
        evidence_notes=payload.evidence_notes, actions_requested=payload.actions_requested,
        ai_summary=summary, ai_suggested_category=category,
        review_status="pending_human_review",
        official_status="awaiting_human_review" if payload.actions_requested in ("official", "both") else "not_requested",
        vendor_status="pending_human_review" if payload.actions_requested in ("vendor", "both") else "not_requested",
        lab_status="not_requested",
    )
    db.add(case)
    db.flush()
    audit(db, number, "system", "case_created", "AI-assisted summary generated; legal decision not made.")
    db.commit()
    db.refresh(case)
    return CaseOut.from_case(case)

@app.get("/api/cases", response_model=list[CaseOut])
def list_cases(db: Session = Depends(get_db)):
    cases = db.scalars(select(Case).order_by(Case.id.desc())).all()
    return [CaseOut.from_case(c) for c in cases]

@app.get("/api/cases/{case_number}", response_model=CaseOut)
def get_case(case_number: str, db: Session = Depends(get_db)):
    case = db.scalar(select(Case).where(Case.case_number == case_number))
    if not case:
        raise HTTPException(404, "Case not found")
    return CaseOut.from_case(case)

@app.post("/api/cases/{case_number}/review", response_model=CaseOut)
def review_case(case_number: str, payload: ReviewDecision, db: Session = Depends(get_db)):
    case = db.scalar(select(Case).where(Case.case_number == case_number))
    if not case:
        raise HTTPException(404, "Case not found")
    if case.review_status != "pending_human_review":
        raise HTTPException(409, "Case is not awaiting initial human review")
    case.reviewer_decision = payload.decision
    case.reviewer_notes = payload.notes
    case.review_status = "reviewed_by_human"
    if payload.decision == "request_more_info":
        case.official_status = "information_requested" if case.actions_requested in ("official", "both") else "not_requested"
        case.vendor_status = "information_requested" if case.actions_requested in ("vendor", "both") else "not_requested"
    elif payload.decision == "route_for_official_review":
        case.official_status = "ready_for_authority_routing"
        case.vendor_status = "not_requested"
    elif payload.decision == "vendor_contact_only":
        case.vendor_status = "vendor_contact_draft_ready"
        case.official_status = "not_requested"
    elif payload.decision == "both_routes":
        case.vendor_status = "vendor_contact_draft_ready"
        case.official_status = "ready_for_authority_routing"
    elif payload.decision == "close_with_reason":
        case.official_status = "closed_by_reviewer_with_reason"
        case.vendor_status = "closed_by_reviewer_with_reason"
    audit(db, case_number, payload.reviewer_role, "human_review_completed", f"{payload.decision}: {payload.notes}")
    db.commit()
    db.refresh(case)
    return CaseOut.from_case(case)

@app.post("/api/cases/{case_number}/workflow", response_model=CaseOut)
def update_workflow(case_number: str, payload: WorkflowUpdate, db: Session = Depends(get_db)):
    case = db.scalar(select(Case).where(Case.case_number == case_number))
    if not case:
        raise HTTPException(404, "Case not found")
    if case.review_status != "reviewed_by_human":
        raise HTTPException(409, "Human review must be completed before official workflow actions.")
    a = payload.action
    if a == "assign_authority":
        if case.official_status not in ("ready_for_authority_routing", "assigned_to_authority"):
            raise HTTPException(409, "Official route was not approved by the human reviewer.")
        case.assigned_authority = payload.authority or "Demo food-safety authority (not a real assignment)"
        case.official_status = "assigned_to_authority"
    elif a == "inspection_consideration":
        if case.official_status != "assigned_to_authority":
            raise HTTPException(409, "Assign the case before recording inspection consideration.")
        case.official_status = "inspection_consideration_recorded"
    elif a == "sample_collected":
        if case.official_status != "inspection_consideration_recorded":
            raise HTTPException(409, "Record inspection consideration first.")
        case.official_status = "sample_collected_demo"
    elif a == "lab_referred":
        if case.official_status != "sample_collected_demo":
            raise HTTPException(409, "Record sample collection before lab referral.")
        case.lab_status = "referred_demo"
        case.official_status = "lab_referral_recorded_demo"
    elif a == "lab_result_received":
        if case.lab_status != "referred_demo":
            raise HTTPException(409, "Record lab referral before a lab result.")
        case.lab_status = "result_received_demo"
        case.official_status = "awaiting_official_assessment"
    elif a == "official_assessment_complete":
        if case.official_status != "awaiting_official_assessment":
            raise HTTPException(409, "A demo lab result must be recorded before this step.")
        case.official_status = "official_assessment_recorded_demo"
    elif a == "vendor_contact_prepared":
        if case.vendor_status != "vendor_contact_draft_ready":
            raise HTTPException(409, "Human review must approve the vendor-contact route first.")
        case.vendor_status = "draft_prepared_not_sent"
    audit(db, case_number, "demo_authority_operator", a, payload.notes or "Demo workflow stage; no external action occurred.")
    db.commit()
    db.refresh(case)
    return CaseOut.from_case(case)

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Case.id))) or 0
    pending = db.scalar(select(func.count(Case.id)).where(Case.review_status == "pending_human_review")) or 0
    reviewed = db.scalar(select(func.count(Case.id)).where(Case.review_status == "reviewed_by_human")) or 0
    labs = db.scalar(select(func.count(Case.id)).where(Case.lab_status != "not_requested")) or 0
    return {
        "demo": True,
        "total_cases": total,
        "pending_human_review": pending,
        "human_reviewed": reviewed,
        "lab_workflow_started": labs,
        "note": "Aggregate demo counts only. Complaints are not findings of guilt."
    }

@app.get("/api/cases/{case_number}/audit")
def case_audit(case_number: str, db: Session = Depends(get_db)):
    events = db.scalars(select(AuditEvent).where(AuditEvent.case_number == case_number).order_by(AuditEvent.id.asc())).all()
    return [{"actor_role": e.actor_role, "action": e.action, "details": e.details, "created_at": e.created_at.isoformat()} for e in events]
