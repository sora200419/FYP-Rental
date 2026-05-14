# AI-Assisted KYC Identity Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-step KYC wizard (IC front, IC back, selfie) with AWS Rekognition face comparison and admin review, replacing the existing flat IC_COPY upload flow.

**Architecture:** New `KycSubmission` Prisma model stores 3 Cloudinary image URLs and the Rekognition similarity score. A multi-step React wizard collects the images client-side then calls `POST /api/kyc/submit` which uploads to Cloudinary, runs Rekognition (or returns mock score 85.0 in dev), and upserts the record. Admins review at `/dashboard/admin/kyc` and approve/reject via dedicated PATCH routes. Existing `User.isVerified` remains the canonical flag.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, Cloudinary (`src/lib/cloudinary.ts`), AWS Rekognition SDK (`@aws-sdk/client-rekognition`), NextAuth v4, Tailwind CSS v4

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/rekognition.ts` | `compareFaces(sourceBytes, targetBytes): Promise<number>` — mock or AWS |
| Modify | `src/lib/cloudinary.ts` | Add `uploadKycImage` and `deleteKycImage` |
| Create | `src/app/api/kyc/submit/route.ts` | POST — validate, Cloudinary upload, Rekognition, upsert KycSubmission |
| Create | `src/app/api/kyc/status/route.ts` | GET — return status + rejectedReason (no score) for current user |
| Create | `src/app/api/admin/kyc/route.ts` | GET — list PENDING submissions with score for admin |
| Create | `src/app/api/admin/kyc/[id]/approve/route.ts` | PATCH — set APPROVED, isVerified=true, notify user |
| Create | `src/app/api/admin/kyc/[id]/reject/route.ts` | PATCH — set REJECTED, store reason, notify user |
| Create | `src/components/kyc/KycWizard.tsx` | 3-step wizard client component |
| Create | `src/app/(dashboard)/dashboard/kyc/page.tsx` | KYC wizard page (server wrapper, auth guard) |
| Create | `src/app/(dashboard)/dashboard/admin/kyc/page.tsx` | Admin KYC review page |
| Modify | `prisma/schema.prisma` | Add KycSubmission model + KycStatus enum + 2 User relations |
| Modify | `src/components/ui/KycPendingBanner.tsx` | Handle no-submission / PENDING / REJECTED states |
| Modify | `src/app/(dashboard)/dashboard/profile/page.tsx` | Add "Verify Identity" CTA |
| Modify | `src/components/ui/AdminTabBar.tsx` | Update AdminNav KYC href → `/dashboard/admin/kyc` |
| Modify | `src/app/(dashboard)/dashboard/admin/users/page.tsx` | Read KYC badge from KycSubmission.status |
| Modify | `src/components/ui/TenantDocumentUploader.tsx` | Remove IC_COPY upload slot |

---

### Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add KycStatus enum and KycSubmission model**

At the bottom of `prisma/schema.prisma` (after the `AgreementChangeRequest` model), add:

```prisma
// ─── KYC SUBMISSION ──────────────────────────────────────────────────────────
// One submission per user. Resubmission (after REJECTED) upserts this record
// and deletes old Cloudinary images. faceMatchScore is admin-only — never
// returned to the submitting user.
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

  faceMatchScore  Float?
  status          KycStatus @default(PENDING)
  rejectedReason  String?   @db.Text

  reviewedById    String?
  reviewedBy      User?     @relation("KycReviewer", fields: [reviewedById], references: [id])
  reviewedAt      DateTime?
  submittedAt     DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum KycStatus {
  PENDING
  APPROVED
  REJECTED
}
```

- [ ] **Step 2: Add relations to User model**

In the `User` model, after the `kycRejectedReason` line, add these two lines:

```prisma
  kycSubmission            KycSubmission?   @relation("UserKyc")
  reviewedKycSubmissions   KycSubmission[]  @relation("KycReviewer")
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name add-kyc-submission
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add KycSubmission model and KycStatus enum"
```

---

### Task 2: Install SDK and set env vars

**Files:** `package.json` only

- [ ] **Step 1: Install**

```bash
npm install @aws-sdk/client-rekognition
```

- [ ] **Step 2: Add to .env (do NOT commit .env)**

```
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-southeast-1"
KYC_REKOGNITION_MODE="mock"
```

Keep `KYC_REKOGNITION_MODE=mock` during development. Set to `aws` only when real AWS credentials are available.

- [ ] **Step 3: Commit package files**

```bash
git add package.json package-lock.json
git commit -m "feat: add @aws-sdk/client-rekognition"
```

---

### Task 3: Add Cloudinary KYC helpers

**Files:**
- Modify: `src/lib/cloudinary.ts`

- [ ] **Step 1: Append two functions at the end of `src/lib/cloudinary.ts`**

```typescript
export async function uploadKycImage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; publicId: string }> {
  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'rentalease/kyc',
    public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
    resource_type: 'image',
    transformation: [{ quality: 'auto' }, { width: 1920, crop: 'limit' }],
  });

  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteKycImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cloudinary.ts
git commit -m "feat: add uploadKycImage and deleteKycImage to Cloudinary lib"
```

---

### Task 4: Create Rekognition lib

**Files:**
- Create: `src/lib/rekognition.ts`

- [ ] **Step 1: Create the file**

```typescript
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

const MOCK_SCORE = 85.0;

export async function compareFaces(
  sourceImageBytes: Buffer,
  targetImageBytes: Buffer,
): Promise<number> {
  if (process.env.KYC_REKOGNITION_MODE !== 'aws') {
    return MOCK_SCORE;
  }

  const client = new RekognitionClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const command = new CompareFacesCommand({
    SourceImage: { Bytes: sourceImageBytes },
    TargetImage: { Bytes: targetImageBytes },
    SimilarityThreshold: 0,
  });

  const response = await client.send(command);
  const matches = response.FaceMatches ?? [];
  if (matches.length === 0) return 0;
  return matches[0].Similarity ?? 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/rekognition.ts
git commit -m "feat: add Rekognition compareFaces with mock/aws mode"
```

---

### Task 5: Create POST /api/kyc/submit

**Files:**
- Create: `src/app/api/kyc/submit/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadKycImage, deleteKycImage } from '@/lib/cloudinary';
import { compareFaces } from '@/lib/rekognition';
import { createNotification } from '@/lib/notifications';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role === 'ADMIN')
    return NextResponse.json({ error: 'Admins do not submit KYC' }, { status: 403 });

  const existing = await prisma.kycSubmission.findUnique({
    where: { userId: session.user.id },
  });

  if (existing?.status === 'PENDING')
    return NextResponse.json(
      { error: 'Your identity verification is already under review.' },
      { status: 409 },
    );
  if (existing?.status === 'APPROVED')
    return NextResponse.json({ error: 'Your identity is already verified.' }, { status: 409 });

  const formData = await request.formData();
  const icFront = formData.get('icFront') as File | null;
  const icBack = formData.get('icBack') as File | null;
  const selfie = formData.get('selfie') as File | null;

  if (!icFront || !icBack || !selfie)
    return NextResponse.json({ error: 'All three images are required' }, { status: 400 });

  for (const [label, file] of [['IC front', icFront], ['IC back', icBack], ['selfie', selfie]] as [string, File][]) {
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: `${label}: only JPG and PNG are accepted` }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: `${label}: file must be under 10 MB` }, { status: 400 });
  }

  if (existing?.status === 'REJECTED') {
    await Promise.allSettled([
      deleteKycImage(existing.icFrontPublicId),
      deleteKycImage(existing.icBackPublicId),
      deleteKycImage(existing.selfiePublicId),
    ]);
  }

  const [icFrontBytes, icBackBytes, selfieBytes] = await Promise.all([
    icFront.arrayBuffer().then(Buffer.from),
    icBack.arrayBuffer().then(Buffer.from),
    selfie.arrayBuffer().then(Buffer.from),
  ]);

  const [icFrontResult, icBackResult, selfieResult] = await Promise.all([
    uploadKycImage(icFrontBytes, icFront.name, icFront.type),
    uploadKycImage(icBackBytes, icBack.name, icBack.type),
    uploadKycImage(selfieBytes, selfie.name, selfie.type),
  ]);

  const faceMatchScore = await compareFaces(icFrontBytes, selfieBytes);

  await prisma.kycSubmission.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      icFrontUrl: icFrontResult.url,
      icFrontPublicId: icFrontResult.publicId,
      icBackUrl: icBackResult.url,
      icBackPublicId: icBackResult.publicId,
      selfieUrl: selfieResult.url,
      selfiePublicId: selfieResult.publicId,
      faceMatchScore,
      status: 'PENDING',
    },
    update: {
      icFrontUrl: icFrontResult.url,
      icFrontPublicId: icFrontResult.publicId,
      icBackUrl: icBackResult.url,
      icBackPublicId: icBackResult.publicId,
      selfieUrl: selfieResult.url,
      selfiePublicId: selfieResult.publicId,
      faceMatchScore,
      status: 'PENDING',
      rejectedReason: null,
      reviewedById: null,
      reviewedAt: null,
      submittedAt: new Date(),
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification(
        admin.id,
        'KYC_SUBMITTED',
        'New KYC submission',
        `${session.user.name} has submitted identity verification documents for review.`,
        '/dashboard/admin/kyc',
      ),
    ),
  );

  return NextResponse.json({ status: 'PENDING' });
}
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`. Log in as a TENANT or LANDLORD. Open browser devtools → Network tab. POST to `/api/kyc/submit` with 3 dummy JPG files via a quick `fetch` in the console:

```javascript
const fd = new FormData();
// attach 3 small test JPG blobs named icFront, icBack, selfie
// Expected response: { "status": "PENDING" }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/kyc/
git commit -m "feat: add POST /api/kyc/submit"
```

---

### Task 6: Create GET /api/kyc/status

**Files:**
- Create: `src/app/api/kyc/status/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const submission = await prisma.kycSubmission.findUnique({
    where: { userId: session.user.id },
    select: { status: true, rejectedReason: true, submittedAt: true },
  });

  if (!submission) return NextResponse.json({ status: null });

  return NextResponse.json({
    status: submission.status,
    rejectedReason: submission.rejectedReason,
    submittedAt: submission.submittedAt,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/kyc/status/route.ts
git commit -m "feat: add GET /api/kyc/status"
```

---

### Task 7: Create admin KYC API routes

**Files:**
- Create: `src/app/api/admin/kyc/route.ts`
- Create: `src/app/api/admin/kyc/[id]/approve/route.ts`
- Create: `src/app/api/admin/kyc/[id]/reject/route.ts`

- [ ] **Step 1: Create GET /api/admin/kyc**

Create `src/app/api/admin/kyc/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const submissions = await prisma.kycSubmission.findMany({
    where: { status: 'PENDING' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { submittedAt: 'asc' },
  });

  return NextResponse.json({ submissions });
}
```

- [ ] **Step 2: Create PATCH /api/admin/kyc/[id]/approve**

Create `src/app/api/admin/kyc/[id]/approve/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendKycApprovedEmail } from '@/lib/email';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const submission = await prisma.kycSubmission.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.status !== 'PENDING')
    return NextResponse.json({ error: 'Submission is not pending' }, { status: 409 });

  await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { id },
      data: { status: 'APPROVED', reviewedById: session.user.id, reviewedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: submission.userId },
      data: { isVerified: true, kycRejectedReason: null },
    }),
  ]);

  sendKycApprovedEmail(submission.user.email, submission.user.name);

  await createNotification(
    submission.userId,
    'ACCOUNT_VERIFIED',
    'Identity verified',
    `Welcome, ${submission.user.name}! Your identity has been verified. You can now use all features on RentalEase.`,
    submission.user.role === 'LANDLORD' ? '/dashboard/landlord/properties' : '/dashboard/tenant',
  );

  return NextResponse.json({ message: 'KYC approved' });
}
```

- [ ] **Step 3: Create PATCH /api/admin/kyc/[id]/reject**

Create `src/app/api/admin/kyc/[id]/reject/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendKycRejectedEmail } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const reason = (body.reason as string)?.trim();
  if (!reason)
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });

  const submission = await prisma.kycSubmission.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.status !== 'PENDING')
    return NextResponse.json({ error: 'Submission is not pending' }, { status: 409 });

  await prisma.kycSubmission.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedReason: reason,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  sendKycRejectedEmail(submission.user.email, submission.user.name, reason);

  await createNotification(
    submission.userId,
    'ACCOUNT_KYC_REJECTED',
    'Identity verification rejected',
    `Your identity verification was not approved. Reason: ${reason}. Please resubmit with clearer photos.`,
    '/dashboard/kyc',
  );

  return NextResponse.json({ message: 'KYC rejected' });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/kyc/
git commit -m "feat: add admin KYC API routes (list, approve, reject)"
```

---

### Task 8: Create KycWizard component

**Files:**
- Create: `src/components/kyc/KycWizard.tsx`

- [ ] **Step 1: Create `src/components/kyc/KycWizard.tsx`**

```tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3;
interface ImageFile { file: File; preview: string; }

export default function KycWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [icFront, setIcFront] = useState<ImageFile | null>(null);
  const [icBack, setIcBack] = useState<ImageFile | null>(null);
  const [selfie, setSelfie] = useState<ImageFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  function handleFile(file: File, setter: (img: ImageFile) => void) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG files are accepted.'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB.'); return;
    }
    setError(null);
    setter({ file, preview: URL.createObjectURL(file) });
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setError('Could not access camera. Please upload a photo instead.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelfie({ file, preview: URL.createObjectURL(blob) });
      stopCamera();
    }, 'image/jpeg', 0.9);
  }

  async function handleSubmit() {
    if (!icFront || !icBack || !selfie) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('icFront', icFront.file);
      body.append('icBack', icBack.file);
      body.append('selfie', selfie.file);
      const res = await fetch('/api/kyc/submit', { method: 'POST', body });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Submission failed');
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Verification submitted</h2>
        <p className="mt-1 text-sm text-gray-500">
          An admin will review your documents and you&apos;ll be notified once approved.
        </p>
        <a href="/dashboard/profile" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Back to profile
        </a>
      </div>
    );
  }

  const stepLabels = ['IC Front', 'IC Back', 'Selfie'];

  return (
    <div className="max-w-lg">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`h-0.5 w-12 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">{stepLabels[step - 1]}</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 1 && (
        <UploadStep
          title="Step 1 — IC Front"
          description="Upload a clear photo of the front of your Malaysian MyKad (JPG or PNG, max 10 MB)."
          value={icFront}
          onChange={(f) => handleFile(f, setIcFront)}
          onNext={() => { setError(null); setStep(2); }}
          canNext={!!icFront}
        />
      )}

      {step === 2 && (
        <UploadStep
          title="Step 2 — IC Back"
          description="Upload a clear photo of the back of your Malaysian MyKad (JPG or PNG, max 10 MB)."
          value={icBack}
          onChange={(f) => handleFile(f, setIcBack)}
          onNext={() => { setError(null); setStep(3); }}
          onBack={() => setStep(1)}
          canNext={!!icBack}
        />
      )}

      {step === 3 && (
        <div>
          <h2 className="mb-1 text-base font-semibold text-gray-900">Step 3 — Selfie</h2>
          <p className="mb-4 text-sm text-gray-500">
            Take a selfie so we can verify your face matches your IC photo.
          </p>

          {selfie ? (
            <div className="mb-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selfie.preview} alt="Selfie preview" className="mx-auto h-48 w-48 rounded-xl border border-gray-200 object-cover" />
              <button onClick={() => setSelfie(null)} className="mt-2 block mx-auto text-xs text-red-500 hover:text-red-700">
                Retake
              </button>
            </div>
          ) : cameraActive ? (
            <div className="mb-4 text-center">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} autoPlay playsInline className="mx-auto h-64 w-64 rounded-xl border border-gray-200 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="mt-3 flex justify-center gap-2">
                <button onClick={captureFrame} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Capture
                </button>
                <button onClick={stopCamera} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex flex-col items-center gap-3">
              <button onClick={startCamera} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Open Camera
              </button>
              <p className="text-xs text-gray-400">or</p>
              <label className="cursor-pointer text-sm text-blue-600 hover:underline">
                Upload a photo instead
                <input type="file" accept="image/jpeg,image/png" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, setSelfie); }} />
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { stopCamera(); setStep(2); }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Back
            </button>
            <button onClick={handleSubmit} disabled={!selfie || submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface UploadStepProps {
  title: string; description: string; value: ImageFile | null;
  onChange: (f: File) => void; onNext: () => void; onBack?: () => void; canNext: boolean;
}

function UploadStep({ title, description, value, onChange, onNext, onBack, canNext }: UploadStepProps) {
  return (
    <div>
      <h2 className="mb-1 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 text-sm text-gray-500">{description}</p>

      <label className="block cursor-pointer">
        <input type="file" accept="image/jpeg,image/png" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.preview} alt="Preview" className="mx-auto h-48 w-full max-w-xs rounded-xl border border-gray-200 object-cover" />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400">
            <svg className="mx-auto mb-2 h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">Click to upload (JPG or PNG, max 10 MB)</p>
          </div>
        )}
      </label>

      {value && (
        <label className="mt-2 block cursor-pointer text-center text-xs text-gray-400 hover:text-gray-600">
          Replace photo
          <input type="file" accept="image/jpeg,image/png" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
        </label>
      )}

      <div className="mt-6 flex gap-2">
        {onBack && (
          <button onClick={onBack} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            Back
          </button>
        )}
        <button onClick={onNext} disabled={!canNext}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          Next
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kyc/
git commit -m "feat: add KycWizard 3-step component"
```

---

### Task 9: Create /dashboard/kyc page

**Files:**
- Create: `src/app/(dashboard)/dashboard/kyc/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KycWizard from '@/components/kyc/KycWizard';

export default async function KycPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role === 'ADMIN') redirect('/dashboard/admin');

  const submission = await prisma.kycSubmission.findUnique({
    where: { userId: session.user.id },
    select: { status: true, rejectedReason: true },
  });

  if (submission?.status === 'APPROVED') redirect('/dashboard/profile');
  if (submission?.status === 'PENDING') {
    return (
      <div className="max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="font-semibold text-blue-800 text-sm">Under review</p>
          <p className="mt-0.5 text-xs text-blue-700">
            Your documents have been submitted and are being reviewed by an admin. You&apos;ll receive a notification once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
        <p className="mt-1 text-sm text-gray-500">
          Verify your identity to unlock full platform access. All documents are stored securely in accordance with PDPA 2010.
        </p>
      </div>

      {submission?.status === 'REJECTED' && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-800 text-sm">Previous submission rejected</p>
          <p className="mt-0.5 text-xs text-red-700">{submission.rejectedReason}</p>
          <p className="mt-1 text-xs text-red-600">Please resubmit with clearer photos.</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <KycWizard />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`. Navigate to `http://localhost:3000/dashboard/kyc` as a logged-in TENANT or LANDLORD. Verify the wizard loads and the 3-step UI renders correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/kyc/
git commit -m "feat: add /dashboard/kyc wizard page"
```

---

### Task 10: Create admin KYC review page

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/kyc/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import { AdminNav } from '@/components/ui/AdminTabBar';
import { PageHeader } from '@/components/ui/RedesignPrimitives';
import AdminKycActions from './AdminKycActions';

function scoreLabel(score: number | null) {
  if (score === null) return { text: 'No score', cls: 'bg-gray-100 text-gray-500' };
  if (score >= 80) return { text: `${score.toFixed(1)}% — High confidence`, cls: 'bg-green-100 text-green-700' };
  if (score >= 60) return { text: `${score.toFixed(1)}% — Moderate`, cls: 'bg-amber-100 text-amber-700' };
  return { text: `${score.toFixed(1)}% — Low confidence`, cls: 'bg-red-100 text-red-700' };
}

export default async function AdminKycPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard/admin');

  const submissions = await prisma.kycSubmission.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { submittedAt: 'asc' },
  });

  return (
    <div className="max-w-4xl">
      <AdminNav active="kyc" />
      <PageHeader
        eyebrow="Admin"
        title="KYC Review"
        description="Review identity verification submissions. Face match score is AI-assisted — you make the final decision."
      />

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="font-semibold text-gray-700">No pending submissions</p>
          <p className="mt-1 text-sm text-gray-400">New KYC submissions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const score = scoreLabel(sub.faceMatchScore);
            return (
              <div key={sub.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{sub.user.name}</p>
                    <p className="text-xs text-gray-500">{sub.user.email}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {sub.user.role} · Submitted{' '}
                      {new Date(sub.submittedAt).toLocaleDateString('en-MY', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${score.cls}`}>
                    {score.text}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { url: sub.icFrontUrl, label: 'IC Front' },
                    { url: sub.icBackUrl, label: 'IC Back' },
                    { url: sub.selfieUrl, label: 'Selfie' },
                  ].map(({ url, label }) => (
                    <a key={label} href={url} target="_blank" rel="noreferrer" className="group block">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        <Image src={url} alt={label} fill className="object-cover group-hover:opacity-90 transition-opacity" sizes="200px" />
                      </div>
                      <p className="mt-1 text-center text-xs text-gray-400">{label}</p>
                    </a>
                  ))}
                </div>

                <AdminKycActions submissionId={sub.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(dashboard)/dashboard/admin/kyc/AdminKycActions.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props { submissionId: string; }

export default function AdminKycActions({ submissionId }: Props) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/${submissionId}/approve`, { method: 'PATCH' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) { setError('Reason is required'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/${submissionId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      {rejecting ? (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button onClick={() => { setRejecting(false); setReason(''); setError(null); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleReject} disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Rejecting…' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={handleApprove} disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Approving…' : 'Approve'}
          </button>
          <button onClick={() => setRejecting(true)} disabled={loading}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Navigate to `http://localhost:3000/dashboard/admin/kyc` as ADMIN. Submit a KYC as a test user first, then verify the submission card shows the 3 images, score badge, and Approve/Reject buttons.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/admin/kyc/
git commit -m "feat: add admin KYC review page with approve/reject"
```

---

### Task 11: Update KycPendingBanner

**Files:**
- Modify: `src/components/ui/KycPendingBanner.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import Link from 'next/link';

type KycState = 'none' | 'PENDING' | 'REJECTED';

interface Props {
  role: string;
  kycState: KycState;
  rejectedReason?: string | null;
}

export default function KycPendingBanner({ role, kycState, rejectedReason }: Props) {
  if (kycState === 'PENDING') {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="font-semibold">Identity verification under review</p>
          <p className="mt-0.5 text-xs text-blue-700">
            An admin is reviewing your submission. You&apos;ll be notified once approved.
          </p>
        </div>
      </div>
    );
  }

  if (kycState === 'REJECTED') {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <p className="font-semibold">Identity verification rejected</p>
          {rejectedReason && <p className="mt-0.5 text-xs text-red-700">{rejectedReason}</p>}
          <Link href="/dashboard/kyc" className="mt-1 inline-block text-xs font-medium underline hover:text-red-900">
            Resubmit verification
          </Link>
        </div>
      </div>
    );
  }

  // kycState === 'none'
  const detail =
    role === 'LANDLORD'
      ? 'You cannot add properties or invite tenants until your identity is approved.'
      : 'You cannot accept tenancy invitations until your identity is approved.';

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="flex-1">
        <p className="font-semibold">Identity verification required</p>
        <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
          {detail}{' '}
          <Link href="/dashboard/kyc" className="font-medium underline hover:text-amber-900">
            Verify your identity
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/KycPendingBanner.tsx
git commit -m "feat: update KycPendingBanner for none/PENDING/REJECTED states"
```

---

### Task 12: Update dashboard layout and profile page

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(dashboard)/dashboard/profile/page.tsx`

- [ ] **Step 1: Update `src/app/(dashboard)/layout.tsx` to pass kycState to banner**

`KycPendingBanner` is rendered on line 27 of this file with only a `role` prop. Update the layout to also query `KycSubmission` and pass `kycState` + `rejectedReason`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KycPendingBanner from '@/components/ui/KycPendingBanner';
import DashboardShell from '@/components/ui/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  let isVerified = true;
  let kycState: 'none' | 'PENDING' | 'REJECTED' = 'none';
  let rejectedReason: string | null = null;

  if (session.user.role !== 'ADMIN') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isVerified: true,
        kycSubmission: { select: { status: true, rejectedReason: true } },
      },
    });
    isVerified = user?.isVerified ?? false;
    const sub = user?.kycSubmission;
    if (sub?.status === 'PENDING') kycState = 'PENDING';
    else if (sub?.status === 'REJECTED') { kycState = 'REJECTED'; rejectedReason = sub.rejectedReason ?? null; }
  }

  return (
    <DashboardShell>
      {!isVerified && (
        <KycPendingBanner role={session.user.role} kycState={kycState} rejectedReason={rejectedReason} />
      )}
      {children}
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Add KycSubmission query to profile page**

In `src/app/(dashboard)/dashboard/profile/page.tsx`, after the `tenantDocuments` query, add:

```typescript
  const kycSubmission = await prisma.kycSubmission.findUnique({
    where: { userId: session.user.id },
    select: { status: true, rejectedReason: true },
  });
```

Also add a "Verify Identity" CTA in the profile page's Account Overview card when `kycSubmission` is null:

Find the `Verification` row in the grid and update it:

```tsx
          <div>
            <p className="text-gray-400">Verification</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p className={`font-medium ${
                isVerified ? 'text-green-600'
                : kycSubmission?.status === 'PENDING' ? 'text-blue-600'
                : kycSubmission?.status === 'REJECTED' ? 'text-red-600'
                : 'text-amber-600'
              }`}>
                {isVerified ? 'Verified'
                  : kycSubmission?.status === 'PENDING' ? 'Under review'
                  : kycSubmission?.status === 'REJECTED' ? 'Rejected'
                  : 'Not started'}
              </p>
              {!isVerified && !kycSubmission && (
                <a href="/dashboard/kyc" className="text-xs text-blue-600 hover:underline font-medium">
                  Verify now →
                </a>
              )}
              {kycSubmission?.status === 'REJECTED' && (
                <a href="/dashboard/kyc" className="text-xs text-red-600 hover:underline font-medium">
                  Resubmit →
                </a>
              )}
            </div>
          </div>
```

- [ ] **Step 2: Manual verification**

Visit `/dashboard/profile` as an unverified user. Confirm the "Verify now →" link appears and navigates to `/dashboard/kyc`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/profile/page.tsx
git commit -m "feat: add KYC state to profile page"
```

---

### Task 13: Update AdminNav KYC link

**Files:**
- Modify: `src/components/ui/AdminTabBar.tsx`

- [ ] **Step 1: Update the KYC href in AdminNav**

In `src/components/ui/AdminTabBar.tsx`, find the `AdminNav` function. Change the KYC anchor href from `/dashboard/admin/verify` to `/dashboard/admin/kyc`:

```tsx
      <a href="/dashboard/admin/kyc" className={`${base} ${active === 'kyc' ? activeClass : inactiveClass}`}>
        KYC
      </a>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/AdminTabBar.tsx
git commit -m "feat: update AdminNav KYC link to /dashboard/admin/kyc"
```

---

### Task 14: Update admin users KYC badge

**Files:**
- Modify: `src/app/(dashboard)/dashboard/admin/users/page.tsx`

- [ ] **Step 1: Update the query to include kycSubmission**

In the `prisma.user.findMany` call inside `AdminUsersPage`, replace the `tenantDocuments` include with `kycSubmission`:

```typescript
        kycSubmission: { select: { status: true } },
```

Remove the existing:
```typescript
        tenantDocuments: { select: { id: true }, take: 1 },
```

- [ ] **Step 2: Update getKycBadge to use KycSubmission status**

Replace the existing `getKycBadge` function:

```typescript
function getKycBadge(isVerified: boolean, kycStatus: string | null) {
  if (isVerified) return { label: 'Verified', cls: 'bg-green-100 text-green-700' };
  if (kycStatus === 'PENDING') return { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
  if (kycStatus === 'REJECTED') return { label: 'Rejected', cls: 'bg-red-100 text-red-700' };
  return { label: 'Unverified', cls: 'bg-gray-100 text-gray-500' };
}
```

- [ ] **Step 3: Update the call site**

Find where `getKycBadge` is called. Change:
```typescript
const kyc = getKycBadge(user.isVerified, user.tenantDocuments.length > 0);
```
to:
```typescript
const kyc = getKycBadge(user.isVerified, user.kycSubmission?.status ?? null);
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/admin/users/page.tsx
git commit -m "feat: update admin users KYC badge to read from KycSubmission"
```

---

### Task 15: Remove IC_COPY slot from TenantDocumentUploader

**Files:**
- Modify: `src/components/ui/TenantDocumentUploader.tsx`

- [ ] **Step 1: Remove the IC_COPY DocumentSlot**

In `src/components/ui/TenantDocumentUploader.tsx`, remove the `DocumentSlot` block for `IC_COPY`:

Delete these lines (approximately lines 213–221):
```tsx
      <DocumentSlot
        type="IC_COPY"
        label="IC / NRIC Copy"
        description="Front and back of your Malaysian identity card. Accepted: JPG, PNG, WebP, PDF (max 10 MB)"
        doc={getDoc('IC_COPY')}
        onUpload={handleUpload}
        onDelete={(id) => handleDelete(id, 'IC_COPY')}
        isUploading={uploadingType === 'IC_COPY'}
      />
```

Replace the security notice text to reflect that IC verification is now handled separately:

```tsx
        <p className="text-xs text-blue-700 leading-relaxed">
          Your income proof document is stored securely and only visible to landlords with an active tenancy relationship with you. Access is automatically revoked when the tenancy ends — in accordance with PDPA data minimisation principles.
        </p>
```

Also update the `handleDelete` call signature — remove the `type` parameter since only `INCOME_PROOF` remains. Find `onDelete={(id) => handleDelete(id, 'INCOME_PROOF')}` and verify it still works (it already passes the type explicitly).

- [ ] **Step 2: Manual verification**

Navigate to `/dashboard/profile` as a tenant. Confirm only "Income Proof" slot appears — no IC Copy slot.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TenantDocumentUploader.tsx
git commit -m "feat: remove IC_COPY slot from TenantDocumentUploader (replaced by KYC wizard)"
```

---

## End-to-end test checklist

After all tasks are complete, verify these flows manually:

- [ ] Unverified user visits `/dashboard/kyc`, completes 3 steps, submits → confirmation screen shown
- [ ] Admin sees new submission at `/dashboard/admin/kyc` with 3 images and score badge
- [ ] Admin approves → user's `isVerified` becomes true → `KycPendingBanner` disappears
- [ ] Admin rejects with reason → user sees red banner with reason + "Resubmit" link
- [ ] User resubmits after rejection → old Cloudinary images deleted, new record created, status resets to PENDING
- [ ] PENDING user visits `/dashboard/kyc` → sees "Under review" message, cannot submit again
- [ ] `/dashboard/profile` shows correct verification status for all 4 states (not started / pending / rejected / verified)
- [ ] Admin users page KYC badge shows Pending/Rejected/Verified correctly
