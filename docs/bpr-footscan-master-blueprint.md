# BPR Foot Scan & Insole Precision System — Master Blueprint

## Vision
Build a **clinic-grade, precision-first, operationally reliable** foot-scan workflow inside the BPR system so the final output is not just a scan archive, but a **trusted clinical assessment + manufacturing-ready insole prescription**.

This blueprint assumes:
- primary workflow = **assisted capture inside the system**
- secondary workflow = **remote capture fallback**
- target outcome = **high-confidence final report + production specification**
- quality standard = **reject weak capture, never manufacture from low-confidence data**

---

# 1. North-star product outcome
The system must produce 5 things reliably:

1. **Standardized capture**
2. **Biomechanical interpretation**
3. **Clinical review workflow**
4. **Manufacturing-ready prescription**
5. **Audit trail and confidence score**

If any of these are weak, precision degrades.

---

# 2. Primary operating model
## 2.1 Assisted capture is the default
The clinic team opens the patient inside BPR and starts the scan workflow there.

### Why this should be the default
- higher adherence
- less patient confusion
- better angle control
- better quality control
- better repeatability
- lower false confidence
- better manufacturing accuracy

## 2.2 Remote capture is fallback only
Remote is useful, but should be treated as:
- convenience mode
- lower-confidence mode unless validated
- subject to stronger review and recapture rules

---

# 3. Product modules
The full system should be split into 6 logical modules.

## Module A — Intake & Clinical Context
Collect all non-image data that influences interpretation and prescription.

### Required fields
- patient identity
- phone
- date of birth
- weight
- height
- pain areas
- chief complaint
- diagnosis / working hypothesis
- activity level
- sport / use case
- footwear type
- occupation / standing load
- side dominance
- purpose of insole
- contraindications / special risks

## Module B — Capture Session
Controls the live workflow.

### Responsibilities
- choose protocol
- choose mode (assisted / remote)
- identify device
- identify operator
- guide step-by-step image capture
- enforce mandatory steps
- run image-quality validation
- store capture metadata per step

## Module C — Quality Assurance
Prevents low-grade capture from flowing into false-precision reporting.

### Responsibilities
- auto QA per image
- completeness checks
- staff QA review
- recapture workflow
- confidence scoring

## Module D — Biomechanical Interpretation
Converts capture into structured findings.

### Responsibilities
- measurements
- alignment interpretation
- risk and asymmetry interpretation
- gait / function notes where available
- findings summary

## Module E — Final Clinical Report
A clinician-facing and patient-facing structured report.

### Responsibilities
- summarize quality
- present measurements
- explain findings
- explain indication
- record approval

## Module F — Manufacturing Specification
A strict production-facing layer.

### Responsibilities
- translate findings into technical prescription
- require clinical approval
- generate printable/exportable lab handoff
- track production status

---

# 4. Capture modes
## 4.1 Assisted capture now
Used in clinic, with staff supervision.

### Flow
1. open patient profile
2. go to Foot Scan / Insoles
3. click New Capture
4. select protocol
5. select device and operator
6. start guided capture
7. pass QA
8. clinical review
9. final report
10. manufacturing handoff

## 4.2 Remote capture later
Used at home via link.

### Conditions
- only for eligible cases
- lower-confidence by default
- stricter recapture thresholds
- never auto-approve complex manufacturing cases

---

# 5. Protocol design
## 5.1 Protocol catalog
Create named protocols, not ad-hoc scanning.

### Protocols
- Basic Screening
- Clinical Standard
- **Insole Precision** (default for manufacturing)

## 5.2 Recommended default
For insole creation, default to:
## **Insole Precision Protocol**

### Mandatory static views
- left dorsal
- right dorsal
- left medial
- right medial
- left lateral
- right lateral
- left posterior
- right posterior
- left plantar
- right plantar

### Mandatory support conditions
- barefoot
- calibrated scale reference visible when required
- stable lighting
- defined stance
- neutral body position

### Optional functional additions
- bilateral standing alignment
- single-leg stance left
- single-leg stance right
- short gait clip
- squat / load variation

---

# 6. Image-quality and protocol-quality design
## 6.1 Per-image automatic checks
Every capture step should score:
- blur
- brightness
- framing
- contrast
- angle compliance
- foot visibility completeness
- reference marker visibility
- shadow severity

### Output for each image
- `PASS`
- `WARN`
- `FAIL`

## 6.2 Session-level checks
A session must also be checked for:
- mandatory steps complete
- left/right labeling coherence
- protocol completeness
- repeatability confidence
- measurement plausibility
- overall confidence score

## 6.3 Golden rule
If confidence is below threshold:
- no final report
- no manufacturing release
- force recapture or manual override with documented reason

---

# 7. Clinical states / state machine
Current repo has basic states. For a true clinical-manufacturing flow, use a richer state model.

## 7.1 Recommended workflow states
- `DRAFT`
- `READY_TO_CAPTURE`
- `CAPTURE_IN_PROGRESS`
- `CAPTURE_SUBMITTED`
- `AUTO_QA_REVIEW`
- `RECAPTURE_REQUIRED`
- `READY_FOR_CLINICAL_REVIEW`
- `CLINICAL_REVIEW_IN_PROGRESS`
- `CLINICALLY_APPROVED`
- `REPORT_FINALIZED`
- `MANUFACTURING_DRAFT`
- `MANUFACTURING_APPROVED`
- `SENT_TO_LAB`
- `IN_PRODUCTION`
- `COMPLETED`
- `CANCELLED`

## 7.2 Transitional mapping strategy
If enum replacement is too disruptive, keep existing `FootScanStatus` for now and add:
- `workflowStage`
- `qualityStage`
- `manufacturingStage`

This lets you evolve safely without breaking current pages.

---

# 8. Recommended data model changes
## 8.1 Keep `FootScan`, but strengthen it
Add fields such as:
- `protocolType`
- `captureMode`
- `workflowStage`
- `qualityStage`
- `manufacturingStage`
- `deviceType`
- `deviceOs`
- `deviceBrowser`
- `deviceModel`
- `operatorId`
- `captureStartedAt`
- `captureCompletedAt`
- `submittedAt`
- `qualityScore`
- `confidenceScore`
- `qualityFlagsJson`
- `clinicalSummaryJson`
- `finalReportJson`
- `manufacturingSpecJson`
- `clinicalApprovedAt`
- `clinicalApprovedById`
- `manufacturingApprovedAt`
- `manufacturingApprovedById`
- `recaptureRequestedAt`
- `recaptureReason`
- `isRemoteFallback`

## 8.2 Add a granular capture table
Create a dedicated capture-step entity.

### Suggested model: `FootScanCapture`
Fields:
- `id`
- `footScanId`
- `foot` (`left`, `right`, `bilateral`)
- `angleCode`
- `stepOrder`
- `protocolStepKey`
- `fileUrl`
- `filePath`
- `thumbnailUrl`
- `qualityScore`
- `qualityStatus`
- `qualityFlagsJson`
- `capturedAt`
- `capturedByMode`
- `deviceMetadataJson`
- `isRequired`
- `approvedForAnalysis`
- `retakeCount`

This is much better than only keeping image arrays.

## 8.3 Add manufacturing separation
Create a dedicated production entity.

### Suggested model: `InsolePrescription`
Fields:
- `id`
- `footScanId`
- `patientId`
- `clinicalObjective`
- `indicationSummary`
- `prescriptionType`
- `rigidity`
- `baseMaterial`
- `topCoverMaterial`
- `topCoverThickness`
- `rearfootPostingLeft`
- `rearfootPostingRight`
- `forefootPostingLeft`
- `forefootPostingRight`
- `archSupportLeft`
- `archSupportRight`
- `heelCupHeight`
- `metPad`
- `offloadingZonesJson`
- `firstRayAccommodation`
- `heelCushioning`
- `shoeCompatibility`
- `labInstructions`
- `approvedById`
- `approvedAt`
- `productionStatus`

---

# 9. Screen blueprint
## 9.1 Patient profile: Foot Scan / Insoles tab
### Show
- latest scan status
- quality score
- confidence score
- protocol used
- device used
- operator
- last report status
- manufacturing status
- scan history

### Actions
- New Capture
- Continue Capture
- Review Scan
- Request Recapture
- Generate Report
- Open Manufacturing Spec
- Duplicate Previous Prescription

## 9.2 New Capture modal
### Inputs
- mode: assisted / remote
- protocol
- operator
- device type
- intended objective
- complexity flags

### Smart rules
- if complexity high → warn or force assisted mode
- if remote selected → display lower-confidence policy

## 9.3 Assisted capture workspace
### Left column
- protocol checklist
- current step instructions
- angle description
- patient positioning rules

### Center
- live camera or capture preview
- alignment overlay
- reference marker visualization

### Right column
- progress
- live QA alerts
- step thumbnails
- pass/warn/fail badges

## 9.4 Clinical review screen
### Sections
- capture completeness
- per-image QA
- derived measurements
- asymmetry summary
- findings summary
- clinician notes
- approve / request recapture / manual override

## 9.5 Final report screen
### Sections
- patient and session metadata
- quality summary
- structural measurements
- alignment findings
- gait/functional findings if available
- clinical interpretation
- prescription rationale

## 9.6 Manufacturing spec screen
### Sections
- technical prescription fields
- auto-suggested values
- clinician overrides
- material selections
- export / print / lab handoff

---

# 10. Final report structure
## Section A — Session integrity
- protocol
- capture mode
- operator
- device
- date/time
- completeness
- quality score
- confidence score

## Section B — Structural measurements
- foot lengths
- widths
- arch height/index
- navicular estimate
- hallux alignment
- calcaneal alignment
- left/right comparison

## Section C — Functional/biomechanical interpretation
- pronation/supination tendency
- rearfoot control issues
- load distribution observations
- asymmetry and likely overload areas
- clinical significance

## Section D — Prescription recommendation
- indication
- insole goal
- design rationale
- special considerations

## Section E — Approval
- reviewer
- approval timestamp
- notes

---

# 11. Manufacturing handoff structure
The lab handoff should not be prose-heavy. It should be explicit.

## Required outputs
- patient
- scan reference
- prescription type
- shell/base type
- arch support left/right
- heel cup height
- rearfoot posting left/right
- forefoot posting left/right
- met pad details
- offloading zones
- cushioning zones
- material stack
- shoe-use target
- special instructions
- approval signature

## Rule
No manufacturing export without explicit approval.

---

# 12. Confidence and safety model
## 12.1 Confidence score inputs
- image quality average
- required-step completion
- repeatability/plausibility of measurements
- device quality tier
- capture mode
- manual QA approval outcome

## 12.2 Release rules
### High confidence
- can proceed to report and manufacturing review

### Medium confidence
- clinician review mandatory
- manufacturing blocked until sign-off

### Low confidence
- recapture mandatory
- no final prescription release

---

# 13. Remote fallback design
Keep this, but explicitly make it second-class in trust.

## Remote-specific rules
- mandatory device compatibility check
- mandatory Portuguese-first patient instructions
- stricter QA threshold
- mandatory staff review before analysis
- manual clinical sign-off always required for manufacturing

---

# 14. Suggested implementation phases
## Phase 1 — foundation
- define protocols
- add richer workflow fields to `FootScan`
- add `FootScanCapture`
- design assisted-capture-first UI flow
- add per-step QA storage

## Phase 2 — staff capture workflow
- patient profile scan tab
- New Capture modal
- assisted capture workspace
- progress and QA badges

## Phase 3 — review and reporting
- clinical review screen
- confidence scoring
- recapture workflow
- final report generation

## Phase 4 — manufacturing
- `InsolePrescription`
- technical prescription UI
- export/print lab handoff
- production tracking

## Phase 5 — remote refinement
- one-click send link
- patient messaging templates
- remote-specific QA and support

---

# 15. Immediate build recommendation
To move quickly without chaos, build in this order:

1. **master workflow spec approval**
2. **data model upgrades**
3. **patient profile + scan workspace UX**
4. **capture-step storage + QA**
5. **clinical review screen**
6. **report + manufacturing spec**
7. **remote flow polish**

---

# 16. Product truth
If BPR wants “precision surgical” output, the product must behave like a clinical instrument, not a casual upload tool.

That means:
- strict protocol
- mandatory QA
- approval gates
- explicit manufacturing translation
- strong auditability

This blueprint is designed around that standard.
