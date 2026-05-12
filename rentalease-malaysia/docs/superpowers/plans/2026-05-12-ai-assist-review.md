# AI Assist Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a side-by-side AI suggestion review panel with changed-block highlighting before agreement editor content is replaced.

**Architecture:** Keep the existing assist API unchanged and compute a client-side diff from the current agreement text and the returned AI suggestion. Render the review in a dedicated UI component so the editor stays responsible only for request/apply/discard state.

**Tech Stack:** Next.js App Router, React, TypeScript, existing Tailwind-style utility classes

---

## File Structure

### New files

- `src/lib/agreements/textDiff.ts`
- `src/components/ui/AgreementSuggestionDiff.tsx`

### Modified files

- `src/components/ui/AgreementEditor.tsx`

---

### Task 1: Build a lightweight client-side diff helper

**Files:**
- Create: `src/lib/agreements/textDiff.ts`

- [ ] Add block-splitting helpers that normalize line endings and split agreement text into readable review blocks.
- [ ] Add a block alignment function that pairs current and suggested blocks by index and marks whether each pair changed.
- [ ] Add a summary builder that returns counts for total changed blocks and whether any changes exist.
- [ ] Keep the implementation dependency-free and focused on review readability, not perfect legal redlining.

Manual verification:

- read the helper output through the review component in the browser
- confirm unchanged blocks are not highlighted and changed blocks are highlighted

### Task 2: Render side-by-side AI review UI

**Files:**
- Create: `src/components/ui/AgreementSuggestionDiff.tsx`

- [ ] Create a presentational component that accepts `currentContent` and `suggestedContent`.
- [ ] Render a top summary line such as changed block count and review guidance.
- [ ] Render a responsive two-column layout on desktop and stacked layout on small screens.
- [ ] Highlight changed blocks on both the current and suggested sides.
- [ ] Preserve whitespace and line breaks for legal text readability.

Manual verification:

- trigger AI assist with a small clause change
- confirm desktop shows left/right comparison
- shrink the viewport and confirm mobile stacking still reads cleanly

### Task 3: Integrate the review panel into the agreement editor flow

**Files:**
- Modify: `src/components/ui/AgreementEditor.tsx`

- [ ] Replace the single preview `<pre>` block with the new diff review component.
- [ ] Keep `Discard` and `Apply to Editor` in the review header.
- [ ] Ensure `Apply to Editor` still updates the main textarea only after explicit confirmation.
- [ ] Ensure `Discard` closes the review panel without changing the textarea content.
- [ ] Keep the current API request flow and error handling unchanged.

Manual verification:

- request an AI suggestion
- confirm the textarea content does not change until `Apply to Editor`
- confirm `Discard` leaves the textarea exactly as it was
- confirm `Apply to Editor` copies the suggested version into the textarea

### Task 4: Static verification and manual test notes

**Files:**
- Modify: `src/components/ui/AgreementEditor.tsx`
- Create/Modify as needed: no additional files expected

- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run `npm.cmd run lint`.
- [ ] Record the manual verification flow in the final response for the user.

Expected output:

- TypeScript passes
- lint passes with only pre-existing warnings
