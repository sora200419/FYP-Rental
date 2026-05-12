# AI Assist Review Design

Date: 2026-05-12

## Goal

Improve the landlord agreement AI assist workflow so suggested edits can be reviewed safely before they replace the editor content.

## Current Problem

The current AI assist flow returns one full replacement draft and renders it as a single preview block. This creates two usability problems:

- the landlord cannot quickly see what actually changed
- applying the suggestion feels like a blind full-document overwrite

This is especially risky for legal text where small clause edits matter.

## Scope

Included:

- upgrade the AI suggestion review panel in the agreement editor
- show current agreement and AI suggestion side by side
- visibly highlight changed blocks
- show a compact change summary above the comparison
- preserve the existing `Apply to Editor` and `Discard` workflow

Excluded:

- backend diff persistence
- tracked changes storage
- clause-level legal approval workflow
- PDF diffing
- automated test additions

Manual verification remains the expected validation path because the project is intentionally operating without automated test coverage.

## User Experience

When the landlord enters an AI instruction and clicks `Get Suggestion`:

1. The existing request flow calls the current assist API.
2. The API still returns one suggested agreement body.
3. The editor does not overwrite immediately.
4. A review panel appears above the main textarea.
5. The panel shows:
   - a short summary of how many blocks changed
   - the current agreement on the left
   - the AI suggestion on the right
   - highlighted changed blocks on both sides
6. The landlord can:
   - click `Apply to Editor` to replace the textarea content with the suggested version
   - click `Discard` to close the review panel and keep the current text unchanged

## Diff Model

The diff will be computed client-side from the current editor content and the returned suggested content.

Design choice:

- use paragraph/block comparison instead of character-perfect legal redlining

Reasoning:

- the source content is long-form legal text
- the user mainly needs to understand which clauses or paragraphs changed
- paragraph/block highlighting is substantially simpler and more stable than implementing tracked insert/delete markup
- it avoids adding a new dependency or backend processing step

## Presentation Rules

The review panel should:

- keep the current purple AI Assist visual language
- use a two-column layout on desktop
- stack into one column on smaller screens
- use soft contrasting backgrounds for changed blocks
- preserve whitespace and line breaks for legal text readability

Suggested semantics:

- unchanged blocks: white or neutral background
- changed blocks: highlighted background with a visible border/accent

## Technical Approach

The implementation remains entirely in the client UI layer.

Files involved:

- `src/components/ui/AgreementEditor.tsx`
- `src/components/ui/AgreementSuggestionDiff.tsx`
- `src/lib/agreements/textDiff.ts`

Responsibilities:

- `AgreementEditor.tsx`
  - keep current assist request flow
  - pass current and suggested content into the review component
  - keep apply/discard behavior
- `AgreementSuggestionDiff.tsx`
  - render summary and side-by-side comparison
  - handle responsive layout and changed-block highlighting
- `textDiff.ts`
  - split text into review blocks
  - align blocks between current and suggested content
  - mark which blocks changed
  - produce summary counts for the UI

## Success Criteria

The feature is successful if:

- the landlord can tell what changed before applying the AI suggestion
- applying still requires an explicit click
- discarding leaves the editor unchanged
- the review panel works on both desktop and mobile
- no agreement API or persistence behavior changes are required
