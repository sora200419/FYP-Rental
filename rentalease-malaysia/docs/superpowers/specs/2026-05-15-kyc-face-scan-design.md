# KYC Face Scan Upgrade — Design Spec

**Date:** 2026-05-15
**Status:** Approved

---

## Problem

The current KYC Step 3 (selfie) shows a plain camera feed with a single "Capture" button. There is no visual guide to help users position their face correctly, making it easy to submit a blurry or off-centre photo. The face-comparison backend (`rekognition.ts`) also runs in mock mode (always returns 85.0), so the `faceMatchScore` stored in the database is meaningless.

---

## Goal

1. Replace the plain camera view with a guided face-scan UI: an oval cutout overlay and a CSS scan-line animation that gives users clear positioning guidance and a polished "scanning" experience.
2. Enable real AWS Rekognition face comparison so the `faceMatchScore` on every new KYC submission reflects an actual biometric similarity score.

---

## Scope

### In scope
- `src/components/kyc/KycWizard.tsx` — Step 3 camera UI only
- `src/lib/rekognition.ts` — remove mock fallback, always call real AWS

### Out of scope
- Steps 1 and 2 (IC front/back upload) — unchanged
- `POST /api/kyc/submit` — unchanged
- Admin KYC review page — unchanged
- Liveness challenge (blink/turn head) — not this iteration
- Auto-capture on face detection — not this iteration

---

## Design

### 1. Frontend — KycWizard.tsx Step 3 camera view

**Layout structure (when camera is active):**

```
┌─────────────────────────────┐
│  [dark overlay]             │
│         ┌───────┐           │
│         │ face  │ ← oval    │
│         │ area  │  cutout   │
│         └───────┘           │
│  [scan line sweeps here]    │
│  Position your face inside  │
│  the oval                   │
└─────────────────────────────┘
        [ Capture ]  [ Cancel ]
```

**Implementation details:**

- The `<video>` element sits inside a `relative` container.
- An `<svg>` is `absolute inset-0` over the video. It draws:
  - A full-size dark semi-transparent rectangle (`fill="rgba(0,0,0,0.55)"`)
  - An ellipse `<clipPath>` that punches the oval cutout — the face area shows through clearly
- A `<div>` scan-line is `absolute` inside the oval bounds, animated with a Tailwind `@keyframes` class:
  - A thin horizontal gradient (`from-transparent via-blue-400/30 to-transparent`)
  - Sweeps from top to bottom of the oval in a 2-second loop (`animation: scan 2s linear infinite`)
- Hint text below the video: `"Position your face inside the oval"` in `text-xs text-gray-400`
- **Capture button** — behaviour unchanged. Calls existing `captureFrame()` which draws the raw `<video>` frame onto the hidden `<canvas>`. The SVG overlay is a DOM sibling and is never composited into the canvas — the submitted image is clean.
- **Cancel button** — behaviour unchanged, calls `stopCamera()`.

**States — no change to state machine:**
- `cameraActive: false` → show "Open Camera" + "Upload instead" (unchanged)
- `cameraActive: true` → show the new oval-guide camera view
- `selfie !== null` → show preview + "Retake" (unchanged)

**Retake flow** — unchanged. Clicking "Retake" clears `selfie`, user re-opens camera and sees the oval guide again.

---

### 2. Backend — rekognition.ts

**Remove the mock fallback:**

```typescript
// BEFORE
const MOCK_SCORE = 85.0;

export async function compareFaces(...): Promise<number> {
  if (process.env.KYC_REKOGNITION_MODE !== 'aws') {
    return MOCK_SCORE;
  }
  // ... real AWS call
}

// AFTER
export async function compareFaces(...): Promise<number> {
  // always calls real AWS
  const client = new RekognitionClient({ ... });
  // ...
}
```

**Error handling:**
- If the AWS call throws (missing credentials, network error, no face detected), log the error and return `0`.
- `faceMatchScore: 0` is stored in the `KycSubmission` record — the admin sees it during review and can treat it as a flag requiring closer manual inspection.
- A `0` score does **not** block the submission from reaching PENDING status. The admin is the decision-maker.

**AWS CompareFacesCommand — no changes needed:**
- Source: IC front image bytes (known face from document)
- Target: selfie image bytes (face to verify)
- `SimilarityThreshold: 0` — correct, returns all matches so the raw score is available regardless of confidence

---

## Environment Variables

All four must be present in `.env`:

```
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=<IAM user access key>
AWS_SECRET_ACCESS_KEY=<IAM user secret>
KYC_REKOGNITION_MODE=aws
```

The IAM user must have `rekognition:CompareFaces` permission (or `AmazonRekognitionReadOnlyAccess` policy).

> **Note:** After removing the mock, if these variables are missing the function returns `0` and logs a clear error — it will not crash the submission.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/kyc/KycWizard.tsx` | Replace Step 3 camera active view (~40 lines) |
| `src/lib/rekognition.ts` | Remove mock fallback (~5 lines deleted) |

No new files. No new packages. No schema changes. No API route changes.

---

## Testing Checklist

- [ ] Camera opens on Step 3 — oval guide and scan animation visible
- [ ] Oval cutout correctly frames a face-sized area
- [ ] Scan line animates continuously while camera is active
- [ ] Pressing Capture takes a clean photo (no oval drawn on the image)
- [ ] Retake clears the photo and reopens camera with oval guide
- [ ] Upload fallback ("Upload a photo instead") still works
- [ ] KYC submission reaches PENDING status successfully
- [ ] `faceMatchScore` in the database is a real value (not 85.0)
- [ ] Admin KYC review page shows the real score
- [ ] If AWS credentials are wrong, submission still saves with score `0`
