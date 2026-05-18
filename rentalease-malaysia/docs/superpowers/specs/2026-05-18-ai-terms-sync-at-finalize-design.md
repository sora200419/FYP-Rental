# AI Terms Sync at Finalization — Design Spec

## Goal

When a landlord finalizes a tenancy agreement, AI automatically extracts the key
financial and date terms from the agreement text, shows them for landlord review,
and syncs the confirmed values into the system records — atomically as part of
the same finalization action. Removes all manual "Correct" buttons.

## Background / Problem

`Tenancy` holds operational fields (`startDate`, `endDate`, `monthlyRent`,
`depositAmount`). `Agreement.rawContent` holds the legal text. These can drift
whenever the landlord or AI edits the text. Previously this was patched with
"Correct" buttons. This design replaces that with an automatic sync that fires
at every finalization checkpoint — the natural moment before the tenant sees the
agreement.

## Status Flow (unchanged)

```
DRAFT / NEGOTIATING
  ↓ landlord clicks "Finalize"
  ↓ ← AI extraction + landlord confirmation + system sync happen here
FINALIZED  (tenant reviews)
  ↓ tenant signs digitally + uploads hard copy
PENDING_SIGNATURE_PROOF → landlord approves
SIGNED → tenancy becomes ACTIVE
```

If the tenant requests changes after seeing the finalized agreement, the status
goes back to NEGOTIATING. The landlord edits and finalizes again — extraction +
sync fires again — so the system is always current before the tenant sees each
new version.

## Architecture

### New Gemini function — `extractAgreementTerms`
File: `src/lib/gemini.ts`

Calls `gemini-2.5-flash` in JSON mode. Prompt instructs the model to find:
- `startDate` — tenancy commencement date (ISO `YYYY-MM-DD` or `null`)
- `endDate` — tenancy expiry date (ISO `YYYY-MM-DD` or `null`)
- `monthlyRent` — monthly rent in RM (positive number or `null`)
- `depositAmount` — security deposit in RM (non-negative number or `null`)

Returns `ExtractedTerms`:
```ts
interface ExtractedTerms {
  startDate:     string | null;
  endDate:       string | null;
  monthlyRent:   number | null;
  depositAmount: number | null;
}
```

Any field the model cannot determine with confidence is returned as `null`. The
UI treats `null` as "AI couldn't read this — landlord must fill it in."

### New API endpoint — `POST /api/agreements/[id]/extract-terms`
File: `src/app/api/agreements/[id]/extract-terms/route.ts`

- Auth: landlord session, must own agreement via room chain.
- Reads `agreement.rawContent`.
- Calls `extractAgreementTerms(rawContent)`.
- Returns `{ startDate, endDate, monthlyRent, depositAmount }`.
- Read-only — does not write anything to the database.
- Blocked if agreement is `SIGNED` (shouldn't be reachable, but guarded).

### Extend finalize endpoint — `PATCH /api/agreements/[id]/finalize`
File: `src/app/api/agreements/[id]/finalize/route.ts` (existing, modified)

Extend the request body to accept:
```ts
{
  reviewedRedFlags: boolean;
  confirmedTerms: {
    startDate:     string;   // YYYY-MM-DD
    endDate:       string;   // YYYY-MM-DD
    monthlyRent:   number;
    depositAmount: number;
  };
}
```

Inside the same `$transaction` that sets `agreement.status = 'FINALIZED'`,
also run `prisma.tenancy.update` to write the confirmed terms. Validation:
- `monthlyRent > 0`
- `depositAmount >= 0`
- `endDate > startDate`
- No past-date restriction — the landlord confirmed these values directly from
  the signed legal text; a historical start date is valid.

`confirmedTerms` is **required**. Return `400` if absent or invalid.

### New component — `AgreementFinalizeStep`
File: `src/components/ui/AgreementFinalizeStep.tsx`

Client component that replaces the raw "Finalize Agreement" button in
`AgreementViewer`. Owns the full three-step UX:

**Step 1 — idle**
Renders the current "Finalize Agreement" button and finalize checklist (same
content as before).

**Step 2 — extracting**
Clicking "Finalize" calls `POST /api/agreements/[id]/extract-terms`. Button
shows spinner. If extraction fails, jumps straight to Step 3 with all fields
pre-filled from current system values and a warning banner.

**Step 3 — confirming**
Shows a review panel:

```
┌─ Review terms before finalizing ───────────────────────────────┐
│  AI read your agreement and extracted these values.            │
│  Correct anything that looks wrong before confirming.          │
│                                                                 │
│  Start date   [2026-06-01]   current: 1 June 2026  ✓ matches  │
│  End date     [2027-05-31]   current: 31 May 2027  ✓ matches  │
│  Monthly rent [RM 1,500]     current: RM 1,200  ⚠ differs     │
│  Deposit      [RM 3,000]     current: RM 3,000  ✓ matches     │
│                                                                 │
│  [ Cancel ]                    [ Confirm & Finalize ]          │
└────────────────────────────────────────────────────────────────┘
```

- Each field is an editable input pre-filled with the extracted value (or current
  value if extraction returned `null` for that field).
- Fields where extracted ≠ current are highlighted amber.
- Fields where extracted = current show a green tick.
- If a field returned `null` (AI couldn't read it), it is pre-filled with the
  current system value and marked with a yellow "AI couldn't determine — please
  verify" label.
- "Confirm & Finalize" is disabled until all four fields have valid values.

**On "Confirm & Finalize"**
Calls `PATCH /api/agreements/[id]/finalize` with both `reviewedRedFlags` and
`confirmedTerms`. On success, calls `onFinalized()` (parent refreshes page).

Props:
```ts
interface Props {
  agreementId:      string;
  tenancyId:        string;
  currentTerms: {
    startDate:     string;  // ISO
    endDate:       string;  // ISO
    monthlyRent:   number;
    depositAmount: number;
  };
  finalizeChecklistBase: FinalizeChecklistBase;
  onFinalized: () => void;
}
```

### `AgreementViewer.tsx` — wire in new component

New props added to `AgreementViewer`:
```ts
tenancyStartDate?:    string;   // ISO — from Tenancy.startDate
tenancyEndDate?:      string;   // ISO — from Tenancy.endDate
tenancyMonthlyRent?:  number;
tenancyDepositAmount?: number;
```

Where the existing finalize button + checklist renders, replace with
`<AgreementFinalizeStep>` (only when `finalizeChecklistBase` is non-null and
agreement is not signed).

### `agreement/page.tsx` — pass tenancy terms

Pass the four new props from `tenancy.startDate`, `tenancy.endDate`,
`tenancy.monthlyRent`, `tenancy.depositAmount` to `<AgreementViewer>`.

### `AgreementEditor.tsx` — remove sync reminder

Remove the `showSyncReminder` state and the amber "Did you change the rent or
deposit amount?" banner. The finalize step handles sync automatically.

### Remove "Correct" button system

Delete these files entirely:
- `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditRentAmount.tsx`
- `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/EditDepositAmount.tsx`
- `src/app/api/tenancies/[id]/rent-amount/route.ts`
- `src/app/api/tenancies/[id]/deposit-amount/route.ts`

In `page.tsx`:
- Remove imports of `EditRentAmount` and `EditDepositAmount`.
- Remove the JSX blocks that render them inside the "Monthly Rent" and
  "Security Deposit" cells.
- Revert `EditTenancyTerms` condition back to `!tenancy.agreement` (AI extraction
  at finalize replaces the need to show it for DRAFT agreements).

In `EditTenancyTerms.tsx`:
- Remove `hasExistingDraftAgreement` prop and all related JSX (the red warning box).
- Remove it from the Props interface.

## Error Handling

| Scenario | Behaviour |
|---|---|
| Extraction API fails (network/Gemini error) | Jump to confirmation with all fields from current system values; amber banner "AI extraction failed — please verify all values manually" |
| One field returns `null` | Pre-fill that field from current system value; yellow label "AI couldn't determine — please verify" |
| `PATCH finalize` fails | Show error inline in AgreementFinalizeStep; stay in confirming state so landlord can retry |
| Tenancy already ACTIVE at finalize time | Blocked by existing finalize API guard (won't reach extraction) |

## What Does Not Change

- `PATCH /api/tenancies/[id]` — used by `EditTenancyTerms` for INVITED/PENDING
  without agreements; unchanged.
- `EditTenancyTerms` — still shown for tenancies with no agreement yet, so
  landlords can correct dates before generating. Hidden once any agreement exists.
- Finalize checklist logic (`isFinalizeBlocked`) — unchanged, just receives
  `reviewedRedFlags` as before.
- Blockchain anchoring — still runs inside finalize as before.

## Files Touched Summary

| Action | File |
|---|---|
| Add `extractAgreementTerms` | `src/lib/gemini.ts` |
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
