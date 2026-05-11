# Agreement Flow And Admin Bootstrap Design

Date: 2026-05-12

## Goal

Implement the following in one scoped pass:

1. Move bilingual toggle into the agreement page only, and make it switch agreement-side content only.
2. Add agreement version/history timeline.
3. Add tenant sign acknowledgement checkbox and clearer final-sign step.
4. Add structured change-request flow instead of only free-text negotiation notes.
5. Add landlord pre-finalize checklist for agreement readiness.
6. Change admin bootstrap so the current system no longer uses seed data or a manual create-admin script, and instead bootstraps admin from `.env` only through a single internal bootstrap path.

This work is explicitly limited to the current product scope. It does not introduce a full legal document management platform, full document diffing, or generalized multi-language dashboard UI.

## Current State Summary

The current agreement flow already supports:

- Landlord wizard-driven agreement generation
- Agreement viewing with full text, plain-language summary, and red flags
- Landlord editing and AI assist
- Landlord finalize action
- Tenant sign or request changes
- Signed audit record with timestamp, IP, content hash, and blockchain anchor

The current gaps are:

- The EN/BM toggle is global in dashboard navigation, which implies dashboard-wide language switching instead of agreement-scoped bilingual support.
- There is no persistent user-facing agreement history timeline or version progression.
- Tenant signing lacks a clear acknowledgement gate before signature submission.
- Tenant change requests are mostly free-text negotiation notes rather than structured requests.
- Landlord finalization lacks a readiness checklist.
- Admin bootstrap currently exists in multiple forms: Prisma seed and a manual create-admin script.

## Scope Boundaries

Included:

- Agreement page UX and related backend behavior
- Agreement event/revision persistence from clean state onward
- Tenant request-changes UX and data model
- Tenant sign confirmation UX
- Landlord finalize guardrails
- Removal of global language toggle from dashboard chrome
- `.env`-only admin bootstrap path

Excluded:

- Backfilling legacy agreement history
- Full agreement body translation into Malay
- Full text diff viewer between revisions
- General dashboard localization overhaul
- Public/admin UI for creating admins
- Reworking unrelated auth, payments, KYC, or tenancy flows except where they intersect the agreement workflow

## Design Decisions

### 1. Agreement-Local Bilingual Toggle

The language toggle will be removed from shared dashboard navigation and moved into the agreement-viewing experience only.

Behavior:

- The agreement page will manage its own local display language state.
- The toggle will switch only agreement-scoped content:
  - plain-language summary
  - red flags
  - agreement-view labels where relevant
- The full legal agreement body remains English because the system currently stores only one `rawContent` legal text.

Why this approach:

- It matches the actual feature meaning: bilingual support applies to agreement interpretation, not the whole product UI.
- It avoids misleading users into expecting the rest of the dashboard to translate.
- It avoids mutating the user profile/session language for a feature that is local to one page.

### 2. Persistent Agreement History And Revision Tracking

This implementation will use a lighter persistent audit model rather than a full forensic audit system.

New persistence from clean state onward:

- `AgreementEvent`
  - stores key business events in the agreement lifecycle
- `AgreementRevision`
  - stores content snapshots only when the agreement text materially changes

Events to capture:

- agreement generated
- agreement content edited
- agreement finalized
- tenant requested changes
- agreement signed

Revision strategy:

- Create a revision at initial generation
- Create a new revision whenever landlord content changes or a regeneration produces materially updated agreement content
- Revisions are versioned with simple user-facing numbering such as `Version 1`, `Version 2`

Explicit non-goal:

- No retroactive reconstruction of old agreement history
- No clause-level diff engine in this pass

Why this approach:

- It gives users an understandable timeline and version history
- It keeps schema and implementation complexity appropriate for current scope
- It is much smaller than a generalized immutable audit subsystem

### 3. Tenant Final Sign Step

The tenant agreement page will gain a clearer action panel for the final decision.

New UX requirements:

- Show a distinct agreement response panel when status is signable
- Require a checkbox acknowledgement before enabling the sign action
- Keep `Request Changes` as a separate explicit action

Acknowledgement text:

- The exact text can be finalized during implementation, but the intent is:
  - the tenant confirms they have reviewed and understood the agreement before signing

Backend behavior:

- Existing signing audit behavior remains intact
- `signedAcknowledged` will reflect an actual UI acknowledgement step, not just an internal field

Why this approach:

- Makes the sign action more deliberate
- Better aligns the UI with the legal/audit posture already present in the backend

### 4. Structured Change Requests

Tenant agreement change requests will move from free-text-only to structured requests with optional notes.

Structured request model:

- request category / section
- requested change summary
- reason / explanation
- optional free-text note

Design principles:

- Keep the form structured enough for clarity
- Do not remove free text completely
- Avoid forcing a rigid legal-clause editor experience

Landlord experience:

- Structured tenant requests will appear clearly in the agreement editor flow
- The landlord can address them via direct edits or AI assist
- Once the landlord saves/revises, addressed request state will be cleared or resolved according to the new data model

Why this approach:

- Produces clearer review input than one large text box
- Improves the landlord’s ability to act on requested changes
- Fits the negotiation workflow already present without turning it into a full collaborative editor

### 5. Landlord Pre-Finalize Checklist

The landlord agreement page will show a checklist before finalization.

Checklist purpose:

- Prevent incomplete or misleading agreement finalization
- Surface high-signal readiness issues at the point of action

Checklist coverage:

- agreement content exists
- wizard preferences are complete
- agreement is still in a finalizable state
- landlord has reviewed red flags
- there are no unresolved structured tenant requests blocking re-finalization
- any agreement-required identity/profile data needed for the document is present

Blocking rules:

- Missing required items block finalization
- Non-critical warnings remain informative but non-blocking

Why this approach:

- Creates a clearer landlord flow
- Reduces avoidable send/re-send churn
- Makes agreement finalization feel like a deliberate checkpoint

### 6. `.env`-Only Admin Bootstrap

Admin bootstrap will be consolidated into a single internal bootstrap path that reads only from `.env`.

Environment variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME` (optional)

Behavior:

- If no matching admin exists, create one
- If a user with that email exists, promote to `ADMIN`
- If the correct admin already exists, do nothing
- Repeated calls must be safe and idempotent

Explicit decisions:

- No Prisma seed-based admin creation
- No manual script-based admin creation for the current system
- No normal user-facing admin creation flow

Why this approach:

- Keeps admin bootstrap explicit and isolated
- Avoids hidden side effects on generic app startup or page visit
- Gives one clear source of truth for admin credentials

## Data Model Changes

The implementation will likely require the following additions or equivalent structures:

### AgreementEvent

Fields:

- `id`
- `agreementId`
- `type`
- `actorRole`
- `actorUserId` nullable where appropriate
- `summary`
- `metadata` JSON nullable
- `createdAt`

Purpose:

- timeline display
- lifecycle visibility

### AgreementRevision

Fields:

- `id`
- `agreementId`
- `versionNumber`
- `rawContent`
- `plainLanguageSummary`
- `plainLanguageSummaryMs` nullable
- `redFlags`
- `redFlagsMs` nullable
- `createdByUserId` nullable
- `createdAt`

Purpose:

- version history
- content snapshots when agreement changes

### Structured Change Request Model

Either a dedicated relational table or a JSON-backed dedicated model may be used, but the implementation must preserve explicit fields for:

- request category
- requested change summary
- reason
- optional note
- request status
- timestamps

The preferred direction is a dedicated relational model because it simplifies rendering and state transitions.

## User Flow Changes

### Landlord

1. Complete wizard
2. Generate agreement
3. View agreement page
4. See version/timeline and pre-finalize checklist
5. Finalize only when blocking checklist items are satisfied
6. If tenant requests changes, review structured requests
7. Edit or regenerate agreement
8. Re-finalize, producing new version/history entries
9. View signed audit record after tenant signs

### Tenant

1. Open finalized agreement
2. Use agreement-local EN/BM toggle for summary/red flags
3. Review full agreement and supporting interpretation tabs
4. Either:
   - submit structured change request
   - or acknowledge review and sign
5. After signing, see signed state and audit record

## Error Handling

The implementation must handle these cleanly:

- Tenant tries to sign without acknowledgement
- Tenant submits malformed or empty structured request
- Landlord tries to finalize while checklist blocking items remain
- Agreement is edited after prior tenant request and old pending requests must resolve correctly
- Agreement history tables are empty because this is a fresh tracking model
- Admin bootstrap env variables are missing or incomplete

## Testing Expectations

Implementation verification must cover:

- Global dashboard language toggle is gone
- Agreement page has local bilingual toggle only
- EN/BM switching changes agreement-side interpretation content only
- Agreement generation writes first revision/history event
- Landlord edit/regenerate writes new revision/history event
- Finalize writes history event and respects checklist blocking
- Tenant request changes writes structured request and history event
- Tenant sign is blocked until acknowledgement is checked
- Tenant sign writes sign event and preserves audit record behavior
- Admin bootstrap path creates/promotes admin only from `.env`
- Re-running bootstrap path does not duplicate admin creation

## Implementation Order

1. Prisma schema and migrations for events, revisions, structured requests
2. Agreement API write-path updates for history/revision tracking
3. Tenant structured request flow
4. Tenant sign acknowledgement UI
5. Landlord checklist logic and UI
6. Agreement timeline/version UI
7. Remove global dashboard language toggle and add agreement-local toggle
8. Replace admin creation flow with `.env`-only internal bootstrap path

## Risks And Tradeoffs

- Agreement-local bilingual toggle is simpler and less confusing, but it means profile-level language is no longer the source of truth for agreement display.
- Lighter history tracking is much easier to implement than a full audit system, but it does not reconstruct the legacy past.
- Structured requests improve clarity, but too many required fields would make the tenant flow heavy. The form must stay concise.
- `.env`-only admin bootstrap is cleaner than seed/script sprawl, but it introduces a new internal bootstrap operation that must be protected from normal user traffic.

## Success Criteria

The work is successful when:

- Users no longer see a dashboard-wide EN/BM toggle
- Agreement pages clearly support local bilingual interpretation
- Users can see agreement version/history progression from clean state onward
- Tenant signing is deliberate and acknowledged
- Tenant change requests are structured and clearer to process
- Landlord finalization is gated by a visible readiness checklist
- Admin bootstrap is driven only by `.env` through one internal mechanism
