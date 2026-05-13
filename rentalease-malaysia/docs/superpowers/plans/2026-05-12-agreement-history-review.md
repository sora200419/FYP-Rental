# Agreement History Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the agreement history tab timeline-first and move version records behind an on-demand reveal.

**Architecture:** Keep the change entirely inside the existing `AgreementViewer` client component. Reuse the existing timeline, revision, and change-request data and only change the rendering order and visibility behavior.

**Tech Stack:** Next.js App Router, React, TypeScript, existing utility-class UI styling

---

## File Structure

### Modified files

- `src/components/ui/AgreementViewer.tsx`

---

### Task 1: Make timeline the primary history surface

**Files:**
- Modify: `src/components/ui/AgreementViewer.tsx`

- [ ] Keep the summary cards at the top of the history tab.
- [ ] Keep the timeline directly below the cards as the primary history content.
- [ ] Add lighter supporting copy that explains the timeline as the main record of agreement activity.

### Task 2: Move recorded versions behind an on-demand reveal

**Files:**
- Modify: `src/components/ui/AgreementViewer.tsx`

- [ ] Add local UI state for showing or hiding the version list.
- [ ] Default the version list to hidden.
- [ ] Replace the always-open version section with a compact header and toggle action.
- [ ] Keep version rows metadata-focused: version number and saved timestamp.

### Task 3: Verify

**Files:**
- Modify: `src/components/ui/AgreementViewer.tsx`

- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run `npm.cmd run lint`.
- [ ] Confirm the history tab is less cluttered and versions expand only on demand.
