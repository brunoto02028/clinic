# Home Scan via Smartphone — Implementation Plan

## Status today
The clinic system already has a substantial base for smartphone foot scanning:

- staff can create a scan session with token/URL via `POST /api/foot-scans/session`
- patient/mobile page exists at `/scan/[token]`
- uploads already arrive in the system via `/api/foot-scans/[id]/upload-local`
- admin monitoring exists in `app/admin/scans/page.tsx`
- there is already a body-assessment pattern for sending capture links to patients

So this is not a greenfield build. The fastest path is to **upgrade and operationalize the existing scan flow** instead of rebuilding from scratch.

---

## Product goal
Allow each patient to complete a precise home foot scan using their own smartphone, with:

- clear device guidance
- compatibility checks
- step-by-step patient instructions
- secure patient-specific scan links
- structured upload into the clinic system
- staff-side tracking, review, and re-capture workflow

---

## Recommended product approach

### Phase 1 — Make current flow production-ready
Use the existing browser-based flow first.

Why:
- no app-store dependency
- fastest to ship
- easiest support for patients
- current codebase already supports it

### Phase 2 — Add optional native-app or LiDAR-enhanced path
Only after validating patient adoption and scan quality.

Why:
- native app increases support burden
- compatibility becomes harder
- better depth capture is useful, but not required for first launch

---

## Current architecture already found in the repo

### Existing staff flow
- Admin opens `app/admin/scans/page.tsx`
- Selects patient
- Creates scan session
- Gets QR code + URL
- Monitors incoming uploads in real time

### Existing patient flow
- Patient opens `/scan/[token]`
- Token is validated with `GET /api/foot-scans/session?token=...`
- Patient chooses scan mode
- Patient captures images
- Images upload to `POST /api/foot-scans/[id]/upload-local`
- System stores scan and staff can review/analyze

### Existing backend entities/behavior already in place
- `FootScan` creation
- `scanToken`
- `scanTokenExpiry`
- status flow such as:
  - `PENDING_UPLOAD`
  - `SCANNING`
  - `PROCESSING`
  - `PENDING_REVIEW`
  - `APPROVED`
- patient linkage
- clinic linkage
- capture metadata

---

## What is still missing for a real patient-ready rollout

## 1. Patient-facing guidance needs to become explicit and localized
Current mobile page is strong, but still too generic and too English-first for operational rollout.

### Needed improvements
- full Portuguese-first copy for BPR patients
- explicit device guidance:
  - iPhone supported
  - Android supported with caveats
  - no desktop use
- a “before you begin” checklist
- recovery guidance when capture quality is poor
- final confirmation that clinic received the scan

### Deliverables
- localized patient instruction copy
- support text for WhatsApp/SMS/email
- FAQ for common patient doubts

---

## 2. Device compatibility policy must be defined
Right now the system hints at LiDAR but does not establish a clinical support policy.

### Recommendation
Create three support tiers:

#### Tier A — recommended
- recent iPhone
- modern Android with good camera
- browser capture supported

#### Tier B — allowed with warning
- older Androids with weaker camera quality
- patient can proceed, but staff may request re-capture

#### Tier C — unsupported
- desktop/laptop
- tablet without adequate camera workflow
- very old devices/browsers

### What the system should do
- detect user agent
- show compatibility status
- show best-practice instructions by device class
- optionally block desktop access for patient scan pages

---

## 3. “Invite patient” flow should be one-click from admin
The body-assessment module already has a send-link pattern. Foot scans should match that.

### Recommended feature
Add a new endpoint similar to body assessment send-capture-link:

- `POST /api/admin/foot-scans/[id]/send-link`

### Behavior
- ensure scan token exists and is valid
- generate/regenerate token if expired
- build patient scan URL
- notify patient through existing `notifyPatient` helper
- support Portuguese and English templates
- log date/time of invitation

### Data to track
Add fields or metadata such as:
- invitationSentAt
- invitationChannel (`email`, `whatsapp`, `sms`, `manual`)
- invitationLanguage
- reminderCount
- lastReminderAt

---

## 4. Patient phone/device tracking should be formalized
You said each patient will have their own phone/process. That means the system should track more than just the uploaded photos.

### Recommended metadata to store
Inside `captureMetadata` or a dedicated structure:
- device type
- browser
- operating system
- screen size
- hasLidar
- scanMode (`self` or `clinician`)
- total images
- upload timestamps
- quality warnings
- whether A4 reference was confirmed

### Why this matters
- support team can troubleshoot faster
- clinical team can understand scan reliability
- future analytics can show which devices produce poor scans

---

## 5. Quality control workflow should exist before analysis
Current flow allows upload and then analysis, but the operational workflow needs a visible triage step.

### Recommended review statuses
- `INVITED`
- `LINK_OPENED`
- `IN_PROGRESS`
- `SUBMITTED`
- `QUALITY_REVIEW`
- `RECAPTURE_REQUESTED`
- `READY_FOR_ANALYSIS`
- `ANALYZED`
- `APPROVED`

If changing enums now is expensive, keep existing statuses and add these as UI-level derived states first.

### Quality checklist for staff
- enough images uploaded?
- both feet captured?
- reference object visible when needed?
- adequate brightness?
- blur acceptable?
- required angles present?
- patient followed stance instructions?

### Nice next step
A “request re-capture” action with a prefilled message:
- what was wrong
- what to redo
- one-click resend of updated link

---

## 6. Patient communications should be standardized
This is essential for adoption.

### Message templates needed
#### Invitation message
- explains what it is
- says which device to use
- says no app is needed for v1
- tells patient how long it takes
- includes scan link

#### Reminder message
- gentle follow-up
- link still valid
- support contact if patient has trouble

#### Re-capture request
- explains exactly what needs repeating
- keeps trust high
- avoids sounding like failure

#### Success message
- confirms receipt
- explains next steps

---

## 7. Admin UI should show operational details, not just QR/session
The admin scan page is already good, but for a real workflow it should also expose:

### Add to staff UI
- patient phone number
- invitation status
- invitation sent timestamp
- device used by patient
- number of capture attempts
- quality flags
- “send again” button
- “request re-capture” button
- “copy patient instructions” button

### Ideal dashboard columns
- patient
- phone
- scan status
- device
- images received
- last activity
- quality review
- next action

---

## 8. Consider using browser-first now, app later
You asked whether patients may need an app.

### My recommendation
For initial rollout:
- **No app required**
- use browser-based smartphone capture only

### Why
- lower friction
- less abandonment
- easier remote support
- no App Store / Play Store dependency
- easier rollout across patient base

### When an app becomes worth it
- if you need true 3D depth workflows
- if LiDAR-only capture becomes clinically necessary
- if offline capture/sync is needed
- if camera/browser limitations become the main bottleneck

---

## Proposed implementation roadmap

## Sprint 1 — operationalize the current feature
### Goal
Turn the existing scan flow into a patient-ready production workflow.

### Build
1. Portuguese-first patient copy in `/scan/[token]`
2. Device compatibility banners
3. Better intro/checklist/instructions
4. Staff-side “send scan link” endpoint + button
5. invitation/reminder metadata tracking
6. WhatsApp/email-ready message templates
7. success confirmation message after upload

### Outcome
Clinic can start inviting real patients using their own phones.

---

## Sprint 2 — quality and support layer
### Build
1. quality flags in capture metadata
2. admin quality review panel
3. request re-capture workflow
4. better progress/state transitions
5. analytics for failed or abandoned scans

### Outcome
Team can manage scan quality instead of just receiving uploads.

---

## Sprint 3 — precision improvements
### Build
1. stronger camera guidance overlays
2. image quality validation thresholds
3. better angle completeness checks
4. optional LiDAR-enhanced path on supported iPhones
5. patient-specific instructions by device class

### Outcome
Higher precision and fewer redo requests.

---

## Sprint 4 — optional native/integrated expansion
Only if needed.

### Options
- dedicated patient app
- third-party scan SDK/provider
- advanced 3D reconstruction pipeline

### Outcome
Higher technical sophistication, but only after validating demand and ROI.

---

## Recommended data model additions
If you want stronger operational tracking, add fields to `FootScan` or equivalent metadata:

- `invitationSentAt DateTime?`
- `lastReminderAt DateTime?`
- `reminderCount Int @default(0)`
- `invitationChannel String?`
- `invitationLanguage String?`
- `linkOpenedAt DateTime?`
- `submittedAt DateTime?`
- `qualityReviewedAt DateTime?`
- `qualityReviewedById String?`
- `recaptureRequestedAt DateTime?`
- `recaptureReason String?`
- `patientDeviceSummary String?`

If schema changes should be minimized, most of this can begin inside `captureMetadata` and be normalized later.

---

## Patient step-by-step guide (recommended live workflow)

### Message sent to patient
- patient receives unique link by WhatsApp/email
- message says to open it on their smartphone
- no app required in v1

### On the patient page
1. patient opens link on phone
2. system validates token
3. system checks device compatibility
4. patient sees clear checklist:
   - remove shoes and socks
   - use good light
   - keep feet visible
   - get A4 paper
5. patient starts guided capture
6. system asks for required angles
7. patient reviews photos
8. patient uploads
9. system confirms receipt
10. clinic reviews and either approves or asks for re-capture

---

## What I recommend building next in code
Priority order:

1. `send-link` endpoint for foot scans
2. patient comms templates in Portuguese
3. admin button: “Send to patient”
4. admin fields for invitation/reminder tracking
5. `/scan/[token]` copy refinement and device messaging
6. re-capture workflow

---

## Key product decision
For launch, the clearest answer to patients should be:

- use **your smartphone**
- open the **link we send you**
- **no app download required** for the first version
- follow the on-screen instructions
- if your phone is not compatible, we will guide you or schedule an assisted capture

That is the cleanest and most scalable v1.

---

## Conclusion
Yes, this can absolutely be implemented — and most importantly, **the clinic repo already contains the foundation**.

So the right move is:
- do **not** start from zero
- do **not** force an app download in v1
- strengthen the existing smartphone browser workflow
- add patient comms + staff operations + quality review

This gives the fastest path to a real working home-scan service.
