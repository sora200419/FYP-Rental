# KYC Face Scan Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain KYC Step 3 camera view with an oval face-guide + CSS scan animation, and enable real AWS Rekognition face comparison (remove mock).

**Architecture:** Two independent file changes — `rekognition.ts` removes the env-flag mock so `compareFaces` always calls real AWS; `KycWizard.tsx` replaces the plain `<video>` block with a relative container holding the video, an SVG overlay with an oval cutout and border, and a CSS-animated scan-line div. No new packages, no schema changes, no API changes.

**Tech Stack:** React (client component), Tailwind CSS, SVG, CSS `@keyframes`, AWS SDK v3 Rekognition

---

## File Map

| File | Change |
|------|--------|
| `src/lib/rekognition.ts` | Delete mock constant + env guard (5 lines) |
| `src/components/kyc/KycWizard.tsx` | Replace camera-active block lines 175–188 (~14 lines → ~45 lines) |

---

## Task 1: Remove the Rekognition mock

**Files:**
- Modify: `src/lib/rekognition.ts`

- [ ] **Step 1: Open the file and confirm what you are deleting**

  `src/lib/rekognition.ts` currently reads:

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
  ```

  You will delete line 3 (`const MOCK_SCORE`) and lines 9–11 (the `if` block).

- [ ] **Step 2: Replace the entire file with the mock-free version**

  Write `src/lib/rekognition.ts` as:

  ```typescript
  import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

  export async function compareFaces(
    sourceImageBytes: Buffer,
    targetImageBytes: Buffer,
  ): Promise<number> {
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

    try {
      const response = await client.send(command);
      const matches = response.FaceMatches ?? [];
      if (matches.length === 0) return 0;
      return matches[0].Similarity ?? 0;
    } catch (err) {
      console.error('[rekognition] compareFaces failed:', err);
      return 0;
    }
  }
  ```

- [ ] **Step 3: Verify the build passes**

  ```bash
  npm run build
  ```

  Expected: build completes with no TypeScript errors. If you see `Cannot find name 'MOCK_SCORE'` the deletion was incomplete — check step 2.

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/rekognition.ts
  git commit -m "feat: enable real AWS Rekognition face comparison, remove mock"
  ```

---

## Task 2: Oval guide + scan animation on Step 3 camera view

**Files:**
- Modify: `src/components/kyc/KycWizard.tsx` lines 175–188

**Geometry reference** (needed to understand the code below):
- Container: `w-64 h-64` = 256 × 256 px
- SVG `viewBox="0 0 256 256"`
- Oval centre: `cx="128" cy="128"`, `rx="80" ry="100"` → 160 px wide, 200 px tall
- Oval top edge: `cy − ry = 128 − 100 = 28 px` from container top
- Oval bottom edge: `cy + ry = 128 + 100 = 228 px`
- Scan-line travel: 200 px (28 → 228)
- Scan-line horizontal span: 160 px (`2 × rx`), centred → `left: calc(50% − 80px)`

- [ ] **Step 1: Locate the exact block to replace**

  In `src/components/kyc/KycWizard.tsx`, find the `cameraActive` branch starting at line 175. It currently reads:

  ```tsx
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
  ```

- [ ] **Step 2: Replace that block with the oval-guide version**

  Replace the entire block above with:

  ```tsx
  ) : cameraActive ? (
    <div className="mb-4 text-center">
      <style>{`
        @keyframes kyc-scan {
          0%   { transform: translateY(0px);   opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { transform: translateY(200px); opacity: 0; }
        }
      `}</style>

      {/* Camera container — video + SVG overlay + scan line */}
      <div className="relative mx-auto w-64 h-64">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full rounded-xl object-cover"
        />

        {/* Dark overlay with oval face cutout */}
        <svg
          className="absolute inset-0 w-full h-full rounded-xl pointer-events-none"
          viewBox="0 0 256 256"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="face-oval-mask">
              <rect width="256" height="256" fill="white" />
              <ellipse cx="128" cy="128" rx="80" ry="100" fill="black" />
            </mask>
          </defs>
          {/* Semi-transparent dark layer with oval hole */}
          <rect
            width="256"
            height="256"
            fill="rgba(0,0,0,0.55)"
            mask="url(#face-oval-mask)"
          />
          {/* White oval border */}
          <ellipse
            cx="128"
            cy="128"
            rx="80"
            ry="100"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeOpacity="0.7"
          />
        </svg>

        {/* Animated scan line — sweeps inside the oval top-to-bottom */}
        <div
          className="absolute pointer-events-none h-1 rounded-full bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
          style={{
            top: '28px',
            left: 'calc(50% - 80px)',
            width: '160px',
            animation: 'kyc-scan 2s linear infinite',
          }}
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <p className="mt-3 text-xs text-gray-400">Position your face inside the oval</p>

      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={captureFrame}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Capture
        </button>
        <button
          onClick={stopCamera}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  ```

- [ ] **Step 3: Verify the build passes**

  ```bash
  npm run build
  ```

  Expected: build completes with no TypeScript or JSX errors. Common error to watch for: `stroke-width` must be camelCase `strokeWidth` in JSX — the code above already uses camelCase.

- [ ] **Step 4: Start the dev server and test manually**

  ```bash
  npm run dev
  ```

  Navigate to `http://localhost:3000/dashboard/kyc` (log in as a non-verified user first).

  **Checklist — work through all of these:**

  - [ ] Steps 1 and 2 (IC front/back upload) still work — upload a JPG and advance
  - [ ] Step 3 shows "Open Camera" and "Upload a photo instead" before camera opens
  - [ ] Clicking "Open Camera" prompts for camera permission and starts the feed
  - [ ] Dark overlay with oval cutout is visible — your face shows through the oval, edges are darkened
  - [ ] White oval border is visible around the face area
  - [ ] Blue scan line sweeps continuously from top to bottom of the oval, fading in/out at edges
  - [ ] "Position your face inside the oval" hint text appears below the camera
  - [ ] Pressing "Capture" takes a photo — the loading spinner is absent (capture is instant)
  - [ ] Preview image shows a clean photo with NO oval or overlay drawn on it
  - [ ] "Retake" button clears the photo and camera reopens with the oval guide again
  - [ ] "Upload a photo instead" still works (file picker opens, photo loads as preview)
  - [ ] "Back" button returns to Step 2
  - [ ] Pressing "Submit" with a selfie captured submits the form

- [ ] **Step 5: Verify real AWS score (requires dev server + all 4 env vars set)**

  Complete a full KYC submission with real IC photos and a selfie captured via the oval guide. Then check the database with Prisma Studio:

  ```bash
  npx prisma studio
  ```

  Open the `KycSubmission` table. Find the row you just created. The `faceMatchScore` column should be a real number — **not 85** (85 was the mock value). Any value from 0 to 100 confirms real AWS is running. A score above 80 with matching photos is a healthy result.

  If `faceMatchScore` is exactly `85.0`, the mock is still active — re-check that `KYC_REKOGNITION_MODE=aws` is in `.env` and that the dev server was restarted after editing `.env`.

  If `faceMatchScore` is `0`, the AWS call failed. Check the terminal logs for `[rekognition] compareFaces failed:` to see the error message (usually a credentials or permissions issue).

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/kyc/KycWizard.tsx
  git commit -m "feat: add oval face guide and scan animation to KYC Step 3"
  ```

---

## Done

Both tasks complete. The KYC page now shows a guided face-scan camera on Step 3, and every new submission stores a real AWS Rekognition similarity score instead of the mock 85.0.
