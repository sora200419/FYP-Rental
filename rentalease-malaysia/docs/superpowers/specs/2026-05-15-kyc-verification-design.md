# KYC Identity Verification — Design Spec

**Date:** 2026-05-15  
**Project:** RentalEase Malaysia  
**Status:** Approved

---

## Overview

Replace the existing weak "upload IC copy" flow with a proper 3-step KYC wizard that captures IC front, IC back, and a selfie, then uses AWS Rekognition to automatically compare the IC face against the selfie. An admin makes the final approve/reject decision with the AI similarity score as a supporting signal.

---

## Problem Statement

The current flow asks users to upload a flat IC image and enter their IC number. Admin manually reviews with no face verification — there is no check that the person submitting is actually the IC holder. This KYC upgrade closes that gap.

---

## Data Model

### New model: `KycSubmission`

```prisma
model KycSubmission {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])

  icFrontUrl      String
  icFrontPublicId String
  icBackUrl       String
  icBackPublicId  String
  selfieUrl       String
  selfiePublicId  String

  faceMatchScore  Float?            // Rekognition similarity 0–100; null until processed
  status          KycStatus         @default(PENDING)
  rejectedReason  String?           @db.Text

  reviewedById    String?
  reviewedBy      User?             @relation("KycReviewer", fields: [reviewedById], references: [id])
  reviewedAt      DateTime?
  submittedAt     DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum KycStatus {
  PENDING    // Submitted, awaiting admin review
  APPROVED   // Admin approved — User.isVerified set to true
  REJECTED   // Admin rejected — reason stored, user may resubmit
}
```

### User model changes
- Add `kycSubmission KycSubmission?` relation
- Add `kycSubmission KycSubmission[] @relation("KycReviewer")` for admin reviewer relation
- Existing `isVerified`, `kycRejectedReason` fields unchanged

### TenantDocument changes
- Remove `IC_COPY` from `DocumentType` enum — replaced by `KycSubmission`
- Keep `INCOME_PROOF` in `TenantDocument` unchanged

---

## User Flow

### KYC Wizard — `/dashboard/kyc`

Three-step stepper with progress indicator:

**Step 1 — IC Front**
- Drag-and-drop or file picker (JPG, PNG, WebP; max 10 MB)
- Live preview of uploaded image
- "Next" enabled only after successful upload

**Step 2 — IC Back**
- Same upload UI as Step 1
- "Next" enabled only after successful upload

**Step 3 — Selfie**
- Primary: webcam capture (opens camera, live preview, capture button)
- Fallback: file upload for users without webcam
- "Submit" enabled only after selfie is captured/uploaded

**On Submit**
1. All 3 images upload to Cloudinary
2. `POST /api/kyc/submit` runs Rekognition `CompareFaces` (IC front vs selfie)
3. `KycSubmission` record created with score and status `PENDING`
4. User sees confirmation: "Identity verification submitted — we'll notify you when reviewed"
5. `KYC_SUBMITTED` notification sent to admin

### Profile Page Integration
- **No submission yet** → amber banner with "Complete identity verification" CTA linking to `/dashboard/kyc`
- **PENDING** → blue banner "Identity verification under review"
- **REJECTED** → red banner with rejection reason + "Resubmit" CTA
- **APPROVED** → green "Verified" badge (existing behaviour)

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/kyc/submit` | `POST` | User | Upload 3 images, run Rekognition, create `KycSubmission` |
| `/api/kyc/status` | `GET` | User | Get current user's submission status and score |
| `/api/admin/kyc` | `GET` | Admin | List all PENDING submissions |
| `/api/admin/kyc/[id]/approve` | `PATCH` | Admin | Approve — set `KycStatus.APPROVED`, `User.isVerified = true` |
| `/api/admin/kyc/[id]/reject` | `PATCH` | Admin | Reject — set `KycStatus.REJECTED`, store reason, notify user |

### `/api/kyc/submit` detail
1. Receive 3 files as `multipart/form-data`
2. Upload all 3 to Cloudinary (folder: `kyc/`)
3. Call `rekognition.compareFaces({ SourceImage: icFront, TargetImage: selfie, SimilarityThreshold: 0 })`
4. Store result: `faceMatchScore` = first face match similarity (or `0` if no face detected)
5. Create/upsert `KycSubmission` (one per user — resubmission overwrites)
6. Return `{ status: "PENDING", faceMatchScore }`

---

## Admin KYC Review Page — `/dashboard/admin/kyc`

New tab added to `AdminNav`.

Each submission card shows:
- User name, role, submission timestamp
- Three images side by side: IC front · IC back · Selfie (clickable to full size)
- Face match score with colour-coded confidence:
  - ≥ 80% → green "High confidence"
  - 60–79% → amber "Moderate — review carefully"
  - < 60% → red "Low confidence — likely mismatch"
- **Approve** button → calls `PATCH /api/admin/kyc/[id]/approve`
- **Reject** button → opens inline reason textarea → submits to `PATCH /api/admin/kyc/[id]/reject`

Empty state shown when no pending submissions.

---

## Notifications

Reuse existing `NotificationType` values:
- `KYC_SUBMITTED` — sent to admin when user submits
- `ACCOUNT_VERIFIED` — sent to user when admin approves
- `ACCOUNT_KYC_REJECTED` — sent to user when admin rejects (include reason in body)

---

## Environment Variables Required

```
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-southeast-1"
```

## npm Package Required

```
@aws-sdk/client-rekognition
```

---

## Integration Points with Existing System

| Existing | Change |
|---|---|
| `TenantDocumentUploader` | Remove `IC_COPY` slot; keep `INCOME_PROOF` |
| `KycPendingBanner` | Update to handle PENDING / REJECTED / no-submission states |
| Profile page | Add "Verify Identity" CTA when no submission exists |
| Admin users page | KYC badge reads from `KycSubmission.status` instead of `tenantDocuments` |
| `User.isVerified` | Unchanged — set `true` on admin approval, `false` on rejection |
| `AdminNav` | Add "KYC" tab |

---

## Out of Scope

- Liveness detection (video-based anti-spoofing) — static selfie is sufficient for FYP
- OCR of IC text fields — Rekognition face comparison only
- Automated approval without admin review
