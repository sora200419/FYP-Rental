# Condition Report Evidence and Dispute Design

Date: 2026-05-15

## Purpose

Improve RentalEase condition reports so they create useful rental evidence instead of becoming a weak photo upload area with a single acknowledgement button.

The new design should protect both landlord and tenant during move-in, move-out, inspection, and deposit settlement. It should require a minimum level of structured evidence while still allowing each party to disagree, add counter evidence, and preserve negotiation space before the report becomes final.

This design focuses on condition report product rules, workflow states, evidence requirements, UI behavior, API validation, and test expectations. It does not implement the feature yet.

## Current Problems

The current system has the right foundation, but the evidence rules are too loose.

- A condition report can be created with optional notes.
- Photos can be uploaded with room or area labels.
- Photos can be deleted by the uploader before acknowledgement.
- Acknowledged reports become locked, which is correct.
- The UI only shows the acknowledgement action when there is at least one photo.
- The API acknowledgement route does not enforce a minimum photo count.
- There is no structured checklist for required areas.
- There is no counter-evidence or correction request flow.
- The acknowledgement wording implies agreement with the documented condition.

The main risk is that a user may acknowledge a weak or incomplete report and later lose negotiation leverage during a deposit dispute.

## Design Direction

Use a hybrid model:

- Require minimum evidence for move-in and move-out reports.
- Keep inspection reports lighter and more flexible.
- Allow both parties to add photos and notes before final acceptance.
- Replace simple acknowledgement with review decisions.
- Lock the report only when the review process is complete.
- Preserve disputed records instead of forcing artificial agreement.

This approach avoids two extremes:

- Fully optional evidence, which weakens dispute resolution.
- Overly strict photo requirements, which make users upload low-quality filler photos.

## Report Types

### Move-In Report

The move-in report records the property state before or near the start of occupation. It is the baseline used later during move-out and deposit settlement.

Move-in reports require the strongest evidence rules.

Minimum requirements:

- At least 6 uploaded photos.
- At least 4 required area checklist items completed.
- Notes are optional, but recommended when damage or missing items exist.
- The report cannot be submitted for review until minimum evidence is met.

### Move-Out Report

The move-out report records the property state near handover. It is compared against the move-in report during deposit settlement.

Move-out reports also require strong evidence rules.

Minimum requirements:

- At least 6 uploaded photos.
- At least 4 required area checklist items completed.
- Any claimed damage or deduction should have at least one linked photo.
- Deposit settlement should warn the landlord if the move-out report is incomplete or disputed.

### Inspection Report

Inspection reports document mid-tenancy checks. They should support evidence but not block normal use.

Minimum requirements:

- At least 1 uploaded photo before submission.
- Area checklist is optional.
- Counter evidence is allowed.
- Acceptance is optional unless the inspection is used as evidence in a later dispute.

## Required Evidence Areas

For move-in and move-out reports, the user should see a checklist of common evidence areas.

Default required areas:

- Bedroom or rented room
- Bathroom
- Kitchen or shared area
- Door, lock, and keys
- Walls, floor, and ceiling
- Furniture or appliances, if provided

Each checklist item can be completed in one of these ways:

- Photo uploaded
- No issue observed
- Not applicable
- Cannot access

The system should store the selected completion reason. This prevents missing photos from becoming silent gaps.

## Evidence Quality Rules

The system cannot fully verify photo quality, but it can guide users toward stronger records.

Photo uploads should continue to require:

- Image file type only
- Maximum file size limit
- Room or area label
- Uploader identity
- Created timestamp

Recommended additional metadata:

- Checklist area, if the photo is linked to one
- Caption or issue description
- Report stage when uploaded

The UI should encourage, but not require, captions for photos showing damage, stains, cracks, missing items, or appliance issues.

## Report States

Condition reports should use explicit workflow states instead of relying only on `acknowledgedAt`.

Recommended states:

- `DRAFT`
- `SUBMITTED`
- `PENDING_REVIEW`
- `CORRECTION_REQUESTED`
- `COUNTER_EVIDENCE_ADDED`
- `ACCEPTED`
- `DISPUTED`
- `LOCKED`

State meaning:

- `DRAFT`: Creator is still preparing the report. Other party is not asked to review yet.
- `SUBMITTED`: Creator has met minimum evidence rules and submitted the report.
- `PENDING_REVIEW`: Other party needs to respond.
- `CORRECTION_REQUESTED`: Other party wants missing or unclear evidence fixed.
- `COUNTER_EVIDENCE_ADDED`: Other party added their own photos or notes.
- `ACCEPTED`: Other party accepts the documented condition.
- `DISPUTED`: Other party disagrees and the disagreement is preserved.
- `LOCKED`: No more report edits are allowed.

`ACCEPTED` and `DISPUTED` reports may both become locked. The important difference is whether the parties agreed.

## Review Decisions

Replace the current single acknowledgement action with three review decisions.

### Accept Report

The reviewer confirms they reviewed the evidence and accept the documented condition.

This should set:

- Review decision: `ACCEPTED`
- Reviewed by user
- Reviewed timestamp
- Report status: `ACCEPTED` or `LOCKED`

### Request Correction

The reviewer believes the report is incomplete, unclear, or missing important areas.

The reviewer must provide a reason.

Examples:

- Missing bathroom photos.
- Photo is too blurry.
- Existing wall damage not shown.
- Appliance condition not documented.

This should set:

- Review decision: `CORRECTION_REQUESTED`
- Correction note
- Reviewed by user
- Reviewed timestamp
- Report status: `CORRECTION_REQUESTED`

The creator may then add photos, update notes, and resubmit.

### Add Counter Evidence

The reviewer disagrees with part of the report and wants to preserve their own evidence.

The reviewer can upload photos and add a counter note.

This should set:

- Review decision: `COUNTER_EVIDENCE_ADDED`
- Counter note
- Counter photos
- Reviewed by user
- Reviewed timestamp
- Report status: `COUNTER_EVIDENCE_ADDED` or `DISPUTED`

The report should clearly show original evidence and counter evidence separately.

## Locking Rules

Reports should not be editable forever.

Locking rules:

- Draft reports are editable by the creator.
- Submitted reports allow both parties to add evidence until a final decision.
- Accepted reports are locked.
- Disputed reports are locked when either party finalizes the dispute record or when deposit settlement begins.
- Locked reports cannot add, delete, or modify photos.
- Photo deletion before lock remains allowed only for the uploader.

The current immutability rule after acknowledgement should be kept, but the trigger should be final report status rather than only `acknowledgedAt`.

## Deposit Settlement Integration

Deposit settlement should show condition report evidence strength.

For each tenancy, the deposit settlement page should display:

- Move-in report status
- Move-out report status
- Evidence completeness score
- Whether either report is disputed
- Whether accepted baseline evidence exists

Settlement warnings:

- No accepted move-in report: baseline evidence is weak.
- No move-out report: deduction evidence is weak.
- Disputed report: settlement should show the dispute before confirming refund or deduction.
- Incomplete required areas: settlement should show which evidence areas are missing.

The system should not block all settlement actions, but it should make evidence weakness visible before the landlord confirms deductions.

## UI Requirements

### Report Creation

The report creation form should create a draft report first.

Required fields:

- Tenancy
- Report type

Optional fields:

- General notes

After draft creation, the user is taken to the evidence collection view.

### Evidence Collection View

The evidence collection view should show:

- Report type and status
- Minimum evidence progress
- Required area checklist
- Photo uploader
- Grouped photo gallery
- Submit for review button

The submit button remains disabled until minimum evidence is met.

Example progress copy:

`4 of 6 minimum photos uploaded`

`3 of 4 required evidence areas completed`

### Review View

The other party sees:

- Original report summary
- Notes
- Photos grouped by area
- Evidence completeness score
- Review decision actions

Available actions:

- Accept Report
- Request Correction
- Add Counter Evidence

The review view must avoid implying that viewing the report equals agreement.

### Dispute View

If counter evidence exists, the report should show:

- Original evidence
- Counter evidence
- Each party's notes
- Timeline of submissions and review decisions
- Current final status

## API Requirements

The backend must enforce the same rules as the UI.

Required validations:

- A move-in or move-out report cannot be submitted unless minimum evidence rules are met.
- A report cannot be accepted if it has no photos.
- A locked report cannot receive new photos.
- A locked report cannot delete existing photos.
- A user cannot accept their own report.
- Only the landlord, tenant, or authorized tenancy party can view or act on the report.
- A correction request must include a non-empty reason.
- Counter evidence must include either a note or at least one photo.

Recommended endpoints:

- `POST /api/condition-reports`
- `PATCH /api/condition-reports/[id]/submit`
- `POST /api/condition-reports/[id]/photos`
- `DELETE /api/condition-reports/[id]/photos/[photoId]`
- `PATCH /api/condition-reports/[id]/accept`
- `PATCH /api/condition-reports/[id]/request-correction`
- `PATCH /api/condition-reports/[id]/counter-evidence`
- `PATCH /api/condition-reports/[id]/lock`

Existing acknowledgement behavior can be migrated into the accept endpoint.

## Data Model Direction

The current models already provide a base:

- `ConditionReport`
- `ConditionPhoto`
- `ReportType`

Recommended additions:

- Report status enum
- Review decision enum
- Submitted timestamp
- Reviewed timestamp
- Reviewed by user
- Correction note
- Counter note
- Evidence checklist records
- Optional photo checklist area relation

The design should avoid storing checklist completion as a JSON blob if structured querying is needed for completeness scoring and deposit settlement warnings.

## Notifications

Notifications should be sent when:

- A report is submitted for review.
- A correction is requested.
- Counter evidence is added.
- A report is accepted.
- A report becomes disputed.
- A report is locked.

Notification copy should be action-oriented and include the report type.

Examples:

- `Move-in condition report ready for review`
- `Correction requested for move-out condition report`
- `Counter evidence added to inspection report`

## Out of Scope

This spec does not include:

- AI damage detection
- Automatic blur detection
- Automatic room recognition
- Legal advice generation
- Mandatory video walkthroughs
- Third-party dispute arbitration
- Full audit log redesign

These can be considered later after the structured evidence workflow is stable.

## Acceptance Criteria

### Move-In and Move-Out Evidence

- Users can create a draft move-in or move-out report.
- Users cannot submit the report until minimum photo and checklist requirements are met.
- Users can mark a required area as not applicable or cannot access.
- Missing evidence reasons are stored and visible.

### Review Decisions

- The non-creator can accept a submitted report.
- The non-creator can request correction with a required reason.
- The non-creator can add counter evidence with a note or photo.
- The creator cannot accept their own report.
- The report clearly distinguishes acceptance from dispute.

### Locking

- Accepted reports become locked.
- Locked reports reject photo uploads and photo deletions from the API.
- Locked reports show immutable evidence in the UI.

### Deposit Settlement

- Deposit settlement displays move-in and move-out report status.
- Deposit settlement warns when baseline evidence is missing.
- Deposit settlement warns when a report is disputed.
- Deposit settlement warns when required evidence areas are incomplete.

### Security and Access

- Users outside the tenancy cannot view condition reports.
- Users outside the tenancy cannot upload photos, request correction, accept, or add counter evidence.
- Backend validation matches UI restrictions.

## Testing Requirements

Unit and integration tests should cover:

- Submit move-in report with insufficient photos fails.
- Submit move-out report with insufficient checklist completion fails.
- Submit inspection report with one photo succeeds.
- Accept report with zero photos fails.
- Creator accepting own report fails.
- Correction request without reason fails.
- Counter evidence without note or photo fails.
- Photo upload to locked report fails.
- Photo deletion from locked report fails.
- Deposit settlement warning appears when move-in report is missing.
- Deposit settlement warning appears when move-out report is disputed.

## Migration Notes

Existing condition reports should be migrated carefully.

Suggested migration:

- Reports with `acknowledgedAt` become `ACCEPTED` and `LOCKED`.
- Reports without `acknowledgedAt` and with photos become `SUBMITTED` or `PENDING_REVIEW`.
- Reports without photos become `DRAFT`.
- Existing `acknowledgedById` maps to reviewed by user.
- Existing `acknowledgedAt` maps to reviewed timestamp.

No existing photos should be deleted during migration.

## Success Criteria

The feature succeeds when:

- Users understand what evidence they still need to upload.
- A report cannot be finalized with empty or meaningless evidence.
- A reviewer can disagree without losing workflow progress.
- Deposit settlement can show whether the evidence record is strong, weak, or disputed.
- The backend prevents bypassing UI evidence rules.
