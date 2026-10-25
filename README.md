# Food Safety & Quality Reporter — MVP Starter

A hackathon demo built with React + Vite, FastAPI, and SQLite.

## What this starter includes
- Citizen report form (local vendor or packaged brand)
- AI-assistance placeholder that creates a non-legal summary and evidence checklist
- Mandatory human-review queue
- Separate vendor-contact and official-authority routes
- Case status tracking
- Simulated inspection/sample/laboratory workflow
- National overview dashboard with aggregate demo counts
- Audit events for important workflow actions

## Important demo boundaries
- AI output is assistive only. It does not determine legal severity, guilt, or enforcement.
- Human review is required before an official route can progress.
- Lab/inspection statuses are simulated. The app does not contact government authorities, vendors, or laboratories.
- The demo role selector is NOT authentication. Do not deploy with real personal data.

## Prerequisites
- Node.js 20+ (18+ may work with a recent Vite version)
- Python 3.10+
- A terminal (PowerShell on Windows is fine)

## 1. Start the backend
Open a terminal in this folder:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

Windows PowerShell:
```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:
```bash
source .venv/bin/activate
```

Install dependencies and run:
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## 2. Start the frontend
Open a SECOND terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## Demo workflow
1. Choose **Citizen** and submit a sample report.
2. Switch to **Human review** and open the new case.
3. Record a review decision. This is the mandatory gate before official handling.
4. Switch to **Authority & lab** to simulate assignment, inspection consideration, sample collection, lab referral, and result.
5. Open **National overview** to see aggregate case counts.

## Suggested next increments
1. Add real authentication and role-based authorization.
2. Add validated image upload and secure evidence storage.
3. Replace AI placeholder with a model/API behind a safe service boundary.
4. Configure jurisdiction routing with verified official data.
5. Add notifications and authorized government integrations only after permission.
