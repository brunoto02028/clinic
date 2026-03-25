# BPR Foot Scan Precision Pipeline — Squad Backlog

## Squad 1 — Product / Clinical Protocol
### Deliverables
- final protocol approval
- recapture rules
- clinician review checklist
- manufacturing spec field list

### Tasks
1. approve protocol tiers
2. approve mandatory views for Manufacturing Grade
3. define remote eligibility rules
4. define confidence thresholds
5. define manufacturing release checklist

---

## Squad 2 — Backend / Data Architecture
### Deliverables
- Prisma schema migration plan
- new models and enums
- transitional compatibility strategy

### Tasks
1. add enums
2. add `FootScanSession`
3. add `FootScanCapture`
4. add `FootScanCalibration`
5. add `FootScanMeasurementSet`
6. add `FootScanAnalysis`
7. add `FootScanReview`
8. add `FootScanManufacturingSpec`
9. add `FootScanEvent`
10. keep dual-write compatibility with current `FootScan`

---

## Squad 3 — Capture Experience / Frontend
### Deliverables
- patient scan tab
- New Capture modal
- assisted capture workspace
- better remote capture flow

### Tasks
1. create patient profile entrypoint
2. build session start modal
3. build guided assisted capture screen
4. show per-view QA state
5. support recapture and resume
6. improve patient/mobile flow for remote fallback

---

## Squad 4 — QA / Workflow Engine
### Deliverables
- technical QA rules
- submission gate logic
- completeness scoring
- confidence scoring

### Tasks
1. implement per-capture quality scoring
2. implement view completeness evaluation
3. implement submission gate
4. implement reliability scoring
5. implement recapture triggers

---

## Squad 5 — Analysis / Interpretation
### Deliverables
- measurement extraction pipeline
- versioned analysis output
- provenance and confidence storage

### Tasks
1. decouple analysis from raw image arrays
2. read from accepted captures
3. create measurement sets
4. create versioned analysis records
5. surface confidence and limitations

---

## Squad 6 — Clinical Review / Reports
### Deliverables
- review UI
- patient report
- clinical report
- approval workflow

### Tasks
1. build clinician review screen
2. support overrides and notes
3. build patient report endpoint/UI
4. build clinical report endpoint/UI
5. block production if review not approved

---

## Squad 7 — Manufacturing / Lab Flow
### Deliverables
- manufacturing spec editor
- approval and lock flow
- lab handoff
- production tracking

### Tasks
1. create manufacturing spec model/UI
2. add approval + lock action
3. build lab export payload/view
4. track production states
5. add remake loop

---

# Recommended build order
## Wave 1
- final spec approval
- schema foundation
- session + capture tables

## Wave 2
- assisted capture UX
- QA engine
- progress API

## Wave 3
- measurements + analysis refactor
- clinician review flow

## Wave 4
- manufacturing spec + lab release
- reports + outcome loop

---

# Execution note
Do not try to rebuild everything in one merge.
Ship in controlled slices with migration compatibility preserved.
