# Codebase audit

Audit date: 2026-11. Paths are relative to `rentalease-malaysia/`.

- Part 1 lists what was **fixed**.
- Part 2 lists issues **left for a decision**: they need a product choice, a database migration, or a larger refactor.

Severity:

| Label | Meaning |
|---|---|
| 🔴 High | Wrong data, a security or privacy risk, or a broken user flow |
| 🟠 Medium | Inconsistent behaviour, or a performance problem that grows with data |
| 🟡 Low | Clean-up |

---

## Part 1 — Fixed

### Tooling

- `npm test` pointed at a gitignored `deployment/vitest.config.ts`. The suite now runs from the committed `vitest.config.ts`. Added the `typecheck` and `test:watch` scripts.
- There was no `vercel.json`, so the expiry cron never ran. It is now scheduled daily.
- `package-lock.json` (generated on Windows) listed only the Windows native binaries for `lightningcss` and `@tailwindcss/oxide`. Builds on Linux, including Vercel, failed with `Cannot find module '../lightningcss.linux-x64-gnu.node'`. The lockfile now lists every platform, at the same versions.
- ESLint's type-aware block was scoped to TS files. Removed stale ignore entries, an unused `@types/multer`, five create-next-app SVGs, and stale `.gitignore` rules. Added `engines.node`.

### Accounts

- **Mixed-case emails.** Registration stored the email as typed, but login and password reset lowercase it, so mixed-case users could never sign in. Registration and tenant invitations now normalise emails.
  - Accounts created before this fix with uppercase letters still need a one-off `UPDATE "User" SET email = lower(email)`. Check for collisions first.
- **Removed/suspended messages.** These used to be revealed before the password was checked, which told an attacker the account existed. They now appear only after a correct password.
- **Soft-deleted users.** Their sessions are now invalidated.
- **Login errors.** The login form now shows the real reason (suspended, removed, rate-limited) instead of always "Invalid email or password".
- **Forgot password.** Removed the dead "reset link generated" branch; the page now says the link was emailed.
- **Reset password.** The client now enforces the server's 12-character minimum.
- **Admin redirect.** Admins visiting `/dashboard` are now sent to `/dashboard/admin`.
- **Revoked verification.** Revoking a user's verification now also marks their KYC submission rejected. Previously they could never resubmit.
- **Audit snapshot.** The user-deletion audit snapshot no longer stores the password hash.

### Agreements

- Agreements that are `SIGNED` or `PENDING_SIGNATURE_PROOF` can no longer be regenerated, edited, AI-assisted or re-analysed. Their wizard answers and tenancy terms are also locked.
  - Before, regenerating reset a signed agreement to DRAFT while its hash, signature trail and blockchain anchor still pointed at the old text.
- **Wizard page.** It now redirects away when the agreement is signed.
- **Negotiation rounds.** The round was incremented both on change request and on regeneration, so the "5 rounds" cap allowed only about 2 rounds. It is now incremented only on change requests.
- **"Agreement signed" email.** It no longer claims the tenancy is active while the deposit is still unpaid. Subjects are no longer HTML-escaped.
- **Rate limiting.** `generate` and `assist` now use `enforceLimit`, so a Redis outage no longer returns 500, and the "you can generate 0 more" text is gone. `analysis` gained a rate limit, and `assist` caps its input size.

### Tenancy lifecycle

- **Rooms after expiry and termination.** Expired tenancies never freed their room, so it stayed unrentable. Termination freed it even when a renewal invite was pending. Withdrawing or declining a *renewal* freed a room that was still occupied.
  - All of these paths now call `syncRoomAvailability`: the cron job, lazy expiry, terminate, renew, withdraw and decline.
- **Cron.** Removed the N+1 landlord lookups and the duplicated 30-day and 7-day blocks. In-app links now match the dashboard's de-duplication, so users no longer get duplicate reminders.
- **Renewal.** It now carries over corporate lease fields, and a room can only have one open renewal.
- **Creating a tenancy.** Now validates rent > 0, deposit ≥ 0 and real calendar dates.

### Uploads and payments

- **Deposit proof.**
  - Uploads are now limited to `PENDING` or `ACTIVE` tenancies. A tenant used to be able to upload while `INVITED`, and landlord approval then skipped the invitation and its identity-verification gate.
  - Type and size validation added (it had none).
- **Both proof routes.** The new file is validated and uploaded *before* the previous proof is deleted, and both routes use the shared Cloudinary configuration.
- **Payment proof uploader.**
  - Selecting several files raced, and each upload deleted the others. It now takes a single file and labels the action "Replace proof".
  - It accepts PDFs, as the server does, and shows PDF tiles instead of broken images.
  - It handles `WAIVED` payments.
- **Ended tenancies.** The tenant payments page no longer offers a deposit upload.
- **Condition report delete.** Now uses the condition-photo delete helper.

### Deposit settlement

- **Landlords could never add deductions.** "Start Settlement" always posted an empty list, which creates an `AGREED` refund, and that state hides the deduction form. Landlords now draft deductions first, then submit them (giving `PROPOSED`) or choose "refund full deposit".
- **Decimal amounts.** They arrive as strings and were being string-concatenated in totals; they are now converted to numbers. Both settlement components re-sync after a refresh.
- **Tenant view.** It now shows the server's refund status and amount.
- **Tenant responses.** The response route is now a single transaction, so concurrent answers can't leave the refund stuck in `IN_REVIEW`.

### UI bugs

- **Wizard.** Reopening a completed wizard showed a blank step and a 120% progress bar.
- **Audit log.**
  - `?page=abc` crashed the page.
  - The entity filter listed a non-existent `TenantDocument` and missed real entities.
  - Most action labels were missing.
- **Tenant dashboard.** The agreement pill referenced a non-existent `PENDING_TENANT` status and rendered "PENDING SIGNATURE_PROOF".
- **Rent due day.** It rendered as "21th", "22th" or "23th".
- **Message thread.** It jumped to the bottom every 10 seconds even with no new messages.
- **AI assist.** Pressing Enter bypassed the 10-character minimum.
- **Property rejection.** It now also clears `isVerified`.

### Dead code removed

- Components with zero importers: `TopNav.tsx`, `VerifyButton.tsx`, and `TenancyInvitationCard.tsx` (which was also broken: it sent lowercase actions).
- The unused 410 routes `api/admin/users/[id]/verify` and `api/admin/users/[id]/reject`.
- The orphan `admin/verify` redirect page.
- `lib/payments.ts`: the unused `generateRentSchedule`, and `ensureNextPaymentPending`, whose body did nothing.
- `lib/cloudinary.ts`: the unused `uploadPaymentProof` and `deleteAgreementSignatureProof`.

### AI provider

Replaced Google Gemini (`@google/generative-ai`, which Google had deprecated) with Claude Haiku 5.5 through the Anthropic SDK. JSON results now use schema-constrained structured outputs instead of prompt-only JSON plus clean-up code, and refusals or truncated responses are detected before parsing. See `docs/ARCHITECTURE.md` → AI usage. The environment variable is now `ANTHROPIC_API_KEY`.

### Round 2 — security, flow gaps and language

Done after the first audit, following the roadmap.

- **Private identity files.** KYC images and signed agreement scans are now `authenticated` Cloudinary assets.
  - They are served only through `/api/files/kyc/...` and `/api/files/signature-proofs/...`, which check who is asking and redirect to a signed link that expires after 5 minutes.
  - Files uploaded earlier stay public until `scripts/make-private-assets.ts` is run once.
- **No IC numbers to the AI.** Every Claude request replaces Malaysian IC numbers with placeholders (`src/lib/icRedaction.ts`) and puts them back on the server: in full in the agreement, masked in summaries and red flags.
- **Upload checks by content.** Every upload route detects the real file type from its first bytes (`src/lib/uploadValidation.ts`) and uses random file names. Non-KYC uploads are rate limited.
- **Password reset.** Tokens are claimed atomically, and other open reset links are revoked.
- **One password rule.** 12–128 characters for both registration and reset (`src/lib/passwordPolicy.ts`).
- **Tenant lookup.** Rate limited, and it no longer reveals removed or suspended accounts.
- **Admin bootstrap.** Runs at build time (`npm run admin:bootstrap`) instead of on every page request. It never promotes an existing account that happens to use `ADMIN_EMAIL`, and refuses a weak admin password.
- **Several tenancies per tenant.** Tenants with more than one tenancy see a list at `/dashboard/tenant/tenancy` and a page per tenancy. Notifications, emails and reminders link to the specific tenancy, and messages can switch between threads.
- **Cancelling.** Landlords can cancel an invitation or a tenancy that hasn't started. Tenant withdraw follows the same rule: blocked once the deposit is submitted or the tenant has signed. Invitations with no answer are removed after 30 days by the daily cron.
- **Editing properties.** A rejected listing is resubmitted on save. A verified listing goes back to review only if its location changes. The address is locked while a tenancy is open, and landlords now see the admin's rejection feedback.
- **Smaller fixes:**
  - expired tenancies link to the renewal page;
  - deleting a room with past tenancies gives a clear message instead of a 500;
  - dashboard banners link to the page that needs action.
- **Bahasa Malaysia interface.** A language switch on the profile page. Translated so far:
  - the shell, notifications and banners;
  - the dashboards and every status label;
  - the tenant tenancy and messages pages.
  - The dictionary is typed, so a missing Malay string fails the build.

### Tests

Added `tests/unit/audit-fixes.test.ts`, `security.test.ts`, `flow-gaps.test.ts` and `i18n.test.ts`. There are now 70 tests in total.

---

## Part 2 — Open issues (not changed)

### 🔴 Security and privacy

1. **Rotate the leaked secrets.** The submitted source archive contained a `.env` with real credentials (database, NextAuth, Gemini, Cloudinary, Sepolia private key, Resend, Upstash, admin password). Rotate all of them; [`DEPLOYMENT.md`](DEPLOYMENT.md) has the steps.
2. **Other personal files are still public URLs.**
   - Payment, deposit and refund proofs (bank slips) and condition photos are linked only from pages that check ownership, but anyone holding the URL can open them.
   - The same private-file mechanism used for KYC images (`getAssetAccessUrl` + an `/api/files/...` route) would cover them.
3. **Registration reveals existing accounts.** It returns different errors for "email already registered" and "IC already registered", which lets someone probe which emails or IC numbers have accounts.
4. **Suspension relies on the proxy and the session.** Route handlers don't check `isSuspended` themselves. The JWT re-reads it on every request, but a shared `requireActiveUser()` helper would be more robust.
5. **The AI provider still receives other personal details.** IC numbers are now redacted, but names, emails, phone numbers and addresses still go to Anthropic. Mention this in the privacy notice / user consent.

### 🔴 Flow gaps

1. **PENDING tenancies never expire.** Only unanswered invitations are cleared automatically.
2. **Linked corporate occupants get no access.**
   - `CorporateOccupant.linkedUserId` is written but never read, so linking an occupant does nothing.
   - REMOVED occupants can also be re-linked.
3. **Condition evidence can change during review.**
   - It stays editable while the other party is reviewing (`PENDING_REVIEW`, `COUNTER_EVIDENCE_ADDED`).
   - Either party can edit the other's draft checklist.
4. **"Regenerate" on a FINALIZED agreement.** It silently resets the version the tenant is reviewing back to DRAFT. Consider a confirmation step or blocking it.
5. **Finalize overwrites terms on an ACTIVE tenancy.** It writes rent, deposit and dates even when the deposit is already PAID.
6. **The timeline's "Condition" step is unreachable** on a live tenancy (`src/lib/uiRedesign.ts`).
7. **Rooms with past tenancies can't be deleted at all** (by design now, with a clear message). An "archive room" option would let landlords hide them.

### 🟠 Database (needs a migration)

1. **Missing indexes:**
   - `Room.propertyId`
   - `ConditionPhoto.reportId`
   - `PropertyPhoto.propertyId`
   - `DepositDeduction.refundId`
   - `CoTenant.tenancyId`
   - `Notification(userId, createdAt)`
2. **Delete restrictions.** `AuditLog.actor` restricts deletion, so `scripts/delete-users.ts` fails for any user who performed an audited action.
3. **System actions have no actor.** The cron records expired invitations under the landlord's ID because `AuditLog.actorId` is required. A nullable actor (or a system user) would be more accurate.
4. **Enum values that are never written:**
   - `ReportStatus.SUBMITTED` and `LOCKED`
   - `AgreementEventType.SIGNED`
   - `NotificationType.CONDITION_REPORT_CREATED`, `CONDITION_REPORT_ACKNOWLEDGED` and `MUTUAL_TERMINATION_PROPOSED`
   - `PaymentStatus.LATE`
5. **Notification types reused for other events.**
   - `DEPOSIT_REFUND_PAID` is sent for "all deductions agreed".
   - `MUTUAL_TERMINATION_RESPONDED` is sent for a one-sided termination.
   - `INVITATION_RESPONDED` is now also used for cancellations and expiry.
   - A dedicated `INVITATION_CANCELLED` type would be clearer.
6. **Floating-point money totals.** Deductions and refunds are summed with JS floats. Use integer cents or `Prisma.Decimal`.
7. **Non-transactional writes.** Property deletion is not one transaction and leaves Cloudinary photos orphaned. Agreement revision numbering can hit the unique constraint under concurrent saves.

### 🟠 Decide: keep or remove

1. **Translation coverage.** These pages are still English-only:
   - the agreement viewer and editor;
   - the wizard;
   - condition reports;
   - deposit settlement;
   - payments;
   - the landlord property/tenancy detail pages;
   - admin tools;
   - the login and registration pages (which have no session to read a language from).
2. **API handlers with no UI caller:**
   - `DELETE /api/agreements/[id]`, `DELETE /api/condition-reports/[id]`, `condition-reports/[id]/acknowledge`
   - `PATCH /api/rooms/[id]`
   - `GET /api/kyc/status`, `GET /api/messages/unread`
   - `/api/admin/users/[id]/revoke`
   - several resource GET handlers, and the tenant branch of `terminate`
3. **Migrations in the build script.** `prisma migrate deploy` inside `npm run build` also runs on preview builds (see [`DEPLOYMENT.md`](DEPLOYMENT.md)).
4. **`verifyHashOnChain` is unused.** It is in `src/lib/blockchain.ts` and would make a good "verify on chain" button.

### 🟡 Consistency and refactoring

1. **Near-duplicate components.** There are three proof uploaders and three approve/reject cards. Extract a generic `ProofUploader` and `ReviewCard`.
2. **Copied helpers.** `formatRM` / `formatDate` are copied into many files. Move them to `src/lib/format.ts`, using `localeFor()` from `src/lib/i18n.ts` and the `Asia/Kuala_Lumpur` time zone.
3. **`AgreementViewer.tsx` (1,174 lines)** is still light-themed inside the dark shell. Split it and finish the theme.
4. **No shared route helpers.** Authorisation and ownership checks are repeated in every route. Error status codes (401 vs 403) and wording are inconsistent, and some routes still use deprecated zod 4 APIs.
5. **Time zones.** Many client components format dates without `timeZone: 'Asia/Kuala_Lumpur'`, which causes hydration warnings and off-by-one dates on a UTC server.
6. **No `loading.tsx` or pagination** for the heavy dashboards and lists.
7. **`Project_Limitations.docx` contradicts the code.**
   - It says messaging is deferred and the UI is English-only.
   - It says KYC needs proof of address.
   - It says Gemini does OCR.
   - Update it before submission.
