# BPR Foot Scan Precision Pipeline — Final Functional Specification

## Document status
- Status: Draft for execution
- Product direction: approved
- Primary pathway: in-clinic assisted capture
- Secondary pathway: remote fallback capture
- Goal: clinical-grade report + manufacturing-ready insole specification

---

# 1. Product mission
Build a precision-first foot scan system inside BPR that transforms guided smartphone capture into:

1. validated clinical evidence
2. reliable biomechanical interpretation
3. clinician-approved prescription
4. manufacturing-ready insole specification
5. traceable delivery and outcome workflow

This system must behave like a **clinical instrument workflow**, not just a photo uploader.

---

# 2. Product principles
1. **Assisted capture first**
   - in-clinic assisted flow is the default for precision cases
2. **Remote fallback allowed, not trusted by default**
   - remote capture must be explicitly modeled as lower-confidence unless it passes strict QA
3. **No fake precision**
   - if calibration, completeness, or quality are weak, the system must downgrade confidence or block manufacturing
4. **AI is advisory, clinician is final authority**
5. **Manufacturing must consume structured prescription data, not loose narrative only**
6. **Every critical action must be auditable**

---

# 3. Users and roles
## 3.1 Roles
- Patient
- Reception / admin staff
- Scan assistant / technician
- Clinician / prescriber
- Manufacturing / lab operator
- System automation / AI services

## 3.2 Key responsibilities
### Patient
- follows preparation instructions
- completes capture if remote
- attends fitting / confirms outcome

### Staff / technician
- starts sessions
- guides assisted capture
- checks readiness and completeness

### Clinician
- validates findings
- overrides AI where needed
- finalizes orthotic prescription
- approves for manufacturing

### Manufacturing / lab
- receives structured spec
- produces device
- reports completion or exception

---

# 4. Pathways
## 4.1 Primary pathway: in-clinic assisted capture
This is the standard workflow for high-precision and manufacturing-grade use.

### Use when
- custom orthotic / bespoke insole production
- complex biomechanics
- deformity
- history of failed remote capture
- high clinical or commercial importance

## 4.2 Secondary pathway: remote fallback
This is allowed only when clinically acceptable.

### Use when
- patient cannot attend for capture
- case complexity is acceptable
- staff decides remote is sufficient

### Rule
Remote capture cannot bypass clinician review or manufacturing gates.

## 4.3 Hybrid recovery pathway
Use when a session started in clinic but missing views are recollected later, or vice versa.

---

# 5. Protocols
## 5.1 Protocol catalog
### Essential
- plantar outline left/right with scale reference
- medial left/right
- lateral left/right
- posterior left/right
- anterior left/right

### Clinical Full Set
- Essential
- true plantar left/right
- dorsal left/right
- shoe sole left/right

### Manufacturing Grade
- Clinical Full Set
- validated calibration reference
- gait video optional but recommended
- clinician sign-off mandatory
- stricter QA threshold

## 5.2 Default protocol
For custom insoles, the default protocol must be:
## **Manufacturing Grade**

---

# 6. Pre-capture readiness gate
Before any capture begins, the system must confirm:
- correct patient identity
- correct scan case
- capture pathway selected
- protocol selected
- operator identified
- patient barefoot
- no socks or occluding coverings
- adequate lighting
- flat hard floor
- A4 or approved calibration marker available
- patient can safely perform required poses

## Hard-stop conditions
- wrong patient / wrong case
- no usable calibration reference for dimensional protocol
- unsafe patient positioning
- severe lighting limitation not fixable

---

# 7. Capture step requirements
Each capture step must define:
- side (`LEFT`, `RIGHT`, `BILATERAL`, `NONE`)
- view type
- required vs optional
- expected camera position
- stance requirement
- calibration requirement
- QA thresholds

## Mandatory view types
- `PLANTAR_OUTLINE`
- `TRUE_PLANTAR`
- `MEDIAL`
- `LATERAL`
- `ANTERIOR`
- `POSTERIOR`
- `DORSAL`
- `SHOE_SOLE`

---

# 8. Quality assurance model
## 8.1 Layer 1 — technical QA (automatic)
Each capture is scored for:
- blur
- brightness
- contrast
- framing completeness
- foot visibility
- occlusion
- orientation correctness
- calibration/reference visibility

### Per-capture result
- `PASS`
- `WARN`
- `FAIL`

## 8.2 Layer 2 — protocol QA (system + staff)
Session-level checks:
- all required views present
- left/right completeness
- labeling correctness
- calibration artifact valid
- stance and protocol compliance
- no duplicate substitution of critical views

## 8.3 Layer 3 — clinical QA
Clinician must confirm:
- evidence is sufficient for prescribing
- measurement confidence is acceptable
- AI output is plausible
- limitations are documented
- ready for manufacture or recapture required

---

# 9. Failure taxonomy
## 9.1 Critical fail
Must be recaptured before submission:
- wrong side
- wrong angle
- severe blur
- missing heel or toes in critical view
- unusable calibration reference
- severe shadow / overexposure
- critical anatomy occluded
- duplicate image used for different required views

## 9.2 Major fail
Submission may continue only for later clinician override:
- mild obliquity
- partial crop of non-critical region
- slight posture deviation
- floor angle slightly off

## 9.3 Minor issue
Acceptable with note:
- minor clutter
- small color cast
- minor perspective issue with anatomy still interpretable

---

# 10. Recapture rules
- any critical fail → immediate recapture
- maximum 3 attempts per required view before escalation
- 2 consecutive failures on same view → targeted guidance shown
- repeated calibration failure → restart calibration stage
- repeated posterior/medial failure → recommend assisted capture
- safety issue during capture → stop and reroute to clinic
- implausible asymmetry → mandatory bilateral confirmation recapture

---

# 11. Submission gate
A session can only be submitted if:
- required views are complete for the selected protocol
- all mandatory views are at least `PASS` or clinician-overridable `WARN`
- left/right labeling is complete
- calibration is detected and accepted where required
- session completeness threshold is met

## Rule
Simple image count must never be the only submission criterion.

---

# 12. Reliability and confidence
The system must compute:
- `captureQualityScore` (0–100)
- `completenessScore` (0–100)
- `calibrationConfidence` (`LOW | MEDIUM | HIGH`)
- `clinicalReliability` (`LOW | MEDIUM | HIGH`)
- `manufacturingReadiness` (`YES | NO`)

## Suggested blocks
- capture quality < 70 → no approval
- calibration confidence low → no dimensional manufacturing
- clinical reliability low → no production unless documented manual override

---

# 13. Workflow states
## 13.1 Case-level states
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

## 13.2 Session-level states
- `CREATED`
- `OPENED`
- `IN_PROGRESS`
- `UPLOADING`
- `SUBMITTED`
- `INCOMPLETE`
- `ABANDONED`
- `EXPIRED`

## 13.3 Capture-level states
- `UPLOADED`
- `ACCEPTED`
- `REJECTED`
- `SUPERSEDED`

---

# 14. Clinical review gate
Before approval, the clinician must complete a structured checklist:
- patient identity correct
- required images complete
- calibration trustworthy
- no side/angle mislabeling
- anatomy sufficient for measurement and interpretation
- AI findings plausible
- red flags escalated if needed
- prescription objective defined

## Review outcomes
- `APPROVED`
- `APPROVED_WITH_LIMITATIONS`
- `CHANGES_REQUESTED`
- `RECAPTURE_REQUIRED`
- `NOT_SUITABLE_FOR_MANUFACTURING`

---

# 15. Manufacturing gate
No case may enter production unless all are true:
- capture passed required QA gates
- clinician review completed
- prescription finalized
- size confirmed
- side-specific specifications present
- manufacturing reliability status present
- final manufacturing spec snapshot locked

---

# 16. Outputs
## 16.1 Patient report
Purpose:
- simple explanation
- visual summary
- next steps

## 16.2 Clinical report
Purpose:
- measurements
- asymmetries
- findings
- confidence and limitations
- prescription rationale

## 16.3 Manufacturing spec pack
Purpose:
- production-ready technical handoff
- zero ambiguity
- versioned and approved

---

# 17. Manufacturing spec content
Structured fields must include:
- patient + scan identifiers
- clinician approver
- approval timestamp
- insole type
- size system + size
- shell/base definition
- arch support left/right
- heel cup depth
- rearfoot posting left/right
- forefoot posting left/right
- met pad settings
- offloading zones
- cushioning zones
- material stack
- trimline / shoe compatibility
- lab instructions
- limitations / reliability notes
- spec version

---

# 18. Outcome loop
The workflow must not end at shipment.
Track:
- fitting status
- comfort
- adaptation period
- symptom response
- remake required or not
- remake reason
- outcome review

---

# 19. Audit requirements
The system must log:
- who created the case
- who created the session
- who captured / uploaded each image
- device used
- quality results per image
- recapture requests and reasons
- clinician review and approval
- manufacturing release version
- post-production amendments

---

# 20. Non-negotiable rules
1. no manufacturing from incomplete capture
2. no manufacturing from low-confidence calibration
3. no manufacturing without clinician approval
4. AI cannot silently finalize production decisions
5. every production release must be traceable to a versioned review and spec

---

# 21. Definition of done
This precision pipeline is only considered complete when:
- capture can be started from the patient record
- sessions are versioned and auditable
- every image is a first-class capture record
- calibration is formalized
- per-image and per-session QA exists
- clinician review is structured
- prescription is structured
- manufacturing handoff is versioned and locked
- delivery/fitting/remake outcome loop exists
