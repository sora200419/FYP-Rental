# AI-Assisted KYC Identity Verification with Admin Final Review — Design Spec

**Date:** 2026-05-15  
**Project:** RentalEase Malaysia  
**Status:** Approved (v2 — post-review revisions applied)

---

## Overview

Replace the existing weak "upload IC copy" flow with a proper 3-step KYC wizard that captures IC front, IC back, and a selfie, then uses AWS Rekognition to automatically compare the IC face against the selfie. An admin makes the final approve/reject decision with the AI similarity score as a supporting signal. This is **not** fully automated KYC — it does not include liveness detection, OCR, or government database verification.

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
  user            User      @relation("UserKyc", fields: [userId], references: [id])

  icFrontUrl      String
  icFrontPublicId String
  icBackUrl       String
  icBackPublicId  String
  selfieUrl       String
  selfiePublicId  String

  faceMatchScore  Float?            // Rekognition similarity 0–100; null until processed. Admin-only.
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
- Add `kycSubmission KycSubmission? @relation("UserKyc")` — the user's own submission
- Add `reviewedKycSubmissions KycSubmission[] @relation("KycReviewer")` — submissions reviewed by this admin
- Existing `isVerified`, `kycRejectedReason` fields unchanged

### TenantDocument / DocumentType
- `IC_COPY` is **deprecated for new KYC submissions** but kept in the `DocumentType` enum for backward compatibility
- Existing `IC_COPY` records are not deleted — old data remains valid
- `TenantDocumentUploader` removes the `IC_COPY` upload slot for new users; the `IC_COPY` enum value stays in the schema
- `INCOME_PROOF` is unchanged

---

## Accepted File Types

**JPG and PNG only, maximum 10 MB per file.**

WebP is excluded — AWS Rekognition accepts JPEG and PNG only. Passing WebP directly may cause the comparison to fail silently.

---

## Environment Variables

```
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-southeast-1"
KYC_REKOGNITION_MODE="mock"   # "mock" | "aws"
```

When `KYC_REKOGNITION_MODE=mock`, the system skips the AWS call and returns a fixed similarity score of `85.0` for testing. When set to `aws`, AWS Rekognition `CompareFaces` is called.

This allows development and testing without AWS credentials, and the report can state:
> "In development mode the system uses a mock similarity score. In production mode, AWS Rekognition CompareFaces is used."

## npm Package Required

```
@aws-sdk/client-rekognition
```

---

## User Flow

### KYC Wizard — `/dashboard/kyc`

Three-step stepper with progress indicator. Accessible from the profile page banner.

**Step 1 — IC Front**
- File picker (JPG, PNG only; max 10 MB)
- Live preview of uploaded image
- "Next" enabled only after image selected

**Step 2 — IC Back**
- Same upload UI as Step 1
- "Next" enabled only after image selected

**Step 3 — Selfie**
- Primary: webcam capture (opens camera, live preview, capture button)
- Fallback: file upload (JPG/PNG) for users without webcam
- "Submit" enabled only after selfie is captured/uploaded

**On Submit**
1. All 3 images upload to Cloudinary (folder: `kyc/`)
2. `POST /api/kyc/submit` — if mock mode, use score `85.0`; if aws mode, call Rekognition
3. `KycSubmission` record created/replaced with score and status `PENDING`
4. `KYC_SUBMITTED` notification created for **all ADMIN users**
5. User sees: "Identity verification submitted — we'll notify you when reviewed"

### Resubmission Rules
- If `status === PENDING` → user **cannot** submit again (button disabled, message shown)
- If `status === REJECTED` → user **can** resubmit
- On resubmission: old Cloudinary KYC images are deleted, new images uploaded, status resets to `PENDING`
- If `status === APPROVED` → no resubmission (already verified)

### What Users See vs Admins See
- **User** sees: `PENDING`, `APPROVED`, or `REJECTED` + rejection reason. **No face match score.**
- **Admin** sees: all three images + face match score + confidence label.

Reason: the score is an internal review signal. Exposing it to users would allow them to optimise submissions against the threshold rather than submitting genuine documents.

### Profile Page Banner States
- **No submission** → amber banner "Complete identity verification" → CTA to `/dashboard/kyc`
- **PENDING** → blue banner "Identity verification under review"
- **REJECTED** → red banner with rejection reason + "Resubmit" CTA to `/dashboard/kyc`
- **APPROVED** → green "Verified" badge (existing behaviour)

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/kyc/submit` | `POST` | User | Upload 3 images, run Rekognition (or mock), upsert `KycSubmission` |
| `/api/kyc/status` | `GET` | User | Returns `{ status, rejectedReason }` — no score |
| `/api/admin/kyc` | `GET` | Admin | List all PENDING submissions with score |
| `/api/admin/kyc/[id]/approve` | `PATCH` | Admin | Set `APPROVED`, `User.isVerified = true`, notify user |
| `/api/admin/kyc/[id]/reject` | `PATCH` | Admin | Set `REJECTED`, store reason, notify user |

### `/api/kyc/submit` detail
1. Reject if current submission status is `PENDING`
2. If existing submission is `REJECTED`, delete old Cloudinary images first
3. Receive 3 files as `multipart/form-data` (JPG/PNG only; reject others with 400)
4. Upload all 3 to Cloudinary folder `kyc/`
5. If `KYC_REKOGNITION_MODE=mock` → `faceMatchScore = 85.0`
6. If `KYC_REKOGNITION_MODE=aws` → call `rekognition.compareFaces({ SourceImage: icFront, TargetImage: selfie, SimilarityThreshold: 0 })`; store first match similarity or `0` if no face detected
7. Upsert `KycSubmission` with new images and score, status `PENDING`
8. Notify all admin users with `KYC_SUBMITTED`
9. Return `{ status: "PENDING" }` — score not returned to user

---

## Admin KYC Review Page — `/dashboard/admin/kyc`

New "KYC" tab added to `AdminNav`.

Each submission card shows:
- User name, role, email, submission timestamp
- Three images side by side: IC front · IC back · Selfie (clickable to full size)
- Face match score with colour-coded confidence label:
  - ≥ 80% → green "High confidence"
  - 60–79% → amber "Moderate — review carefully"
  - < 60% → red "Low confidence — likely mismatch"
- **Approve** button → `PATCH /api/admin/kyc/[id]/approve`
- **Reject** button → inline reason textarea → `PATCH /api/admin/kyc/[id]/reject`

Empty state shown when no pending submissions.

---

## Notifications

| Event | Type | Recipient |
|---|---|---|
| User submits KYC | `KYC_SUBMITTED` | All ADMIN users (fetch `where: { role: 'ADMIN' }`) |
| Admin approves | `ACCOUNT_VERIFIED` | Submitting user |
| Admin rejects | `ACCOUNT_KYC_REJECTED` | Submitting user (include reason in body) |

---

## Privacy & PDPA

KYC images (IC front, IC back, selfie) are sensitive personal data under Malaysia's Personal Data Protection Act 2010.

- Access is restricted to the submitting user and admin reviewers only
- Images are stored in a dedicated Cloudinary folder (`kyc/`) separate from tenancy documents
- On resubmission, old KYC images are deleted from Cloudinary before new ones are uploaded
- A future retention policy should define how long approved KYC images are kept after account closure (out of scope for this FYP iteration)

---

## Integration Points with Existing System

| Existing | Change |
|---|---|
| `TenantDocumentUploader` | Remove `IC_COPY` upload slot in UI; keep `INCOME_PROOF`. `IC_COPY` enum value stays in schema. |
| `KycPendingBanner` | Update to handle: no-submission / PENDING / REJECTED states |
| Profile page | Add "Verify Identity" CTA button when no submission exists |
| Admin users page | KYC badge reads from `KycSubmission.status` (falls back to `tenantDocuments` check for legacy users) |
| `User.isVerified` | Unchanged — set `true` on admin approval |
| `AdminNav` | Add "KYC" tab pointing to `/dashboard/admin/kyc` |

---

## Out of Scope

- Liveness detection (video-based anti-spoofing)
- OCR of IC text fields
- Automated approval without admin review
- Government database verification (e.g. JPN MyKad lookup)
- KYC image retention/deletion policy after account closure
