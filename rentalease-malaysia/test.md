# RentalEase Malaysia — End-to-End Manual Test Guide

> **Base URL:** `http://localhost:3000`
> Run `npm run dev` before starting. Admin account must already exist (see Prerequisites).

---

## Prerequisites

Create the admin account once before testing:

```bash
npx tsx scripts/create-admin.ts admin@rentalease.com Admin@12345 "Admin"
```

---

## Test Accounts

| Role | Name | Email | Password | IC Number | Phone |
|------|------|-------|----------|-----------|-------|
| **Admin** | Admin | admin@rentalease.com | Admin@12345 | — | — |
| **Landlord** | Ahmad Farid bin Hassan | ahmad.landlord@gmail.com | Landlord@123 | 850714-10-5678 | 012-3456789 |
| **Tenant** | Lee Wei Jian | lee.tenant@gmail.com | Tenant@123 | 960305-14-3456 | 011-2345678 |

> **IC photos:** Use any JPEG or PNG image file on your computer as a placeholder IC upload throughout these tests.
> **Emails:** All system emails go to the Resend registered account (`wangyuhong027@gmail.com`) while using `onboarding@resend.dev` as sender.

---

## Supporting Test Data

### Property
| Field | Value |
|-------|-------|
| Address | 12, Jalan Mawar 3 |
| City | Petaling Jaya |
| State | Selangor |
| Postcode | 47810 |
| Type | Condominium |
| Description | Modern condominium unit near LRT station with excellent facilities including swimming pool and gym. |

### Room
| Field | Value |
|-------|-------|
| Label | Master Bedroom |
| Room Type | Master |
| Bathroom | Attached |
| Monthly Rent | 900 |
| Size (sqft) | 250 |
| Floor Level | 5 |
| Furnishing | Fully Furnished |
| Max Occupants | 2 |
| WiFi Included | Yes |
| Water Included | Yes |
| Electricity Included | No |
| Gender Preference | Any |
| Notes | Air conditioning included. High-speed WiFi 500Mbps. |

### Tenancy
| Field | Value |
|-------|-------|
| Tenant Email | lee.tenant@gmail.com |
| Start Date | 2025-07-01 |
| End Date | 2026-06-30 |
| Monthly Rent | 900 |
| Security Deposit | 1800 |

### Co-Tenant
| Field | Value |
|-------|-------|
| Name | Nur Aisyah binti Rahman |
| IC Number | 970820-08-1234 |
| Phone | 013-9876543 |

---

## Module 1 — Landlord Registration

**Pre-condition:** Dev server running at localhost:3000.

**Steps:**
1. Go to `http://localhost:3000/register`
2. Fill in the form:
   - **Name:** Ahmad Farid bin Hassan
   - **Email:** ahmad.landlord@gmail.com
   - **Password:** Landlord@123
   - **Confirm Password:** Landlord@123
   - **Phone:** 012-3456789
   - **IC Number:** 850714-10-5678
   - **Role:** Landlord
3. Click **"Upload IC Photo"** and select any image file from your computer.
4. Click **Register**.

**Expected Result:**
- Redirected to `/login?registered=true`
- Green banner: "Account created successfully. Please log in."
- Account exists in DB with `isVerified = false`, `role = LANDLORD`.
- **Email:** Welcome email received in inbox (from `onboarding@resend.dev`).

> **Note (BUG-12 fix):** IC photo is now strictly required at the API level. Attempting to submit the form without an IC photo will return HTTP 400 "IC photo is required for identity verification."

---

## Module 2 — Tenant Registration

**Steps:**
1. Go to `http://localhost:3000/register`
2. Fill in the form:
   - **Name:** Lee Wei Jian
   - **Email:** lee.tenant@gmail.com
   - **Password:** Tenant@123
   - **Confirm Password:** Tenant@123
   - **Phone:** 011-2345678
   - **IC Number:** 960305-14-3456
   - **Role:** Tenant
3. Upload any image file as IC photo (required).
4. Click **Register**.

**Expected Result:**
- Redirected to `/login?registered=true` with success banner.
- **Email:** Welcome email received in inbox.

---

## Module 3 — Login (All Roles)

### 3A — Admin Login
1. Go to `/login`
2. Enter `admin@rentalease.com` / `Admin@12345`
3. Click **Sign In**

**Expected Result:** Redirected to `/dashboard/admin`. Admin dashboard shows total users, pending KYC count, properties count.

### 3B — Landlord Login
1. Go to `/login`
2. Enter `ahmad.landlord@gmail.com` / `Landlord@123`
3. Click **Sign In**

**Expected Result:** Redirected to `/dashboard/landlord`. Dashboard shows empty state (no properties yet).

### 3C — Tenant Login
1. Go to `/login`
2. Enter `lee.tenant@gmail.com` / `Tenant@123`
3. Click **Sign In**

**Expected Result:** Redirected to `/dashboard/tenant`. Dashboard shows empty state (no tenancies yet).

---

## Module 4 — Admin: KYC Verification

**Pre-condition:** Logged in as Admin.

**Steps:**
1. Navigate to `/dashboard/admin/verify`
2. Verify the admin dashboard stats show **2 pending KYC** verifications (landlord + tenant).
3. Find **Ahmad Farid bin Hassan** in the unverified user list.
   - Click the IC photo thumbnail to view the full image.
   - Note the IC number displayed: `850714105678`
   - Click **Verify**.
4. Confirm the success toast/banner appears.
5. Find **Lee Wei Jian** in the list.
   - **First, test rejection:** Click **Reject** and enter reason: `IC photo is blurry. Please re-upload a clearer image.`
   - Click confirm.
6. Verify Lee Wei Jian's card now shows a **"Previously rejected"** badge and the rejection reason in a red banner (IMP-09).
7. **Then approve** Lee Wei Jian: click **Verify**.

**Expected Result:**
- Both users now have `isVerified = true`.
- In-app notifications: `ACCOUNT_VERIFIED` created for both.
- **Emails:** KYC approved/rejected emails sent to the Resend inbox.
- Pending KYC counter on admin dashboard drops to 0.

> **Tip:** To test the KYC rejection email, log in as Tenant briefly after step 5 — you should see the rejection notification with the reason. The rejection email is also delivered to inbox.

---

## Module 5 — Profile Management & Document Upload

### 5A — Landlord Profile
**Pre-condition:** Logged in as Landlord.

1. Navigate to `/dashboard/profile`
2. Update the following:
   - **Language:** Bahasa Malaysia
   - **Phone:** 012-9999888
3. Click **Save Changes**.
4. Change language back to **English**.
5. Scroll to **Documents** section.
6. Upload an image as **Income Proof** (e.g., any salary slip placeholder).
7. Verify the document appears in the list with file name and upload date.

**Expected Result:** Profile updates saved. Income proof document visible under profile documents.

### 5B — IC Number Correction After KYC Rejection (FEAT-11)
**Pre-condition:** Logged in as Tenant (after rejection in Module 4).

1. Navigate to `/dashboard/profile`
2. Update the **IC Number** field to correct a typo (e.g., temporarily enter `960305145678` — same IC without dashes).
3. Click **Save Changes**.
4. Verify the update is accepted and `isVerified` resets to false (pending re-review).
5. Correct it back to the original value.

> **Note:** If you try to enter an IC number already registered to another account, you get: "This IC number is already registered to another account." (FEAT-11 uniqueness check).

---

## Module 6 — Landlord: Property Creation

**Pre-condition:** Logged in as Landlord.

**Steps:**
1. Navigate to `/dashboard/landlord/properties`
2. Click **Add New Property** (or equivalent button).
3. Fill in:
   - **Address:** 12, Jalan Mawar 3
   - **City:** Petaling Jaya
   - **State:** Selangor
   - **Postcode:** 47810
   - **Type:** Condominium
   - **Description:** Modern condominium unit near LRT station with excellent facilities including swimming pool and gym.
4. Click **Save**.
5. Navigate to the newly created property detail page.
6. Upload **2–3 property photos** (any images from your computer).
7. Verify photos appear in the gallery.

**Expected Result:**
- Property created with `isVerified = false`.
- Property card shows **"Pending Verification"** badge.
- Photos uploaded and displayed.

---

## Module 7 — Admin: Property Verification

**Pre-condition:** Logged in as Admin.

**Steps:**
1. Navigate to `/dashboard/admin/properties`
2. Find **12, Jalan Mawar 3, Petaling Jaya** in the pending list.
3. Review the property details displayed.
4. **Test rejection first:** Click **Reject** and enter: `Please provide more accurate address details.`
5. Verify the rejection reason is stored (check `/dashboard/landlord/properties` as landlord to see the rejection message).
6. Return to admin, find the property again (it should still appear), and click **Verify**.

**Expected Result:**
- Property `isVerified = true`.
- Landlord receives `PROPERTY_VERIFICATION_APPROVED` notification.
- Property badge changes to **Verified** on landlord's properties page.

---

## Module 8 — Landlord: Room Management

**Pre-condition:** Logged in as Landlord. Property is verified.

### 8A — Create Room
1. Navigate to `/dashboard/landlord/properties` → click on the property.
2. Click **Add Room**.
3. Fill in:
   - **Label:** Master Bedroom
   - **Room Type:** Master
   - **Bathroom Type:** Attached
   - **Monthly Rent:** 900
   - **Size (sqft):** 250
   - **Floor Level:** 5
   - **Furnishing:** Fully Furnished
   - **Max Occupants:** 2
   - **WiFi Included:** ✓ Yes
   - **Water Included:** ✓ Yes
   - **Electricity Included:** ☐ No
   - **Gender Preference:** Any
   - **Notes:** Air conditioning included. High-speed WiFi 500Mbps.
4. Click **Save Room**.

**Expected Result:** Room appears on the property detail page with all details. `isAvailable = true`.

### 8B — Edit Room Details (BUG-14 fix)
1. On the property detail page, click **Edit** on the Master Bedroom room.
2. Change:
   - **Monthly Rent:** 950
   - **Notes:** Air conditioning included. High-speed WiFi 1Gbps upgraded.
3. Click **Save**.

**Expected Result:** Room updated successfully. Changes reflected immediately on the property page.

4. Edit the room again and restore **Monthly Rent** back to **900** before proceeding.

---

## Module 9 — Landlord: New Tenancy (Invite Tenant)

**Pre-condition:** Logged in as Landlord. Property verified. Room created.

**Steps:**
1. Navigate to `/dashboard/landlord/tenancies`
2. Click **Invite Tenant** (or **New Tenancy**).
3. Fill in:
   - **Property/Room:** Select "Master Bedroom — 12, Jalan Mawar 3" (the room you created)
   - **Tenant Email:** lee.tenant@gmail.com
   - **Start Date:** 2025-07-01
   - **End Date:** 2026-06-30
   - **Monthly Rent:** 900
   - **Security Deposit:** 1800
4. Click **Send Invitation**.

**Expected Result:**
- Tenancy created with status `INVITED`.
- Room `isAvailable` set to `false`.
- Tenant receives `INVITATION_RECEIVED` notification.
- **Email:** Invitation email sent to Resend inbox (from `onboarding@resend.dev`).

> **Validation test (BUG-08 fix):** Before the valid submission, try setting End Date = Start Date (2025-07-01 for both) and submit — expect error "End date must be after start date".

---

## Module 10 — Tenant: Respond to Invitation

**Pre-condition:** Logged in as Tenant.

### 10A — View Invitation
1. Navigate to `/dashboard/tenant`
2. A notification banner or card shows an active invitation.
3. Click on it or go to `/dashboard/tenant/tenancy`.
4. Review the invitation details:
   - Property address, room label, dates, monthly rent, deposit amount.

### 10B — Accept Invitation
1. Click **Accept Invitation**.

**Expected Result:**
- Tenancy status changes from `INVITED` → `PENDING`.
- Landlord receives `INVITATION_RESPONDED` notification.
- Tenant dashboard now shows the tenancy in PENDING state.

### 10C — Test Decline (BUG-04 fix)
> Requires creating a second test invitation. You can do this by first creating a second room on the property, inviting the same tenant again, then declining.

1. As Landlord, add a second room (label: "Small Bedroom", Rent: 600) and invite the tenant.
2. As Tenant, navigate to the new invitation and click **Decline**.

**Expected Result:**
- The declined tenancy record is **completely deleted** from the database (not set to TERMINATED).
- Room `isAvailable` returns to `true`.
- Landlord receives "Tenant declined your invitation" notification.
- The declined tenancy does NOT appear in the landlord's tenancy list.

> This is the corrected behaviour — previously declined invitations were being stored as `TERMINATED`, making them indistinguishable from genuinely terminated active tenancies.

### 10D — Tenant Withdrawal from PENDING (FEAT-05)
> After completing 10B (tenant accepted and tenancy is PENDING):

1. Logged in as Tenant. Navigate to `/dashboard/tenant/tenancy`.
2. Find the PENDING tenancy and click **Withdraw** (if available in UI).
3. Confirm the action.

**Expected Result:**
- The pending tenancy record is deleted.
- Room is freed (`isAvailable = true`).
- Landlord receives "Tenant withdrew from tenancy" notification.

> If the UI withdraw button is not yet wired up, you can test the API directly:
> `POST /api/tenancies/{id}/withdraw` (authenticated as tenant)

---

## Module 11 — Landlord: Co-Tenant Management

**Pre-condition:** Logged in as Landlord. Tenancy is PENDING (re-invite tenant if needed from Module 10).

**Steps:**
1. Navigate to `/dashboard/landlord/tenancies` → click the tenancy for Lee Wei Jian.
2. Find the **Co-Tenants** section.
3. Click **Add Co-Tenant**.
4. Fill in:
   - **Name:** Nur Aisyah binti Rahman
   - **IC Number:** 970820-08-1234
   - **Phone:** 013-9876543
5. Click **Save**.
6. Verify co-tenant appears in the list with name, IC, and phone.
7. Click **Remove** on the co-tenant, confirm deletion.
8. Add the co-tenant again (same data as above) — this will be included in the final agreement.

**Expected Result:** Co-tenant saved. Will appear in the AI-generated agreement as a named party.

---

## Module 12 — Landlord: Agreement Preferences Wizard (6 Steps)

**Pre-condition:** Logged in as Landlord. Tenancy is PENDING.

**Steps:**
1. Navigate to `/dashboard/landlord/tenancies` → click the tenancy.
2. Click **Set Up Agreement** or navigate to `/dashboard/landlord/tenancies/[id]/wizard`.
3. Complete all 6 steps:

### Step 1 — House Rules
| Field | Value |
|-------|-------|
| Pets Policy | Not Allowed |
| Smoking Policy | Outdoor Only |
| Overnight Guests | Allowed |
| Max Overnight Nights/Month | 7 |
| Quiet Hours | Yes (10:00 PM – 7:00 AM) |
| Additional Rules | No cooking of strong-smelling food after 10pm. Keep common areas clean. |

Click **Next**.

### Step 2 — Utilities
| Field | Value |
|-------|-------|
| Utility Payment Method | Separate (each pays own) |
| Utility Dispute Method | Landlord Decides |
| Internet Provider | Unifi |
| Internet Account Manager | Tenant |
| AC Servicing | Every 6 months — Landlord |
| Pest Control | Every 12 months — Landlord |

Click **Next**.

### Step 3 — Financial Terms
| Field | Value |
|-------|-------|
| Rent Due Day | **5** |
| Grace Period (days) | 7 |
| Late Penalty Type | Fixed Amount |
| Late Penalty Amount | 50 |
| Acceptable Payment Methods | Bank Transfer, E-Wallet |
| Rent Increase Terms | Upon renewal |
| Rent Increase Percent | 5 |

Click **Next**.

> **Important (IMP-03 fix):** The rent due day **5** will be used when generating the payment schedule after signing. All 12 payments will be due on the **5th of each month** (e.g. 2025-07-05, 2025-08-05, …, 2026-06-05), not on the 1st.

### Step 4 — Maintenance
| Field | Value |
|-------|-------|
| Minor Repair Threshold (RM) | 100 |
| Minor Repairs Responsible | Tenant |
| Plumbing Responsible | Landlord |
| Electrical Responsible | Landlord |
| Appliances Responsible | Landlord |
| Structural Responsible | Landlord |
| Urgent Response Time | 24 hours |

Click **Next**.

### Step 5 — Ending Terms
| Field | Value |
|-------|-------|
| Tenant Notice Period (months) | 2 |
| Landlord Notice Period (months) | 2 |
| Early Termination Penalty | 2 months rent |
| Reinstatement Level | Original Condition |
| Subletting Policy | Not Allowed |

Click **Next**.

### Step 6 — Deposit Handling
| Field | Value |
|-------|-------|
| Deposit Refund Within (days) | 30 |
| Deduction Categories | Damage repair, Cleaning, Unpaid utility bills |
| Dispute Resolution | Mediation |
| Utility Deposit Handling | Return after final utility bill confirmed |

Click **Save & Complete**.

**Expected Result:** Wizard shows all 6 steps completed. `isComplete = true` stored in AgreementPreferences. A "Generate Agreement" button is now accessible.

---

## Module 13 — AI Agreement Generation

**Pre-condition:** Logged in as Landlord. Wizard completed.

**Steps:**
1. From the tenancy detail page, click **Generate Agreement** (or navigate to `/dashboard/landlord/tenancies/[id]/agreement`).
2. Click the **Generate** button.
3. Wait for the Gemini AI call to complete (may take 10–20 seconds).
4. Review the generated agreement:
   - **Raw Content:** Full legal agreement text mentioning both parties (Ahmad Farid bin Hassan as landlord, Lee Wei Jian as tenant, Nur Aisyah binti Rahman as co-tenant).
   - **Plain Language Summary (English):** Simplified clause-by-clause explanation.
   - **Plain Language Summary (Bahasa Malaysia):** Same content in BM.
   - **Red Flags:** List of flagged clauses with severity (LOW/MEDIUM/HIGH), the clause, the issue, and recommendation.
5. Read through at least 2 red flags to verify they make sense in context.
6. Click **Request AI Assistance** and enter: `Can you clarify the late payment penalty clause to be more specific about when the penalty applies?`
7. Review the AI assistance response.

**Expected Result:**
- Agreement created with status `DRAFT`.
- All three sections (raw content, English summary, BM summary) populated.
- Red flags array contains at least 1 item with severity, clause, issue, recommendation fields.
- AI assistance provides a suggestion in response to the query.

> **Rate limit test (IMP-02):** Try clicking Generate 6 times rapidly for the same tenancy. The 6th request should return HTTP 429 with message "Too many requests. You can generate 0 more time(s). Please wait before regenerating." Limit resets after 1 hour.

### 13B — Tenancy Term Edit While Agreement is DRAFT (BUG-06 fix)
1. On the tenancy detail page, click **Edit Terms**.
2. Change **Monthly Rent** to **920**.
3. Click **Save**.

**Expected Result:** Edit succeeds even though a DRAFT agreement exists. A message reminds you to regenerate the agreement with the new terms.

4. Change rent back to **900** and regenerate the agreement before proceeding.

---

## Module 14 — Agreement Finalization (Landlord)

**Pre-condition:** Agreement in DRAFT status.

**Steps:**
1. On the agreement page, review the full agreement text.
2. Click **Finalize Agreement** (DRAFT → FINALIZED).
3. Confirm the action in any confirmation dialog.

**Expected Result:**
- Agreement status changes to `FINALIZED`.
- Tenant receives `AGREEMENT_READY` notification.
- **Email:** "Your tenancy agreement is ready to review" email sent to Resend inbox.
- Finalize button disappears; agreement is now read-only for the landlord.

---

## Module 15 — Tenant: Agreement Review & Signing

**Pre-condition:** Logged in as Tenant.

### 15A — Review Agreement
1. Navigate to `/dashboard/tenant/tenancy`
2. A notification/banner indicates the agreement is ready for review.
3. Click to view the agreement.
4. Read the full agreement text.
5. Check the **Plain Language Summary** tab — verify English and BM versions.
6. Check the **Red Flags** section — review each flag with severity badges.
7. Download the **PDF** version of the agreement (click PDF export button if available).

### 15B — Request Changes (Optional Negotiation Round)
1. Click **Request Changes**.
2. Enter negotiation note: `Please clarify that the RM50 late fee applies per calendar day after the grace period, not as a one-time charge.`
3. Click **Submit**.

**Expected Result:** Agreement status → `NEGOTIATING`. Landlord notified. NegotiationRound increments to 1.

4. Log in as Landlord, go to the agreement, regenerate (terms editing now works in NEGOTIATING status — BUG-06 fix), and re-finalize.
5. Log back in as Tenant. Agreement is FINALIZED again.

### 15C — Sign Agreement
1. Click **Sign Agreement**.
2. Confirm in the dialog (acknowledge you are signing legally).
3. Wait for blockchain anchoring (may take a few seconds; non-blocking).

**Expected Result:**
- Agreement status → `SIGNED`.
- Tenancy status → `ACTIVE`.
- Fields populated: `signedAt`, `signedByIp`, `contentHash` (SHA-256 hex).
- `txHash` populated with Sepolia transaction hash (e.g., `0xabc123...`).
- **Rent payment schedule:** 12 monthly records generated, each due on the **5th of the month** (IMP-03 fix): 2025-07-05, 2025-08-05, 2025-09-05, …, 2026-06-05. Each for RM 900.
- **Email:** "Agreement Signed — tenancy is now active" email sent to landlord's Resend inbox.
- Both parties receive `AGREEMENT_SIGNED` notification.

### 15D — Verify Blockchain Anchoring
1. Copy the `txHash` displayed on the agreement page.
2. Go to `https://sepolia.etherscan.io/tx/{txHash}` in your browser.
3. Under **Input Data**, decode the hex to UTF-8.
4. Verify the decoded string is: `RentalEase:sha256:<64-char-hex>` where the hash matches the `contentHash` on the agreement page.

---

## Module 16 — Tenant: Deposit Proof Upload

**Pre-condition:** Tenancy is ACTIVE. Logged in as Tenant.

**Steps:**
1. Navigate to `/dashboard/tenant/payments` (or `/dashboard/tenant/tenancy`).
2. Find the **Security Deposit** section showing deposit of RM 1,800 with status `PENDING`.
3. Click **Upload Deposit Proof**.
4. Upload any image file as a placeholder bank transfer receipt.
5. Click **Submit**.

**Expected Result:**
- Deposit status changes to `UNDER_REVIEW`.
- Landlord receives `DEPOSIT_PROOF_UPLOADED` notification.

---

## Module 17 — Landlord: Deposit Proof Verification

**Pre-condition:** Logged in as Landlord.

### 17A — Test Rejection
1. Navigate to the tenancy detail page for Lee Wei Jian.
2. Find the **Deposit Proof** section showing status `UNDER_REVIEW`.
3. Click **Reject**.
4. Enter reason: `Payment amount does not match. Please re-upload the correct receipt.`
5. Verify deposit status → `REJECTED`.
6. Tenant receives `DEPOSIT_PROOF_REJECTED` notification.

### 17B — Approve After Tenant Re-uploads
1. Log in as Tenant. Upload a new deposit proof image.
2. Log in as Landlord. Click **Approve** on the deposit proof.

**Expected Result:** `depositStatus = PAID`. Tenant receives `DEPOSIT_PROOF_APPROVED` notification.

---

## Module 18 — Move-In Condition Report

**Pre-condition:** Tenancy ACTIVE. Logged in as Landlord.

> **Note (BUG-11 fix):** Condition reports can only be created for tenancies in PENDING or later status. A MOVE_OUT report can only be created for ACTIVE, EXPIRED, or TERMINATED tenancies.

**Steps:**
1. Navigate to `/dashboard/landlord/tenancies/[id]/conditions`
2. Click **Create Condition Report**.
3. Set type: **Move-In**.
4. Add notes: `Property is in excellent condition. All appliances functional. No existing damage noted.`
5. Click **Create**.
6. On the report detail view, click **Add Photo**. Upload an image and fill in:
   - **Room/Area:** Living Room
   - **Caption:** Clean and fully furnished living area
7. Add a second photo:
   - **Room/Area:** Master Bedroom
   - **Caption:** Bed, wardrobe, and AC in good condition
8. Add a third photo:
   - **Room/Area:** Bathroom
   - **Caption:** Clean toilet and shower — no damage

**Expected Result:**
- Move-In report created with 3 photos.
- Tenant receives `CONDITION_REPORT_CREATED` notification.

### Tenant Acknowledges Move-In Report
1. Log in as Tenant.
2. Navigate to `/dashboard/tenant/conditions`
3. Find the Move-In report, review the notes and photos.
4. Click **Acknowledge / Sign Off**.

**Expected Result:**
- `acknowledgedAt` timestamp set.
- Landlord receives `CONDITION_REPORT_ACKNOWLEDGED` notification.
- Notification link navigates to `/dashboard/landlord/tenancies/[id]/conditions` (BUG-10 fix — previously linked to a non-existent route).

---

## Module 19 — Rent Payment Cycle

**Pre-condition:** Tenancy ACTIVE. Rent schedule generated. Logged in as Tenant.

### 19A — Upload Payment Proof (Month 1 — July 2025)
1. Navigate to `/dashboard/tenant/payments`
2. Find the first payment: **Due: 2025-07-05 | Amount: RM 900 | Status: PENDING**
3. Verify the due date is the **5th** (matching the `rentDueDay = 5` set in wizard Step 3). This confirms the IMP-03 fix is working.
4. Click **Upload Proof**.
5. Upload any image file as bank transfer receipt.
6. Click **Submit**.

**Expected Result:**
- Payment status → `UNDER_REVIEW`.
- Landlord receives `PAYMENT_PROOF_UPLOADED` notification.

### 19B — Landlord Rejects Payment (test rejection flow)
1. Log in as Landlord.
2. Navigate to `/dashboard/landlord/payments`
3. Find the July 2025 payment for Lee Wei Jian showing `UNDER_REVIEW`.
4. Click **Reject** and enter reason: `Wrong amount transferred. Expected RM 900, received RM 800.`

**Expected Result:**
- Payment back to `PENDING` with `rejectionReason` stored.
- Tenant receives `PAYMENT_REJECTED` notification.
- **Email:** "Payment Proof Rejected" email sent to Resend inbox with rejection reason.

### 19C — Tenant Re-uploads and Landlord Approves
1. Log in as Tenant. Re-upload payment proof for July 2025.
2. Log in as Landlord. Click **Approve** on the proof.

**Expected Result:**
- Payment status → `PAID`.
- `paidDate` set to today.
- Tenant receives `PAYMENT_APPROVED` notification.
- **Email:** "Payment Confirmed" email sent to Resend inbox.
- Payment card shows green PAID badge.

### 19D — Upload Month 2 Payment (August 2025)
1. Logged in as Tenant. Find **Due: 2025-08-05 | RM 900 | PENDING**.
2. Upload a proof and submit.
3. Log in as Landlord and approve directly (skip rejection this time).

**Expected Result:** Two payments now show PAID status. Financial Summary on landlord dashboard shows updated income figure.

### 19E — Late Payment Check (Computed Status)
1. Observe any payment with `dueDate` in the past and `status = PENDING`.
2. Verify the UI displays it as **LATE** (red badge or label).

> **Note:** "Late" is not stored in the database — it is computed dynamically (`dueDate < today && status === PENDING`). There is no LATE enum actively used in the schema.

---

## Module 20 — Messaging

**Pre-condition:** Tenancy ACTIVE. Both landlord and tenant logged in (use two browser tabs or profiles).

### 20A — Landlord Sends Message
1. Log in as Landlord. Navigate to `/dashboard/landlord/messages`.
2. Select the conversation with Lee Wei Jian.
3. Type: `Hi Lee, please ensure the apartment is clean for the inspection next Monday.`
4. Click **Send**.

### 20B — Tenant Replies
1. Log in as Tenant. Navigate to `/dashboard/tenant/messages`.
2. Find the conversation with Ahmad Farid.
3. Verify the landlord's message appears.
4. Reply: `Understood, I will ensure everything is tidy by Sunday evening.`

### 20C — Unread Count
1. Log in as Landlord. Check the notification/badge count on the Messages menu item.

**Expected Result:**
- Messages appear in both dashboards in chronological order.
- Unread count badge visible on Messages icon when logged in as recipient before reading.
- After viewing the conversation, unread count drops to 0 (messages are marked `read = true` on fetch — IMP-06).

---

## Module 21 — Inspection Condition Report

**Pre-condition:** Tenancy ACTIVE. Logged in as Landlord.

> **Note (IMP-04 fix):** A second MOVE_IN report cannot be created for the same tenancy — the system returns 409 "A move-in report already exists for this tenancy." Multiple INSPECTION reports are allowed.

**Steps:**
1. Navigate to `/dashboard/landlord/tenancies/[id]/conditions`
2. Click **Create Condition Report**.
3. Type: **Inspection**.
4. Notes: `6-month routine inspection. Minor scuff on bedroom wall noted.`
5. Add photo:
   - **Room/Area:** Master Bedroom
   - **Caption:** Small scuff mark on north wall, approximately 10cm
6. Create the report.

**Expected Result:**
- Inspection report created with photo.
- Tenant receives `CONDITION_REPORT_CREATED` notification.
- Tenant acknowledges from their conditions page.

---

## Module 22 — Tenancy Termination

**Pre-condition:** Tenancy ACTIVE. Logged in as Landlord.

**Steps:**
1. Navigate to `/dashboard/landlord/tenancies/[id]/terminate`
2. Fill in:
   - **Reason:** Landlord requires property for personal use after lease period.
   - **Termination Date:** (leave as today or select a date)
3. Click **Confirm Termination**.

**Expected Result:**
- Tenancy status → `TERMINATED`.
- `terminatedAt` and `terminatedReason` set.
- Room `isAvailable` → `true`.
- Tenant dashboard reflects terminated status.

> **Auto-expiry alternative (FEAT-01):** Instead of manual termination, if the tenancy `endDate` (2026-06-30) passes, the daily cron at `GET /api/cron/expire-tenancies` will automatically set status to `EXPIRED`. You can test this manually:
> `GET http://localhost:3000/api/cron/expire-tenancies` (no auth required in dev without CRON_SECRET set)

---

## Module 23 — Move-Out Condition Report

**Pre-condition:** Tenancy TERMINATED or EXPIRED. Logged in as Tenant.

**Steps:**
1. Navigate to `/dashboard/tenant/conditions`
2. Click **Create Condition Report**.
3. Type: **Move-Out**.
4. Notes: `Vacating unit. The scuff mark on bedroom wall was pre-existing from move-in. All appliances intact.`
5. Add photos:
   - **Room/Area:** Master Bedroom — **Caption:** Same scuff mark (pre-existing, see move-in report)
   - **Room/Area:** Living Room — **Caption:** Clean and no damage
6. Create the report.
7. Log in as Landlord and acknowledge the move-out report.

**Expected Result:** Move-out report with photos created and acknowledged by landlord.

---

## Module 24 — Deposit Settlement

**Pre-condition:** Tenancy TERMINATED/EXPIRED. `depositStatus = PAID`. Logged in as Landlord.

> **Note (BUG-05 fix):** If the tenancy `endDate` has passed but the status was still `ACTIVE` (cron not run yet), initiating deposit settlement will automatically expire the tenancy first before proceeding.

### 24A — Initiate Settlement with Deduction
1. Navigate to `/dashboard/landlord/tenancies/[id]/deposit-settlement`
2. Click **Initiate Deposit Settlement**.
3. Set original deposit amount: **1800** (auto-filled).
4. Add a deduction:
   - **Reason:** Professional cleaning required — unit left with minor stains
   - **Amount:** 200
   - **Linked Photos:** Select the move-out bedroom photo (if photo linking UI is available)
5. Add a second deduction:
   - **Reason:** Painting of scuffed bedroom wall
   - **Amount:** 200
6. Click **Submit Settlement**.

**Expected Result:**
- `DepositRefund` created with status `PROPOSED`.
- `refundAmount` = 1800 - 200 - 200 = **RM 1,400**.
- Tenant receives `DEPOSIT_DEDUCTION_FILED` notification.
- **Email:** "Deposit Settlement Started" email sent to Resend inbox.

### 24B — Tenant Accepts One Deduction
1. Log in as Tenant. Navigate to `/dashboard/tenant/tenancy` → deposit settlement section.
2. Review the two deductions.
3. Click **Accept** on the RM 200 cleaning deduction.

**Expected Result:**
- Deduction status → `ACCEPTED`.
- `DepositRefund` status → `IN_REVIEW`.
- `refundAmount` is NOT yet auto-updated (one deduction is still PROPOSED).

### 24C — Tenant Disputes the Second Deduction
1. Click **Dispute** on the RM 200 painting deduction.
2. Enter dispute note: `The scuff mark was pre-existing — see move-in report photo.`

**Expected Result:**
- Deduction status → `DISPUTED`.
- Since **all** deductions are now resolved (ACCEPTED + DISPUTED), `DepositRefund` status auto-transitions to **`DISPUTED`** (BUG-02 fix).
- `refundAmount` is recalculated: 1800 - 200 (accepted) - 200 (disputed) = **RM 1,400** (IMP-07 fix).
- Landlord receives notification of the dispute response.

### 24D — Landlord Withdraws Disputed Deduction
1. Log in as Landlord. Navigate to the deposit settlement.
2. View the tenant's dispute note on the painting deduction.
3. Click **Withdraw** on the painting deduction.

**Expected Result:**
- Deduction status → `WITHDRAWN`.
- `refundAmount` recalculated: 1800 - 200 (cleaning accepted) = **RM 1,600** (BUG-03 fix — correctly filters by deduction ID, not amount).
- `DepositRefund` status → **`AGREED`**.
- **Landlord receives notification:** "All deductions agreed. Please arrange the deposit refund payment." (IMP-12 fix).

> **BUG-03 verification:** In step 24A we added two deductions both for RM 200. In 24D when we withdrew one, verify the refundAmount is 1600 (not 1400). If both RM 200 deductions were being removed (old bug), refundAmount would be 1800.

### 24E — Landlord Marks Refund as Paid
1. Click **Mark as Paid**.
2. Upload an image as proof of bank transfer (the RM 1,600 return to tenant).
3. Confirm.

**Expected Result:**
- `DepositRefund.status` → `PAID`.
- `paidAt` timestamp set.
- `paidProofUrl` stored.
- Tenant receives `DEPOSIT_REFUND_PAID` notification.

---

## Module 25 — Tenancy Renewal

**Pre-condition:** Tenancy is ACTIVE or EXPIRED. Logged in as Landlord.

**Steps:**
1. Navigate to `/dashboard/landlord/tenancies/[id]/renew`
2. Fill in renewal details:
   - **New Start Date:** 2026-07-01
   - **New End Date:** 2027-06-30
   - **Monthly Rent:** 945 *(5% increase as per wizard preference)*
   - **New Deposit:** 1890
3. Click **Create Renewal**.

**Expected Result:**
- New tenancy created in `INVITED` status with `renewalOfTenancyId` pointing to the original tenancy.
- Room `isAvailable` set to `false` atomically in the same transaction (BUG-09 fix — prevents race condition where another tenant could claim the room between create and update).
- Tenant receives invitation for the renewal.
- Follow Modules 10–15 again for the renewed tenancy to complete the full renewal lifecycle.

---

## Module 26 — Password Reset

**Pre-condition:** Dev server running. Email configured (Resend key in `.env`).

**Steps:**
1. Go to `/login` and click **Forgot Password?**
2. Enter `lee.tenant@gmail.com`
3. Click **Send Reset Email**

**Expected Result:** Success message: "If that email exists, a reset link has been sent." — reset token is **never returned in the HTTP response** (BUG-01 fix).

4. **Check your email inbox** (Resend delivers to the registered account email). You should receive "Reset your RentalEase password" with a button/link.
5. Click the link in the email — it opens `/reset-password?token=<token>`.
6. Enter new password: `NewTenant@456` / confirm: `NewTenant@456`
7. Click **Reset Password**

> **Fallback (if email not received):** Query DB directly:
> `SELECT token FROM "PasswordResetToken" ORDER BY "createdAt" DESC LIMIT 1;`

**Expected Result:**
- Redirected to `/login?reset=true` with success message.
- Old password `Tenant@123` no longer works.
- New password `NewTenant@456` logs in successfully.
- `PasswordResetToken.usedAt` is now set.

8. Reset password back to `Tenant@123` for convenience.

---

## Module 27 — TENANCY_ENDING_SOON Notifications (FEAT-10)

**Pre-condition:** Cron endpoint accessible. An ACTIVE tenancy exists.

**Steps:**
1. In DB, temporarily update a tenancy's `endDate` to 7 days from today:
   ```sql
   UPDATE "Tenancy" SET "endDate" = NOW() + INTERVAL '7 days' WHERE status = 'ACTIVE';
   ```
2. Call the cron endpoint: `GET http://localhost:3000/api/cron/expire-tenancies`
3. Log in as Tenant and check notifications.
4. Log in as Landlord and check notifications.

**Expected Result:**
- Both tenant and landlord receive `TENANCY_ENDING_SOON` notification: "Your tenancy ends in 7 days."
- Response JSON shows `{ "expired": 0, "notified30Days": 0, "notified7Days": 1 }`.

5. Restore the `endDate` to the original value after testing.

---

## Module 28 — Notifications

**Pre-condition:** Run through Modules 1–25. Logged in as any role.

**Steps:**
1. Click the **Notifications** bell icon in the navigation.
2. Verify the unread count badge is visible.
3. Review the notification list — confirm the following notification types appear based on actions taken:
   - `ACCOUNT_VERIFIED` — (Tenant, after Module 4)
   - `ACCOUNT_KYC_REJECTED` — (Tenant, after Module 4 rejection step)
   - `PROPERTY_VERIFICATION_APPROVED` — (Landlord, after Module 7)
   - `INVITATION_RECEIVED` — (Tenant, after Module 9)
   - `INVITATION_RESPONDED` — (Landlord, after Module 10)
   - `AGREEMENT_READY` — (Tenant, after Module 14)
   - `AGREEMENT_SIGNED` — (both, after Module 15C)
   - `PAYMENT_PROOF_UPLOADED` — (Landlord, after Module 19A)
   - `PAYMENT_APPROVED` / `PAYMENT_REJECTED` — (Tenant, after Module 19B/C)
   - `DEPOSIT_PROOF_UPLOADED` — (Landlord, after Module 16)
   - `DEPOSIT_PROOF_APPROVED` / `DEPOSIT_PROOF_REJECTED` — (Tenant, after Module 17)
   - `CONDITION_REPORT_CREATED` — (both parties, after Modules 18/21/23)
   - `CONDITION_REPORT_ACKNOWLEDGED` — (both, after acknowledgement)
   - `DEPOSIT_DEDUCTION_FILED` — (Tenant, after Module 24A)
   - `DEPOSIT_REFUND_PAID` — (Tenant, after Module 24E)
   - `TENANCY_ENDING_SOON` — (both, after Module 27)
4. Click **Mark All as Read**. Verify unread count drops to 0.
5. Click an individual notification to verify it navigates to the correct dashboard page.

---

## Module 29 — Financial Dashboard (IMP-05 / FEAT-04)

**Pre-condition:** Logged in as Landlord. At least one ACTIVE tenancy with paid payments exists.

**Steps:**
1. Navigate to `/dashboard/landlord`
2. Locate the **Financial Summary** row near the top of the dashboard (above the stat cards).
3. Verify the 4 cards show correct values:

| Card | Expected |
|------|----------|
| Income (last 30 days) | RM 900.00 × (approved payments in last 30 days) |
| Overdue payments | RM 0.00 (if no past-due PENDING payments) |
| Pending proofs | Count matching landlord's unverified payment proofs |
| Occupancy rate | 100% (1 active room out of 1 total) |

4. Verify card colours:
   - Income → green background
   - Overdue → red background if non-zero, gray if zero
   - Pending proofs → amber background if non-zero
   - Occupancy → blue background

**Expected Result:** All four financial cards display correctly with colour-coded backgrounds.

---

## Module 30 — Admin Dashboard Summary

**Pre-condition:** Logged in as Admin.

**Steps:**
1. Navigate to `/dashboard/admin`
2. Verify the following stats are accurate:
   - **Total Users:** 3 (Admin + Landlord + Tenant)
   - **Pending KYC:** 0 (all verified)
   - **Total Properties:** 1
   - **Pending Property Verification:** 0
3. Navigate to `/dashboard/admin/verify` — confirm the queue is empty.
4. Navigate to `/dashboard/admin/properties` — confirm the queue is empty.

---

## End-to-End Flow Summary

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | Landlord | Register + IC photo | Account created, unverified; welcome email sent |
| 2 | Tenant | Register + IC photo | Account created, unverified; welcome email sent |
| 3 | Admin | KYC: Verify Landlord & Tenant | Both `isVerified = true`; approval/rejection emails sent |
| 4 | Landlord | Create Property | Property pending admin approval |
| 5 | Admin | Verify Property | Property `isVerified = true` |
| 6 | Landlord | Create Room | Room available |
| 7 | Landlord | Edit Room details | Rent/notes updated (PATCH endpoint) |
| 8 | Landlord | Invite Tenant | Tenancy `INVITED`; invitation email sent |
| 9 | Tenant | Accept Invitation | Tenancy `PENDING` |
| 10 | Landlord | Add Co-Tenant | Co-tenant stored |
| 11 | Landlord | Complete Wizard (rentDueDay=5) | AgreementPreferences saved |
| 12 | Landlord | Generate Agreement | Agreement `DRAFT` via Gemini AI (rate limited 5/hr) |
| 13 | Landlord | Edit tenancy terms (DRAFT exists) | Terms updated; agreement regenerated with new values |
| 14 | Landlord | Finalize Agreement | Agreement `FINALIZED`; agreement-ready email to tenant |
| 15 | Tenant | Sign Agreement | Agreement `SIGNED`, Tenancy `ACTIVE`, 12 payments due on 5th of each month, txHash anchored; signed email to landlord |
| 16 | Tenant | Upload Deposit Proof | `depositStatus = UNDER_REVIEW` |
| 17 | Landlord | Approve Deposit Proof | `depositStatus = PAID` |
| 18 | Landlord | Create Move-In Report | Report with photos |
| 19 | Tenant | Acknowledge Report | `acknowledgedAt` set; notification links to correct page |
| 20 | Tenant | Upload Rent Proofs (×2) | Payments `UNDER_REVIEW` |
| 21 | Landlord | Approve/Reject Payments | Payments `PAID`; emails sent to tenant |
| 22 | Both | Send Messages | Conversation thread; messages marked read on view |
| 23 | Landlord | Create Inspection Report | Mid-tenancy inspection recorded |
| 24 | Landlord | Terminate Tenancy | Tenancy `TERMINATED`, room freed |
| 25 | Tenant | Create Move-Out Report | With damage photos |
| 26 | Landlord | Initiate Deposit Settlement (2 deductions, both RM 200) | `DepositRefund PROPOSED`; settlement email to tenant |
| 27 | Tenant | Accept one / Dispute one | All resolved → auto-transitions to `DISPUTED`; refundAmount updated |
| 28 | Landlord | Withdraw disputed deduction | `DepositRefund AGREED`; refundAmount correctly recalculated by ID; notification to landlord |
| 29 | Landlord | Mark Refund Paid | `DepositRefund PAID` |
| 30 | Landlord | Create Renewal Tenancy | New INVITED tenancy; room marked unavailable atomically |

---

## Edge Cases to Verify

| Scenario | How to Test | Expected |
|----------|-------------|----------|
| Unverified tenant tries to accept invitation | Register new tenant (no KYC), invite them, try to accept | Error: "Account not yet verified" |
| Duplicate IC number registration | Try to register with `960305-14-3456` again | Error: "IC number already registered" |
| Duplicate email registration | Try to register with `lee.tenant@gmail.com` again | Error: "Email already in use" |
| Register without IC photo | Submit registration form with no IC photo (or call API without file) | HTTP 400 "IC photo is required" |
| Expired reset token | Wait > 1 hour after requesting reset and try to use | Error: "Token expired or invalid" |
| Late payment UI | Find payment with past `dueDate` still PENDING | Red **LATE** badge shown (computed, not stored) |
| Landlord invites from unverified property | Create second property (not yet verified), try to invite | Should block with verification warning |
| Tenant views wrong tenancy | Manually navigate to another tenancy's URL | 403 / redirect (unauthorized) |
| PDF export | Click PDF download on a SIGNED agreement | PDF file downloaded with full agreement text |
| BM language preference | In profile, set language to Bahasa Malaysia | Agreement summaries and red flags display in BM |
| End date ≤ start date in invitation | Set end date same as or before start date | Error: "End date must be after start date" |
| Duplicate MOVE_IN report | Try to create a second Move-In report for the same tenancy | HTTP 409 "A move-in report already exists for this tenancy" |
| Condition report for INVITED tenancy | Try `POST /api/condition-reports` for a tenancy in INVITED status | HTTP 409 "cannot be created for a tenancy that has not yet been accepted" |
| Delete room with only historical tenancies | On a room that had a past TERMINATED tenancy but none active, click Delete | Room deleted successfully (BUG-07 fix) |
| Delete room with ACTIVE tenancy | Try to delete a room with a live tenancy | HTTP 409 "Cannot delete a room with an active or pending tenancy" |
| Agreement generation rate limit | Click Generate 6+ times for the same tenancy | 6th request returns HTTP 429 with cooldown message |
| AI assist rate limit | Click AI Assist 11+ times for the same agreement | 11th request returns HTTP 429 |
| Same-amount deduction withdrawal | Add two deductions for RM 200, withdraw one | refundAmount increases by RM 200 only (not RM 400) — BUG-03 fix |
| Tenancy edit while agreement is FINALIZED | Try to edit tenancy terms after landlord finalizes | Blocked: "The agreement has already been finalised" |
| Tenancy edit while agreement is DRAFT | Edit tenancy terms when only a DRAFT agreement exists | Succeeds — terms updated, user prompted to regenerate |
