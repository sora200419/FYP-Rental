# RentalEase Malaysia — Complete Test Plan & Test Data

> Prepared: 2026-05-08  
> System URL (dev): http://localhost:3000  
> No automated test suite exists — all tests are manual (browser + API).

---

## How to Read This Document

Each test case is structured as:

```
TC-XXX  Title
  Pre-condition: what must already be true
  Steps: numbered actions
  Expected: what you should see
  Test data: exact values to enter
```

Roles covered: **ADMIN**, **LANDLORD**, **TENANT**  
The sections below are ordered to follow the real end-to-end workflow.

---

## Pre-Test Setup

### Start the dev server

```bash
npm run dev
```

Confirm `http://localhost:3000` loads the landing / login page.

### Seed test accounts

Run this command to create the admin account (only needed once):

```bash
npx ts-node scripts/create-admin.ts
```

Then use the credentials below.

### Test Account Credentials

| Role     | Email               | Password   | IC Number                 | Purpose               |
| -------- | ------------------- | ---------- | ------------------------- | --------------------- |
| ADMIN    | admin@rentalease.my | Admin1234! | (N/A — created by script) | System administration |
| LANDLORD | landlord@test.my    | Test1234!  | 850101-14-5678            | Property owner        |
| TENANT   | tenant@test.my      | Test1234!  | 900202-08-1234            | Renter                |

---

## PHASE 1 — Registration & Authentication

### TC-001 Register as Landlord

**Pre-condition:** Fresh database, or landlord email not yet registered.

**Steps:**

1. Go to `http://localhost:3000/register`
2. Fill in the form with the data below
3. Upload a sample IC photo (any JPEG image file)
4. Click **Create Account**

**Test Data:**

```
Name:        Ahmad Razif bin Hassan
Email:       landlord@test.my
Password:    Test1234!
Confirm:     Test1234!
Role:        Landlord
Phone:       011-2345678
IC Number:   850101-14-5678
IC Photo:    any_jpeg.jpg (< 10 MB)
```

**Expected:**

- Redirected to `/login` with success message "Account created"
- Welcome email sent to landlord@test.my (check Resend dashboard or console)
- User created in DB with `isVerified = false`

---

### TC-002 Register as Tenant

**Steps:**

1. Go to `http://localhost:3000/register`
2. Fill in form below, upload an IC photo
3. Click **Create Account**

**Test Data:**

```
Name:        Lim Mei Ling
Email:       tenant@test.my
Password:    Test1234!
Role:        Tenant
Phone:       012-3456789
IC Number:   900202-08-1234
IC Photo:    any_jpeg.jpg
```

**Expected:** Same as TC-001. `isVerified = false`.

---

### TC-003 Duplicate email registration

**Pre-condition:** TC-001 or TC-002 completed.

**Steps:**

1. Go to `/register`
2. Enter the same email `landlord@test.my` with a different IC number
3. Submit

**Expected:** Error "An account with this email already exists" — HTTP 409

---

### TC-004 Duplicate IC number registration

**Steps:**

1. Go to `/register`
2. Enter a new email but the same IC `850101-14-5678`
3. Submit

**Expected:** Error "An account with this IC number already exists" — HTTP 409

---

### TC-005 Invalid IC format registration

**Steps:**

1. Go to `/register`
2. Enter IC number `ABCDEF-12-3456`
3. Submit

**Expected:** Inline validation error "Invalid IC format"

---

### TC-006 Login — valid credentials

**Steps:**

1. Go to `/login`
2. Enter `landlord@test.my` / `Test1234!`
3. Click **Sign In**

**Expected:** Redirected to `/dashboard/landlord` — dashboard loads showing "Welcome, Ahmad Razif"

---

### TC-007 Login — wrong password

**Steps:**

1. Go to `/login`
2. Enter `landlord@test.my` / `wrongpass`

**Expected:** Error "Invalid email or password"

---

### TC-008 Password Reset Flow

**Steps:**

1. Go to `/login`, click "Forgot Password"
2. Enter `landlord@test.my`
3. Click **Send Reset Link**
4. Check Resend dashboard for the email; copy the token from the URL
5. Visit the reset link
6. Enter new password `NewPass5678!` twice
7. Login with the new password

**Expected:**

- Step 3: Success message shown regardless of whether email exists (prevents enumeration)
- Step 5: Password reset form shown
- Step 7: Login succeeds with new password

---

## PHASE 2 — Admin: Verify Users

> Login as **ADMIN** first: `admin@rentalease.my`

---

### TC-009 Admin dashboard loads

**Steps:**

1. Login as admin
2. Observe the admin dashboard at `/dashboard/admin`

**Expected:** Dashboard shows pending KYC verifications, pending property verifications, and user/property counts.

---

### TC-010 Admin verifies Landlord

**Pre-condition:** TC-001 completed (landlord registered, `isVerified = false`)

**Steps:**

1. In admin dashboard, navigate to **Users / KYC Verification**
2. Find "Ahmad Razif bin Hassan" — status should be "Pending"
3. Click **View IC Copy** — confirm the uploaded document is visible
4. Click **Approve**

**Expected:**

- User row changes to "Verified"
- Landlord receives an in-app notification "Identity verified"
- Email sent to landlord@test.my "Your identity has been verified"
- `User.isVerified = true` in DB

---

### TC-011 Admin verifies Tenant

**Pre-condition:** TC-002 completed

**Steps:**

1. Same as TC-010 but for Lim Mei Ling (`tenant@test.my`)
2. Click **Approve**

**Expected:** Same as TC-010.

---

### TC-012 Admin rejects user (KYC)

**Pre-condition:** Create a third user `bad@test.my` / `Test1234!` / IC `010101-99-0001`

**Steps:**

1. Find the third user in admin KYC list
2. Click **Reject**
3. Enter rejection reason: `IC photo is blurry — please re-upload a clearer scan`
4. Confirm

**Expected:**

- User row marked "Rejected"
- `User.kycRejectedReason` set in DB
- Notification sent to user with the rejection reason

---

## PHASE 3 — Landlord: Property & Room Setup

> Login as **LANDLORD** (`landlord@test.my`)

---

### TC-013 Create a Property

**Steps:**

1. Navigate to `/dashboard/landlord/properties`
2. Click **Add Property**
3. Fill in form:

```
Address:     12 Jalan Bukit Bintang
City:        Kuala Lumpur
State:       Wilayah Persekutuan Kuala Lumpur
Postcode:    50200
Type:        Apartment
Description: Modern 3-bedroom apartment near LRT station
```

4. Upload 3 property photos
5. Click **Submit for Verification**

**Expected:**

- Property created with `isVerified = false`
- Confirmation message shown: "Property submitted for admin verification"
- Redirected to properties list showing new property with "Pending" badge

---

### TC-014 Admin verifies the Property

> Switch to **ADMIN** session

**Steps:**

1. Go to admin dashboard → **Properties / Pending Verification**
2. Find "12 Jalan Bukit Bintang"
3. Click **Approve**

**Expected:**

- Property status changes to "Verified"
- Landlord receives notification "Property Verification Approved"
- `Property.isVerified = true`

> Switch back to **LANDLORD** session

---

### TC-015 Add a Room to the Property

**Steps:**

1. Navigate to the property detail page for "12 Jalan Bukit Bintang"
2. Click **Add Room**
3. Fill in:

```
Label:           Master Room (Level 2)
Room Type:       Master
Bathroom Type:   Attached
Bathrooms:       1
Rent Amount:     1500.00
Size (sqft):     200
Floor Level:     2
Furnishing:      Fully Furnished
Max Occupants:   1
Wifi Included:   Yes
Water Included:  No
Electricity:     No
Gender Pref:     Any
Notes:           Near LRT, quiet floor
```

4. Click **Save Room**

**Expected:** Room appears in the property's room list with "Available" badge.

---

### TC-016 Add a second room (for parallel testing)

**Steps:** Repeat TC-015 with:

```
Label:      Small Room (Level 1)
Room Type:  Small
Rent:       800.00
Furnishing: Partially Furnished
```

---

## PHASE 4 — Landlord: Invite Tenant

---

### TC-017 Invite Tenant to Master Room

**Pre-condition:** TC-014 (property verified), TC-011 (tenant verified)

**Steps:**

1. Navigate to `/dashboard/landlord/tenancies`
2. Click **Invite Tenant**
3. Fill in:

```
Room:            Master Room (Level 2) — 12 Jalan Bukit Bintang
Tenant Email:    tenant@test.my
Start Date:      [today + 7 days, e.g. 2026-05-15]
End Date:        [start + 12 months, e.g. 2027-05-15]
Monthly Rent:    1500.00
Deposit Amount:  3000.00
```

4. Click **Send Invitation**

**Expected:**

- Tenancy created with status `INVITED`
- Master Room marked `isAvailable = false`
- Tenant receives notification "New tenancy invitation" with link
- Email sent to tenant@test.my

---

### TC-018 Invite to unverified property (should fail)

**Pre-condition:** Create a second property (TC-013) without admin approval

**Steps:**

1. Try to invite a tenant to the unverified property

**Expected:** Error "This property has not been verified by an admin yet"

---

### TC-019 Invite to unavailable room (should fail)

**Pre-condition:** TC-017 completed (Master Room already invited)

**Steps:**

1. Try to invite a second tenant to the same Master Room

**Expected:** Error "Room is not available"

---

## PHASE 5 — Tenant: Accept Invitation

> Login as **TENANT** (`tenant@test.my`)

---

### TC-020 View Invitation

**Steps:**

1. Navigate to `/dashboard/tenant/tenancy`
2. Observe invitation card with property address, dates, and rent

**Expected:** Invitation shown with status "Invited" and **Accept / Decline** buttons.

---

### TC-021 Accept Invitation

**Steps:**

1. Click **Accept** on the invitation

**Expected:**

- Tenancy status changes to `PENDING`
- Landlord receives notification "Tenant accepted invitation"
- Tenant view now shows "Pending — Agreement in progress"

---

### TC-022 Decline Invitation (separate test)

**Pre-condition:** Create a fresh invitation using TC-017 (use a different room)

**Steps:**

1. As tenant, click **Decline**
2. Confirm decline

**Expected:**

- Tenancy deleted or moved to DECLINED status
- Room becomes available again (`isAvailable = true`)
- Landlord notified

---

## PHASE 6 — Landlord: Agreement Preferences Wizard

> Login as **LANDLORD**

---

### TC-023 Complete the 6-Step Agreement Wizard

**Pre-condition:** TC-021 (tenancy in PENDING status)

**Steps:**

1. Navigate to the tenancy detail for "Lim Mei Ling"
2. Click **Generate Agreement** / **Set Up Agreement**
3. Complete all 6 wizard steps:

**Step 1 — House Rules:**

```
Pets Policy:        No Pets
Smoking Policy:     Not Allowed Anywhere
Overnight Guests:   Notification Required
Quiet Hours:        Standard (10pm–7am)
```

**Step 2 — Utilities:**

```
Utility Payment:    Direct to Provider
Internet Manager:   Landlord
AC Servicing:       Landlord handles and pays
Pest Control:       Landlord handles and pays
```

**Step 3 — Financial Terms:**

```
Rent Due Day:       1
Grace Period:       7 days
Late Penalty:       Flat Rate — RM 50
Payment Methods:    Bank Transfer, eWallet
Rent Increase:      No Increase
```

**Step 4 — Maintenance:**

```
Minor Repair Threshold: RM 200
Minor Repair:           Tenant
Plumbing:               Landlord
Electrical:             Landlord
Appliances:             Landlord
Structural:             Landlord
Urgent Response:        24 hours
```

**Step 5 — Ending Tenancy:**

```
Tenant Notice:          1 month
Landlord Notice:        2 months
Early Termination:      Forfeit deposit
Reinstatement:          Broom clean
Subletting:             Not Allowed
```

**Step 6 — Deposit:**

```
Refund Days:            14
Deduction Categories:   Damage, Unpaid Rent, Cleaning
Dispute Resolution:     Platform Messaging
Utility Deposit:        Combined
```

4. Click **Save & Generate Agreement** on the final step

**Expected:**

- Wizard saves all 6 steps (`completedSteps = 6`, `isComplete = true`)
- AI agreement generation starts (Gemini API call)
- Loading indicator shown; after ~10–20 seconds, agreement text appears
- Plain language summary and red-flag analysis displayed
- Bahasa Malaysia translation available via language toggle

---

### TC-024 Finalize Agreement (send to tenant for signing)

**Pre-condition:** TC-023 completed (Agreement in DRAFT status)

**Steps:**

1. Review the generated agreement text
2. Click **Finalize & Send to Tenant**

**Expected:**

- Agreement status → `FINALIZED`
- Tenant receives notification "Your tenancy agreement is ready to review"
- Landlord can no longer edit the content

---

## PHASE 7 — Tenant: Review & Sign Agreement

> Login as **TENANT**

---

### TC-025 View Agreement

**Steps:**

1. Navigate to `/dashboard/tenant/tenancy`
2. Click **Review Agreement**

**Expected:**

- Full agreement text visible
- Plain language summary tab available
- Red flags panel shows any highlighted clauses
- Language toggle (English / BM) works
- **Sign Agreement** and **Request Changes** buttons visible

---

### TC-026 Sign Agreement

**Steps:**

1. Read through the agreement
2. Tick the acknowledgement checkbox: "I have read and understood this agreement"
3. Click **Sign Agreement**
4. Confirm in the modal: "I confirm that I am Lim Mei Ling and I agree to these terms"

**Expected:**

- Agreement status → `SIGNED`
- `signedAt`, `signedByIp`, `contentHash` populated in DB
- `txHash` populated after blockchain anchoring (may take a few seconds; check Sepolia Etherscan link)
- Tenancy status → `ACTIVE`
- Rent payment schedule generated (12 monthly payments from startDate)
- Landlord receives notification "Tenant has signed the agreement"
- **Download PDF** button appears

---

### TC-027 Download PDF

**Steps:**

1. Click **Download PDF** on the signed agreement

**Expected:** PDF file downloads with full agreement text, signatures section, and content hash.

---

### TC-028 Request Agreement Changes (negotiation)

**Pre-condition:** Use a fresh tenancy where agreement is in FINALIZED status (re-run TC-023/024)

**Steps:**

1. As tenant, click **Request Changes**
2. Enter note: `Please add a clause allowing a small dog (< 5kg) with a pet deposit of RM 200`
3. Submit

**Expected:**

- Agreement status → `NEGOTIATING`
- Landlord receives notification "Tenant requested agreement changes"
- Negotiation round counter increments

---

## PHASE 8 — Deposit Payment

> Login as **TENANT**

---

### TC-029 Upload Deposit Payment Proof

**Pre-condition:** TC-026 (tenancy ACTIVE)

**Steps:**

1. Navigate to `/dashboard/tenant/tenancy`
2. In the **Deposit** section, click **Upload Proof**
3. Upload a JPEG image of a bank transfer receipt
4. Click **Submit**

**Expected:**

- `DepositStatus` → `UNDER_REVIEW`
- Landlord receives notification "Tenant uploaded deposit proof"

---

### TC-030 Landlord Approves Deposit

> Login as **LANDLORD**

**Steps:**

1. Navigate to tenancy for Lim Mei Ling
2. Go to **Deposit** tab
3. View uploaded proof
4. Click **Approve**

**Expected:**

- `DepositStatus` → `PAID`
- Tenant receives notification "Deposit approved"

---

### TC-031 Landlord Rejects Deposit Proof

**Pre-condition:** TC-029 completed (proof under review)

**Steps:**

1. In deposit tab, click **Reject**
2. Enter reason: `Wrong bank account — please transfer to CIMB 1234567890`
3. Confirm

**Expected:**

- `DepositStatus` → `REJECTED`
- Tenant notified with rejection reason
- Tenant can re-upload proof

---

## PHASE 9 — Rent Payments

> Login as **TENANT**

---

### TC-032 View Payment Schedule

**Pre-condition:** TC-026 (tenancy ACTIVE — payment schedule generated)

**Steps:**

1. Navigate to `/dashboard/tenant/payments`

**Expected:** List of 12 monthly payments, each showing due date, amount (RM 1,500), and status (PENDING). Overdue payments highlighted.

---

### TC-033 Upload Rent Payment Proof

**Steps:**

1. Click on the first payment (due 2026-05-15)
2. Click **Upload Proof**
3. Upload a JPEG receipt
4. Submit

**Expected:**

- Payment status → `UNDER_REVIEW`
- Landlord receives notification "Payment proof uploaded"

---

### TC-034 Landlord Approves Rent Payment

> Login as **LANDLORD**

**Steps:**

1. Navigate to `/dashboard/landlord/payments`
2. Find the payment under review
3. Click **Approve**

**Expected:**

- Payment status → `PAID`
- `paidDate` set in DB
- Tenant notified "Payment approved"

---

### TC-035 Landlord Rejects Rent Payment

**Pre-condition:** Re-upload a proof (TC-033) to create a new UNDER_REVIEW payment

**Steps:**

1. Click **Reject**
2. Enter reason: `Proof is unreadable — please upload a clearer image`

**Expected:**

- Payment status → `PENDING` (back to pending with rejection reason)
- Tenant notified with rejection reason

---

### TC-036 Landlord Waives a Payment

**Steps:**

1. Find a PENDING payment
2. Click **Waive**
3. Confirm

**Expected:**

- Payment status → `WAIVED`
- Tenant notified

---

### TC-037 Late payment display

**Pre-condition:** A payment whose `dueDate` is in the past with `status = PENDING`

**Steps:**

1. View the payments list as both landlord and tenant

**Expected:** Payment shows "Overdue" badge (computed dynamically — not a DB status).

---

## PHASE 10 — Messaging

---

### TC-038 Tenant sends message to Landlord

> Login as **TENANT**

**Steps:**

1. Navigate to tenancy detail
2. Go to **Messages** tab
3. Type: `Hi, the water heater in the bathroom is not working. Can you arrange a repair?`
4. Click **Send**

**Expected:** Message appears in chat immediately.

---

### TC-039 Landlord replies

> Login as **LANDLORD**

**Steps:**

1. Navigate to the tenancy messages for Lim Mei Ling
2. Reply: `Noted! I will send a plumber this Thursday.`
3. Send

**Expected:** Both parties see the full conversation thread.

---

### TC-040 Unread message count

**Steps:**

1. As tenant, check the notification badge / unread count in the header

**Expected:** Badge shows count of unread messages from landlord.

---

## PHASE 11 — Condition Reports

> Login as **LANDLORD**

---

### TC-041 Create Move-In Condition Report

**Pre-condition:** TC-026 (tenancy ACTIVE)

**Steps:**

1. Navigate to tenancy → **Condition Reports** tab
2. Click **New Report**
3. Select type: **Move-In**
4. Notes: `Room is clean. AC working. Minor paint chip near window.`
5. Upload 3 photos:
   - Photo 1, Room label: `Bedroom`, Caption: `Overview of room`
   - Photo 2, Room label: `Bathroom`, Caption: `Clean condition`
   - Photo 3, Room label: `Window`, Caption: `Minor paint chip`
6. Submit

**Expected:** Report created with all photos. Status shows "Awaiting Tenant Acknowledgement".

---

### TC-042 Tenant Acknowledges Condition Report

> Login as **TENANT**

**Steps:**

1. Navigate to tenancy → **Condition Reports**
2. Find the Move-In report
3. Review all photos
4. Click **Acknowledge**

**Expected:**

- `acknowledgedAt` set in DB
- `acknowledgedById` set to tenant ID
- Landlord notified

---

### TC-043 Create Move-Out Condition Report

> Login as **LANDLORD**

**Steps:**

1. Repeat TC-041 but select type: **Move-Out**
2. Upload photos of damage:
   - `Bedroom` — `Broken wardrobe door`
   - `Floor` — `Scuff marks`
3. Notes: `Wardrobe door damaged. Floor has scuff marks not present at move-in.`

---

## PHASE 12 — Co-Tenants

> Login as **LANDLORD** or **TENANT**

---

### TC-044 Add a Co-Tenant

**Pre-condition:** Active tenancy

**Steps:**

1. Navigate to tenancy → **Co-Tenants** tab
2. Click **Add Co-Tenant**
3. Enter:

```
Name:      Tan Wei Ming
IC Number: 950303-14-7890
Phone:     013-4567890
```

4. Save

**Expected:** Co-tenant appears in the list.

---

### TC-045 Remove a Co-Tenant

**Steps:**

1. Click the remove icon next to Tan Wei Ming
2. Confirm

**Expected:** Co-tenant removed.

---

## PHASE 13 — Tenant Documents

> Login as **TENANT**

---

### TC-046 Upload Income Proof

**Steps:**

1. Navigate to `/dashboard/tenant/documents`
2. Click **Upload Income Proof**
3. Upload a PDF or JPEG file

**Expected:** Document stored with type `INCOME_PROOF`. Landlord can view it for tenancies where they share a relationship.

---

### TC-047 Landlord views tenant documents

> Login as **LANDLORD**

**Steps:**

1. Navigate to the tenancy for Lim Mei Ling
2. Click **Tenant Documents**

**Expected:** IC copy and income proof are visible (access is scoped to active tenancy relationship).

---

## PHASE 14 — Deposit Refund Settlement

> Requires tenancy to be in EXPIRED or TERMINATED status.  
> For testing: either wait for endDate to pass, or use the cron endpoint (see TC-060).

---

### TC-048 Landlord Proposes Deposit Deductions

> Login as **LANDLORD**

**Pre-condition:** Tenancy is EXPIRED and no DepositRefund record exists.

**Steps:**

1. Navigate to expired tenancy → **Deposit Refund** tab
2. Click **Propose Deductions**
3. Enter original deposit: `3000.00`
4. Add deduction 1:

```
Reason:  Broken wardrobe door — replacement cost
Amount:  450.00
Photos:  [select condition report photos from TC-043]
```

5. Add deduction 2:

```
Reason:  Professional floor cleaning
Amount:  150.00
```

6. Calculated refund shown: `3000 - 450 - 150 = RM 2,400`
7. Click **Submit Proposal**

**Expected:**

- `DepositRefund` created with status `PROPOSED`
- `refundAmount = 2400`
- Tenant notified "Landlord proposed deposit deductions"

---

### TC-049 Tenant Reviews Deductions

> Login as **TENANT**

**Steps:**

1. Navigate to expired tenancy → **Deposit Refund**
2. Review each deduction

For deduction 1 (wardrobe): Click **Accept**  
For deduction 2 (cleaning): Click **Dispute**, enter reason: `The floor was already scuffed before I moved in — see move-in photos`

**Expected:**

- Deduction 1: status `ACCEPTED`
- Deduction 2: status `DISPUTED`
- Refund status → `IN_REVIEW`
- Landlord notified

---

### TC-050 Landlord Responds to Dispute

> Login as **LANDLORD**

**Steps:**

1. View the disputed deduction
2. Click **Withdraw Deduction** (accepting tenant's argument)

**Expected:**

- Deduction 2: status `WITHDRAWN`
- Refund recalculates: `3000 - 450 = RM 2,550`
- Status → `AGREED`

---

### TC-051 Landlord Marks Deposit as Paid

**Pre-condition:** Status is `AGREED`

**Steps:**

1. Click **Mark as Paid**
2. Upload proof of bank transfer (JPEG)
3. Confirm

**Expected:**

- `DepositRefund.status` → `PAID`
- `paidAt` set
- Tenant notified "Deposit refund paid"
- Tenancy fully closed

---

## PHASE 15 — Tenancy Renewal

> Login as **LANDLORD**

---

### TC-052 Propose Tenancy Renewal

**Pre-condition:** Active tenancy approaching end date.

**Steps:**

1. Navigate to tenancy → click **Propose Renewal**
2. Enter new terms:

```
New Start Date:  2027-05-16
New End Date:    2028-05-16
Monthly Rent:    1600.00  (increased)
Deposit Amount:  3200.00
```

3. Submit

**Expected:** New tenancy created with status `INVITED`, `renewalOfTenancyId` linked to old tenancy.

---

### TC-053 Tenant accepts renewal invitation

> Login as **TENANT**

**Steps:**

1. View the new invitation
2. Click **Accept**

**Expected:** Same flow as Phase 5 onwards for the new tenancy.

---

## PHASE 16 — Mutual Termination

---

### TC-054 Landlord Proposes Early Termination

> Login as **LANDLORD**

**Steps:**

1. Navigate to active tenancy
2. Click **Terminate Early**
3. Enter:

```
Reason: Tenant has found alternative accommodation and requested early release
```

4. Submit

**Expected:**

- Termination proposal created
- Tenant notified "Early termination proposed"

---

### TC-055 Tenant Accepts Termination

> Login as **TENANT**

**Steps:**

1. View termination proposal
2. Click **Accept**

**Expected:**

- Tenancy status → `TERMINATED`
- `terminatedAt` and `terminatedReason` set
- Both parties notified

---

### TC-056 Tenant Rejects Termination

**Pre-condition:** Another termination proposal (re-run TC-054)

**Steps:**

1. Click **Reject** on the proposal

**Expected:** Proposal closed; tenancy remains ACTIVE.

---

## PHASE 17 — Tenant Withdraws Invitation

---

### TC-057 Tenant Withdraws Acceptance (before agreement signed)

**Pre-condition:** Tenancy in PENDING status (invitation accepted but no agreement signed)

> Login as **TENANT**

**Steps:**

1. Navigate to the pending tenancy
2. Click **Withdraw**
3. Confirm

**Expected:**

- Tenancy deleted or moved to WITHDRAWN status
- Room becomes available again
- Landlord notified

---

## PHASE 18 — Notifications & In-App Alerts

---

### TC-058 Unread notification count

**Steps:**

1. Login as tenant after landlord has sent several notifications
2. Observe notification bell icon

**Expected:** Badge count matches unread notifications.

---

### TC-059 Mark all notifications as read

**Steps:**

1. Open notification panel
2. Click **Mark All as Read**

**Expected:** All notifications marked read; badge count resets to 0.

---

## PHASE 19 — Cron Job (Tenancy Expiry)

---

### TC-060 Manually trigger the cron endpoint

**Pre-condition:** `CRON_SECRET=mysecret` is set in `.env`

```bash
curl -H "Authorization: Bearer mysecret" http://localhost:3000/api/cron/expire-tenancies
```

**Expected JSON response:**

```json
{
  "expired": 0,
  "notified30Days": 0,
  "notified7Days": 0
}
```

- Tenancies past `endDate` are moved to EXPIRED
- 30-day and 7-day notification emails sent for upcoming tenancies

---

### TC-061 Cron without secret — should be rejected

```bash
curl http://localhost:3000/api/cron/expire-tenancies
```

**Expected:** HTTP 401 `{"error":"Unauthorised"}` (or 500 if CRON_SECRET is missing from env — see Improvement.md §1.1)

---

## PHASE 20 — Admin: Property Rejection

---

### TC-062 Admin rejects a Property

> Login as **ADMIN**

**Steps:**

1. Navigate to pending properties
2. Find a property
3. Click **Reject**
4. Enter reason: `Ownership documents not uploaded — please provide title deed or tenancy certificate`

**Expected:**

- `Property.isVerified = false`, `rejectedReason` set
- Landlord notified "Property verification rejected"

---

## PHASE 21 — Profile Management

---

### TC-063 Landlord updates phone number

> Login as **LANDLORD**

**Steps:**

1. Go to `/dashboard/landlord/profile` (or settings page)
2. Update phone to `011-9988776`
3. Save

**Expected:** Profile updated successfully.

---

### TC-064 Landlord changes language preference

**Steps:**

1. Toggle language to **Bahasa Malaysia**
2. Observe UI changes

**Expected:** UI text switches to BM where translations are available.

---

## Edge Cases & Negative Tests

| TC     | Scenario                                                            | Expected                                         |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------ |
| EC-001 | Upload a 15 MB file as payment proof                                | Error: "File must be under 10 MB"                |
| EC-002 | Upload a `.exe` file as payment proof                               | Error: "Only JPEG, PNG, or WebP images accepted" |
| EC-003 | Tenant tries to access landlord route `/dashboard/landlord`         | Redirected to `/dashboard/tenant`                |
| EC-004 | Landlord tries to access tenant route `/dashboard/tenant`           | Redirected to `/dashboard/landlord`              |
| EC-005 | Unauthenticated user accesses any dashboard route                   | Redirected to `/login`                           |
| EC-006 | Tenant tries to approve payment (PATCH `/api/payments/{id}/verify`) | HTTP 403                                         |
| EC-007 | Invalid IC format on registration (`ABCDEF`)                        | Zod validation error "Invalid IC format"         |
| EC-008 | Start date in the past on tenancy invite                            | Error "Start date cannot be in the past"         |
| EC-009 | End date before start date                                          | Error "End date must be after start date"        |
| EC-010 | Landlord invites tenant with non-existent email                     | Error "No tenant account found with that email"  |
| EC-011 | Landlord invites a LANDLORD-role user as tenant                     | Error "No tenant account found with that email"  |
| EC-012 | Landlord invites tenant to unverified property                      | Error "This property has not been verified"      |
| EC-013 | Password reset with expired token                                   | Error "Invalid or expired reset link"            |
| EC-014 | Call `/api/agreements/{id}/finalize` twice                          | Second call returns 409 "Already finalised"      |
| EC-015 | Deposit refund proposed on ACTIVE tenancy                           | Should only be allowed on EXPIRED/TERMINATED     |

---

## Summary Checklist

Use this table to track test execution:

| Phase      | Description                   | Status |
| ---------- | ----------------------------- | ------ |
| Phase 1    | Registration & Authentication | ☐      |
| Phase 2    | Admin KYC Verification        | ☐      |
| Phase 3    | Property & Room Setup         | ☐      |
| Phase 4    | Tenant Invitation             | ☐      |
| Phase 5    | Tenant Accept Invitation      | ☐      |
| Phase 6    | Agreement Wizard              | ☐      |
| Phase 7    | Agreement Sign / Negotiate    | ☐      |
| Phase 8    | Deposit Payment               | ☐      |
| Phase 9    | Rent Payments                 | ☐      |
| Phase 10   | Messaging                     | ☐      |
| Phase 11   | Condition Reports             | ☐      |
| Phase 12   | Co-Tenants                    | ☐      |
| Phase 13   | Tenant Documents              | ☐      |
| Phase 14   | Deposit Refund Settlement     | ☐      |
| Phase 15   | Tenancy Renewal               | ☐      |
| Phase 16   | Mutual Termination            | ☐      |
| Phase 17   | Withdrawal Flow               | ☐      |
| Phase 18   | Notifications                 | ☐      |
| Phase 19   | Cron Job                      | ☐      |
| Phase 20   | Admin Property Rejection      | ☐      |
| Phase 21   | Profile Management            | ☐      |
| Edge Cases | Negative / boundary tests     | ☐      |
