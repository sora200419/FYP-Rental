# AI Terms Sync at Finalization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a landlord finalizes a tenancy agreement, AI automatically extracts key terms (dates, rent, deposit) from the agreement text, shows them for required landlord review, and writes the confirmed values into the system records atomically — replacing all manual "Correct" buttons.

**Architecture:** New `extractAgreementTerms` Gemini function feeds a new `POST /api/agreements/[id]/extract-terms` read-only endpoint. The landlord confirms values in a new `AgreementFinalizeStep` client component, which then calls the existing finalize endpoint extended to accept and atomically apply `confirmedTerms`. Cleanup tasks remove the now-redundant EditRentAmount/EditDepositAmount components and sync reminder.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma, Google Gemini (`gemini-2.5-flash`), Tailwind CSS v4, `@google/generative-ai`.

---

## File Map

| Action | File |
|---|---|
| Modify | `src/lib/gemini.ts` — add `ExtractedTerms` interface + `extractAgreementTerms` |
| Create | `src/app/api/agreements/[id]/extract-terms/route.ts` |
| Modify | `src/app/api/agreements/[id]/finalize/route.ts` |
| Create | `src/components/ui/AgreementFinalizeStep.tsx` |
| Modify | `src/components/ui/AgreementViewer.tsx` |
| Modify | `src/components/ui/AgreementEditor.tsx` |
| Modify | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx` |
| Modify | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx` |
| Modify | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditTenancyTerms.tsx` |
| Delete | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditRentAmount.tsx` |
| Delete | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditDepositAmount.tsx` |
| Delete | `src/app/api/tenancies/[id]/rent-amount/route.ts` |
| Delete | `src/app/api/tenancies/[id]/deposit-amount/route.ts` |

---

### Task 1: Add `extractAgreementTerms` to gemini.ts

**Files:**
- Modify: `src/lib/gemini.ts`

Context: `gemini.ts` already exports `generateTenancyAgreement`, `analyzeAgreementContent`, and `translateAgreementOutputs`. The `cleanGeminiJson` helper and `genAI`/`GEMINI_MODEL` constants are already defined in scope. Add the new export at the bottom of the file, after `translateAgreementOutputs`.

- [ ] **Step 1: Add `ExtractedTerms` interface and `extractAgreementTerms` function to `src/lib/gemini.ts`**

Open `src/lib/gemini.ts`. Scroll to the end of the file (after the closing brace of `translateAgreementOutputs`). Add the following two exports:

```typescript
export interface ExtractedTerms {
  startDate: string | null;     // ISO YYYY-MM-DD or null if AI couldn't determine
  endDate: string | null;
  monthlyRent: number | null;   // plain number in RM, or null
  depositAmount: number | null; // plain number in RM, or null
}

/**
 * Reads a tenancy agreement's raw text and extracts the four key operational
 * terms. Uses a small Gemini call (maxOutputTokens: 256) since the output is
 * just a tiny JSON object.
 *
 * Returns null for any field the model cannot determine with confidence.
 * The caller is responsible for falling back to current system values when null.
 */
export async function extractAgreementTerms(
  rawContent: string,
): Promise<ExtractedTerms> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 256,
    },
  });

  const prompt = `You are a legal document parser for Malaysian tenancy agreements.
Extract the following key terms from the agreement text below.
Return a single JSON object with exactly these four keys:
  "startDate"     — tenancy commencement date as "YYYY-MM-DD", or null
  "endDate"       — tenancy expiry date as "YYYY-MM-DD", or null
  "monthlyRent"   — monthly rent amount as a plain number (no RM symbol), or null
  "depositAmount" — security deposit amount as a plain number (no RM symbol), or null

Rules:
- Return ONLY the JSON object. No explanation, no markdown fences.
- Dates MUST be in YYYY-MM-DD format (e.g. "2026-06-01").
- Amounts MUST be plain numbers (e.g. 1500.00, not "RM 1,500").
- If you cannot determine a value with confidence, return null for that key.

Agreement text:
${rawContent}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(cleanGeminiJson(text));

  return {
    startDate:
      typeof parsed.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.startDate)
        ? parsed.startDate
        : null,
    endDate:
      typeof parsed.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.endDate)
        ? parsed.endDate
        : null,
    monthlyRent:
      typeof parsed.monthlyRent === 'number' && parsed.monthlyRent > 0
        ? parsed.monthlyRent
        : null,
    depositAmount:
      typeof parsed.depositAmount === 'number' && parsed.depositAmount >= 0
        ? parsed.depositAmount
        : null,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gemini.ts
git commit -m "feat: add extractAgreementTerms Gemini function"
```

---

### Task 2: Create `POST /api/agreements/[id]/extract-terms`

**Files:**
- Create: `src/app/api/agreements/[id]/extract-terms/route.ts`

Context: This is a read-only endpoint — it calls Gemini and returns extracted values without writing anything to the database. The pattern follows other routes in `src/app/api/agreements/[id]/`.

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "src/app/api/agreements/[id]/extract-terms"
```

Create `src/app/api/agreements/[id]/extract-terms/route.ts` with this content:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractAgreementTerms } from '@/lib/gemini';

/**
 * POST /api/agreements/[id]/extract-terms
 *
 * Read-only: calls Gemini to extract { startDate, endDate, monthlyRent,
 * depositAmount } from the agreement's rawContent. Does NOT write anything.
 *
 * Returns ExtractedTerms — any field can be null if the model couldn't
 * determine it. The caller should fall back to current system values for nulls.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: agreementId } = await params;

  const agreement = await prisma.agreement.findFirst({
    where: {
      id: agreementId,
      tenancy: { room: { property: { landlordId: session.user.id } } },
    },
    select: { id: true, status: true, rawContent: true },
  });

  if (!agreement)
    return NextResponse.json(
      { error: 'Agreement not found or access denied' },
      { status: 404 },
    );

  if (agreement.status === 'SIGNED')
    return NextResponse.json(
      { error: 'Agreement is already signed' },
      { status: 409 },
    );

  try {
    const terms = await extractAgreementTerms(agreement.rawContent);
    return NextResponse.json(terms);
  } catch (error) {
    console.error('Term extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract terms from agreement.' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/agreements/[id]/extract-terms/route.ts"
git commit -m "feat: add POST /api/agreements/[id]/extract-terms endpoint"
```

---

### Task 3: Extend `PATCH /api/agreements/[id]/finalize` to apply confirmed terms

**Files:**
- Modify: `src/app/api/agreements/[id]/finalize/route.ts`

Context: The existing route (`src/app/api/agreements/[id]/finalize/route.ts`) reads `reviewedRedFlags` from the body and runs a `$transaction` with `agreement.update` + `agreementEvent.create`. We extend it to also:
1. Parse `confirmedTerms` from the request body with Zod validation.
2. Select `tenancy.id` in the initial `findUnique` so we can reference the tenancy in the transaction.
3. Add `prisma.tenancy.update` to the same `$transaction`.

- [ ] **Step 1: Add `z` import and `confirmedTermsSchema` at the top of the finalize route**

Open `src/app/api/agreements/[id]/finalize/route.ts`. Add `import { z } from 'zod';` to the existing imports. Then, directly below all imports, add:

```typescript
import { z } from 'zod';

const confirmedTermsSchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
    monthlyRent: z.coerce
      .number()
      .positive('Monthly rent must be greater than 0'),
    depositAmount: z.coerce
      .number()
      .min(0, 'Deposit amount must be 0 or more'),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });
```

- [ ] **Step 2: Add `id: true` to the tenancy select inside `findUnique`**

Find the `tenancy: { select: { status: true, ...` block inside `prisma.agreement.findUnique`. Add `id: true` so the tenancy ID is available for the update:

```typescript
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      changeRequests: {
        where: { status: 'PENDING' },
        select: { id: true },
      },
      tenancy: {
        select: {
          id: true,           // ← ADD THIS
          status: true,
          tenant: { select: { id: true, name: true, icNumber: true } },
          agreementPreferences: { select: { isComplete: true } },
          room: {
            include: {
              property: {
                select: { landlordId: true, address: true },
              },
            },
          },
        },
      },
    },
  });
```

- [ ] **Step 3: Parse `confirmedTerms` from the request body and add tenancy update to the transaction**

Find the block:
```typescript
  const body = await request.json().catch(() => ({}));
  const reviewedRedFlags = body?.reviewedRedFlags === true;
```

Replace it with:
```typescript
  const body = await request.json().catch(() => ({}));
  const reviewedRedFlags = body?.reviewedRedFlags === true;

  const confirmedTermsResult = confirmedTermsSchema.safeParse(body?.confirmedTerms);
  if (!confirmedTermsResult.success) {
    return NextResponse.json(
      { error: confirmedTermsResult.error.issues[0]?.message ?? 'Invalid confirmedTerms' },
      { status: 400 },
    );
  }
  const { startDate, endDate, monthlyRent, depositAmount } = confirmedTermsResult.data;
```

Then find the `$transaction` block:
```typescript
  await prisma.$transaction([
    prisma.agreement.update({
      where: { id },
      data: { status: 'FINALIZED' },
    }),
    prisma.agreementEvent.create({
      data: buildAgreementEvent({ ... }),
    }),
  ]);
```

Replace it with:
```typescript
  await prisma.$transaction([
    prisma.agreement.update({
      where: { id },
      data: { status: 'FINALIZED' },
    }),
    prisma.tenancy.update({
      where: { id: agreement.tenancy.id },
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent,
        depositAmount,
      },
    }),
    prisma.agreementEvent.create({
      data: buildAgreementEvent({
        agreementId: id,
        type: 'FINALIZED',
        actorRole: 'LANDLORD',
        actorUserId: session.user.id,
        summary: 'Landlord finalized the agreement for tenant review.',
      }),
    }),
  ]);
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/agreements/[id]/finalize/route.ts"
git commit -m "feat: extend finalize API to atomically sync confirmed terms"
```

---

### Task 4: Create `AgreementFinalizeStep` component

**Files:**
- Create: `src/components/ui/AgreementFinalizeStep.tsx`

Context: This client component replaces the inline finalize UI in `AgreementViewer`. It owns a three-step flow: **idle** (shows checklist + finalize button) → **extracting** (spinner while calling extract-terms) → **confirming** (editable fields for landlord review). The `av-checklist-pass`, `av-checklist-fail`, and `av-finalize-btn` CSS classes are defined via `<style>` tags inside `AgreementViewer`. Since we're moving the finalize UI out, we keep those class names and pass them through `className` — but the styles are still defined in AgreementViewer's `<style>` block (they are page-scoped). Create the file:

- [ ] **Step 1: Create `src/components/ui/AgreementFinalizeStep.tsx`**

```tsx
'use client';

import { useState, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinalizeChecklistBase {
  hasRawContent: boolean;
  isWizardComplete: boolean;
  unresolvedStructuredRequests: number;
  hasRequiredIdentityData: boolean;
  isFinalizableStatus: boolean;
}

export interface CurrentTerms {
  startDate: string;    // ISO string from Tenancy.startDate.toISOString()
  endDate: string;      // ISO string from Tenancy.endDate.toISOString()
  monthlyRent: number;
  depositAmount: number;
}

interface ExtractedTerms {
  startDate: string | null;
  endDate: string | null;
  monthlyRent: number | null;
  depositAmount: number | null;
}

interface Props {
  agreementId: string;
  currentTerms: CurrentTerms;
  finalizeChecklistBase: FinalizeChecklistBase;
  onFinalized: () => void;
}

type Step = 'idle' | 'extracting' | 'confirming' | 'finalizing';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "2026-06-01T00:00:00.000Z" → "2026-06-01" */
function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

// ─── Sub-component: single term row ──────────────────────────────────────────

function TermField({
  label,
  currentRaw,
  extractedRaw,
  inputType,
  value,
  onChange,
  prefix,
}: {
  label: string;
  currentRaw: string;        // what system currently holds (for comparison)
  extractedRaw: string | null; // what AI extracted, null = couldn't determine
  inputType: 'date' | 'number';
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  const differs =
    extractedRaw !== null && extractedRaw !== currentRaw;
  const unknown = extractedRaw === null;

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: differs
          ? 'rgba(251,191,36,0.06)'
          : 'rgba(196,154,60,0.04)',
        border: differs
          ? '1px solid rgba(251,191,36,0.3)'
          : '1px solid rgba(196,154,60,0.12)',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          {label}
        </span>
        {differs && (
          <span className="text-[10px] font-semibold text-[#E8B84B]">
            ⚠ differs from system
          </span>
        )}
        {!differs && !unknown && (
          <span className="text-[10px] font-semibold text-emerald-400">
            ✓ matches
          </span>
        )}
        {unknown && (
          <span className="text-[10px] text-white/30">
            AI couldn&apos;t determine — verify
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {prefix && (
          <span className="text-[11px] text-white/40 shrink-0">{prefix}</span>
        )}
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...(inputType === 'number' ? { min: 0, step: '0.01' } : {})}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:border-[rgba(196,154,60,0.5)] focus:outline-none"
        />
      </div>

      {differs && (
        <p className="text-[10px] text-white/30 mt-1">
          System currently has: {currentRaw}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgreementFinalizeStep({
  agreementId,
  currentTerms,
  finalizeChecklistBase,
  onFinalized,
}: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [reviewedRedFlags, setReviewedRedFlags] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedTerms | null>(null);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Editable confirmed values — pre-filled from current, overwritten after extraction
  const [confirmedStartDate, setConfirmedStartDate] = useState(
    toDateInput(currentTerms.startDate),
  );
  const [confirmedEndDate, setConfirmedEndDate] = useState(
    toDateInput(currentTerms.endDate),
  );
  const [confirmedMonthlyRent, setConfirmedMonthlyRent] = useState(
    String(currentTerms.monthlyRent),
  );
  const [confirmedDepositAmount, setConfirmedDepositAmount] = useState(
    String(currentTerms.depositAmount),
  );

  // ── Checklist ────────────────────────────────────────────────────────
  const checklistItems = useMemo(
    () => [
      {
        key: 'content',
        label: 'Agreement content is present',
        passed: finalizeChecklistBase.hasRawContent,
      },
      {
        key: 'wizard',
        label: 'Agreement wizard has been completed',
        passed: finalizeChecklistBase.isWizardComplete,
      },
      {
        key: 'identity',
        label: 'Tenant identity details are available',
        passed: finalizeChecklistBase.hasRequiredIdentityData,
      },
      {
        key: 'status',
        label: 'Agreement is in a finalizable status',
        passed: finalizeChecklistBase.isFinalizableStatus,
      },
      {
        key: 'requests',
        label:
          finalizeChecklistBase.unresolvedStructuredRequests === 0
            ? 'No unresolved structured change requests remain'
            : `${finalizeChecklistBase.unresolvedStructuredRequests} change request(s) still need attention`,
        passed: finalizeChecklistBase.unresolvedStructuredRequests === 0,
      },
      {
        key: 'review',
        label: 'Red flags reviewed before sending to tenant',
        passed: reviewedRedFlags,
      },
    ],
    [finalizeChecklistBase, reviewedRedFlags],
  );

  const checklistBlocked = checklistItems.some((item) => !item.passed);

  // ── Extraction ───────────────────────────────────────────────────────
  const handleStartFinalize = async () => {
    if (checklistBlocked) return;
    setStep('extracting');
    setExtractionFailed(false);
    try {
      const res = await fetch(
        `/api/agreements/${agreementId}/extract-terms`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error('extraction failed');
      const data: ExtractedTerms = await res.json();
      setExtracted(data);
      // Pre-fill confirmed values from extraction; fall back to current if null
      setConfirmedStartDate(
        data.startDate ?? toDateInput(currentTerms.startDate),
      );
      setConfirmedEndDate(
        data.endDate ?? toDateInput(currentTerms.endDate),
      );
      setConfirmedMonthlyRent(
        data.monthlyRent !== null
          ? String(data.monthlyRent)
          : String(currentTerms.monthlyRent),
      );
      setConfirmedDepositAmount(
        data.depositAmount !== null
          ? String(data.depositAmount)
          : String(currentTerms.depositAmount),
      );
    } catch {
      setExtractionFailed(true);
      setExtracted(null);
      // Fall back to current system values
      setConfirmedStartDate(toDateInput(currentTerms.startDate));
      setConfirmedEndDate(toDateInput(currentTerms.endDate));
      setConfirmedMonthlyRent(String(currentTerms.monthlyRent));
      setConfirmedDepositAmount(String(currentTerms.depositAmount));
    } finally {
      setStep('confirming');
    }
  };

  // ── Finalization ─────────────────────────────────────────────────────
  const confirmedValid =
    confirmedStartDate.length === 10 &&
    confirmedEndDate.length === 10 &&
    confirmedEndDate > confirmedStartDate &&
    Number(confirmedMonthlyRent) > 0 &&
    Number(confirmedDepositAmount) >= 0;

  const handleConfirmAndFinalize = async () => {
    if (!confirmedValid) return;
    setStep('finalizing');
    setFinalizeError(null);
    try {
      const res = await fetch(`/api/agreements/${agreementId}/finalize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedRedFlags,
          confirmedTerms: {
            startDate: confirmedStartDate,
            endDate: confirmedEndDate,
            monthlyRent: Number(confirmedMonthlyRent),
            depositAmount: Number(confirmedDepositAmount),
          },
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setFinalizeError(result.error || 'Failed to finalize');
        setStep('confirming');
        return;
      }
      onFinalized();
    } catch {
      setFinalizeError('Network error. Please try again.');
      setStep('confirming');
    }
  };

  // Snapshot the current raw values for comparison in TermField
  const currentStartRaw = toDateInput(currentTerms.startDate);
  const currentEndRaw = toDateInput(currentTerms.endDate);
  const currentRentRaw = String(currentTerms.monthlyRent);
  const currentDepositRaw = String(currentTerms.depositAmount);

  // ── Render: idle ─────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <div className="px-4 py-4 space-y-2">
        {checklistItems.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-medium leading-snug ${
              item.passed ? 'av-checklist-pass' : 'av-checklist-fail'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                item.passed
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {item.passed ? '✓' : '!'}
            </div>
            {item.label}
          </div>
        ))}

        <label
          className="flex items-start gap-2.5 px-3 py-3 rounded-xl cursor-pointer"
          style={{
            background: 'rgba(196,154,60,0.07)',
            border: '1px solid rgba(196,154,60,0.18)',
          }}
        >
          <input
            type="checkbox"
            checked={reviewedRedFlags}
            onChange={(e) => setReviewedRedFlags(e.target.checked)}
            className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-amber-500"
          />
          <span className="text-[11px] text-gray-400 leading-relaxed">
            I have reviewed the red-flag analysis and am ready to send this
            agreement to the tenant.
          </span>
        </label>

        <button
          onClick={handleStartFinalize}
          disabled={checklistBlocked}
          className="av-finalize-btn w-full text-sm px-4 py-3 rounded-xl"
        >
          Send Finalized Agreement
        </button>
      </div>
    );
  }

  // ── Render: extracting ───────────────────────────────────────────────
  if (step === 'extracting') {
    return (
      <div className="px-4 py-6">
        <div
          className="rounded-xl px-4 py-5 flex items-center gap-3"
          style={{
            background: 'rgba(196,154,60,0.06)',
            border: '1px solid rgba(196,154,60,0.2)',
          }}
        >
          <svg
            className="w-4 h-4 animate-spin shrink-0"
            style={{ color: '#C49A3C' }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <div>
            <p className="text-[11px] font-semibold" style={{ color: '#C49A3C' }}>
              Reading agreement terms…
            </p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: 'rgba(196,154,60,0.6)' }}
            >
              AI is extracting dates and amounts from your agreement text
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: confirming / finalizing ──────────────────────────────────
  const extractedStartRaw =
    extracted?.startDate ?? null;
  const extractedEndRaw =
    extracted?.endDate ?? null;
  const extractedRentRaw =
    extracted?.monthlyRent !== null && extracted?.monthlyRent !== undefined
      ? String(extracted.monthlyRent)
      : null;
  const extractedDepositRaw =
    extracted?.depositAmount !== null && extracted?.depositAmount !== undefined
      ? String(extracted.depositAmount)
      : null;

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Banner */}
      {extractionFailed ? (
        <div
          className="rounded-xl px-3 py-2.5 text-[11px]"
          style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
          }}
        >
          <p className="font-semibold text-[#E8B84B]">
            AI extraction failed — please verify all values manually
          </p>
          <p className="mt-0.5" style={{ color: 'rgba(232,184,75,0.7)' }}>
            Fields are pre-filled with current system values.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl px-3 py-2.5 text-[11px]"
          style={{
            background: 'rgba(196,154,60,0.06)',
            border: '1px solid rgba(196,154,60,0.18)',
          }}
        >
          <p className="font-semibold text-[#C49A3C]">
            Review terms before finalizing
          </p>
          <p className="mt-0.5" style={{ color: 'rgba(196,154,60,0.7)' }}>
            AI read your agreement. Correct anything that looks wrong.
          </p>
        </div>
      )}

      {/* Four term fields */}
      <div className="space-y-2">
        <TermField
          label="Start date"
          currentRaw={currentStartRaw}
          extractedRaw={extractedStartRaw}
          inputType="date"
          value={confirmedStartDate}
          onChange={setConfirmedStartDate}
        />
        <TermField
          label="End date"
          currentRaw={currentEndRaw}
          extractedRaw={extractedEndRaw}
          inputType="date"
          value={confirmedEndDate}
          onChange={setConfirmedEndDate}
        />
        <TermField
          label="Monthly rent"
          currentRaw={currentRentRaw}
          extractedRaw={extractedRentRaw}
          inputType="number"
          value={confirmedMonthlyRent}
          onChange={setConfirmedMonthlyRent}
          prefix="RM"
        />
        <TermField
          label="Security deposit"
          currentRaw={currentDepositRaw}
          extractedRaw={extractedDepositRaw}
          inputType="number"
          value={confirmedDepositAmount}
          onChange={setConfirmedDepositAmount}
          prefix="RM"
        />
      </div>

      {finalizeError && (
        <div
          className="rounded-xl px-3 py-2.5 text-[11px] text-red-400"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          {finalizeError}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            setStep('idle');
            setFinalizeError(null);
          }}
          disabled={step === 'finalizing'}
          className="flex-1 text-[11px] font-medium rounded-xl py-2.5"
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Back
        </button>
        <button
          onClick={handleConfirmAndFinalize}
          disabled={!confirmedValid || step === 'finalizing'}
          className="av-finalize-btn flex-1 text-sm px-4 py-2.5 rounded-xl"
        >
          {step === 'finalizing' ? 'Finalizing…' : 'Confirm & Finalize'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/AgreementFinalizeStep.tsx
git commit -m "feat: add AgreementFinalizeStep component"
```

---

### Task 5: Wire `AgreementFinalizeStep` into `AgreementViewer`

**Files:**
- Modify: `src/components/ui/AgreementViewer.tsx`

Context: `AgreementViewer` currently owns `handleFinalize`, `isFinalizing`, `finalizeError` state, and the checklist + finalize button JSX (lines ~1080–1130). We replace all of that with `<AgreementFinalizeStep>`. We also add four new optional props for current tenancy terms.

- [ ] **Step 1: Add the import for `AgreementFinalizeStep` and the four new props to AgreementViewer**

At the top of `src/components/ui/AgreementViewer.tsx`, add the import after existing imports:

```typescript
import AgreementFinalizeStep, { type CurrentTerms } from './AgreementFinalizeStep';
```

In the `Props` interface (around line 50), add four new optional fields:

```typescript
interface Props {
  agreementId: string;
  tenancyId?: string;
  status: string;
  rawContent: string;
  plainLanguageSummary: string;
  plainLanguageSummaryMs?: string | null;
  redFlags: RedFlag[];
  redFlagsMs?: RedFlag[] | null;
  tenantName: string;
  propertyAddress: string;
  readOnly?: boolean;
  contentHash?: string | null;
  signedAt?: Date | string | null;
  signedByIp?: string | null;
  txHash?: string | null;
  events?: AgreementTimelineEvent[];
  revisions?: AgreementRevisionSummary[];
  changeRequests?: AgreementChangeRequestSummary[];
  finalizeChecklistBase?: FinalizeChecklistBase | null;
  editable?: boolean;
  editableInitialContent?: string;
  negotiationNotes?: string | null;
  // ↓ New: tenancy operational terms for the finalize sync step
  tenancyStartDate?: string;     // ISO string from Tenancy.startDate.toISOString()
  tenancyEndDate?: string;       // ISO string from Tenancy.endDate.toISOString()
  tenancyMonthlyRent?: number;
  tenancyDepositAmount?: number;
}
```

- [ ] **Step 2: Destructure the four new props in the component function signature**

Find the destructuring block (around line 400–430). Add the four new props at the end:

```typescript
  tenancyStartDate,
  tenancyEndDate,
  tenancyMonthlyRent,
  tenancyDepositAmount,
```

- [ ] **Step 3: Remove finalize-related state and logic from AgreementViewer**

Delete these items entirely — they all move into `AgreementFinalizeStep`:

- `const [isFinalizing, setIsFinalizing] = useState(false);`
- `const [finalizeError, setFinalizeError] = useState<string | null>(null);`
- `const [reviewedRedFlags, setReviewedRedFlags] = useState(false);`
- The entire `handleFinalize` async function

- [ ] **Step 4: Replace the finalize block (lines ~1080–1130) with `<AgreementFinalizeStep>`**

Find the JSX block starting with:
```tsx
              {showFinalizeButton && (
                <div className="px-4 py-4 space-y-2">
                  {checklistItems.map(...)}
                  ...
                  <button onClick={handleFinalize} ...>
                  ...
                </div>
              )}
```

Replace the entire `{showFinalizeButton && (...)}` block with:

```tsx
              {showFinalizeButton && tenancyStartDate && tenancyEndDate &&
                tenancyMonthlyRent !== undefined && tenancyDepositAmount !== undefined && (
                <AgreementFinalizeStep
                  agreementId={agreementId}
                  currentTerms={{
                    startDate: tenancyStartDate,
                    endDate: tenancyEndDate,
                    monthlyRent: tenancyMonthlyRent,
                    depositAmount: tenancyDepositAmount,
                  }}
                  finalizeChecklistBase={finalizeChecklistBase!}
                  onFinalized={() => router.refresh()}
                />
              )}
```

- [ ] **Step 5: Remove the `checklistItems` useMemo and `finalizeBlocked` derived value from AgreementViewer**

These now live inside `AgreementFinalizeStep`. Delete:
- The `const checklistItems = useMemo(...)` block
- `const finalizeBlocked = checklistItems.some(...)`

(If `checklistItems` is used elsewhere in AgreementViewer, leave it; if only used for the finalize block, remove it.)

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/AgreementViewer.tsx
git commit -m "feat: replace inline finalize UI with AgreementFinalizeStep in AgreementViewer"
```

---

### Task 6: Pass tenancy term props from agreement page to AgreementViewer

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx`

Context: The agreement page server component fetches the tenancy and renders `<AgreementViewer>`. We need to pass the four new props. The tenancy is already fetched (includes `startDate`, `endDate`, `monthlyRent`, `depositAmount`).

- [ ] **Step 1: Add four new props to the `<AgreementViewer>` call**

Open `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx`. Find the `<AgreementViewer` JSX element. Add these four props alongside the existing ones:

```tsx
        tenancyStartDate={tenancy.startDate.toISOString()}
        tenancyEndDate={tenancy.endDate.toISOString()}
        tenancyMonthlyRent={Number(tenancy.monthlyRent)}
        tenancyDepositAmount={Number(tenancy.depositAmount)}
```

The full updated `<AgreementViewer>` call becomes:

```tsx
      <AgreementViewer
        agreementId={tenancy.agreement.id}
        tenancyId={tenancy.id}
        status={tenancy.agreement.status}
        rawContent={tenancy.agreement.rawContent}
        plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
        plainLanguageSummaryMs={tenancy.agreement.plainLanguageSummaryMs}
        redFlags={redFlags}
        redFlagsMs={redFlagsMs}
        tenantName={tenancy.tenant.name}
        propertyAddress={`${tenancy.room.property.address}, ${tenancy.room.property.city} — ${tenancy.room.label}`}
        contentHash={tenancy.agreement.contentHash}
        signedAt={tenancy.agreement.signedAt}
        signedByIp={tenancy.agreement.signedByIp}
        txHash={tenancy.agreement.txHash}
        events={tenancy.agreement.events}
        revisions={tenancy.agreement.revisions}
        changeRequests={tenancy.agreement.changeRequests}
        finalizeChecklistBase={isSigned ? null : finalizeChecklistBase}
        editable={!isSigned}
        editableInitialContent={tenancy.agreement.rawContent}
        negotiationNotes={tenancy.agreement.negotiationNotes}
        tenancyStartDate={tenancy.startDate.toISOString()}
        tenancyEndDate={tenancy.endDate.toISOString()}
        tenancyMonthlyRent={Number(tenancy.monthlyRent)}
        tenancyDepositAmount={Number(tenancy.depositAmount)}
      />
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx"
git commit -m "feat: pass tenancy term props to AgreementViewer for finalize sync"
```

---

### Task 7: Remove sync reminder from AgreementEditor

**Files:**
- Modify: `src/components/ui/AgreementEditor.tsx`

Context: The sync reminder ("Did you change the rent or deposit amount?") was added as a workaround for the drift problem. The finalize step now handles sync automatically, so the reminder is redundant and should be removed.

- [ ] **Step 1: Remove `showSyncReminder` state and its `setShowSyncReminder(true)` call**

In `src/components/ui/AgreementEditor.tsx`:

Remove line:
```typescript
  const [showSyncReminder, setShowSyncReminder] = useState(false);
```

In `handleSave`, remove:
```typescript
      setShowSyncReminder(true);
```

- [ ] **Step 2: Remove the sync reminder JSX block**

Delete the entire JSX block:

```tsx
      {/* ── Financial sync reminder — shown after saving ── */}
      {showSyncReminder && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          ...
        </div>
      )}
```

(It's the block that starts with `{showSyncReminder &&` and contains the "Did you change the rent or deposit amount?" text.)

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/AgreementEditor.tsx
git commit -m "chore: remove sync reminder from AgreementEditor (handled by finalize step)"
```

---

### Task 8: Remove "Correct" buttons and revert EditTenancyTerms

**Files:**
- Delete: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditRentAmount.tsx`
- Delete: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditDepositAmount.tsx`
- Delete: `src/app/api/tenancies/[id]/rent-amount/route.ts`
- Delete: `src/app/api/tenancies/[id]/deposit-amount/route.ts`
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditTenancyTerms.tsx`

- [ ] **Step 1: Delete the four files**

```bash
rm "src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditRentAmount.tsx"
rm "src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditDepositAmount.tsx"
rm "src/app/api/tenancies/[id]/rent-amount/route.ts"
rm "src/app/api/tenancies/[id]/deposit-amount/route.ts"
```

- [ ] **Step 2: Remove imports and JSX from `page.tsx`**

Open `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`.

**Remove these two import lines:**
```typescript
import EditDepositAmount from './EditDepositAmount';
import EditRentAmount from './EditRentAmount';
```

**Find the Monthly Rent cell and remove the `EditRentAmount` block.** The cell currently looks like:

```tsx
            <div>
              <p className="text-white/40 text-xs">Monthly Rent</p>
              <p className="font-medium text-white mt-0.5">{formatRM(tenancy.monthlyRent)}</p>
              {/* Allow correcting rent after agreement negotiation — only before all payments are paid */}
              {tenancy.status === 'ACTIVE' &&
                tenancy.rentPayments.some((p) => p.status === 'PENDING') && (
                <EditRentAmount
                  tenancyId={tenancy.id}
                  currentAmount={Number(tenancy.monthlyRent)}
                  pendingPaymentCount={
                    tenancy.rentPayments.filter(
                      (p) =>
                        p.status === 'PENDING' &&
                        new Date(p.dueDate) > new Date(),
                    ).length
                  }
                />
              )}
            </div>
```

Replace with:
```tsx
            <div>
              <p className="text-white/40 text-xs">Monthly Rent</p>
              <p className="font-medium text-white mt-0.5">{formatRM(tenancy.monthlyRent)}</p>
            </div>
```

**Find the Security Deposit cell and remove the `EditDepositAmount` block.** The cell currently looks like:

```tsx
            <div>
              <p className="text-white/40 text-xs">Security Deposit</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <p className="font-medium text-white">{formatRM(tenancy.depositAmount)}</p>
                {tenancy.depositStatus !== 'PAID' && (
                  <EditDepositAmount
                    tenancyId={tenancy.id}
                    currentAmount={Number(tenancy.depositAmount)}
                  />
                )}
              </div>
            </div>
```

Replace with:
```tsx
            <div>
              <p className="text-white/40 text-xs">Security Deposit</p>
              <p className="font-medium text-white mt-0.5">{formatRM(tenancy.depositAmount)}</p>
            </div>
```

**Revert the `EditTenancyTerms` visibility condition** from the current:
```tsx
          {(tenancy.status === 'INVITED' || tenancy.status === 'PENDING') &&
            (!tenancy.agreement ||
              !['FINALIZED', 'SIGNED', 'PENDING_SIGNATURE_PROOF'].includes(
                tenancy.agreement.status,
              )) && (
            <EditTenancyTerms
              tenancyId={tenancy.id}
              currentStartDate={tenancy.startDate.toISOString()}
              currentEndDate={tenancy.endDate.toISOString()}
              currentMonthlyRent={Number(tenancy.monthlyRent)}
              currentDepositAmount={Number(tenancy.depositAmount)}
              tenancyStatus={tenancy.status}
              leasePartyType={tenancy.leasePartyType}
              currentInvitationEmail={
                tenancy.leasePartyType === 'CORPORATE'
                  ? tenancy.authorizedSignatoryUser?.email ?? tenancy.tenant.email
                  : tenancy.tenant.email
              }
              hasExistingDraftAgreement={
                !!tenancy.agreement &&
                ['DRAFT', 'NEGOTIATING'].includes(tenancy.agreement.status)
              }
            />
          )}
```

Replace with:
```tsx
          {(tenancy.status === 'INVITED' || tenancy.status === 'PENDING') && !tenancy.agreement && (
            <EditTenancyTerms
              tenancyId={tenancy.id}
              currentStartDate={tenancy.startDate.toISOString()}
              currentEndDate={tenancy.endDate.toISOString()}
              currentMonthlyRent={Number(tenancy.monthlyRent)}
              currentDepositAmount={Number(tenancy.depositAmount)}
              tenancyStatus={tenancy.status}
              leasePartyType={tenancy.leasePartyType}
              currentInvitationEmail={
                tenancy.leasePartyType === 'CORPORATE'
                  ? tenancy.authorizedSignatoryUser?.email ?? tenancy.tenant.email
                  : tenancy.tenant.email
              }
            />
          )}
```

- [ ] **Step 3: Remove `hasExistingDraftAgreement` from `EditTenancyTerms.tsx`**

Open `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditTenancyTerms.tsx`.

**Remove from the Props interface:**
```typescript
  hasExistingDraftAgreement?: boolean;
```
(and the JSDoc comment above it)

**Remove from the function parameter destructure:**
```typescript
  hasExistingDraftAgreement = false,
```

**Remove the red warning box JSX** — the block that starts with:
```tsx
      {hasExistingDraftAgreement ? (
        <div className="bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.25)] ...">
          ...
        </div>
      ) : (
        ...
      )}
```

Replace it with just the amber info box that was previously the `else` branch:
```tsx
      <div className="bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.25)] rounded-lg px-3 py-2.5">
        <p className="text-xs text-[#E8B84B]">
          {tenancyStatus === 'INVITED'
            ? 'While the invitation is still pending, you can correct the invited tenant or signatory and update the tenancy terms. Once the invite is accepted, the recipient can no longer be changed from here.'
            : 'Terms can be edited before an agreement is generated. Once you generate an agreement, dates and amounts are locked into the legal text.'}
        </p>
      </div>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add \
  "src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx" \
  "src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditTenancyTerms.tsx"
git commit -m "chore: remove Correct buttons and revert EditTenancyTerms to pre-agreement-only"
```

- [ ] **Step 6: Stage deleted files and commit**

```bash
git add -u
git commit -m "chore: delete EditRentAmount, EditDepositAmount, and their API routes"
```

---

## Manual Verification Checklist

After all tasks, verify these flows in the browser (`npm run dev`):

- [ ] Open a PENDING tenancy that has a DRAFT agreement → Agreement page → click "Send Finalized Agreement" → spinner appears → confirmation panel shows with four fields pre-filled → fields that differ from system are highlighted amber → "Confirm & Finalize" becomes active → click it → agreement status changes to FINALIZED
- [ ] On the tenancy detail page for the now-FINALIZED agreement, confirm no "Correct" buttons appear next to Monthly Rent or Security Deposit
- [ ] On a tenancy with no agreement yet, confirm "Edit terms" link still appears below the Tenancy Terms card
- [ ] On a tenancy with a DRAFT agreement, confirm "Edit terms" link does NOT appear (reverted condition)
- [ ] After signing (SIGNED status), confirm finalize step does not appear (existing guard prevents it)
