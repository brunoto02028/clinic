---
collection: msk_treatment_protocols
title: "Level 5 Sports & Clinical Therapy — Treatment Protocols"
description: "Machine-ingestible MSK treatment protocols for a clinical AI system. One file per condition, shared schema."
count: 10
version: "1.0"
last_reviewed: 2026-07-06
---

# MSK Treatment Protocols — Index & Schema

This collection contains **10 musculoskeletal treatment protocols**, one Markdown file per condition, each with the same structure so a system can parse, retrieve and reason over them consistently.

## How to ingest
- Treat **each file as one retrievable document** (good for RAG / vector stores).
- The **YAML frontmatter** holds structured metadata for filtering (region, tissue, category, tags, ICD-10).
- The **`## Clinical reasoning (Q&A)`** section encodes expected reasoning — useful for grounding generated plans and for evaluation.
- Content is written in clinical English; ask for a translated set if the system must respond in another language.

## Shared schema (sections in every file)
1. **YAML frontmatter** — `protocol_id`, `name`, `aliases`, `body_region`, `tissue_type`, `condition_category`, `icd10`, `tags`, `version`, `last_reviewed`.
2. **Summary** — one-paragraph overview + pathology.
3. **Clinical presentation (signs & symptoms)**.
4. **Assessment (E&A)** — subjective, objective, differential, and a **key special tests** table (test → what a positive indicates).
5. **Red flags & when to refer**.
6. **Contraindications & precautions** (per modality).
7. **Treatment protocol** — session structure/timings + **modalities & rationale** table.
8. **Loading & exercise progression**.
9. **Home care / self-management**.
10. **Outcome measures & re-assessment**.
11. **Anatomy reference** — structure → origin → insertion → action table.
12. **Clinical reasoning (Q&A)**.
13. **References**.

## Protocols in this collection
| # | protocol_id | Condition | Region | ICD-10 | File |
|---|---|---|---|---|---|
| 1 | MSK-KNEE-PATELLAR-TENDINOPATHY | Patella Tendonitis (Patellar Tendinopathy / "Jumper's Knee") | knee | M76.5 | `protocol_01_patella_tendonitis.md` |
| 2 | MSK-FOOT-PLANTAR-FASCIOPATHY | Plantar Fasciitis (Plantar Fasciopathy / Plantar Heel Pain) | foot | M72.2 | `protocol_02_plantar_fasciitis.md` |
| 3 | MSK-HIP-PROXIMAL-HAMSTRING-TENDINOPATHY | Hamstring Tendinosis (Proximal Hamstring Tendinopathy) | hip / posterior thigh | M76.8 (indicative) | `protocol_03_hamstring_tendinosis.md` |
| 4 | MSK-SHOULDER-ADHESIVE-CAPSULITIS | Frozen Shoulder (Adhesive Capsulitis) | shoulder | M75.0 | `protocol_04_frozen_shoulder.md` |
| 5 | MSK-CSPINE-WHIPLASH-WAD | Whiplash (Whiplash-Associated Disorder (WAD)) | cervical spine | S13.4 | `protocol_05_whiplash.md` |
| 6 | MSK-HIP-SNAPPING-HIP | Snapping Hip (Coxa Saltans) | hip | — (no single standard code) | `protocol_06_snapping_hip.md` |
| 7 | MSK-LSPINE-CHRONIC-NONSPECIFIC-LBP | Chronic Lower Back Pain (Non-Specific CLBP (>12 weeks)) | lumbar spine | M54.5 | `protocol_07_chronic_lower_back_pain.md` |
| 8 | MSK-KNEE-ITB-SYNDROME | Runner's Knee (ITB Syndrome) (Iliotibial Band Syndrome) | knee (lateral) / thigh | M76.3 | `protocol_08_runner_s_knee_itb_syndrome.md` |
| 9 | MSK-HIP-GTPS | Trochanteric Bursitis (Greater Trochanteric Pain Syndrome (GTPS)) | hip (lateral) | M70.6 | `protocol_09_trochanteric_bursitis.md` |
| 10 | MSK-WRIST-CARPAL-TUNNEL-SYNDROME | Carpal Tunnel Syndrome (Median Nerve Compression at the Wrist) | wrist / hand | G56.0 | `protocol_10_carpal_tunnel_syndrome.md` |

> **Note on codes:** ICD-10 values are indicative and should be verified against your own coding system before clinical use. Codes marked `(indicative)` or `—` need confirmation.

## Important usage notes for the system
- These protocols are **clinical decision-support templates**, not a substitute for individual assessment. Any generated plan must be gated by the **red flags** and **contraindications** sections.
- Always screen red flags first; several conditions (e.g. cauda equina in low back pain, vascular signs in whiplash) require **immediate referral**, not treatment.
- `TODO` markers indicate where a condition-specific loading-protocol reference should be added from your module notes.
