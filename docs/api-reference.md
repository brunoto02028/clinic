# API Reference

All API routes are under `/api/`. Authentication is required unless noted otherwise.

---

## Patient APIs

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/profile` | Get patient profile (name, email, phone, locale) |
| `PATCH` | `/api/patient/profile` | Update profile fields |
| `POST` | `/api/patient/change-password` | Change password (old password optional) |

### Access & Membership
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/access` | Check module access, permissions, onboarding status |
| `GET` | `/api/patient/membership/plans` | List available membership plans |
| `GET` | `/api/patient/membership/subscription` | Get active subscription |
| `POST` | `/api/patient/membership/subscribe` | Subscribe (free=instant, paid=Stripe Checkout) |
| `POST` | `/api/patient/membership/cancel` | Cancel subscription |

### Medical Screening
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/medical-screening` | Get existing screening data |
| `POST` | `/api/medical-screening` | Submit/update screening |

### Treatment
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/treatment` | Get treatment protocols with items |
| `PATCH` | `/api/patient/treatment` | Toggle item completion |

### Blood Pressure
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/blood-pressure` | List BP readings |
| `POST` | `/api/patient/blood-pressure` | Save new reading (with PPG signal) |

### Journey & Gamification
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/journey` | Get XP, level, streak, missions |
| `POST` | `/api/patient/journey/mission` | Complete mission task |

### Exercises
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/exercises` | List assigned exercises |
| `POST` | `/api/patient/exercises/complete` | Log exercise completion |

### Education
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/education` | List educational content |
| `POST` | `/api/patient/education/progress` | Track content progress |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/documents` | List patient documents |
| `POST` | `/api/patient/documents` | Upload document |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/quizzes` | List available quizzes |
| `GET` | `/api/patient/quizzes/[id]` | Get quiz with questions |
| `POST` | `/api/patient/quizzes/[id]/submit` | Submit quiz attempt |

### Community
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/community` | Get leaderboard, challenges |

### Marketplace
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/marketplace` | List products |
| `POST` | `/api/patient/marketplace/checkout` | Create Stripe checkout |

### Achievements
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/achievements` | List achievements |

### Scans
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/foot-scans` | List foot scans |
| `GET` | `/api/foot-scans/[id]` | Get scan details |

### Body Assessments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/body-assessments` | List assessments |
| `POST` | `/api/body-assessments/capture/[token]` | Submit capture (public, token-auth) |

---

## Admin APIs

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/patients` | List all patients |
| `POST` | `/api/admin/patients` | Create patient |
| `GET` | `/api/admin/patients/[id]` | Get patient detail |
| `PATCH` | `/api/admin/patients/[id]` | Update patient |
| `DELETE` | `/api/admin/patients/[id]` | Delete patient |
| `PATCH` | `/api/admin/patients/[id]/permissions` | Reset password, toggle lock |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/appointments` | List appointments |
| `POST` | `/api/appointments` | Create appointment |
| `GET` | `/api/appointments/[id]` | Get appointment |
| `PATCH` | `/api/appointments/[id]` | Update/cancel appointment |

### Treatment Protocols
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/treatment-protocols` | List protocols |
| `POST` | `/api/admin/treatment-protocols` | Create protocol |
| `GET` | `/api/admin/treatment-protocols/[id]` | Get protocol |
| `PATCH` | `/api/admin/treatment-protocols/[id]` | Update protocol |

### Body Assessments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/body-assessments` | List assessments |
| `POST` | `/api/admin/body-assessments` | Create assessment |
| `POST` | `/api/admin/body-assessments/[id]/analyze` | Run AI analysis |

### Foot Scans
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/foot-scans` | List scans |
| `POST` | `/api/foot-scans` | Create scan |
| `POST` | `/api/foot-scans/[id]/analyze` | Run AI analysis |
| `GET` | `/api/foot-scans/[id]/report` | Generate report |

### Email
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/email` | List emails (inbox/sent/drafts) |
| `POST` | `/api/admin/email` | Send email or sync IMAP |
| `PATCH` | `/api/admin/email` | Mark read/star/move |
| `GET` | `/api/admin/email-templates` | List email templates |
| `PATCH` | `/api/admin/email-templates` | Update template |

### Memberships
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/memberships` | List membership plans |
| `POST` | `/api/admin/memberships` | Create plan |
| `PATCH` | `/api/admin/memberships/[id]` | Update plan |

### Social Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/social/posts` | List posts |
| `POST` | `/api/admin/social/posts` | Create post |
| `POST` | `/api/admin/social/posts/[id]/publish` | Publish to Instagram |
| `POST` | `/api/admin/social/generate` | AI generate caption/hashtags |

### Impersonation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/impersonate` | Start impersonating patient |
| `DELETE` | `/api/admin/impersonate` | Stop impersonation |

---

## Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/stripe` | Stripe payment events |
| `GET/POST` | `/api/webhooks/whatsapp` | WhatsApp message events |

---

## Authentication

All authenticated endpoints require a valid NextAuth session cookie. The middleware checks:
1. Valid JWT token in session cookie
2. User role matches required permission
3. Impersonation headers (if applicable)

### Response Codes
| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Unauthorized (not logged in) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `500` | Internal server error |
