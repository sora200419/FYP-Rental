# RentalEase UI/UX Redesign — Implementation Plan

## Rules (DO NOT BREAK)
- Only change Tailwind class names and JSX structure.
- Never touch API routes, auth logic, DB schema, or business logic.
- `npm run build` must pass after every phase.
- No gradients. One accent (blue-600). Dark sidebar only.

---

## Phase 0 — Global CSS + Font Tokens (~30 min)

**Goal:** Establish design tokens and Inter font. Unblocks all subsequent phases.

Files:
- `src/app/globals.css` — add CSS custom properties from SPEC §2
- `src/app/layout.tsx` — confirm Inter font is loaded with weight 400/500/600/700

Verify: `npm run build` passes, app loads with Inter font.

---

## Phase 1 — Top Nav → Sidebar (~4h)

**Goal:** Replace horizontal TopNav with a fixed left sidebar. Biggest structural change.

Files:
- `src/components/ui/Sidebar.tsx` — **new file**; dark sidebar per SPEC §5 with per-role nav links, language toggle, user row, sign out
- `src/app/(dashboard)/layout.tsx` — change from `TopNav` + `<main>` to `flex h-screen` layout with `<Sidebar>` + top header bar + `<main>`, mobile drawer, KYC banner inside main

Verify: all three roles (LANDLORD, TENANT, ADMIN) can log in, see sidebar, navigate, and sign out. Mobile hamburger opens/closes drawer.

---

## Phase 2 — Auth Pages Split-Panel Layout (~2h)

**Goal:** Replace centered card auth with a split-panel design per SPEC §7.

Files:
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`

Steps per page:
1. Outer `<div className="min-h-screen flex">` (flex row)
2. Left panel: `hidden lg:flex w-5/12 bg-gray-900` — branding, feature bullets
3. Right panel: `flex-1 flex items-center justify-center bg-white px-6 py-12` — form (unchanged logic)
4. Apply button, input, label classes from SPEC §8 §9

Verify: Login and register work end-to-end. Responsive on mobile (left panel hidden).

---

## Phase 3 — Dashboard Stat Cards + Banners + Progress Bars (~3h)

**Goal:** Apply updated card and banner styles. Stat card numbers should be large and bold.

Files:
- `src/app/(dashboard)/dashboard/landlord/page.tsx` — stat cards (SPEC §16), quick-action buttons (SPEC §8), tenancy row status pills (SPEC §11)
- `src/app/(dashboard)/dashboard/tenant/page.tsx` — same treatment for tenant variant
- `src/app/(dashboard)/dashboard/admin/page.tsx` — admin summary cards
- `src/components/ui/DashboardBanners.tsx` — apply banner classes from SPEC §12 (add icon SVG, remove emoji)
- `src/components/ui/KycPendingBanner.tsx` — apply banner classes from SPEC §12

Verify: dashboards load, banners display correctly per role, no console errors.

---

## Phase 4 — Properties + Tenancy Detail Pages (~3h)

**Goal:** Apply card, pill, button, and tab styles to property and tenancy pages.

Files:
- `src/app/(dashboard)/dashboard/landlord/properties/page.tsx`
- `src/app/(dashboard)/dashboard/landlord/properties/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/landlord/properties/new/page.tsx`
- `src/app/(dashboard)/dashboard/landlord/tenancies/page.tsx`
- `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/landlord/tenancies/new/page.tsx` + `NewTenancyForm.tsx`
- `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`

Steps:
- Property list: cards with `rounded-xl border border-gray-200` and hover border
- Room list: divider list inside card
- Tenancy status pills: apply SPEC §11 map
- Buttons: primary/secondary/danger from SPEC §8
- Form inputs on new property/tenancy forms: SPEC §9

Verify: landlord can browse properties, add a property, and view tenancy detail. Status pills show correct colours.

---

## Phase 5 — Agreement Viewer Tabs + Red-Flag Cards + Audit Rows (~2h)

**Goal:** Apply tab bar, audit row, and red-flag card styles.

Files:
- `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx`
- `src/components/ui/AgreementViewer.tsx`
- `src/components/ui/AgreementEditor.tsx`

Steps:
- Tab bar: SPEC §13 (Content / Summary / Red Flags / History)
- Red flag cards: severity pill (high=red, medium=amber, low=blue) + issue text + recommendation
- Audit/history rows: SPEC §15
- Agreement status pill: SPEC §11

Verify: Agreement page loads for all statuses, tabs switch, red flags render.

---

## Phase 6 — Payments Upload Zone + Proof Cards (~2h)

**Goal:** Clean up payment pages and proof uploader UI.

Files:
- `src/app/(dashboard)/dashboard/landlord/payments/page.tsx`
- `src/app/(dashboard)/dashboard/tenant/payments/page.tsx`
- `src/components/ui/PaymentProofUploader.tsx`
- `src/components/ui/PaymentVerficationCard.tsx`
- `src/components/ui/DepositProofUploader.tsx`
- `src/components/ui/DepositVerificationCard.tsx`

Steps:
- Payment list: divider list, status pills per SPEC §11
- Upload zone: dashed border `border-2 border-dashed border-gray-300 rounded-xl p-8 text-center`, hover `border-blue-400 bg-blue-50`
- Proof card: card with image thumbnail, status pill, action buttons

Verify: both landlord and tenant payment pages load; upload zone displays correctly.

---

## Phase 7 — Messages Two-Panel Chat Layout (~2h)

**Goal:** Replace linear message view with two-panel layout and chat bubble styling.

Files:
- `src/app/(dashboard)/dashboard/landlord/messages/page.tsx`
- `src/app/(dashboard)/dashboard/tenant/messages/page.tsx`
- `src/components/ui/LandlordMessagesClient.tsx`
- `src/components/ui/MessageThread.tsx`

Layout:
```
<div className="flex h-[calc(100vh-theme(spacing.14))] bg-white rounded-xl border border-gray-200 overflow-hidden">
  {/* Thread list — left panel */}
  <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
  ...
  </div>
  {/* Active thread — right panel */}
  <div className="flex-1 flex flex-col">
    {/* Thread header */}
    {/* Messages scroll area */}
    {/* Input bar */}
  </div>
</div>
```

Chat bubbles: SPEC §14

Verify: messages load, threads switch, send works.

---

## Phase 8 — Admin Pages (~1.5h)

**Goal:** Apply card/table/pill styles to admin verification pages.

Files:
- `src/app/(dashboard)/dashboard/admin/page.tsx`
- `src/app/(dashboard)/dashboard/admin/verify/page.tsx`
- `src/app/(dashboard)/dashboard/admin/properties/page.tsx`
- `src/components/ui/VerifyButton.tsx`
- `src/components/ui/VerifyPropertyButton.tsx`

Steps:
- User/property rows: divider list with name, email, status pill, action buttons
- Verify button: primary style; Reject button: danger style
- IC photo: `rounded-xl border border-gray-200 overflow-hidden` image container

Verify: admin can view pending users, click verify/reject, see status updates.

---

## Phase 9 — Profile Page (~30 min)

**Goal:** Apply form and card styles to profile page.

Files:
- `src/app/(dashboard)/dashboard/profile/page.tsx`
- `src/components/ui/ProfileForm.tsx`

Steps:
- Card wrapping each section (Personal Info, KYC Documents, Change Password)
- Input, label, button classes from SPEC §8 §9
- Document upload zone: same dashed style as Phase 6

Verify: profile loads, form submits, KYC photo upload works.

---

## Done Criteria

- `npm run build` passes with zero TypeScript errors.
- All three roles (LANDLORD, TENANT, ADMIN) can complete their primary flows:
  - Landlord: add property → invite tenant → review agreement → verify payment
  - Tenant: accept invitation → sign agreement → submit payment proof
  - Admin: verify user → verify property
- No gradient classes in codebase (`grep -r "bg-gradient" src/` returns empty).
- No `TopNav` import remains in `layout.tsx`.
- All status pills use `rounded-full ring-1 ring-inset` shape.
