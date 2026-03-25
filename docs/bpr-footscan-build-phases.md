# BPR Foot Scan Precision System — Build Phases & Team Workstreams

## Objective
Turn the existing foot-scan feature into a clinic-grade insole workflow with:
- assisted capture as the primary mode
- remote capture as fallback
- quality gates
- clinical approval
- manufacturing-ready specification

---

# Workstream 1 — Product & Clinical Protocol
## Owner profile
Clinical product / operations

## Deliverables
- approved protocol list
- Insole Precision protocol definition
- complexity triage rules
- pass/fail rules
- report structure
- manufacturing handoff structure

## Tasks
1. define capture modes
2. define mandatory capture steps
3. define support/eligibility rules for remote capture
4. define recapture triggers
5. define approval rules before manufacturing

## Output files recommended
- `docs/footscan/protocols.md`
- `docs/footscan/qa-rules.md`
- `docs/footscan/report-spec.md`
- `docs/footscan/manufacturing-spec.md`

---

# Workstream 2 — Data Model & Backend
## Owner profile
Backend / architecture

## Deliverables
- schema changes
- migration plan
- new entities
- workflow state design
- report + prescription storage model

## Tasks
1. expand `FootScan`
2. add `FootScanCapture`
3. add `InsolePrescription`
4. implement workflowStage / qualityStage / manufacturingStage
5. add confidence and quality fields
6. define API contract per stage

## Proposed API surface
- `POST /api/admin/patients/[id]/foot-scans/create-session`
- `POST /api/foot-scans/[id]/captures`
- `PATCH /api/foot-scans/[id]/captures/[captureId]`
- `POST /api/foot-scans/[id]/qa/review`
- `POST /api/foot-scans/[id]/report/generate`
- `POST /api/foot-scans/[id]/prescription/generate`
- `POST /api/foot-scans/[id]/prescription/approve`
- `POST /api/foot-scans/[id]/request-recapture`

---

# Workstream 3 — Assisted Capture UX
## Owner profile
Frontend / UX

## Deliverables
- patient profile scan tab
- New Capture modal
- assisted capture workspace
- step progress visualization
- QA feedback UI

## Tasks
1. redesign scan start flow from patient profile
2. create guided capture workspace
3. show per-step instructions and overlays
4. show pass/warn/fail quality state
5. support retake and continue later

---

# Workstream 4 — Clinical Review & Reporting
## Owner profile
Clinical UX + backend

## Deliverables
- review queue
- scan review screen
- final report screen
- PDF export

## Tasks
1. build review summary by step
2. show session completeness and confidence
3. allow review notes and override reason
4. generate report JSON + printable report

---

# Workstream 5 — Manufacturing Specification
## Owner profile
Clinical + operations + product

## Deliverables
- prescription editor
- auto-suggested manufacturing parameters
- lab export document
- production status flow

## Tasks
1. define structured prescription fields
2. build editing UI
3. add approval gate
4. generate export-ready lab handoff

---

# Workstream 6 — QA / Reliability / Guardrails
## Owner profile
QA / operations

## Deliverables
- failure matrix
- recapture policy
- release checklist
- test scenarios

## Tasks
1. enumerate failure states
2. define minimum acceptable confidence
3. define complex-case block rules
4. define regression test plan

---

# Suggested execution order
## Phase 0 — Specification lock
- approve blueprint
- approve protocol
- approve state machine

## Phase 1 — Data foundation
- schema changes
- migration
- API contracts

## Phase 2 — Assisted capture flow
- patient profile entry point
- session creation
- capture-step model
- QA storage

## Phase 3 — Review flow
- clinical review page
- confidence score
- recapture workflow

## Phase 4 — Report + prescription
- report generation
- insole prescription UI
- manufacturing export

## Phase 5 — Remote fallback polish
- send-link flow
- remote patient guidance
- stricter QA thresholds

---

# Definition of done
The system is only “done” when all are true:

- a scan can be started from the patient record
- every required capture step is individually tracked
- low-quality steps are detectable
- a full session gets a confidence score
- a clinician can review and approve/reject
- a manufacturing specification can be generated and approved
- no manufacturing release happens from low-confidence or incomplete capture
