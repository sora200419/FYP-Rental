# Roadmap

Suggested improvements, ordered by value for an FYP demo and for real-world feasibility. See [`AUDIT.md`](AUDIT.md) for the specific open issues each item addresses. Items marked ✅ are done; see AUDIT.md → Round 2.

## 1. Make it dependable (first)

| Item | Why |
|---|---|
| **CI on every push.** A GitHub Actions workflow running `npm ci`, `typecheck`, `lint` and `test`. | Catches regressions like the broken test script and the Windows-only lockfile before they reach a build. |
| **Seed script with demo accounts.** `prisma/seed.ts` creating an admin, a landlord with one verified property and two rooms, and tenants at each lifecycle stage. | One-command demo setup. Examiners can see every flow without clicking through registration and KYC. |
| **Route-level tests for the money and signing paths:** finalize, sign, approve signature proof, approve deposit, deposit settlement and cron. Use a throwaway Postgres (Docker or a Neon branch). | These are the flows where a bug costs money or legal standing. Today only the pure helpers are tested. |
| ✅ **Private storage for identity documents.** Authenticated Cloudinary uploads served through a permission-checked endpoint. | Next: apply the same to payment/deposit proofs and condition photos. |
| ✅ **Move admin bootstrap into a script.** | Done: runs during `npm run build`. |

## 2. Make the framework easier to extend

- **Shared route helpers.** Add `requireUser()`, `requireRole()`, `requireLandlordTenancy(id)` and `requireTenantTenancy(id)` in `src/lib/authz.ts`. They would return typed records or a uniform `{ error }` response, and replace about 60 hand-written session and ownership blocks.
- **One validation style.** Validate every request body with zod via a small `parseBody(request, schema)` helper. Use one error shape (`{ error, details? }`) and consistent 401 vs 403.
- **Status transitions in one place.** Extend `src/lib/*Workflow.ts` so each state machine exposes `canTransition(from, to, actor)`. Routes then call it instead of keeping their own status lists, which is exactly where the "signed agreement can be regenerated" class of bugs came from.
- **Shared formatting and UI primitives.** Add `src/lib/format.ts` (`formatRM`, `formatDate` with the `Asia/Kuala_Lumpur` time zone), one `StatusPill` map per enum, a generic `ProofUploader` and a generic `ReviewCard`.
- **Reliable background work.** Use Next's `after()` for blockchain anchoring and emails instead of fire-and-forget promises, which serverless platforms may stop as soon as the response is sent.
- **Split `AgreementViewer.tsx`** into reader, red-flags, history and signing-audit components, and finish moving it to the dark theme.

## 3. Product features that strengthen the project

- ✅ **Bahasa Malaysia UI** — language switch in the profile; shell, dashboards, statuses and tenant tenancy pages translated. Next: the agreement, payment, condition-report and deposit-settlement pages (keys go in `src/lib/i18n.ts`).
- ✅ **Multi-tenancy tenant view** — `/dashboard/tenant/tenancy` list plus `/dashboard/tenant/tenancy/[id]`.
- ✅ **Landlord-side cancellation** of invitations and not-yet-started tenancies, and expiry of unanswered invitations after 30 days. Next: expiry of stale PENDING tenancies.
- ✅ **Property editing**, including resubmission after an admin rejection.
- **"Verify on chain" button.** `verifyHashOnChain` already exists in `src/lib/blockchain.ts`. Show tenants and landlords that the stored hash matches the Sepolia transaction.
- **Rent reminders and overdue notices**, sent by the existing daily cron.
- **Pagination and filters** on landlord payments, admin users, admin properties and the audit log.
- **Corporate occupants.** Give linked occupants read access to their tenancy, or remove the linking feature.

## 4. Feasibility and scale notes

- **Privacy with the AI provider.** IC numbers are redacted before every Claude request (`src/lib/icRedaction.ts`). Names, contact details and addresses are still sent; say so in the privacy notice.
- **AI cost and latency.** Generation is the slowest path. Claude Haiku 5.5 is the low-cost choice; if agreement quality needs more, move only `generateTenancyAgreement` to Claude Sonnet 5.5 and keep Haiku for the rest. Keep the per-tenancy rate limits, cache analysis results by `contentHash`, and show progress in the UI. On Vercel, keep generation within the function time limit or move it to a background job.
- **Blockchain.** Sepolia is a free testnet. That is right for a proof-of-concept, but it is not a legal record. Present it as tamper evidence, and keep the database `contentHash` as the source of truth.
- **Legal.** Generated agreements are drafts. A short disclaimer on the signing screen, plus a recommendation to have it reviewed by a lawyer, makes the project more credible.
- **Data protection (PDPA 2010).** Keep KYC documents private, mask IC numbers in the UI, and document retention: how long KYC images and deleted users' data are kept.
