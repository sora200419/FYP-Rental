# Dual-Signature Proof And Corporate Tenancy Scaffolding Design

Prepared: 2026-05-13

## Goal

Strengthen the agreement-signing workflow so a tenancy only becomes active after:

1. the tenant completes the in-system digital signature step,
2. the system records the agreement hash and keeps the existing best-effort Sepolia anchor flow,
3. the tenant uploads a signed hard-copy agreement file, and
4. the landlord approves that uploaded signed file.

At the same time, prepare the database for a future employer/corporate leasing mode without reusing `CoTenant` for legal contracting-party logic.

## Scope

In scope:

- dual-signature proof workflow for tenant agreement acceptance
- landlord review flow for uploaded signed hard-copy proof
- re-upload loop with rejection reason
- agreement and tenancy lifecycle updates required for the new signing gate
- audit/history events for each signature-proof step
- database scaffolding for future `Individual / Corporate` lease-party support

Out of scope for this round:

- full corporate tenancy UI
- corporate tenancy API/business rules
- replacing the existing `CoTenant` feature
- making Sepolia anchoring a hard blocker
- OCR, document authenticity analysis, or advanced fraud detection

## Product Decisions

### 1. Activation Rule

The tenancy must **not** become active immediately after digital signing.

The tenancy only becomes active after:

- tenant digital sign is completed,
- tenant signed hard-copy file is uploaded, and
- landlord approves that uploaded file.

This gives the system both:

- digital audit proof, and
- practical real-world signed-document proof.

### 2. Sepolia Behavior

Keep the current Sepolia anchor behavior as-is:

- the system computes `contentHash` at digital signing time,
- the anchor to Sepolia remains best-effort,
- failure to anchor does not block the workflow from moving into the next signature-proof step.

### 3. Accepted Upload Types

Accepted signed-copy file types:

- `PDF`
- `JPG`
- `PNG`
- `HEIC`

Rationale:

- PDF is the normal final signed agreement format.
- phone-captured images are common in real use.
- allowing only these formats keeps review manageable.

### 4. Landlord Review Outcome

Landlord review must support:

- `Approve`
- `Reject`
- required rejection reason
- tenant re-upload after rejection

### 5. CoTenant Positioning

`CoTenant` remains valid for:

- named additional occupants,
- staff living in the property,
- non-account-holding co-occupants listed in the agreement.

`CoTenant` must **not** be treated as the legal substitute for employer/corporate leasing.

### 6. Future Corporate Tenancy Positioning

Future employer/corporate tenancy should be represented separately through lease-party fields, not through `CoTenant`.

This round only adds database scaffolding for that future path.

## Lifecycle Design

### Current Target Lifecycle

Agreement status:

- `DRAFT`
- `FINALIZED`
- `NEGOTIATING`
- `PENDING_SIGNATURE_PROOF`
- `SIGNED`

Tenancy status:

- `INVITED`
- `PENDING`
- `ACTIVE`
- `EXPIRED`
- `TERMINATED`

### New Signing Sequence

1. Landlord finalizes agreement.
2. Agreement becomes `FINALIZED`.
3. Tenant reviews agreement.
4. Tenant digitally signs in-system.
5. System stores signature metadata and moves agreement to `PENDING_SIGNATURE_PROOF`.
6. Tenancy remains `PENDING`.
7. Tenant uploads signed hard-copy file.
8. Landlord reviews uploaded file.
9. If landlord approves:
   - agreement becomes `SIGNED`
   - tenancy becomes `ACTIVE`
   - rent schedule is generated
10. If landlord rejects:
   - uploaded proof is marked rejected
   - rejection reason is shown to the tenant
   - tenant can upload a replacement file

## Data Model Design

### Agreement Status

Add new agreement status:

- `PENDING_SIGNATURE_PROOF`

Meaning:

- tenant has digitally signed,
- hard-copy signature proof is still missing, pending review, or awaiting approval,
- agreement is not fully complete yet.

### Signature Proof Record

Add a dedicated model for signed hard-copy proof rather than overloading `TenantDocument`.

Recommended model shape:

- `AgreementSignatureProof`
  - `id`
  - `agreementId`
  - `uploadedByUserId`
  - `fileUrl`
  - `publicId`
  - `originalName`
  - `mimeType`
  - `fileSize`
  - `status` = `UNDER_REVIEW | APPROVED | REJECTED`
  - `rejectionReason`
  - `reviewedByUserId`
  - `reviewedAt`
  - `createdAt`
  - `updatedAt`

Important behavior:

- one agreement can have multiple uploaded proofs over time,
- only the latest effective proof is actively reviewed,
- rejected proofs remain stored for audit.

### Agreement Signature Metadata

Keep existing fields:

- `contentHash`
- `signedAt`
- `signedByIp`
- `signedAcknowledged`
- `txHash`

These continue to represent the digital-signing event, not the landlord’s hard-copy approval.

### Future Corporate Tenancy Scaffolding

Add tenancy-party scaffolding fields now, but keep them unused in UI for this round.

Recommended fields on `Tenancy`:

- `leasePartyType` = `INDIVIDUAL | CORPORATE`
- `companyName`
- `companyRegistrationNo`
- `authorizedSignatoryName`
- `authorizedSignatoryIC`
- `authorizedSignatoryRole`

Purpose:

- prepare for employer-rents-for-staff scenarios,
- keep future migration smaller,
- avoid misusing `CoTenant` for legal contracting-party identity.

## API Design

### Tenant Digital Sign

Current sign endpoint should change behavior:

- after digital sign:
  - set agreement to `PENDING_SIGNATURE_PROOF`
  - keep tenancy as `PENDING`
  - store digital signature metadata
  - do **not** create active-tenancy side effects yet

Deferred until landlord approval:

- setting agreement to `SIGNED`
- setting tenancy to `ACTIVE`
- generating rent payment schedule

### Tenant Upload Signed Hard Copy

Add a new tenant endpoint to upload signed proof for a specific agreement.

Expected behavior:

- validate file type and size,
- upload to storage,
- create new signature-proof row,
- mark it `UNDER_REVIEW`,
- notify landlord.

### Landlord Review Signed Hard Copy

Add landlord review endpoint with actions:

- `APPROVE`
- `REJECT`

If approved:

- latest proof becomes `APPROVED`
- agreement becomes `SIGNED`
- tenancy becomes `ACTIVE`
- rent payment schedule is created

If rejected:

- proof becomes `REJECTED`
- rejection reason is required
- agreement stays `PENDING_SIGNATURE_PROOF`
- tenancy stays `PENDING`

## UI Design

### Tenant Side

On tenant agreement page:

- keep current digital-sign acknowledgement step
- after digital sign success, replace “completed” behavior with a signature-proof step
- show:
  - current agreement version
  - digital signature completed indicator
  - signed hard-copy upload control
  - proof review status
  - rejection reason if rejected
  - re-upload action

Status messaging should be explicit:

- “Digital signature completed”
- “Signed hard-copy proof under review”
- “Please re-upload your signed agreement”
- “Waiting for landlord approval before tenancy activation”

### Landlord Side

On landlord tenancy/agreement page:

- add a review card for signed hard-copy proof
- show:
  - uploaded file preview/link
  - upload timestamp
  - file type
  - tenant name
  - review status
- actions:
  - `Approve signed copy`
  - `Reject and request re-upload`

### History / Audit

Add timeline events for:

- tenant digitally signed agreement
- tenant uploaded signed hard-copy proof
- landlord rejected signed hard-copy proof
- landlord approved signed hard-copy proof

This keeps the agreement history meaningful without requiring users to inspect raw database state.

## Corporate Tenancy Future Path

This round does **not** implement corporate tenancy UI or business rules.

Future workflow should support:

- lease party type selection
- company/employer as legal contracting party
- authorized signatory details
- occupant roster for staff

Future agreements should then distinguish clearly between:

- who legally signs, and
- who physically occupies the property.

## Error Handling

Tenant-side errors:

- unsupported file type
- oversized file
- upload failed
- no digital sign yet
- proof rejected with reason shown clearly

Landlord-side errors:

- approving without a valid pending proof
- rejecting without a reason
- duplicate review attempts on already approved proof

System-side constraints:

- only tenant of that agreement can upload proof
- only landlord of that tenancy can review proof
- signed-proof approval must be idempotent

## Testing Strategy

Manual test coverage should include:

1. tenant digitally signs and agreement moves to `PENDING_SIGNATURE_PROOF`
2. tenancy remains `PENDING`
3. tenant uploads PDF proof
4. landlord approves proof
5. agreement becomes `SIGNED`
6. tenancy becomes `ACTIVE`
7. rent payment schedule appears only after approval
8. tenant uploads image proof instead of PDF
9. landlord rejects with reason
10. tenant sees rejection reason and re-uploads
11. landlord approves second upload
12. history shows all proof events in order

Corporate scaffolding validation for this round:

- migration applies cleanly
- current individual tenancy flow still works unchanged
- `CoTenant` behavior remains intact

## Open Technical Notes

- Rent-payment generation currently happens at digital sign time. That must move to landlord approval time.
- The system should use a dedicated proof model instead of reusing generic tenant documents, because the review lifecycle is agreement-specific.
- The proof-upload workflow should be version-aware so the uploaded signed copy always corresponds to the current finalized agreement version.

## Recommendation

Implement the dual-signature proof workflow as the active feature now, and keep future corporate tenancy limited to database scaffolding only.

This keeps the scope focused, improves real-world legal credibility, and avoids forcing `CoTenant` to represent a legal relationship it was not designed to model.
