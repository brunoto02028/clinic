# Foot Scan Manufacturing Spec API

## Route
`/api/foot-scans/:id/manufacturing-spec`

---

## GET
Fetch latest manufacturing spec for a foot scan.

---

## POST
Create a manufacturing spec draft or approved version.

### Requires
- authenticated staff user
- clinic access
- at least one `FootScanReview`

### Example body
```json
{
  "insoleType": "Medical",
  "sizeSystem": "EU",
  "sizeValue": "42",
  "shellGeometry": {},
  "heelCupDepth": "medium",
  "archSupport": {
    "left": "high",
    "right": "medium"
  },
  "posting": {},
  "materials": {},
  "offloadingZones": {},
  "trimline": "full-length",
  "shoeCompatibility": "trainer",
  "productionNotes": "Lab notes",
  "reliabilityNotes": "Confidence: HIGH",
  "approve": false
}
```

### Behavior
- creates a versioned `FootScanManufacturingSpec`
- links it to latest review
- updates `FootScan.manufacturingReport`
- updates `FootScan.productionNotes`
- updates `FootScan.insoleType` and `FootScan.insoleSize`
- logs `FootScanEvent`

### If `approve = true`
- spec `labStatus = READY`
- `approvedById` / `approvedAt` set
- `FootScan.manufacturingStatus = READY`
