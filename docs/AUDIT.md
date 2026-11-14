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

### Tests

Added `tests/unit/audit-fixes.test.ts`, covering email normalisation, ordinal suffixes, wizard resume, and the rent schedule. There are now 41 tests in total.

---

## Part 2 — Open issues (not changed)

### 🔴 Security and privacy

1. **Identity documents are public URLs.**
   - Where: `src/lib/cloudinary.ts`.
   - Problem: KYC images (IC front and back, selfie) and signed-agreement scans, which contain IC numbers, are standard public Cloudinary uploads. Anyone with the URL can view them.
   - Fix: upload them as `type: 'authenticated'` and serve signed, short-lived URLs from an endpoint that checks permissions.
2. **Full IC numbers are sent to the AI provider.**
   - Where: `src/lib/ai.ts`, the agreement prompt (sent to Anthropic).
   - Problem: this is a PDPA concern.
   - Fix: send a placeholder, then substitute the real IC on the server after generation.
3. **Uploads trust the browser's MIME type.**
   - Where: every upload route.
   - Fix: check magic bytes (for example with the `file-type` package) before uploading.
4. **Admin bootstrap runs on every request and can promote an account.**
   - Where: `src/app/layout.tsx`.
   - Problem: the root layout runs `ensureAdminBootstrap()` on every page request, adding a database query and making every page dynamic. It also promotes any existing account with `ADMIN_EMAIL` to ADMIN.
   - Fix: move it to a one-off script (`npm run admin:bootstrap`) or a seed.
5. **Suspension is only enforced by `proxy.ts`.**
   - Problem: route handlers don't check `isSuspended` themselves.
   - Mitigation: the JWT callback now re-reads it on every request, but a shared `requireActiveUser()` helper would be more robust.
6. **Password-reset tokens can be used twice concurrently.**
   - Where: `api/reset-password`.
   - Fix: claim the token with `updateMany({ where: { token, usedAt: null } })` and check the count.
7. **Tenant lookup allows account enumeration.**
   - Where: `api/tenants/lookup`.
   - Problem: any landlord can enumerate tenant accounts; there is no rate limit and soft-deleted users aren't filtered out.
8. **Leaked secrets in the submission archive.** The submitted source archive contained a `.env` with real credentials (database, NextAuth, Gemini, Cloudinary, Sepolia private key, Resend, Upstash, admin password). **Rotate all of them.**
9. **Weaker registration password rule.** Registration accepts 8-character passwords; reset requires 12. Decide on one policy.

### 🔴 Flow gaps

1. **Renewal hides the live tenancy.**
   - Where: `tenant/tenancy` and `tenant/messages`.
   - Problem: both pages show only the **newest** tenancy, so once a renewal invite exists the live ACTIVE tenancy disappears.
   - Fix: add a tenancy switcher or `/dashboard/tenant/tenancy/[id]`.
2. **Landlords can't cancel an invitation or a PENDING tenancy**, and PENDING tenancies never expire.
3. **Withdraw and decline can fail after a deposit proof exists.**
   - Problem: `DepositProof → Tenancy` is `ON DELETE RESTRICT`.
   - Withdraw is also allowed after the tenant has signed or paid the deposit. Decide whether to block that or keep a record.
4. **Rooms with past tenancies can't be deleted.**
   - Problem: `Tenancy.room` is `Restrict`, so the delete fails with a 500.
   - Fix: block the delete with a clear message, or archive the room.
5. **No property editing.** Rejection and revoke notifications tell landlords to "update the listing", but no edit page or `PATCH /api/properties/[id]` exists.
6. **Expired tenancies can't be renewed from the UI.** The renew page allows them, but the only link is shown for ACTIVE tenancies ending within 30 days.
7. **Linked corporate occupants get nothing.** `CorporateOccupant.linkedUserId` is written but never read, so linking an occupant grants no access. REMOVED occupants can also be re-linked.
8. **Condition evidence can change during review.** It stays editable while the other party is reviewing (`PENDING_REVIEW`, `COUNTER_EVIDENCE_ADDED`), and either party can edit the other's draft checklist.
9. **"Regenerate" on a FINALIZED agreement.** It silently resets the version the tenant is reviewing back to DRAFT. Consider a confirmation step or blocking it.
10. **Finalize overwrites terms on an ACTIVE tenancy.** It writes rent, deposit and dates even when the deposit is already PAID.
11. **Timeline step is unreachable.** The "Condition" step of the tenancy timeline (`src/lib/uiRedesign.ts`) can never be reached on a live tenancy.

### 🟠 Database (needs a migration)

1. **Missing indexes:**
   - `Room.propertyId`
   - `ConditionPhoto.reportId`
   - `PropertyPhoto.propertyId`
   - `DepositDeduction.refundId`
   - `CoTenant.tenancyId`
   - `Notification(userId, createdAt)`
2. **Delete restrictions.**
   - `AuditLog.actor` restricts deletion, so `scripts/delete-users.ts` fails for any user who performed an audited action.
   - `DepositProof.tenancy` has the same restriction.
3. **Enum values that are never written:**
   - `ReportStatus.SUBMITTED` and `LOCKED`
   - `AgreementEventType.SIGNED`
   - `NotificationType.CONDITION_REPORT_CREATED`, `CONDITION_REPORT_ACKNOWLEDGED` and `MUTUAL_TERMINATION_PROPOSED`
   - `PaymentStatus.LATE`
4. **Notification types reused for other events.** `DEPOSIT_REFUND_PAID` is sent for "all deductions agreed", and `MUTUAL_TERMINATION_RESPONDED` for a one-sided termination.
5. **Floating-point money totals.** Deductions and refunds are summed with JS floats. Use integer cents or `Prisma.Decimal`.
6. **Non-transactional multi-step writes:**
   - property deletion (which also leaves Cloudinary photos orphaned);
   - agreement revision numbering, where concurrent saves can hit the unique constraint.
7. **Unnamed migration folders.** `20260411061512_` and `20260412052917_` have empty names (cosmetic).

### 🟠 Decide: keep or remove

1. **Unused i18n dictionary.**
   - What: `src/lib/i18n.ts` (473 lines, complete English and Bahasa Malaysia) has no importers. `User.language` is stored but nothing in the UI reads it.
   - Choice: wire it into the UI (a strong FYP feature) or delete it.
2. **API handlers with no UI caller:**
   - `DELETE /api/agreements/[id]`, `DELETE /api/condition-reports/[id]`, `condition-reports/[id]/acknowledge`
   - `PATCH /api/rooms/[id]`
   - `GET /api/admin/kyc`, `GET /api/kyc/status`, `GET /api/messages/unread` (duplicates `/unread-counts`)
   - `/api/admin/users/[id]/revoke`
   - the GET handlers of several resources
   - the tenant branch of `terminate`
3. **Migrations in the build script.** `prisma migrate deploy` inside `npm run build` also runs on preview builds (see [`DEPLOYMENT.md`](DEPLOYMENT.md)).
4. **Unused helper exports.** `blockchain.ts` exports `verifyHashOnChain`, which nothing calls (it would make a nice "verify on chain" button). `conditionReports.ts` exports an unused constant.

### 🟡 Consistency and refactoring

1. **Near-duplicate components:**
   - three proof uploaders: payment, deposit and signature;
   - three approve/reject cards;
   - `VerifyPropertyButton` and the admin KYC actions.
   - Fix: extract a generic `ProofUploader` and `ReviewCard`.
2. **Copied helpers.**
   - `formatRM` appears in 8 files, `formatDate` in 7, status-pill maps in 5, `toDateInput` in 2. Move them to `src/lib/format.ts` and share the status labels.
   - Status wording also differs between pages ("Paid", "Confirmed", "Deposit Confirmed"; "Pending Signature" vs "PENDING SIGNATURE PROOF").
3. **`AgreementViewer.tsx` is 1,174 lines.** It is still light-themed inside the dark shell, so the title is almost invisible. It also contains an inline `<style>` with a Google Fonts `@import` and unused CSS classes. Split it into reader, red flags, history and signing-audit parts, and use `next/font`.
4. **No shared route helpers.** There is no shared auth or ownership helper, and wrong-role errors are a mix of 401 and 403, "Unauthorised" and "Unauthorized", zod and hand-written checks, and deprecated zod 4 APIs (`z.string().email()`, `.datetime()`).
5. **Time zones.** Client components format dates without `timeZone: 'Asia/Kuala_Lumpur'`, which causes hydration warnings and off-by-one dates on a UTC server. The cron compares `endDate < now`, so tenancies expire at 08:00 Malaysia time on their last day.
6. **No `loading.tsx`.** Pages with heavy database work give no feedback while they load.
7. **No pagination.** Landlord payments, admin users and admin properties load everything; admin users loads ID arrays just to count them (use `_count`).
8. **Root-level `Project_Limitations.docx` contradicts the code.**
   - It says messaging was deferred; messaging exists.
   - It says KYC needs proof of address; KYC uses IC front, IC back and a selfie.
   - It says the UI is English-only; a bilingual dictionary exists, though it is unused.
   - It says Gemini does OCR of scans; it doesn't.
   - Update it before submission.
