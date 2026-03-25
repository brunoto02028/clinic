# BPR Foot Scan Precision Pipeline — Schema Plan

## Goal
Refactor the current foot-scan data model from a single aggregate row into a precision pipeline with auditable child entities.

---

# 1. Existing model strategy
Keep `FootScan` as the top-level clinical case record.
Move operational data into child models.

---

# 2. Proposed enums
## Case workflow
- `CASE_CREATED`
- `CAPTURE_PREPARED`
- `CAPTURE_IN_PROGRESS`
- `CAPTURE_INCOMPLETE`
- `CAPTURE_SUBMITTED`
- `CALIBRATION_PENDING`
- `MEASUREMENT_PROCESSING`
- `MEASUREMENT_READY`
- `CLINICAL_REVIEW_PENDING`
- `CHANGES_REQUESTED`
- `APPROVED_FOR_PRODUCTION`
- `IN_PRODUCTION`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`

## Capture pathway
- `IN_CLINIC_ASSISTED`
- `REMOTE_FALLBACK`
- `HYBRID`

## Capture intent
- `PRECISION`
- `STANDARD`
- `QUICK_REVIEW`

## Session mode
- `SELF`
- `CLINICIAN_ASSISTED`

## Session status
- `CREATED`
- `OPENED`
- `IN_PROGRESS`
- `UPLOADING`
- `SUBMITTED`
- `INCOMPLETE`
- `ABANDONED`
- `EXPIRED`

## Capture side
- `LEFT`
- `RIGHT`
- `BILATERAL`
- `NONE`

## Capture view
- `PLANTAR_OUTLINE`
- `TRUE_PLANTAR`
- `MEDIAL`
- `LATERAL`
- `ANTERIOR`
- `POSTERIOR`
- `DORSAL`
- `SHOE_SOLE`

## Capture role
- `REQUIRED`
- `OPTIONAL`
- `FALLBACK`

## Capture asset status
- `UPLOADED`
- `ACCEPTED`
- `REJECTED`
- `SUPERSEDED`

## Calibration type
- `A4`
- `AR_MARKER`
- `CHECKERBOARD`
- `LIDAR_DEPTH`
- `MANUAL_REFERENCE`

## Calibration status
- `PENDING`
- `DETECTED`
- `VERIFIED`
- `FAILED`

## Measurement extraction method
- `RULE_BASED`
- `CV_MODEL`
- `AI_VISION`
- `HYBRID`
- `MANUAL`

## Measurement set status
- `DRAFT`
- `COMPUTED`
- `VERIFIED`
- `SUPERSEDED`

## Analysis status
- `PENDING`
- `RUNNING`
- `COMPLETE`
- `FAILED`

## Review status
- `PENDING`
- `IN_REVIEW`
- `VERIFIED`
- `CHANGES_REQUESTED`
- `APPROVED_FOR_PRODUCTION`

## Lab status
- `DRAFT`
- `READY`
- `SENT`
- `ACKNOWLEDGED`

---

# 3. Changes to FootScan
## Keep
- id
- scanNumber
- clinicId
- patientId
- orderId
- timestamps

## Add
- workflowStatus
- capturePathway
- captureIntent
- currentSessionId
- currentMeasurementSetId
- currentAnalysisId
- reviewedById
- reviewedAt
- approvedById
- approvedAt
- manufacturingReadyAt
- confidenceBand
- qaStatus
- clinicalStatus
- manufacturingStatus

## Keep selected summary fields for UI lists only
- archType
- pronation
- leftFootLength
- rightFootLength
- leftFootWidth
- rightFootWidth

---

# 4. New model: FootScanSession
Represents one capture attempt.

## Fields
- id
- footScanId
- mode
- pathway
- tokenHash
- tokenExpiresAt
- tokenConsumedAt
- startedAt
- submittedAt
- abandonedAt
- expiredAt
- deviceInfo Json
- browserInfo Json
- captureClientVersion
- capturePlanVersion
- expectedViews Json
- requiredViews Json
- sessionStatus
- createdById
- createdAt
- updatedAt

---

# 5. New model: FootScanCapture
Represents one uploaded/captured asset.

## Fields
- id
- footScanId
- footScanSessionId
- side
- view
- captureRole
- sequenceNo
- status
- storageUrl
- storagePath
- thumbnailUrl
- mimeType
- widthPx
- heightPx
- sizeBytes
- capturedAt
- uploadedAt
- deviceMetadata Json
- qualityScores Json
- calibrationMarkers Json
- segmentationMaskUrl
- rejectedReason
- supersededById
- approvedForAnalysis Boolean
- retakeCount Int

---

# 6. New model: FootScanCalibration
Formal calibration artifact.

## Fields
- id
- footScanId
- footScanSessionId
- type
- sourceCaptureId
- status
- mmPerPixel
- homography Json
- referenceDimensionsMm Json
- confidence Float
- validatedByClinician Boolean
- notes
- createdAt
- updatedAt

---

# 7. New model: FootScanMeasurementSet
Versioned extracted measurements.

## Fields
- id
- footScanId
- version
- sourceSessionId
- extractionMethod
- status
- leftMeasurements Json
- rightMeasurements Json
- bilateralComparison Json
- confidenceSummary Json
- provenance Json
- calibrationId
- createdAt
- updatedAt

---

# 8. New model: FootScanAnalysis
Versioned AI/computational interpretation.

## Fields
- id
- footScanId
- measurementSetId
- analysisType
- modelProvider
- modelName
- promptVersion
- inputSummary Json
- output Json
- confidence Json
- status
- errorText
- createdAt
- updatedAt

---

# 9. New model: FootScanReview
Clinician validation layer.

## Fields
- id
- footScanId
- measurementSetId
- analysisId
- reviewerId
- status
- clinicianFindings Json
- overriddenMeasurements Json
- overrideReason
- notes
- completedAt
- createdAt
- updatedAt

---

# 10. New model: FootScanManufacturingSpec
Structured manufacturing handoff.

## Fields
- id
- footScanId
- sourceMeasurementSetId
- sourceReviewId
- specVersion
- insoleType
- sizeSystem
- sizeValue
- shellGeometry Json
- heelCupDepth
- archSupport Json
- posting Json
- materials Json
- offloadingZones Json
- trimline
- shoeCompatibility
- productionNotes
- reliabilityNotes
- labStatus
- createdById
- approvedById
- approvedAt
- createdAt
- updatedAt

---

# 11. New model: FootScanEvent
Append-only event log.

## Fields
- id
- footScanId
- sessionId
- eventType
- actorType
- actorId
- payload Json
- createdAt

---

# 12. Migration strategy
## Phase 1
- add new enums and new tables
- keep current `FootScan` fields alive
- do not remove `leftFootImages` / `rightFootImages` yet

## Phase 2
- dual-write new captures into `FootScanCapture`
- keep arrays for backward compatibility in legacy screens

## Phase 3
- migrate admin/patient screens to read from new tables
- keep old aggregate fields only as denormalized summaries

## Phase 4
- deprecate direct image arrays once all UI and analysis pipelines are moved

---

# 13. Architectural rule
`FootScan` is the case.
`FootScanSession` is the attempt.
`FootScanCapture` is the evidence.
`FootScanCalibration` is the dimensional trust anchor.
`FootScanMeasurementSet` is the extracted geometry.
`FootScanAnalysis` is the interpretation.
`FootScanReview` is the clinician decision.
`FootScanManufacturingSpec` is the lab handoff.
`FootScanEvent` is the audit trail.
