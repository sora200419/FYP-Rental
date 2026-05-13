# RentalEase UI/UX Wireframe Redesign Design

Date: 2026-05-13

## Purpose

Redesign the RentalEase web UI/UX through approved wireframes before implementation. The redesign preserves the current product direction from `SPEC.md`: dark sidebar, light dashboard canvas, blue primary accent, flat cards, restrained motion, and role-based dashboard navigation.

This design does not change backend behavior, authentication, API routes, database schema, or business logic. It focuses on layout, spacing, visual hierarchy, information architecture, and usability across all core pages.

## Approved Direction

Use a hybrid page system:

- Command Center is the base layout for landlord, tenant, and admin dashboards.
- Ledger layout is used for dense review pages such as payments, KYC verification, and property verification.
- Guided Flow layout is used for tenancy creation, tenancy detail, agreement review, agreement wizard, signing, renewal, termination, condition reports, and deposit settlement.
- Split Inbox layout is used for messages.
- Split Auth layout is retained for login, register, forgot password, and reset password, with stronger trust cues and clearer form hierarchy.

The shared rule is: users should see the current state, the next required action, and the relevant supporting context without hunting through the page.

## Shared App Shell

The dashboard shell keeps the existing left dark sidebar and light content canvas.

Desktop layout:

- Fixed dark sidebar with role-specific navigation.
- Sticky light top bar with messages and notifications where applicable.
- Main content area uses a consistent max readable rhythm: page header, attention section, KPI/summary strip, main content, secondary context.
- Page spacing should feel less crowded than the current implementation: larger section gaps, clearer card grouping, and fewer equally weighted blocks.

Mobile layout:

- Sidebar remains a drawer.
- Dashboard attention content stacks first.
- KPI cards become two-column or single-column depending on available width.
- Tables convert to stacked review cards where horizontal scanning would be poor.

## Dashboard Pattern

Every role dashboard follows this order:

1. Page title and short context.
2. Attention hero: the most important current state and one primary action.
3. Priority queue: the top 2-3 pending items that need a decision or response.
4. KPI strip: compact metrics that support the user's decisions.
5. Main work list: tenancies, properties, verification rows, or active workflow records.
6. Secondary context: recent activity, audit trail, quick links, or help text.

The attention hero should not become another generic banner. It must answer:

- What is happening now?
- Who needs to act?
- What is the next action?
- What happens after this action?

## Landlord Dashboard

The landlord dashboard is a command center for income, properties, tenants, and agreement/payment work.

Content priority:

- Attention hero highlights pending payment proof reviews, agreement change requests, tenant invitations, or condition reports.
- KPI strip includes income in the last 30 days, overdue payments, occupancy rate, and pending invites or proofs.
- Active tenancy pipeline shows tenant, property, room, status, and next action.
- Property portfolio uses photo-led cards.

Property photo rule:

- Use the first uploaded property photo as the cover image.
- If a property has no photo, show a neutral "No photo yet" fallback.
- The fallback should still show address, city, room count, occupancy status, and a prompt to add a photo.
- Property thumbnails should also appear in tenancy rows when they improve scanning.

## Tenant Dashboard

The tenant dashboard centers on the tenant's current home and next responsibilities.

Content priority:

- Attention hero shows the current tenancy status with property photo, address, room, landlord, agreement status, and next rent due.
- Primary action changes based on state: respond to invitation, review/sign agreement, upload payment proof, fix rejected proof, or acknowledge a condition report.
- KPI strip includes active tenancy count, pending action count, and next payment or agreement status.
- Checklist lists required actions in order.

The tenant should not need to infer the next step from scattered cards. The next action must be explicit.

## Admin Dashboard

The admin dashboard is a verification center.

Content priority:

- Attention hero highlights queues that block platform activity.
- KPI strip includes pending KYC, pending property verification, total users, and total listings.
- Review queues show KYC rows and property rows with clear verify/reject actions.
- Property verification rows include property thumbnails where available.

Admin pages should optimize for decision speed and traceability rather than visual storytelling.

## Tenancy Detail Pattern

Tenancy detail pages use Guided Flow.

Required layout:

- Property cover/header with photo, address, room, and involved parties.
- Current status panel with the one primary next action.
- Horizontal or stacked progress timeline that shows the tenancy lifecycle.
- Documents/proofs section for agreement PDF, version history, deposit proof, rent proof, and condition report photos.
- Right-side or lower "Next actions" panel showing action owner, deadline, dependency, and result.
- Audit trail with recent actions and timestamps.

The state machine should be visible. Users should understand where the tenancy is, who needs to act, and what happens next.

## Agreement Review And Editor Pattern

Agreement pages use a three-zone review layout on desktop:

- Left: section navigation for agreement clauses or wizard steps.
- Center: readable agreement content, diff highlights, and document preview.
- Right: review panel with AI analysis, risks, comments, approve/request-change/finalize actions, and signing status.

On smaller screens, the review panel stacks below the document and section navigation becomes a compact stepper or dropdown.

Agreement history and AI analysis should stay contextual to the agreement, not buried beneath unrelated tenancy content.

## Creation Wizard Pattern

Creation and setup flows use Guided Flow.

Applicable pages:

- New tenancy form.
- Agreement wizard steps.
- Renewal flow.
- Termination flow.
- Deposit settlement flow.
- Condition report creation.

Required layout:

- Step number and short purpose.
- Visible progress tracker.
- Main form fields in the primary column.
- Live summary, validation help, or next-step explanation in the support column.
- Primary action aligned consistently at the bottom of the form area.

Users should always know how many steps remain and what information is required before submission.

## Ledger Pages

Payments and verification pages use Ledger layout.

Required layout:

- Header explaining what is being reviewed.
- KPI strip for queue counts and status totals.
- Search and filter row above records.
- Rows with the most decision-relevant data first.
- Thumbnails for payment proof, property photo, or uploaded documents where useful.
- Clear verify/reject or review actions.
- Empty states that explain completion, not just "No data".

Tables can remain on desktop, but mobile should use stacked record cards.

## Messages Pattern

Messages use a split inbox layout.

Required layout:

- Left thread list with user name, property thumbnail or initials, unread badge, latest message preview, and related tenancy status.
- Right conversation panel with header context: participant, role, property, and tenancy status.
- Message bubbles remain visually distinct for sent and received messages.
- Context chips can link to related payment proof, agreement, or tenancy detail when relevant.
- Composer stays fixed to the bottom of the conversation panel.

The conversation should not lose tenancy context.

## Auth Pages

Auth pages keep the split-panel layout.

Required improvements:

- Left panel communicates product trust: agreement review, verification, payments, and tenant-landlord handoff.
- Right panel keeps a focused form with clear title, subtitle, fields, status banners, and secondary links.
- Mobile collapses to a clean single-column form with compact brand context.
- Error and success banners stay close to the form they affect.

## Visual System Constraints

Preserve the existing visual system unless a later approved implementation plan changes it:

- Dark sidebar with light dashboard canvas.
- Blue primary accent.
- Flat colors and restrained shadows.
- Rounded cards and inputs.
- Minimal motion focused on transitions and state changes.
- No broad rebrand, no decorative gradient-heavy overhaul, and no backend behavior changes.

Property photos are the main new visual content layer. They should improve recognition and scanning without making the interface feel like a marketplace landing page.

## Accessibility And Responsiveness

Implementation should maintain:

- Semantic headings in page order.
- Buttons for actions and links for navigation.
- Visible focus states.
- Sufficient color contrast for status pills, buttons, and banners.
- Image `alt` text for property photos and proof/document thumbnails.
- Fallback content for missing images.
- Responsive layouts for mobile drawers, stacked cards, and mobile record lists.

## Implementation Scope

Likely UI files affected in a later implementation plan:

- `src/components/ui/DashboardShell.tsx`
- `src/components/ui/Sidebar.tsx`
- `src/components/ui/DashboardBanners.tsx`
- `src/components/ui/PropertyPhotoGallery.tsx`
- `src/components/ui/PropertyPhotoUploader.tsx`
- Dashboard pages under `src/app/(dashboard)/dashboard/**`
- Auth pages under `src/app/(auth)/**`
- Wizard components under `src/components/wizard/**`
- Agreement components under `src/components/ui/Agreement*.tsx`
- Message components under `src/components/ui/*Message*.tsx`
- Payment, deposit, condition, tenant document, and verification UI components

Do not change API routes, auth rules, database schema, tenancy business rules, payment logic, AI generation logic, or blockchain logic as part of the visual redesign unless a separate approved spec requires it.

## Verification Expectations

When implementation begins, each phase should verify:

- `npm run build` passes.
- Relevant unit tests still pass when UI edits touch tested behavior.
- Key pages render without console errors.
- Desktop and mobile layouts are visually checked.
- Property-photo fallbacks work for records with and without images.

## Approved Wireframe Decisions

The following decisions were approved during the wireframe review:

- Use Command Center as the base dashboard direction.
- Adapt Ledger for payment/admin review pages.
- Adapt Guided Flow for tenancy and agreement workflows.
- Preserve the current visual system rather than performing a full rebrand.
- Use property photos where available, especially in property cards, tenant tenancy context, property detail headers, and admin property verification rows.
- Use neutral image fallbacks when photos are missing.
- Keep messages and auth as specialized layouts rather than forcing them into dashboard cards.
