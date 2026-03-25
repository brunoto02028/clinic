# BPR Foot Scan Precision Pipeline — Migration Phase 1

## Goal
Introduce the new precision-pipeline schema without breaking the live foot-scan flow.

---

# Phase 1 scope
This phase is intentionally conservative.

## Add, do not replace
- add new enums
- add new pipeline tables
- add new workflow fields to `FootScan`
- keep legacy fields and legacy routes working

## Keep in place for compatibility
- `FootScan.status`
- `scanToken`
- `scanTokenExpiry`
- `leftFootImages`
- `rightFootImages`
- current `/api/foot-scans/session`
- current `/scan/[token]`
- current upload and analyze routes

---

# New schema added in phase 1
## New enums
- `FootScanWorkflowStatus`
- `FootScanCapturePathway`
- `FootScanCaptureIntent`
- `FootScanSessionMode`
- `FootScanSessionStatus`
- `FootScanCaptureSide`
- `FootScanCaptureView`
- `FootScanCaptureRole`
- `FootScanCaptureStatus`
- `FootScanCalibrationType`
- `FootScanCalibrationStatus`
- `FootScanMeasurementExtractionMethod`
- `FootScanMeasurementSetStatus`
- `FootScanAnalysisStatus`
- `FootScanReviewStatus`
- `FootScanLabStatus`

## New models
- `FootScanSession`
- `FootScanCapture`
- `FootScanCalibration`
- `FootScanMeasurementSet`
- `FootScanAnalysis`
- `FootScanReview`
- `FootScanManufacturingSpec`
- `FootScanEvent`

## New fields on `FootScan`
- `workflowStatus`
- `capturePathway`
- `captureIntent`
- `qaStatus`
- `clinicalStatus`
- `manufacturingStatus`
- `confidenceBand`
- `currentSessionId`
- `currentMeasurementSetId`
- `currentAnalysisId`
- `reviewedById`
- `reviewedAt`
- `approvedById`
- `approvedAt`
- `manufacturingReadyAt`

---

# Operational strategy
## Current app behavior
Current app should continue to work exactly as before.

## Transitional rule
Any future new code should start writing into the new tables **in parallel** while preserving legacy writes.

### Dual-write targets for next implementation slice
When a session is created:
- keep writing legacy `scanToken` on `FootScan`
- also create `FootScanSession`

When an image is uploaded:
- keep appending to legacy image arrays
- also create `FootScanCapture`

When analysis runs:
- keep writing summary fields to `FootScan`
- also create `FootScanMeasurementSet` and `FootScanAnalysis`

---

# Why this is the right first migration
This avoids breaking:
- admin scan page
- mobile capture page
- existing QA and analysis flow
- old reports

while opening the door to:
- per-image QA
- versioned sessions
- calibration tracking
- structured review
- structured manufacturing handoff

---

# Recommended next implementation slice after schema
1. update session creation endpoint to dual-write `FootScanSession`
2. update upload-local route to dual-write `FootScanCapture`
3. add a new progress view driven by the new tables
4. only then migrate analysis pipeline
