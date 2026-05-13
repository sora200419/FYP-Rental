# Agreement History Review Design

Date: 2026-05-12

## Goal

Refine the agreement history tab so landlords see the activity timeline first and version records only when they choose to inspect them.

## Current Problem

The current history tab shows:

- summary cards
- full timeline
- full version list
- full structured change request list

This makes history feel heavy even when the landlord only wants to answer one question: what happened on this agreement?

## Design Direction

Default view:

- show high-level summary cards
- show the agreement timeline as the primary section
- show version records as a secondary, collapsed section
- keep structured change requests visible but below timeline

On-demand detail:

- the landlord can expand recorded versions only when needed
- version records remain metadata-focused, not full-content by default

## Why This Is Better

- timeline is the fastest way to understand agreement progress
- version metadata is still available for auditability
- the page becomes easier to scan
- it avoids turning the history tab into another full document browser

## Scope

Included:

- history-tab presentation changes in the existing agreement viewer
- version records collapsed by default
- clearer copy to frame timeline as the primary audit view

Excluded:

- full version-content viewer
- revision diff view
- backend changes
- schema changes

## Success Criteria

The feature is successful if:

- landlords can understand agreement progress from the timeline alone
- version records are still accessible when needed
- the default history tab is less cluttered than before
