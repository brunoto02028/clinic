# Foot Scan Clinical Review API

## Route
`POST /api/foot-scans/:id/review`

## Purpose
Create a clinician review record for the current measurement + analysis set and optionally approve the scan for production.

## Request body
```json
{
  "status": "VERIFIED",
  "clinicianFindings": {},
  "overriddenMeasurements": null,
  "overrideReason": null,
  "notes": "Clinical review notes",
  "approveForProduction": false
}
```

## Behavior
- requires authenticated staff user
- validates clinic access
- requires `currentMeasurementSetId`
- creates `FootScanReview`
- updates `FootScan` with review metadata
- logs `FootScanEvent`

## Approval behavior
If `approveForProduction = true`, then:
- review status becomes `APPROVED_FOR_PRODUCTION`
- `FootScan.workflowStatus = APPROVED_FOR_PRODUCTION`
- legacy `FootScan.status = APPROVED`
- `approvedById` / `approvedAt` / `manufacturingReadyAt` are set

## Listing reviews
`GET /api/foot-scans/:id/review`
- returns review history for the scan
