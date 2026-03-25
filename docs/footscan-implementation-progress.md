# BPR Foot Scan Precision Pipeline — Implementation Progress

## Completed in this slice
### Schema groundwork
- Added v2 foot-scan enums
- Added v2 pipeline models:
  - `FootScanSession`
  - `FootScanCapture`
  - `FootScanCalibration`
  - `FootScanMeasurementSet`
  - `FootScanAnalysis`
  - `FootScanReview`
  - `FootScanManufacturingSpec`
  - `FootScanEvent`
- Expanded `FootScan` with workflow-oriented fields while keeping legacy compatibility

### Dual-write: session creation
Updated `app/api/foot-scans/session/route.ts`
- when a legacy scan session is created:
  - still creates `FootScan` with legacy token flow
  - also creates `FootScanSession`
  - sets `workflowStatus = CAPTURE_PREPARED`
  - sets `capturePathway = REMOTE_FALLBACK`
  - sets `captureIntent = PRECISION`
  - stores `currentSessionId`
- when token is opened via GET:
  - updates session to `OPENED`
  - stamps session open timestamps
  - returns `workflowStatus` and `currentSessionId`

### Dual-write: image upload
Updated `app/api/foot-scans/[id]/upload-local/route.ts`
- legacy behavior preserved:
  - still writes image URL into `leftFootImages` / `rightFootImages`
  - still updates `status = SCANNING`
- new v2 behavior added:
  - sets `workflowStatus = CAPTURE_IN_PROGRESS`
  - creates a `FootScanCapture` row for each uploaded image
  - maps legacy angle names to canonical capture views
  - updates `FootScanSession` to `IN_PROGRESS`
  - creates a `FootScanEvent` entry for upload audit trail

### Dual-write: analysis
Updated `app/api/foot-scans/[id]/analyze/route.ts`
- legacy behavior preserved:
  - still reads legacy image arrays
  - still writes scalar metrics back to `FootScan`
  - still writes `biomechanicData` and `aiRecommendation`
  - still moves legacy status to `PENDING_REVIEW`
- new v2 behavior added:
  - sets `workflowStatus = MEASUREMENT_PROCESSING` during processing
  - creates `FootScanMeasurementSet`
  - creates `FootScanAnalysis`
  - stores `currentMeasurementSetId` and `currentAnalysisId`
  - promotes session to `SUBMITTED`
  - logs `ANALYSIS_COMPLETED` in `FootScanEvent`
  - sets `workflowStatus = CLINICAL_REVIEW_PENDING` on success

### Clinical review API
Created `app/api/foot-scans/[id]/review/route.ts`
- `POST` creates a `FootScanReview`
- validates authenticated staff and clinic access
- requires `currentMeasurementSetId`
- updates `FootScan` review metadata
- can optionally approve directly for production
- writes `FootScanEvent` for review completion / production approval
- `GET` returns review history for the foot scan

### Manufacturing spec API
Created `app/api/foot-scans/[id]/manufacturing-spec/route.ts`
- `GET` returns the latest manufacturing spec
- `POST` creates a versioned `FootScanManufacturingSpec`
- requires at least one clinical review before drafting spec
- can create draft or approved spec (`approve = true`)
- updates legacy `manufacturingReport` for compatibility
- updates `FootScan.manufacturingStatus`
- writes `FootScanEvent` for draft/approval actions

### Progress API upgraded to v2-aware
Updated `app/api/foot-scans/[id]/progress/route.ts`
- now reads v2 pipeline entities when available
- returns `workflowStatus`, `clinicalStatus`, `manufacturingStatus`
- returns session status, capture pathway and capture mode
- returns measurement / analysis / review / manufacturing spec status
- returns v2 capture list while keeping legacy image array fallback

---

## Not done yet
- migration generation / db apply
- assisted-capture-first UI
- production send/ack workflow
- review/manufacturing admin UI integration

---

## Recommended next slice
1. add progress endpoint backed by `FootScanCapture`
2. dual-write analysis output into `FootScanMeasurementSet` and `FootScanAnalysis`
3. begin clinical review model + endpoint
