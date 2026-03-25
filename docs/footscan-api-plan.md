# BPR Foot Scan Precision Pipeline — API Plan

## Goal
Define the API surface for the precision foot-scan workflow.

---

# 1. Case APIs
## POST /api/foot-scans
Create a new foot-scan case.

### Input
- patientId
- capturePathway
- captureIntent
- linkedOrderId? 
- protocol? 

### Output
- footScan
- current workflow state

## GET /api/foot-scans
List cases with filters:
- patientId
- workflowStatus
- qaStatus
- clinicalStatus
- manufacturingStatus

## GET /api/foot-scans/:id
Return full case summary with:
- latest session
- capture completeness
- latest measurement set
- latest analysis
- latest review
- latest manufacturing spec

---

# 2. Session APIs
## POST /api/foot-scans/:id/sessions
Create a capture session.

### Input
- pathway
- mode
- capturePlanId
- tokenDelivery (`QR | LINK | NONE`)

### Output
- sessionId
- token
- scanUrl
- expectedViews
- requiredViews
- expiresAt

## GET /api/foot-scan-sessions/:token
Public bootstrap for mobile capture.

### Output
- session summary
- patient first name or initials
- clinic branding
- capture plan
- required views
- quality thresholds
- calibration requirement
- pathway and mode

## POST /api/foot-scan-sessions/:token/open
Marks session as opened.

## POST /api/foot-scan-sessions/:token/submit
Attempts to close the session.

### Server validation
- required views present
- calibration acceptable
- minimum quality met
- side labeling complete

### Output
- accepted true/false
- missingViews[]
- rejectedViews[]
- nextState

---

# 3. Capture APIs
## POST /api/foot-scan-sessions/:token/captures
Upload one capture.

### Input
- file
- side
- view
- sequenceNo
- clientMetadata

### Output
- captureId
- qualityScores
- acceptanceStatus
- rejectedReason?
- nextRecommendedView

## PATCH /api/foot-scans/:id/captures/:captureId
Manual review/update of a capture.

### Input
- status
- rejectedReason
- approvedForAnalysis
- notes

## GET /api/foot-scans/:id/captures
List all captures by session / side / view.

---

# 4. Calibration APIs
## POST /api/foot-scans/:id/calibration/validate
Validate calibration from source capture.

### Input
- sourceCaptureId
- type

### Output
- calibration status
- mmPerPixel
- confidence

## GET /api/foot-scans/:id/calibration
Return latest calibration artifact(s).

---

# 5. Measurement APIs
## POST /api/foot-scans/:id/process-measurements
Start measurement extraction.
Should be async job backed.

## GET /api/foot-scans/:id/measurements
Returns latest measurement set plus history metadata.

## GET /api/foot-scans/:id/measurements/:measurementSetId
Returns one version.

---

# 6. Analysis APIs
## POST /api/foot-scans/:id/analyze
Run analysis against latest verified measurement set.

## GET /api/foot-scans/:id/analyses
List analysis versions.

## GET /api/foot-scans/:id/analyses/:analysisId
Fetch one analysis version.

---

# 7. Review APIs
## POST /api/foot-scans/:id/review
Submit clinician review.

### Input
- measurementSetId
- analysisId
- status
- clinicianFindings
- overriddenMeasurements
- overrideReason
- notes
- approveForProduction boolean

## GET /api/foot-scans/:id/reviews
List review history.

---

# 8. Recapture APIs
## POST /api/foot-scans/:id/request-recapture
Create recapture request.

### Input
- scope (`SESSION | VIEWS | FULL`)
- views[]
- reason
- pathway
- mode

### Output
- new session
- new link/token if needed

---

# 9. Manufacturing APIs
## POST /api/foot-scans/:id/manufacturing-spec
Create or update manufacturing spec draft.

## POST /api/foot-scans/:id/manufacturing-spec/approve
Approve and lock spec for lab release.

## GET /api/foot-scans/:id/manufacturing-spec
Fetch latest spec.

## POST /api/foot-scans/:id/manufacturing-spec/send
Mark spec as sent to lab.

---

# 10. Reporting APIs
## GET /api/foot-scans/:id/report/patient
Simple patient report.

## GET /api/foot-scans/:id/report/clinical
Detailed clinical report.

## GET /api/foot-scans/:id/report/manufacturing
Production pack.

---

# 11. Progress / dashboard APIs
## GET /api/foot-scans/:id/progress
Should return:
- case workflow status
- latest session status
- completeness
- accepted/rejected captures by view
- calibration status
- measurement status
- review status
- manufacturing status

## GET /api/admin/foot-scans/queue
Operational queue with filters:
- waiting for capture
- QA failed
- review pending
- ready for production
- in production
- remake required

---

# 12. Compatibility rule
For migration safety:
- keep current legacy routes working initially
- implement new routes in parallel
- transition UI incrementally
