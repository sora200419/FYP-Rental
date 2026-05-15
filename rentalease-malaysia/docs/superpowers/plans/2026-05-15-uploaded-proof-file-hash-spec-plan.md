# Uploaded Proof File Hash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store a SHA-256 hash for every uploaded signed agreement proof file so the system can verify that the uploaded proof has not changed after upload.

**Architecture:** Calculate the proof file hash server-side from the uploaded file buffer before sending the file to Cloudinary. Store the hash on `AgreementSignatureProof`, display it in landlord/tenant review surfaces, and include it in the agreement event/audit record where useful.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Node `crypto`, Cloudinary upload helper, existing agreement signature proof workflow

---

## Specification

### Problem

The system currently stores uploaded signed proof file metadata such as file URL, MIME type, original filename, and size. It does not store a cryptographic hash of the uploaded file. This means the system can show that a file was uploaded, but it cannot independently identify the exact binary file uploaded at that time.

### Target Behavior

When a tenant uploads a signed agreement proof file, the system should:

- read the uploaded file into a server-side buffer
- calculate SHA-256 hash from the file buffer
- store the hash in the database
- keep the hash visible to landlord and tenant in the audit/proof section
- preserve the hash even if the proof is later approved or rejected

### Scope

In scope:

- add `fileHash` to `AgreementSignatureProof`
- compute SHA-256 hash during proof upload
- return `fileHash` in the upload API response
- display `fileHash` in tenant/landlord proof review UI where proof details are shown
- add focused tests for hash calculation

Out of scope:

- malware scanning
- OCR verification
- automatic handwritten signature detection
- comparing the proof file hash with the final PDF hash
- re-upload deduplication rules

### Acceptance Criteria

- Every new uploaded signed proof stores a 64-character lowercase SHA-256 hex hash.
- Rejected and approved proof records keep their original hash.
- Landlord can see the uploaded proof hash during review.
- Tenant can see the uploaded proof hash after upload.
- Invalid files are rejected before database creation, as they are today.

## File Structure

### Modified files

- `prisma/schema.prisma`
- `src/app/api/agreements/[id]/signature-proof/route.ts`
- `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
- `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`
- `src/components/ui/TenantAgreementSignatureProofUploader.tsx`
- `src/components/ui/LandlordAgreementSignatureProofReview.tsx`

### New files

- `src/lib/fileHash.ts`
- `tests/unit/file-hash.test.ts`

### Migration output expected

- `prisma/migrations/<timestamp>_add_signature_proof_file_hash/`

---

## Implementation Plan

### Task 1: Add the database field

**Files:**

- Modify: `prisma/schema.prisma`
- Create migration: `prisma/migrations/<timestamp>_add_signature_proof_file_hash/`

- [ ] **Step 1: Add `fileHash` to `AgreementSignatureProof`**

Add the field near the other file metadata.

```prisma
model AgreementSignatureProof {
  id              String                        @id @default(cuid())
  agreementId     String
  agreement       Agreement                     @relation(fields: [agreementId], references: [id], onDelete: Cascade)
  uploadedById    String
  uploadedBy      User                          @relation("UploadedAgreementSignatureProofs", fields: [uploadedById], references: [id])
  fileUrl         String
  publicId        String
  originalName    String
  mimeType        String
  fileSize        Int
  fileHash        String?
  status          AgreementSignatureProofStatus @default(UNDER_REVIEW)
  rejectionReason String?                       @db.Text
  reviewedById    String?
  reviewedBy      User?                         @relation("ReviewedAgreementSignatureProofs", fields: [reviewedById], references: [id])
  reviewedAt      DateTime?
  createdAt       DateTime                      @default(now())
  updatedAt       DateTime                      @updatedAt

  @@index([agreementId, createdAt])
  @@index([agreementId, status])
  @@index([fileHash])
}
```

Use nullable `String?` for backward compatibility with older proof records.

- [ ] **Step 2: Create migration**

Run:

```bash
npx.cmd prisma migrate dev --name add_signature_proof_file_hash
```

Expected: Prisma creates a migration that adds nullable `fileHash` and an index.

### Task 2: Add a reusable file hash helper

**Files:**

- Create: `src/lib/fileHash.ts`
- Create: `tests/unit/file-hash.test.ts`

- [ ] **Step 1: Create the helper**

```ts
import crypto from 'crypto';

export function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
```

- [ ] **Step 2: Add unit tests**

```ts
import { describe, expect, it } from 'vitest';
import { isSha256Hex, sha256Buffer } from '@/lib/fileHash';

describe('file hash helpers', () => {
  it('creates a stable SHA-256 hash from a buffer', () => {
    const hash = sha256Buffer(Buffer.from('signed-proof-demo'));

    expect(hash).toBe(
      'e736621b9ef8bded34db5aa2ee38e6dcf989aaeafb97a7c1217a7b180f89a994',
    );
    expect(isSha256Hex(hash)).toBe(true);
  });

  it('rejects non SHA-256 hex values', () => {
    expect(isSha256Hex('abc')).toBe(false);
    expect(isSha256Hex('g'.repeat(64))).toBe(false);
  });
});
```

- [ ] **Step 3: Run the helper tests**

Run:

```bash
npm.cmd run test -- file-hash
```

Expected: all file hash helper tests pass.

### Task 3: Store the hash during proof upload

**Files:**

- Modify: `src/app/api/agreements/[id]/signature-proof/route.ts`

- [ ] **Step 1: Import the helper**

```ts
import { sha256Buffer } from '@/lib/fileHash';
```

- [ ] **Step 2: Calculate hash after reading the file buffer**

Use the existing buffer creation point.

```ts
const buffer = Buffer.from(await file.arrayBuffer());
const fileHash = sha256Buffer(buffer);
```

- [ ] **Step 3: Save hash in the proof record**

Add `fileHash` to the `agreementSignatureProof.create` call.

```ts
const proof = await tx.agreementSignatureProof.create({
  data: {
    agreementId: id,
    uploadedById: session.user.id,
    fileUrl: url,
    publicId,
    originalName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    fileHash,
    status: 'UNDER_REVIEW',
  },
});
```

- [ ] **Step 4: Return hash in the API response**

```ts
return NextResponse.json({
  ok: true,
  proof: {
    id: createdProof.id,
    fileUrl: createdProof.fileUrl,
    originalName: createdProof.originalName,
    mimeType: createdProof.mimeType,
    fileSize: createdProof.fileSize,
    fileHash: createdProof.fileHash,
    status: createdProof.status,
  },
});
```

### Task 4: Display proof hash in the UI

**Files:**

- Modify: `src/components/ui/TenantAgreementSignatureProofUploader.tsx`
- Modify: `src/components/ui/LandlordAgreementSignatureProofReview.tsx`
- Modify page data includes if needed:
  - `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
  - `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`

- [ ] **Step 1: Add `fileHash` to proof TypeScript types**

```ts
type AgreementSignatureProof = {
  id: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileHash?: string | null;
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
};
```

- [ ] **Step 2: Render hash when available**

Use a small monospace line in the proof detail panel.

```tsx
{proof.fileHash && (
  <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
    <p className="text-xs font-medium text-gray-500">Uploaded file SHA-256</p>
    <p className="mt-1 break-all font-mono text-xs text-gray-700">
      {proof.fileHash}
    </p>
  </div>
)}
```

### Task 5: Manual verification

**Files:**

- Verify: proof upload endpoint
- Verify: tenant proof UI
- Verify: landlord proof review UI

- [ ] Upload a valid signed proof file.
- [ ] Confirm the database record has a 64-character `fileHash`.
- [ ] Confirm the tenant UI shows the hash after upload.
- [ ] Confirm the landlord review UI shows the same hash.
- [ ] Reject the proof and confirm the hash remains unchanged.
- [ ] Re-upload a different proof and confirm the new record has a different hash.

## FYP Report Note

This feature improves document integrity by storing a cryptographic fingerprint of each uploaded signed agreement proof. The system does not verify whether the handwritten signature is genuine; it only proves that the uploaded proof file can be uniquely identified after upload.
