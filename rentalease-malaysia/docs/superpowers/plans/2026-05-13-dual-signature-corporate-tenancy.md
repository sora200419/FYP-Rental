# Dual-Signature Proof And Corporate Tenancy Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dual-signature proof workflow so a tenancy only becomes active after tenant digital signing, tenant hard-copy signature upload, and landlord approval, while also adding database scaffolding for future corporate tenancy support.

**Architecture:** Rework the current tenant signing endpoint so digital signing moves the agreement into an intermediate `PENDING_SIGNATURE_PROOF` state instead of activating the tenancy immediately. Add a dedicated agreement-signature-proof model, tenant upload endpoint/UI, landlord review endpoint/UI, and agreement history events. Add future corporate-party fields to the tenancy schema only, without exposing corporate UI in this round.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma/PostgreSQL, existing Cloudinary upload helpers, existing agreement history/event infrastructure, existing Sepolia best-effort anchor flow

---

## File Structure

### New files

- `src/app/api/agreements/[id]/signature-proof/route.ts`
- `src/app/api/agreements/[id]/signature-proof/[proofId]/review/route.ts`
- `src/components/ui/TenantAgreementSignatureProofUploader.tsx`
- `src/components/ui/LandlordAgreementSignatureProofReview.tsx`

### Modified files

- `prisma/schema.prisma`
- `src/app/api/agreements/[id]/respond/route.ts`
- `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
- `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`
- `src/components/ui/TenantAgreementActions.tsx`
- `src/components/ui/AgreementViewer.tsx`
- `src/lib/cloudinary.ts`
- `src/lib/agreements/history.ts`
- `test data.md`

### Migration output expected

- `prisma/migrations/<timestamp>_dual_signature_corporate_scaffolding/`

---

### Task 1: Extend the schema for proof review and future corporate tenancy

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_dual_signature_corporate_scaffolding/`

- [ ] Add `PENDING_SIGNATURE_PROOF` to `AgreementStatus`.
- [ ] Add a new `AgreementSignatureProof` model with:
  - `agreementId`
  - `uploadedById`
  - `fileUrl`
  - `publicId`
  - `originalName`
  - `mimeType`
  - `fileSize`
  - `status`
  - `rejectionReason`
  - `reviewedById`
  - `reviewedAt`
  - timestamps
- [ ] Add `AgreementSignatureProofStatus` enum with:
  - `UNDER_REVIEW`
  - `APPROVED`
  - `REJECTED`
- [ ] Add future corporate-tenancy scaffolding on `Tenancy`:
  - `leasePartyType`
  - `companyName`
  - `companyRegistrationNo`
  - `authorizedSignatoryName`
  - `authorizedSignatoryIC`
  - `authorizedSignatoryRole`
- [ ] Add `LeasePartyType` enum with:
  - `INDIVIDUAL`
  - `CORPORATE`
- [ ] Add relations on `Agreement` and `User` needed for proof uploads/reviews.
- [ ] Create and inspect the Prisma migration.

Manual verification:

- run `npx.cmd prisma migrate dev --name dual_signature_corporate_scaffolding`
- open generated SQL and confirm:
  - agreement status enum includes `PENDING_SIGNATURE_PROOF`
  - proof table exists
  - tenancy corporate fields are nullable

### Task 2: Rework the digital-sign endpoint so tenancy does not activate early

**Files:**
- Modify: `src/app/api/agreements/[id]/respond/route.ts`
- Modify: `src/lib/agreements/history.ts`

- [ ] Keep the existing acknowledgement requirement for tenant digital signing.
- [ ] Keep content hashing and best-effort Sepolia anchoring logic.
- [ ] Change the `SIGN` action so it:
  - stores `contentHash`
  - stores `signedAt`
  - stores `signedByIp`
  - stores `signedAcknowledged`
  - sets agreement status to `PENDING_SIGNATURE_PROOF`
  - does **not** set tenancy to `ACTIVE`
  - does **not** generate rent payments yet
- [ ] Add a new agreement event summary for tenant digital signing that clearly says the signed hard-copy proof is still pending.
- [ ] Update notification text to landlord and tenant so they understand the agreement is not fully complete yet.

Manual verification:

- tenant signs a finalized agreement
- confirm agreement becomes `PENDING_SIGNATURE_PROOF`
- confirm tenancy stays `PENDING`
- confirm no rent payment schedule is created yet

### Task 3: Add tenant signed hard-copy upload endpoint

**Files:**
- Create: `src/app/api/agreements/[id]/signature-proof/route.ts`
- Modify: `src/lib/cloudinary.ts`

- [ ] Reuse the existing upload style used by tenant documents and deposit proof uploads.
- [ ] Accept only:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/heic` / equivalent client-provided HEIC MIME handling used by the app
- [ ] Validate:
  - tenant owns the agreement
  - agreement is `PENDING_SIGNATURE_PROOF`
  - file exists
  - file type allowed
  - file size within a documented limit
- [ ] Upload the file to storage.
- [ ] Create a new `AgreementSignatureProof` row with `UNDER_REVIEW`.
- [ ] Keep previous rejected proofs for audit rather than deleting them.
- [ ] Add an agreement event for proof upload.
- [ ] Notify the landlord that a signed hard-copy proof is ready for review.

Manual verification:

- upload a PDF after digital signing
- confirm upload succeeds
- confirm landlord gets a reviewable proof
- try uploading before digital sign and confirm it is blocked

### Task 4: Add landlord proof-review endpoint

**Files:**
- Create: `src/app/api/agreements/[id]/signature-proof/[proofId]/review/route.ts`
- Modify: `src/lib/agreements/history.ts`

- [ ] Accept two actions:
  - `APPROVE`
  - `REJECT`
- [ ] Require rejection reason for `REJECT`.
- [ ] On `APPROVE`:
  - mark proof `APPROVED`
  - set `reviewedById`
  - set `reviewedAt`
  - set agreement to `SIGNED`
  - set tenancy to `ACTIVE`
  - create rent payment schedule here
  - add approval event
  - notify tenant that the agreement is fully approved and move-in can start
- [ ] On `REJECT`:
  - mark proof `REJECTED`
  - save rejection reason
  - keep agreement as `PENDING_SIGNATURE_PROOF`
  - keep tenancy as `PENDING`
  - add rejection event
  - notify tenant to re-upload
- [ ] Make review idempotent enough to avoid double-approval side effects such as duplicate rent schedules.

Manual verification:

- landlord approves a pending proof and tenancy becomes active
- landlord rejects a pending proof and tenant stays pending
- second approval attempt does not create duplicate side effects

### Task 5: Add tenant-side dual-signature proof UI

**Files:**
- Create: `src/components/ui/TenantAgreementSignatureProofUploader.tsx`
- Modify: `src/components/ui/TenantAgreementActions.tsx`
- Modify: `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`

- [ ] Keep the current digital sign acknowledgement UX.
- [ ] After digital sign succeeds, replace the old “agreement signed successfully” path with a proof-upload flow.
- [ ] Show a clear state panel for:
  - digital signature complete
  - hard-copy proof missing
  - under review
  - rejected with reason
  - approved
- [ ] Add upload UI with file-type guidance: `PDF`, `JPG`, `PNG`, `HEIC`.
- [ ] Support re-upload after rejection.
- [ ] Make it explicit that move-in/tenancy activation only starts after landlord approval.

Manual verification:

- tenant signs digitally
- tenant sees upload area instead of immediate activation
- tenant uploads proof
- tenant sees `UNDER_REVIEW`
- after rejection, tenant sees the rejection reason and can upload again

### Task 6: Add landlord-side proof review UI

**Files:**
- Create: `src/components/ui/LandlordAgreementSignatureProofReview.tsx`
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`

- [ ] Add a landlord review card on the tenancy detail page for agreements in `PENDING_SIGNATURE_PROOF`.
- [ ] Show:
  - uploaded filename
  - uploaded time
  - file type
  - proof status
  - link/preview target
- [ ] Add `Approve signed copy` action.
- [ ] Add `Reject and request re-upload` action with mandatory reason field.
- [ ] Keep the existing agreement card and tenancy summary readable; do not bury the proof review action.

Manual verification:

- landlord can review the uploaded proof from the tenancy detail page
- landlord can approve and activate the tenancy
- landlord can reject only after entering a reason

### Task 7: Update agreement history and viewer surfaces

**Files:**
- Modify: `src/lib/agreements/history.ts`
- Modify: `src/components/ui/AgreementViewer.tsx`

- [ ] Add history event labels/summaries for:
  - digital signature completed
  - signed hard-copy uploaded
  - signed hard-copy rejected
  - signed hard-copy approved
- [ ] Ensure the agreement history tab reflects the new signature-proof sequence.
- [ ] If the viewer shows signed metadata, keep it aligned with the new lifecycle so “signed” means fully approved, not just digitally signed.

Manual verification:

- run one approve path and one reject/re-upload path
- confirm the history tab shows each event in order

### Task 8: Preserve CoTenant behavior and add corporate scaffolding safely

**Files:**
- Modify: `prisma/schema.prisma`
- Modify as needed: any server-side tenancy selects relying on full tenancy shape

- [ ] Confirm `CoTenant` remains unchanged in behavior and wording: occupants only, not legal contracting parties.
- [ ] Keep corporate fields nullable and unused in current UI.
- [ ] Avoid introducing any conditional UI around `leasePartyType` in this round.
- [ ] Make sure existing agreement generation and tenancy pages still work for normal individual tenancies.

Manual verification:

- add or remove a co-tenant after the schema change
- confirm agreement generation still includes co-occupant names as before
- confirm no new corporate fields appear in the current UI

### Task 9: Update test data and manual verification notes

**Files:**
- Modify: `test data.md`

- [ ] Add a new manual flow for dual-signature proof:
  - finalized agreement
  - tenant digital sign
  - tenant uploads signed copy
  - landlord approves
  - tenancy becomes active
- [ ] Add a rejection/re-upload test case.
- [ ] Add a short note that employer/corporate leasing is future-scaffolded only, not active in the current UI.

### Task 10: Final verification

**Files:**
- Modify as needed: no new files expected in this task

- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run `npm.cmd run lint`.
- [ ] Manually verify the happy path:
  - finalize agreement
  - tenant digital sign
  - tenant upload signed hard copy
  - landlord approve
  - tenancy becomes active
  - rent schedule appears after approval only
- [ ] Manually verify the rejection path:
  - landlord rejects
  - tenant sees rejection reason
  - tenant re-uploads
  - landlord approves

Expected output:

- TypeScript passes
- lint passes with only pre-existing warnings
- tenancy activation is blocked until both signature proofs are complete

---

## Self-Review

Spec coverage check:

- dual-signature activation rule: covered in Tasks 2, 3, 4, 5, 6
- `PENDING_SIGNATURE_PROOF`: covered in Tasks 1 and 2
- landlord approve/reject/re-upload: covered in Tasks 4, 5, 6
- file type restrictions: covered in Task 3
- history/audit: covered in Task 7
- corporate scaffolding only: covered in Tasks 1 and 8
- keep `CoTenant` as occupants only: covered in Task 8
- Sepolia best-effort retained: covered in Task 2

Placeholder scan:

- no `TODO`, `TBD`, or deferred implementation placeholders remain inside execution tasks

Type consistency:

- status names are consistent: `FINALIZED`, `PENDING_SIGNATURE_PROOF`, `SIGNED`
- proof statuses are consistent: `UNDER_REVIEW`, `APPROVED`, `REJECTED`
- corporate scaffolding field names are consistent with the approved spec
