import React, { useEffect, useMemo, useState } from 'react'

const API = 'http://127.0.0.1:8000/api'
const initialForm = {
  concern_type: 'Suspected spoilage',
  target_type: 'local_vendor',
  business_or_brand: '',
  product_name: '',
  batch_number: '',
  location: '',
  observations: '',
  evidence_notes: '',
  actions_requested: 'official'
}
const labels = {
  pending_human_review: 'Pending human review',
  reviewed_by_human: 'Reviewed by human',
  ready_for_authority_routing: 'Ready for authority routing',
  assigned_to_authority: 'Assigned (demo)',
  inspection_consideration_recorded: 'Inspection consideration recorded (demo)',
  sample_collected_demo: 'Sample collected (demo)',
  lab_referral_recorded_demo: 'Lab referral recorded (demo)',
  awaiting_official_assessment: 'Awaiting official assessment (demo)',
  official_assessment_recorded_demo: 'Assessment recorded (demo)',
  not_requested: 'Not requested',
  vendor_contact_draft_ready: 'Vendor draft ready',
  draft_prepared_not_sent: 'Draft prepared — not sent',
  awaiting_human_review: 'Awaiting human review',
  information_requested: 'Information requested',
  closed_by_reviewer_with_reason: 'Closed with reason'
}
function statusLabel(value) { return labels[value] || (value || '—').replaceAll('_', ' ') }
function App() {
  const [view, setView] = useState('citizen')
  const [cases, setCases] = useState([])
  const [dashboard, setDashboard] = useState({total_cases:0,pending_human_review:0,human_reviewed:0,lab_workflow_started:0})
  const [form, setForm] = useState(initialForm)
  const [selected, setSelected] = useState('')
  const [decision, setDecision] = useState('route_for_official_review')
  const [reviewNotes, setReviewNotes] = useState('Reviewed the submitted information. This is a demo reviewer decision, not a legal finding.')
  const [authority, setAuthority] = useState('Demo food-safety authority')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const current = cases.find(c => c.case_number === selected) || cases[0]

  async function refresh() {
    try {
      const [c, d] = await Promise.all([fetch(`${API}/cases`), fetch(`${API}/dashboard`)])
      if (!c.ok || !d.ok) throw new Error('API unavailable')
      setCases(await c.json()); setDashboard(await d.json())
    } catch { setMessage('Backend not connected yet. Start FastAPI in the backend terminal, then refresh this page.') }
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => { if (!selected && cases.length) setSelected(cases[0].case_number) }, [cases, selected])

  async function request(path, body) {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(`${API}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? {'Content-Type':'application/json'} : undefined,
        body: body ? JSON.stringify(body) : undefined
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Request failed')
      setMessage('Saved successfully.'); await refresh()
      return data
    } catch (e) { setMessage(e.message || 'Could not reach the backend.'); return null }
    finally { setBusy(false) }
  }
  async function submit(e) {
    e.preventDefault()
    const result = await request('/cases', form)
    if (result) { setSelected(result.case_number); setForm(initialForm); setView('tracking'); setMessage(`Report created: ${result.case_number}. It is waiting for human review.`) }
  }
  async function review(e) {
    e.preventDefault()
    if (!current) return
    await request(`/cases/${current.case_number}/review`, {decision, notes:reviewNotes, reviewer_role:'demo_human_reviewer'})
  }
  async function workflow(action) {
    if (!current) return
    await request(`/cases/${current.case_number}/workflow`, {action, notes:'Hackathon demonstration only; no external action occurred.', authority})
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">FS</div><div><div className="brand-title">Food Safety <span>&</span> Quality Reporter</div><div className="brand-sub">Evidence-led reporting · Human-led decisions</div></div></div>
      <div className="demo-pill"><span className="dot"></span> HACKATHON DEMO</div>
    </header>
    <div className="notice"><strong>Demo safeguards:</strong> AI assistance does not determine legal severity or guilt. Human review is mandatory. Authority, inspection, lab, and vendor steps are simulated; nothing is sent externally.</div>
    <div className="layout">
      <aside className="sidebar">
        <div className="nav-label">WORKSPACE</div>
        {[
          ['citizen','＋','Submit a report'],['tracking','◷','Case tracking'],['review','✓','Human review'],['authority','⌁','Authority & lab'],['dashboard','▦','National overview']
        ].map(([id,icon,title])=><button key={id} className={`nav-item ${view===id?'active':''}`} onClick={()=>{setView(id);setMessage('')}}><span className="nav-icon">{icon}</span>{title}{id==='review'&&dashboard.pending_human_review>0&&<span className="nav-count">{dashboard.pending_human_review}</span>}</button>)}
        <div className="sidebar-bottom"><div className="mini-shield">✓</div><div><strong>Human oversight enabled</strong><p>Every case requires a human checkpoint.</p></div></div>
      </aside>
      <main className="main">
        <div className="page-heading"><div><div className="eyebrow">FOOD SAFETY INTELLIGENCE</div><h1>{({citizen:'Report a concern',tracking:'Case tracking',review:'Human review queue',authority:'Authority & lab workflow',dashboard:'National overview'})[view]}</h1><p>{({citizen:'Tell us what you observed. Your report will be reviewed by a human.',tracking:'Follow the separate vendor and official-authority routes.',review:'Review evidence and decide the next appropriate step.',authority:'Demonstration workflow for assigned cases and lab stages.',dashboard:'Aggregate operational metrics — not a public guilt ranking.'})[view]}</p></div><button className="btn btn-ghost" onClick={refresh}>↻ Refresh</button></div>
        {message && <div className={`toast ${message.toLowerCase().includes('error')||message.toLowerCase().includes('not connected')||message.toLowerCase().includes('failed')?'error':''}`}>{message}</div>}

        {view==='citizen' && <form className="panel form-panel" onSubmit={submit}>
          <div className="section-title"><span className="step-number">01</span><div><h2>What happened?</h2><p>Describe what you noticed, not what you cannot verify.</p></div></div>
          <div className="field-grid">
            <label>Concern category<select value={form.concern_type} onChange={e=>setForm({...form,concern_type:e.target.value})}>{['Suspected spoilage','Mold-like appearance','Foreign object','Unusual smell or taste','Packaging damage','Labelling concern','Suspected adulteration','Other quality concern'].map(x=><option key={x}>{x}</option>)}</select></label>
            <label>Who or what is this about?<select value={form.target_type} onChange={e=>setForm({...form,target_type:e.target.value})}><option value="local_vendor">Local vendor / food outlet</option><option value="packaged_brand">Packaged product / brand</option><option value="both">Both product and premises</option><option value="unsure">I'm not sure</option></select></label>
            <label className="span-2">Vendor, business, or brand name *<input required value={form.business_or_brand} onChange={e=>setForm({...form,business_or_brand:e.target.value})} placeholder="e.g. shop name or packaged food brand"/></label>
            {(form.target_type==='packaged_brand'||form.target_type==='both')&&<><label>Product name<input value={form.product_name} onChange={e=>setForm({...form,product_name:e.target.value})} placeholder="Name printed on package"/></label><label>Batch / lot number<input value={form.batch_number} onChange={e=>setForm({...form,batch_number:e.target.value})} placeholder="If available"/></label></>}
            {(form.target_type==='local_vendor'||form.target_type==='both'||form.target_type==='unsure')&&<label className="span-2">Location / address / landmark<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Address or nearby landmark"/></label>}
            <label className="span-2">What did you observe? *<textarea required minLength="3" rows="4" value={form.observations} onChange={e=>setForm({...form,observations:e.target.value})} placeholder="Describe appearance, smell, texture, taste if experienced, symptoms if relevant, and when it happened."/></label>
            <label className="span-2">Evidence notes (photo/receipt/packaging details)<textarea rows="2" value={form.evidence_notes} onChange={e=>setForm({...form,evidence_notes:e.target.value})} placeholder="MVP note: image upload is the next implementation increment. Do not include sensitive personal information."/></label>
          </div>
          <div className="section-title section-gap"><span className="step-number">02</span><div><h2>What would you like to do?</h2><p>Vendor contact and official review are separate routes.</p></div></div>
          <div className="choice-grid">{[['vendor','Contact the business','Prepare a factual draft for your review. It will not be sent automatically.'],['official','Request official review','Prepare the case for human review and possible routing to a competent authority.'],['both','Both routes','Track business contact and official review independently.']].map(([v,t,d])=><label key={v} className={`choice ${form.actions_requested===v?'chosen':''}`}><input type="radio" name="action" checked={form.actions_requested===v} onChange={()=>setForm({...form,actions_requested:v})}/><div><strong>{t}</strong><p>{d}</p></div></label>)}</div>
          <div className="form-footer"><span className="muted">Submitting creates a demo case and an AI-assisted summary.</span><button className="btn btn-primary" disabled={busy}>{busy?'Submitting…':'Submit report →'}</button></div>
        </form>}

        {view==='tracking'&&<div className="content-grid"><section className="panel"><div className="panel-heading"><h2>Your demo cases</h2><span className="count-badge">{cases.length}</span></div>{cases.length===0?<Empty text="No reports yet. Submit a report to create your first case."/>:<div className="case-list">{cases.map(c=><button key={c.case_number} onClick={()=>setSelected(c.case_number)} className={`case-row ${selected===c.case_number?'selected':''}`}><div className="case-row-top"><strong>{c.case_number}</strong><span className="status-pill">{statusLabel(c.review_status)}</span></div><div className="case-name">{c.business_or_brand}</div><div className="muted small">{c.concern_type} · {c.target_type.replaceAll('_',' ')}</div></button>)}</div>}</section><section className="panel">{current?<CaseDetail c={current}/>:<Empty text="Select a case to view details."/>}</section></div>}

        {view==='review'&&<div className="content-grid"><section className="panel"><div className="panel-heading"><h2>Awaiting human review</h2><span className="count-badge">{cases.filter(c=>c.review_status==='pending_human_review').length}</span></div>{cases.filter(c=>c.review_status==='pending_human_review').length===0?<Empty text="No cases are waiting for initial review."/>:<div className="case-list">{cases.filter(c=>c.review_status==='pending_human_review').map(c=><button key={c.case_number} className={`case-row ${selected===c.case_number?'selected':''}`} onClick={()=>setSelected(c.case_number)}><div className="case-row-top"><strong>{c.case_number}</strong><span className="status-pill warning">Review required</span></div><div className="case-name">{c.business_or_brand}</div><div className="muted small">{c.concern_type}</div></button>)}</div>}</section><section className="panel">{current&&current.review_status==='pending_human_review'?<><div className="panel-heading"><h2>Review case</h2><span className="status-pill warning">Human decision required</span></div><CaseDetail c={current}/><form onSubmit={review} className="review-form"><label>Reviewer decision<select value={decision} onChange={e=>setDecision(e.target.value)}><option value="route_for_official_review">Recommend official-authority review</option><option value="vendor_contact_only">Approve vendor-contact draft only</option><option value="both_routes">Approve both routes</option><option value="request_more_info">Request more information</option><option value="close_with_reason">Close with recorded reason</option></select></label><label>Reviewer rationale *<textarea required minLength="3" rows="3" value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)}/></label><div className="warning-box">This is a demo reviewer action. It is not a legal finding and does not order an inspection or establish guilt.</div><button className="btn btn-primary" disabled={busy}>Save human review</button></form></>:<Empty text="Select a case awaiting review from the left."/>}</section></div>}

        {view==='authority'&&<div className="content-grid"><section className="panel"><div className="panel-heading"><h2>Reviewed cases</h2><span className="count-badge">{cases.filter(c=>c.review_status==='reviewed_by_human').length}</span></div>{cases.filter(c=>c.review_status==='reviewed_by_human').length===0?<Empty text="Cases become available here only after human review."/>:<div className="case-list">{cases.filter(c=>c.review_status==='reviewed_by_human').map(c=><button key={c.case_number} className={`case-row ${selected===c.case_number?'selected':''}`} onClick={()=>setSelected(c.case_number)}><div className="case-row-top"><strong>{c.case_number}</strong><span className="status-pill">{statusLabel(c.official_status)}</span></div><div className="case-name">{c.business_or_brand}</div><div className="muted small">Lab: {statusLabel(c.lab_status)}</div></button>)}</div>}</section><section className="panel">{current&&current.review_status==='reviewed_by_human'?<><div className="panel-heading"><h2>Workflow controls</h2><span className="status-pill">Simulation only</span></div><CaseDetail c={current}/><label className="workflow-label">Assigned authority (demo label)<input value={authority} onChange={e=>setAuthority(e.target.value)}/></label><div className="workflow-buttons"><button className="btn btn-outline" onClick={()=>workflow('assign_authority')} disabled={busy}>1 · Assign authority</button><button className="btn btn-outline" onClick={()=>workflow('inspection_consideration')} disabled={busy}>2 · Record inspection consideration</button><button className="btn btn-outline" onClick={()=>workflow('sample_collected')} disabled={busy}>3 · Record sample collected</button><button className="btn btn-outline" onClick={()=>workflow('lab_referred')} disabled={busy}>4 · Record lab referral</button><button className="btn btn-outline" onClick={()=>workflow('lab_result_received')} disabled={busy}>5 · Record lab result received</button><button className="btn btn-primary" onClick={()=>workflow('official_assessment_complete')} disabled={busy}>6 · Record assessment complete</button><button className="btn btn-outline" onClick={()=>workflow('vendor_contact_prepared')} disabled={busy}>Prepare vendor draft (not sent)</button></div><p className="muted small">The backend enforces workflow order. These buttons only update demo records; no inspection, sampling, lab test, authority assignment, or email occurs.</p></>:<Empty text="Select a human-reviewed case to continue its simulated workflow."/>}</section></div>}

        {view==='dashboard'&&<><div className="metric-grid"><Metric title="Total cases" value={dashboard.total_cases} hint="All demo reports" icon="▤"/><Metric title="Pending human review" value={dashboard.pending_human_review} hint="Needs a reviewer" icon="◷" alert/><Metric title="Human reviewed" value={dashboard.human_reviewed} hint="Review checkpoint completed" icon="✓"/><Metric title="Lab workflow started" value={dashboard.lab_workflow_started} hint="Simulated lab stage" icon="⌁"/></div><div className="content-grid dashboard-lower"><section className="panel"><h2>Recent case activity</h2>{cases.length===0?<Empty text="Submit a report to populate the dashboard."/>:<div className="case-list">{cases.slice(0,6).map(c=><div className="activity-row" key={c.case_number}><div className="activity-icon">•</div><div><strong>{c.case_number} · {c.business_or_brand}</strong><p>{c.concern_type} — {statusLabel(c.review_status)}</p></div></div>)}</div>}</section><section className="panel"><h2>Governance & evidence status</h2><div className="governance-item"><span className="check">✓</span><div><strong>Human review gate</strong><p>Required before authority workflow actions.</p></div></div><div className="governance-item"><span className="check">✓</span><div><strong>Separate action routes</strong><p>Vendor draft and official route have independent statuses.</p></div></div><div className="governance-item"><span className="check">✓</span><div><strong>No automatic legal verdict</strong><p>AI suggestions are not guilt or legal severity decisions.</p></div></div><div className="governance-item"><span className="check">✓</span><div><strong>Simulation disclosed</strong><p>All official and laboratory stages are demo-only.</p></div></div><div className="warning-box">Complaint volume alone does not establish wrongdoing. This dashboard is for aggregate demo operations, not public accusations.</div></section></div></>}
        <footer className="footer">Food Safety & Quality Reporter · Hackathon MVP · Not an official government service</footer>
      </main>
    </div>
  </div>
}
function Metric({title,value,hint,icon,alert}){return <div className="metric-card"><div className="metric-top"><span>{title}</span><span className={`metric-icon ${alert?'alert':''}`}>{icon}</span></div><div className="metric-value">{value??0}</div><div className="metric-hint">{hint}</div></div>}
function Empty({text}){return <div className="empty-state"><div className="empty-icon">◇</div><p>{text}</p></div>}
function CaseDetail({c}){return <div className="case-detail"><div className="case-number">{c.case_number}</div><h3>{c.business_or_brand}</h3><p className="muted">{c.concern_type} · {c.target_type.replaceAll('_',' ')}</p><div className="detail-pairs"><div><span>Human review</span><strong>{statusLabel(c.review_status)}</strong></div><div><span>Official route</span><strong>{statusLabel(c.official_status)}</strong></div><div><span>Vendor route</span><strong>{statusLabel(c.vendor_status)}</strong></div><div><span>Lab workflow</span><strong>{statusLabel(c.lab_status)}</strong></div></div><div className="detail-block"><span className="detail-label">AI-assisted summary · not a finding</span><p>{c.ai_summary}</p></div><div className="detail-block"><span className="detail-label">Consumer observations</span><p>{c.observations}</p></div>{c.location&&<div className="detail-block"><span className="detail-label">Reported location</span><p>{c.location}</p></div>}{c.reviewer_notes&&<div className="detail-block"><span className="detail-label">Human reviewer rationale</span><p>{c.reviewer_notes}</p></div>}{c.assigned_authority&&<div className="detail-block"><span className="detail-label">Demo authority label</span><p>{c.assigned_authority}</p></div>}<div className="demo-note">Demo workflow only — no external submission or laboratory action.</div></div>}
export default App