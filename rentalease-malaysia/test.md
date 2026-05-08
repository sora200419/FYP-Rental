# RentalEase Malaysia — End-to-End Test Data

> All scenarios run against `http://localhost:3000` with `npm run dev`.  
> Seed the database in the order listed so foreign-key dependencies are satisfied.

---

## 1. Test Accounts

### 1.1 Admin

| Field    | Value                        |
|----------|------------------------------|
| Email    | `admin@rentalease.my`        |
| Password | `Admin@12345`                |
| Role     | ADMIN                        |
| Created via | `npx ts-node scripts/create-admin.ts` |

---

### 1.2 Landlords

| # | Name              | Email                        | Password      | IC Number      | Phone         | Verified |
|---|-------------------|------------------------------|---------------|----------------|---------------|----------|
| L1 | Ahmad Razif       | `landlord1@rentalease.my`   | `Land@12345`  | 850101-14-5001 | 012-3456789   | Yes (Admin approved) |
| L2 | Siti Nurhaliza    | `landlord2@rentalease.my`   | `Land@12345`  | 900215-10-6002 | 011-9876543   | No (pending KYC)     |

---

### 1.3 Tenants

| # | Name              | Email                        | Password      | IC Number      | Phone         | Docs Uploaded                | Verified |
|---|-------------------|------------------------------|---------------|----------------|---------------|------------------------------|----------|
| T1 | Lim Wei Jian      | `tenant1@rentalease.my`     | `Ten@12345`   | 950322-07-3001 | 016-1112222   | IC_COPY + INCOME_PROOF       | Yes      |
| T2 | Nurul Ain Binti   | `tenant2@rentalease.my`     | `Ten@12345`   | 991108-12-4002 | 017-3334444   | IC_COPY only                 | Yes      |
| T3 | Rajesh Kumar      | `tenant3@rentalease.my`     | `Ten@12345`   | 880630-08-7003 | 019-5556666   | None (not yet uploaded)      | No       |

---

## 2. Test Properties & Rooms

### Property 1 — Ahmad Razif (Verified)

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Address     | 12, Jalan Ampang Hilir, Taman Duta         |
| City        | Kuala Lumpur                               |
| State       | Wilayah Persekutuan                        |
| Postcode    | 50450                                      |
| Type        | APARTMENT                                  |
| Description | Modern 3-bedroom apartment near KLCC. Near LRT station, 24hr security, facilities include gym and pool. |
| Status      | Verified                                   |

**Rooms — Property 1**

| Label       | Type         | Bathroom   | Rent (RM) | Furnish     | Gender     | Utilities           | Available |
|-------------|--------------|------------|-----------|-------------|------------|---------------------|-----------|
| Master Room | MASTER       | ATTACHED   | 1,200     | FULLY       | ANY        | WiFi, Water, Elec   | No (T1 occupying) |
| Medium Room | MEDIUM       | SHARED     | 800       | PARTIALLY   | FEMALE_ONLY | WiFi only          | No (T2 occupying) |
| Small Room  | SMALL        | SHARED     | 600       | UNFURNISHED | MALE_ONLY  | None                | Yes       |

---

### Property 2 — Ahmad Razif (Verified, 2nd property)

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Address     | 45, Lorong Utama, Taman Melawati            |
| City        | Kuala Lumpur                               |
| State       | Wilayah Persekutuan                        |
| Postcode    | 53100                                      |
| Type        | TERRACE                                    |
| Description | Double-storey terrace house, fully furnished, walking distance to Giant supermarket. |
| Status      | Verified                                   |

**Rooms — Property 2**

| Label          | Type         | Bathroom | Rent (RM) | Furnish | Gender | Utilities         | Available |
|----------------|--------------|----------|-----------|---------|--------|-------------------|-----------|
| Master Suite   | MASTER       | ATTACHED | 950       | FULLY   | ANY    | WiFi, Water, Elec | No (T3 occupying — PENDING) |
| Middle Bedroom | MEDIUM       | SHARED   | 700       | PARTIALLY | ANY  | WiFi only         | Yes       |

---

### Property 3 — Ahmad Razif (Admin Rejected)

| Field       | Value                                        |
|-------------|----------------------------------------------|
| Address     | 22, Jalan Duta Kiara, Mont Kiara             |
| City        | Kuala Lumpur                                 |
| State       | Wilayah Persekutuan                          |
| Postcode    | 50480                                        |
| Type        | CONDO                                        |
| Description | Condo unit.                                  |
| Status      | Rejected by Admin                            |

> Admin rejected this property because the description is too brief and no photos were uploaded. L1 must update the listing and resubmit. This property is used only to test the admin property-rejection flow — no tenancies are linked to it.

> **Note on L2 (Siti Nurhaliza):** L2's KYC was rejected in Scenario 2. Because L2 is unverified, the "Add Property" button is disabled on L2's dashboard. L2 cannot create any property until admin approves L2's KYC. This is tested in Scenario 2, Step 10 — no separate property data exists for L2.

---

## 3. Test Tenancies

### Tenancy A — ACTIVE (Full lifecycle, T1 in P1 Master Room)

| Field            | Value                         |
|------------------|-------------------------------|
| Tenant           | Lim Wei Jian (T1)             |
| Landlord         | Ahmad Razif (L1)              |
| Property / Room  | Property 1 / Master Room      |
| Start Date       | 2026-01-01                    |
| End Date         | 2026-12-31                    |
| Monthly Rent     | RM 1,200                      |
| Deposit Amount   | RM 2,400 (2 months)           |
| Status           | ACTIVE                        |
| Deposit Status   | PAID                          |
| Agreement Status | SIGNED                        |

**Co-Tenants (Tenancy A)**

| Name           | IC Number      | Phone       |
|----------------|----------------|-------------|
| Chua Wei Hong  | 960412-10-5555 | 013-7778888 |

**Rent Payments (Tenancy A — 12 months)**

| # | Due Date   | Amount (RM) | Status       | Notes                          |
|---|------------|-------------|--------------|--------------------------------|
| 1 | 2026-01-05 | 1,200       | PAID         | Proof approved                 |
| 2 | 2026-02-05 | 1,200       | PAID         | Proof approved                 |
| 3 | 2026-03-05 | 1,200       | PAID         | Proof approved                 |
| 4 | 2026-04-05 | 1,200       | PAID         | Proof approved                 |
| 5 | 2026-05-05 | 1,200       | UNDER_REVIEW | T1 uploaded proof, awaiting landlord |
| 6 | 2026-06-05 | 1,200       | PENDING      | Not yet due                    |
| 7 | 2026-07-05 | 1,200       | PENDING      | Not yet due                    |
| 8 | 2026-08-05 | 1,200       | PENDING      | Not yet due                    |
| 9 | 2026-09-05 | 1,200       | PENDING      | Not yet due                    |
|10 | 2026-10-05 | 1,200       | PENDING      | Not yet due                    |
|11 | 2026-11-05 | 1,200       | PENDING      | Not yet due                    |
|12 | 2026-12-05 | 1,200       | PENDING      | Not yet due                    |

**Agreement (Tenancy A)**

| Field          | Value                                                    |
|----------------|----------------------------------------------------------|
| Status         | SIGNED                                                   |
| contentHash    | `sha256:abc123...` (generated on signing)                |
| signedAt       | 2025-12-28T10:00:00Z                                     |
| signedByIp     | `127.0.0.1`                                              |
| txHash         | `0xabc...def` (Sepolia testnet tx)                       |

**Condition Reports (Tenancy A)**

| Type       | Date       | Photos | Acknowledged |
|------------|------------|--------|--------------|
| MOVE_IN    | 2026-01-01 | 6      | Yes          |
| INSPECTION | 2026-03-15 | 4      | Yes          |

---

### Tenancy B — ACTIVE with Overdue Payments (T2 in P1 Medium Room)

| Field            | Value                         |
|------------------|-------------------------------|
| Tenant           | Nurul Ain Binti (T2)          |
| Landlord         | Ahmad Razif (L1)              |
| Property / Room  | Property 1 / Medium Room      |
| Start Date       | 2026-02-01                    |
| End Date         | 2027-01-31                    |
| Monthly Rent     | RM 800                        |
| Deposit Amount   | RM 1,600 (2 months)           |
| Status           | ACTIVE                        |
| Deposit Status   | PAID                          |
| Agreement Status | SIGNED                        |

**Rent Payments (Tenancy B — selected)**

| # | Due Date   | Amount (RM) | Status  | Notes                                           |
|---|------------|-------------|---------|-------------------------------------------------|
| 1 | 2026-02-05 | 800         | PAID    | Proof approved                                  |
| 2 | 2026-03-05 | 800         | PAID    | Proof approved                                  |
| 3 | 2026-04-05 | 800         | PENDING | **Overdue** (dueDate < today, status = PENDING) |
| 4 | 2026-05-05 | 800         | PENDING | **Overdue** (dueDate < today, status = PENDING) |
| 5 | 2026-06-05 | 800         | PENDING | Not yet due                                     |

> Overdue is computed dynamically: `dueDate < now() && status === PENDING`. No DB enum change needed.

---

### Tenancy C — PENDING (T3 in P2 Master Suite, awaiting agreement)

| Field            | Value                             |
|------------------|-----------------------------------|
| Tenant           | Rajesh Kumar (T3)                 |
| Landlord         | Ahmad Razif (L1)                  |
| Property / Room  | Property 2 / Master Suite         |
| Start Date       | 2026-06-01                        |
| End Date         | 2027-05-31                        |
| Monthly Rent     | RM 950                            |
| Deposit Amount   | RM 1,900 (2 months)               |
| Status           | PENDING (T3 accepted invitation)  |
| Deposit Status   | PENDING                           |
| Agreement Status | FINALIZED (awaiting T3 signature) |

> Landlord ran the wizard and generated + finalized the agreement. T3 must review and sign or request changes.

---

### Tenancy D — INVITED (not yet responded)

| Field            | Value                             |
|------------------|-----------------------------------|
| Tenant           | Nurul Ain Binti (T2)              |
| Landlord         | Ahmad Razif (L1)                  |
| Property / Room  | Property 2 / Middle Bedroom       |
| Start Date       | 2026-07-01                        |
| End Date         | 2027-06-30                        |
| Monthly Rent     | RM 700                            |
| Deposit Amount   | RM 1,400                          |
| Status           | INVITED                           |

> T2 has not yet accepted or declined. Used to test invitation accept/decline flows.

---

### Tenancy E — EXPIRED with Deposit Settlement

| Field            | Value                   |
|------------------|-------------------------|
| Tenant           | Lim Wei Jian (T1)       |
| Landlord         | Ahmad Razif (L1)        |
| Property / Room  | Property 1 / Small Room |
| Start Date       | 2025-01-01              |
| End Date         | 2025-12-31              |
| Monthly Rent     | RM 600                  |
| Deposit Amount   | RM 1,200                |
| Status           | EXPIRED                 |
| Agreement Status | SIGNED                  |

**Deposit Refund (Tenancy E)**

| Field          | Value     |
|----------------|-----------|
| originalAmount | RM 1,200  |
| refundAmount   | RM 850    |
| Status         | IN_REVIEW |

**Deductions**

| Reason              | Amount (RM) | Status   | Tenant Note                                             |
|---------------------|-------------|----------|---------------------------------------------------------|
| Broken window latch | 150         | ACCEPTED | (None)                                                  |
| Stained bedroom wall| 100         | DISPUTED | "Was already stained before move-in per condition report"|
| Missing room key    | 50          | ACCEPTED | (None)                                                  |
| Deep cleaning fee   | 50          | PROPOSED | (Pending T1 response)                                   |

---

### Tenancy F — TERMINATED (early)

| Field            | Value                       |
|------------------|-----------------------------|
| Tenant           | Rajesh Kumar (T3)           |
| Landlord         | Ahmad Razif (L1)            |
| Property / Room  | Property 1 / Small Room     |
| Start Date       | 2025-06-01                  |
| End Date         | 2025-11-30                  |
| Monthly Rent     | RM 600                      |
| terminatedAt     | 2025-09-15                  |
| terminatedReason | Tenant relocated for work   |
| Status           | TERMINATED                  |
| Agreement Status | SIGNED                      |

---

## 4. End-to-End Test Scenarios

Run these in order — each scenario builds on the previous state.

---

### Scenario 1 — New User Registration

**Goal**: Verify LANDLORD and TENANT registration with IC upload.

| Step | Action                                                      | Expected Result                             |
|------|-------------------------------------------------------------|---------------------------------------------|
| 1    | Go to `/register`                                           | Registration form loads                     |
| 2    | Select role = LANDLORD                                      | IC Number field appears                     |
| 3    | Fill: Name=Ahmad Razif, Email=`landlord1@rentalease.my`, Password=`Land@12345`, IC=`850101-14-5001`, Phone=`012-3456789` | Fields validate |
| 4    | Upload a JPG as IC photo                                    | Preview appears                             |
| 5    | Submit                                                      | Redirect to `/login` with success message   |
| 6    | Repeat for L2: role=LANDLORD, `landlord2@rentalease.my`, IC=`900215-10-6002` | Same success |
| 7    | Register T1: role=TENANT, `tenant1@rentalease.my`, IC=`950322-07-3001` | Success |
| 8    | Register T2: `tenant2@rentalease.my`, IC=`991108-12-4002`  | Success                                     |
| 9    | Register T3: `tenant3@rentalease.my`, IC=`880630-08-7003`  | Success                                     |
| 10   | Login as L1                                                 | Redirects to `/dashboard/landlord`          |
| 11   | Login as T1                                                 | Redirects to `/dashboard/tenant`            |
| 12   | Login as admin                                              | Redirects to `/dashboard/admin`             |
| 13   | Attempt T1 account to access `/dashboard/landlord`          | Redirected back to `/dashboard/tenant`      |

---

### Scenario 2 — Admin KYC Verification

**Goal**: Admin reviews and approves/rejects identity documents.

| Step | Action                                                              | Expected Result                                        |
|------|---------------------------------------------------------------------|--------------------------------------------------------|
| 1    | Login as `admin@rentalease.my`                                     | `/dashboard/admin` loads with stats                    |
| 2    | Admin dashboard shows Pending KYC count ≥ 2                        | Stats visible                                          |
| 3    | Click "KYC Verification" → `/dashboard/admin/verify`               | User list with IC thumbnails                           |
| 4    | Find L1 (Ahmad Razif) — view IC photo, confirm IC number visible   | Thumbnail and IC number shown                          |
| 5    | Click "Approve" for L1                                              | L1.isVerified=true; L1 removed from queue              |
| 6    | Find L2 (Siti Nurhaliza) — click "Reject"                          | Input for rejection reason appears                     |
| 7    | Enter: "IC photo is blurry. Please re-upload a clearer copy."      | Submitted                                              |
| 8    | L2 removed from queue; L2.kycRejectedReason saved                  | Confirmed in DB                                        |
| 9    | Login as L2 (`landlord2@rentalease.my`)                            | Dashboard shows "KYC Rejected" banner with reason text |
| 10   | L2 attempts to add property                                         | Button disabled — "Verification required" message      |

---

### Scenario 3 — Property Creation & Admin Verification

**Goal**: Verified landlord creates properties; admin verifies them.

| Step | Action                                                                    | Expected Result                                                    |
|------|---------------------------------------------------------------------------|--------------------------------------------------------------------|
| 1    | Login as L1, go to Properties → "Add Property"                           | Form loads                                                         |
| 2    | Enter Property 1 details (see Section 2), submit                         | Status = Pending Verification shown on property card               |
| 3    | Login as Admin → `/dashboard/admin/properties`                           | Property 1 in queue; L1 shown as "Verified"                       |
| 4    | Approve Property 1                                                        | Property.isVerified=true                                           |
| 5    | L1 creates Property 2 (terrace) — admin approves                         | Both properties verified in L1's list                              |
| 6    | L1 creates Property 3 (Mont Kiara condo) with only "Condo unit." as description and no photos | Property created; status = Pending Verification   |
| 7    | Admin views Property 3 — L1 shown as "Verified" but listing is incomplete | Warning / thin content visible to admin                           |
| 8    | Admin rejects Property 3: "Description is too brief and no photos uploaded. Please add more details and at least one photo." | Property.rejectedReason saved |
| 9    | L1 logs in — rejection reason shown on Property 3 card                   | Visible; L1 can edit and resubmit                                  |
| 10   | *(L2 is already blocked from adding properties — KYC rejected in Scenario 2 Step 10. No property data exists for L2.)* | Confirmed |

---

### Scenario 4 — Room Setup

**Goal**: Landlord adds rooms to properties. Rooms can be added before or after admin approval — this is by design so the landlord can prepare the full listing while admin reviews. Tenant invitations are blocked separately until the property is verified.

| Step | Action                                                         | Expected Result                              |
|------|----------------------------------------------------------------|----------------------------------------------|
| 1    | L1 → Property 1 detail page (still Pending Verification at this point) | "Add Room" button available — adding rooms does not require admin approval |
| 2    | Add Master Room: type=MASTER, bathroom=ATTACHED, rent=1200, furnish=FULLY, gender=ANY, utilities=WiFi+Water+Elec | Room created successfully |
| 3    | Add Medium Room: type=MEDIUM, bathroom=SHARED, rent=800, furnish=PARTIALLY, gender=FEMALE_ONLY, utilities=WiFi | Room created |
| 4    | Add Small Room: type=SMALL, bathroom=SHARED, rent=600, furnish=UNFURNISHED, gender=MALE_ONLY | Room created |
| 5    | Property 1 card now shows "0/3 Occupied"                      | Occupancy pill updated                       |
| 6    | L1 attempts to invite a tenant to Master Room (property still pending) | **Blocked** — "Property not yet verified" error (checked in `POST /api/tenancies`) |
| 7    | Add Master Suite + Middle Bedroom to Property 2 (also before approval) | Rooms listed on Property 2 detail |
| 8    | Upload 2 photos to Property 1                                 | Cloudinary upload; thumbnails visible        |
| 9    | Admin approves Properties 1 and 2 (Scenario 3 steps 3–5)     | L1 can now invite tenants to rooms in both properties |

---

### Scenario 5 — Tenancy Invitation & Acceptance

**Goal**: Landlord invites tenant; tenant accepts.

| Step | Action                                                       | Expected Result                                        |
|------|--------------------------------------------------------------|--------------------------------------------------------|
| 1    | L1 → `/dashboard/landlord/tenancies/new`                    | Invitation form loads                                  |
| 2    | Select Property 1, Master Room                               | Rent auto-filled as RM 1,200                           |
| 3    | Lookup tenant: `tenant1@rentalease.my`                       | T1 (Lim Wei Jian) found and selected                   |
| 4    | Set: Start=2026-01-01, End=2026-12-31, Rent=1200, Deposit=2400 | Fields populated                                  |
| 5    | Submit                                                       | Tenancy created (INVITED); email sent to T1            |
| 6    | Tenancy appears in L1's list with "INVITED" pill             | Correct                                                |
| 7    | Login as T1 → Dashboard                                      | "1 Pending Invitation" shown                           |
| 8    | Go to `/dashboard/tenant/tenancy`                            | Invitation card for Property 1 / Master Room           |
| 9    | Click "Accept"                                               | Status → PENDING; L1 notified                          |
| 10   | Property 1 Master Room now shows as occupied                 | Room.isAvailable=false                                 |

---

### Scenario 5b — Invitation Decline

| Step | Action                                               | Expected Result                              |
|------|------------------------------------------------------|----------------------------------------------|
| 1    | L1 creates Tenancy D (invite T2 to P2 Middle Bedroom) | Status = INVITED                            |
| 2    | Login as T2, go to tenancy page                      | Invitation D visible                         |
| 3    | Click "Decline"                                      | Status → TERMINATED; room stays available    |
| 4    | Notification sent to L1                              | "Nurul Ain declined your invitation"         |

---

### Scenario 6 — Tenant Document Upload (PDPA)

**Goal**: Tenant uploads IC and income proof; landlord access is scoped to active tenancy only.

| Step | Action                                                   | Expected Result                                           |
|------|----------------------------------------------------------|-----------------------------------------------------------|
| 1    | Login as T1 → `/dashboard/profile`                      | Identity Documents section visible                        |
| 2    | Upload IC Copy (JPG/PNG)                                 | IC_COPY saved; upload date shown                          |
| 3    | Upload Income Proof (bank statement image)               | INCOME_PROOF saved                                        |
| 4    | Login as L1 → Tenancy A detail page                     | "Tenant Documents" section shows T1's IC and income proof |
| 5    | Login as L1 → Tenancy F (TERMINATED) detail             | Tenant Documents section hidden (PDPA: tenancy not active)|

---

### Scenario 7 — Agreement Wizard & AI Generation

**Goal**: Landlord completes 6-step wizard; Gemini generates agreement.

| Step | Action                                                              | Expected Result                                       |
|------|---------------------------------------------------------------------|-------------------------------------------------------|
| 1    | L1 opens Tenancy A (PENDING) → click "Start Agreement Wizard"      | 6-step wizard loads with progress tracker             |
| 2    | **Step 1 — House Rules**                                            |                                                       |
|      | Pets: No / Smoking: Not allowed / Guests: max 2, 11pm curfew / Quiet hours: 11pm–7am | Saved |
| 3    | **Step 2 — Utilities & Services**                                   |                                                       |
|      | Payment: Bank transfer / Internet: Included / AC: Landlord / Pest control: Landlord annually | Saved |
| 4    | **Step 3 — Financial Terms**                                        |                                                       |
|      | Due day: 5th / Grace: 5 days / Late fee: RM 50 flat / Methods: Bank transfer + e-wallet / Increase: 5% with 60-day notice | Saved |
| 5    | **Step 4 — Maintenance**                                            |                                                       |
|      | Tenant threshold: RM 100 / Structural: Landlord / Appliances: Landlord / Urgent response: 24hr | Saved |
| 6    | **Step 5 — Tenancy Ending**                                         |                                                       |
|      | Notice: 60 days / Early termination penalty: 2 months rent / Reinstatement: Move-in condition / Subletting: Not allowed | Saved |
| 7    | **Step 6 — Deposit Handling**                                       |                                                       |
|      | Refund: 14 days after move-out / Deductions: Damages, cleaning, unpaid rent / Dispute: Negotiation then mediation | Saved |
| 8    | Close wizard partway through — reopen                               | Previous answers pre-filled (partial save works)      |
| 9    | Return to tenancy detail → click "Generate Agreement"               | Loading state; Gemini API called                      |
| 10   | Agreement generated                                                 | rawContent, plainLanguageSummary, redFlags all shown  |
| 11   | At least 1 red flag with severity (HIGH/MEDIUM/LOW) appears         | Severity colour coding correct                        |
| 12   | Toggle to BM                                                        | plainLanguageSummaryMs + redFlagsMs displayed         |
| 13   | Click "Finalize & Send to Tenant"                                   | Agreement status → FINALIZED; T1 notified by email    |

---

### Scenario 8 — Tenant Agreement Review & Signing

**Goal**: Tenant reviews AI-generated agreement and signs with blockchain anchoring.

| Step | Action                                                         | Expected Result                                         |
|------|----------------------------------------------------------------|---------------------------------------------------------|
| 1    | Login as T1 → `/dashboard/tenant/tenancy`                     | "Agreement Ready for Review" banner                     |
| 2    | Click "Review Agreement"                                       | Raw agreement text + plain language summary             |
| 3    | Toggle language to BM                                          | BM summary + BM red flags shown                         |
| 4    | Review red flags — all severities visible                      | HIGH=red, MEDIUM=amber, LOW=green pills                 |
| 5    | Click "Sign Agreement"                                         | Confirmation modal: "I confirm I have read and agree"   |
| 6    | Confirm                                                        | `PATCH /api/agreements/[id]/respond` with action=sign   |
| 7    | Agreement status → SIGNED                                      | contentHash, signedAt, signedByIp, txHash all populated |
| 8    | Tenancy status → ACTIVE                                        | 12 RentPayment records auto-generated (Jan–Dec 2026)    |
| 9    | Blockchain audit section shows Etherscan link                  | `https://sepolia.etherscan.io/tx/{txHash}` clickable    |

---

### Scenario 8b — Tenant Requests Negotiation

**Goal**: Test the negotiation round-trip (Tenancy C with T3).

| Step | Action                                                             | Expected Result                                     |
|------|---------------------------------------------------------------------|-----------------------------------------------------|
| 1    | Login as T3 → Tenancy C page                                       | Agreement status = FINALIZED                        |
| 2    | Click "Request Changes"                                            | Negotiation notes text box appears                  |
| 3    | Enter: "Clause 7 on late fees — RM 50 is too high. Can we reduce to RM 30?" | Submit                               |
| 4    | Agreement status → NEGOTIATING                                     | L1 notified: "Rajesh Kumar requested changes"       |
| 5    | Login as L1 → Tenancy C agreement                                  | T3's negotiation note visible                       |
| 6    | L1 updates wizard Step 3: late fee → RM 30                        | Wizard updated                                      |
| 7    | Click "Regenerate Agreement"                                       | New Gemini call with updated preferences            |
| 8    | Click "Re-finalize & Send"                                         | Agreement → FINALIZED (round 2); T3 notified        |
| 9    | T3 reviews round 2 agreement — sees RM 30 late fee                | Updated content confirmed                           |
| 10   | T3 clicks "Sign"                                                   | Agreement → SIGNED; Tenancy C → ACTIVE              |

---

### Scenario 9 — Deposit Payment Upload & Verification

**Goal**: Tenant uploads deposit proof; landlord approves and rejects.

| Step | Action                                                   | Expected Result                                        |
|------|----------------------------------------------------------|--------------------------------------------------------|
| 1    | Login as T1 → `/dashboard/tenant/payments`              | Security Deposit card: status = PENDING                |
| 2    | Click "Upload Deposit Proof"                             | File picker appears                                    |
| 3    | Upload bank transfer screenshot (JPG)                   | Proof saved; status → UNDER_REVIEW                     |
| 4    | Login as L1 → `/dashboard/landlord/payments`            | Security Deposits section: T1 shows "Under Review"     |
| 5    | Click proof thumbnail — image visible                   | Image enlarges for review                              |
| 6    | Click "Confirm Deposit Received"                        | depositStatus → PAID; T1 notified                      |
| 7    | Login as T2, upload deposit proof                       | Status → UNDER_REVIEW                                  |
| 8    | L1 rejects T2's proof: "Amount shown (RM 800) does not match required deposit (RM 1,600)." | REJECTED; reason saved |
| 9    | T2 logs in — sees rejection reason + "Re-upload" button | Visible on payments page                               |
| 10   | T2 re-uploads correct proof; L1 approves               | depositStatus → PAID                                   |

---

### Scenario 10 — Rent Payment Upload & Verification

**Goal**: Tenant uploads rent proof; landlord approves/rejects; overdue detection works.

| Step | Action                                                   | Expected Result                                          |
|------|----------------------------------------------------------|----------------------------------------------------------|
| 1    | Login as T1 → `/dashboard/tenant/payments`              | Jan–Apr=PAID, May=PENDING/UNDER_REVIEW                   |
| 2    | Click "Upload Proof" for May 2026 payment               | File picker                                              |
| 3    | Upload bank transfer screenshot                         | Status → UNDER_REVIEW                                    |
| 4    | Login as L1 → `/dashboard/landlord/payments`            | "Awaiting Review" section: T1 May payment appears        |
| 5    | Click "Approve"                                         | Status → PAID; T1 notified; removed from Awaiting Review |
| 6    | L1 rejects a different proof: "Wrong account number transferred" | Status remains PENDING; rejection reason stored; T1 notified |
| 7    | T1 re-uploads corrected proof; L1 approves              | Status → PAID                                            |
| 8    | Check T2's payments: Apr and May 2026 show "OVERDUE" pill | Confirmed (dueDate < today && status=PENDING)           |

---

### Scenario 11 — Property Condition Reports

**Goal**: Landlord creates reports with photos; tenant acknowledges.

| Step | Action                                                         | Expected Result                                      |
|------|----------------------------------------------------------------|------------------------------------------------------|
| 1    | L1 → Tenancy A detail → "Create Condition Report"             | Type selector: MOVE_IN / MOVE_OUT / INSPECTION       |
| 2    | Select MOVE_IN, notes: "Property in excellent condition. All appliances working." | Report created |
| 3    | Upload 6 photos grouped by room:                               |                                                      |
|      | Kitchen: "Clean stovetop"                                      |                                                      |
|      | Bedroom: "New mattress", "Clean wardrobe"                      |                                                      |
|      | Bathroom: "No damage", "New showerhead"                        |                                                      |
|      | Living Room: "No scratches on floor"                           | All photos saved with captions                       |
| 4    | Login as T1 → `/dashboard/tenant/conditions`                  | MOVE_IN report visible with 6 photos                 |
| 5    | T1 clicks "Acknowledge Report"                                 | acknowledgedAt saved; acknowledgedById=T1.id         |
| 6    | L1 creates INSPECTION report for 2026-03-15 with 4 photos     | Report appears in both L1 and T1 views               |

---

### Scenario 12 — In-App Messaging

**Goal**: Landlord and tenant exchange messages; unread badge works.

| Step | Action                                                      | Expected Result                                    |
|------|-------------------------------------------------------------|----------------------------------------------------|
| 1    | Login as L1 → `/dashboard/landlord/messages`               | Tenancy A thread listed                            |
| 2    | Send: "Hi Lim, annual AC service is scheduled for 15 May." | Message appears in thread                          |
| 3    | Login as T1 → `/dashboard/tenant/messages`                 | Message from L1 visible; unread badge on nav       |
| 4    | T1 replies: "Noted, thank you! I'll be home that day."     | Message sent                                       |
| 5    | Login as L1 — unread badge shows 1                         | T1's reply shown; badge clears on thread open      |

---

### Scenario 13 — Co-Tenant Management

**Goal**: Landlord adds and removes additional occupants.

| Step | Action                                                           | Expected Result                                   |
|------|------------------------------------------------------------------|---------------------------------------------------|
| 1    | L1 → Tenancy A detail → Co-Tenants section                      | Section visible (ACTIVE tenancy)                  |
| 2    | Click "Add Co-Tenant"                                            | Form: Name, IC Number, Phone                      |
| 3    | Add: Chua Wei Hong, IC=`960412-10-5555`, Phone=`013-7778888`    | Listed                                            |
| 4    | Add: Priya Devi, IC=`970808-14-6666`, Phone=`014-9990000`       | Both listed                                       |
| 5    | Remove Priya Devi                                                | Deleted; only Chua Wei Hong remains               |
| 6    | Open Tenancy E (EXPIRED) detail                                  | Co-Tenant section read-only (no add/remove buttons)|

---

### Scenario 14 — Deposit Settlement (Post-Tenancy)

**Goal**: After Tenancy E expires, landlord proposes deductions; tenant disputes and accepts.

| Step | Action                                                                | Expected Result                                     |
|------|-----------------------------------------------------------------------|-----------------------------------------------------|
| 1    | Tenancy E is EXPIRED                                                  | End-of-tenancy banner in L1's view                  |
| 2    | L1 → `/dashboard/landlord/tenancies/{E_id}/deposit-settlement`       | Original deposit = RM 1,200 shown                   |
| 3    | Add 4 deductions (see Section 3, Tenancy E deductions table)         | Total deductions = RM 350; refund = RM 850          |
| 4    | Submit → DepositRefund status = PROPOSED                              | T1 notified of settlement proposal                  |
| 5    | Login as T1 → Tenancy E → deposit settlement section                 | 4 deductions listed                                 |
| 6    | T1 accepts Deductions 1 and 3 (window latch + missing key)           | Status → ACCEPTED                                   |
| 7    | T1 disputes Deduction 2: "Was already stained before move-in per move-in condition report photo" | Status → DISPUTED; note saved |
| 8    | Deduction 4 left without response                                     | Status = PROPOSED                                   |
| 9    | L1 reviews disputes — sees T1's note with condition report reference  | Note displayed                                      |
| 10   | L1 withdraws Deduction 2 (accepts T1's argument)                     | Status → WITHDRAWN; refund amount = RM 950          |
| 11   | All deductions resolved → DepositRefund status = AGREED              | Refund = RM 950 confirmed                           |
| 12   | L1 marks as paid + uploads bank transfer proof                       | DepositRefund.status=PAID; paidAt set               |

---

### Scenario 15 — Early Tenancy Termination

**Goal**: Landlord terminates an active tenancy before end date.

| Step | Action                                                     | Expected Result                                         |
|------|------------------------------------------------------------|---------------------------------------------------------|
| 1    | L1 → Tenancy B detail                                     | "Terminate Tenancy" button visible                      |
| 2    | Click → confirm page at `/dashboard/landlord/tenancies/{B_id}/terminate` | Confirmation form |
| 3    | Enter reason: "Tenant violated no-pets policy."           | Reason field filled                                     |
| 4    | Confirm termination                                       | Status=TERMINATED; terminatedAt=today; terminatedReason saved |
| 5    | Medium Room (P1) → isAvailable=true                       | Room appears as available in property detail            |
| 6    | T2 notified via email + in-app                            | Notification visible in T2's notification centre        |

---

### Scenario 16 — Tenancy Renewal

**Goal**: Landlord creates a new cycle renewing an expiring tenancy.

| Step | Action                                                          | Expected Result                                       |
|------|-----------------------------------------------------------------|-------------------------------------------------------|
| 1    | L1 → Tenancy A (30 days before 2026-12-31)                     | "End of tenancy approaching" banner shown             |
| 2    | Click "Renew Tenancy" → `/dashboard/landlord/tenancies/{A_id}/renew` | Renewal form with pre-filled values             |
| 3    | New terms: Start=2027-01-01, End=2027-12-31, Rent=1260 (5% up) | Form filled                                           |
| 4    | Submit                                                          | New tenancy (INVITED); renewalOfTenancyId → Tenancy A |
| 5    | T1 receives invitation email                                    | Invitation visible in T1's dashboard                  |
| 6    | T1 accepts renewal                                              | Status → PENDING; wizard + agreement flow restarts    |

---

### Scenario 17 — Tenant Withdrawal

**Goal**: Tenant withdraws from a PENDING tenancy before agreement signing.

| Step | Action                                                     | Expected Result                                    |
|------|------------------------------------------------------------|----------------------------------------------------|
| 1    | Tenancy A or C in PENDING state                           | "Withdraw" option visible on tenancy page          |
| 2    | T1/T3 clicks "Withdraw from Tenancy"                      | Confirmation dialog                                |
| 3    | Confirm                                                   | Status → TERMINATED; L1 notified; room → available |

---

### Scenario 18 — Password Reset Flow

**Goal**: Full forgot password and reset token lifecycle.

| Step | Action                                                       | Expected Result                                       |
|------|--------------------------------------------------------------|-------------------------------------------------------|
| 1    | Go to `/forgot-password`                                    | Email input form                                      |
| 2    | Enter `tenant1@rentalease.my`                               | "Reset link sent to your email" message               |
| 3    | PasswordResetToken created in DB                             | token set; expiresAt = +1hr                           |
| 4    | Access `/reset-password?token={token}`                      | New password form                                     |
| 5    | Enter `NewTen@99999`                                        | Password updated; token.usedAt set; redirect to login |
| 6    | Login with new password                                     | Success                                               |
| 7    | Attempt reuse of same token                                 | "Token already used" error                            |

---

### Scenario 19 — Language Toggle (i18n EN/BM)

**Goal**: Verify English and Bahasa Malaysia toggle throughout the app.

| Step | Action                                                         | Expected Result                                     |
|------|----------------------------------------------------------------|-----------------------------------------------------|
| 1    | Login as T1 (language=en by default)                          | UI in English                                       |
| 2    | In profile, change language to Bahasa Malaysia                 | UI re-renders in BM                                 |
| 3    | Go to signed agreement view                                    | plainLanguageSummaryMs shown; redFlagsMs displayed  |
| 4    | Clause, issue, and recommendation all in formal BM            | Confirmed                                           |
| 5    | Switch back to English                                         | EN content restored                                 |

---

### Scenario 20 — Rate Limit on Agreement Generation

**Goal**: Confirm 5-per-hour rate limit for AI generation.

| Step | Action                                           | Expected Result                                    |
|------|--------------------------------------------------|----------------------------------------------------|
| 1–5  | L1 generates agreement for Tenancy A 5 times    | All succeed                                        |
| 6    | 6th generation attempt in same hour             | 429 response; "Rate limit exceeded" shown in UI    |

---

### Scenario 21 — Cron Job: Auto-Expire Tenancies

**Goal**: Verify tenancies past end date are auto-expired.

| Step | Action                                                                 | Expected Result                               |
|------|------------------------------------------------------------------------|-----------------------------------------------|
| 1    | Confirm Tenancy E endDate=2025-12-31 (past today)                     | Should already be EXPIRED                     |
| 2    | Trigger cron: `GET /api/cron/expire-tenancies` with cron-secret header | Returns list of newly expired tenancy IDs     |
| 3    | Any tenancy with endDate < today and status=ACTIVE                     | All moved to EXPIRED                          |
| 4    | Rooms of expired tenancies                                             | isAvailable=true on those rooms               |

---

### Scenario 22 — Blockchain Audit Trail

**Goal**: Verify agreement hash is written to Sepolia and is verifiable.

| Step | Action                                                     | Expected Result                                          |
|------|------------------------------------------------------------|----------------------------------------------------------|
| 1    | T1 signs Tenancy A agreement (Scenario 8)                 | txHash returned from Sepolia RPC                         |
| 2    | L1 opens Tenancy A agreement view                         | txHash, contentHash, signedAt, signedByIp all displayed  |
| 3    | Click Etherscan link                                       | Opens `https://sepolia.etherscan.io/tx/{txHash}`         |
| 4    | Transaction input data on Etherscan shows `RentalEase:sha256:<hex>` | Verified on-chain                               |

---

### Scenario 23 — PDF Export

**Goal**: Download signed agreement as PDF.

| Step | Action                                               | Expected Result                                      |
|------|------------------------------------------------------|------------------------------------------------------|
| 1    | L1 → Tenancy A agreement (SIGNED) — "Download PDF"  | `GET /api/agreements/{id}/pdf` called                |
| 2    | PDF downloads                                        | Contains full agreement text, signatures section, blockchain hash, timestamp |

---

### Scenario 24 — AI Clause Assist

**Goal**: Landlord uses AI assist for clause suggestions during negotiation.

| Step | Action                                                     | Expected Result                                          |
|------|------------------------------------------------------------|----------------------------------------------------------|
| 1    | L1 → Tenancy C agreement (NEGOTIATING) — click "AI Assist" | Text field for improvement prompt                       |
| 2    | Enter: "Suggest a fairer late payment clause balancing tenant flexibility and landlord cash flow" | Submit |
| 3    | `POST /api/agreements/{id}/assist` called                  | Gemini returns revised clause with explanation           |
| 4    | Landlord copies suggestion into manual edit field          | Editable within agreement view                           |

---

### Scenario 25 — Notification Centre

**Goal**: All major notification types are generated and visible.

| Trigger                          | Recipient | Expected Message                                         |
|----------------------------------|-----------|----------------------------------------------------------|
| L1 creates invitation            | T1        | "You have a new rental invitation from Ahmad Razif"      |
| T1 accepts invitation            | L1        | "Lim Wei Jian accepted your invitation"                  |
| L1 finalizes agreement           | T1        | "Your tenancy agreement is ready for review"             |
| T1 signs agreement               | L1        | "Lim Wei Jian has signed the tenancy agreement"          |
| T1 uploads deposit proof         | L1        | "Lim Wei Jian uploaded deposit payment proof"            |
| L1 approves deposit              | T1        | "Your deposit payment has been confirmed"                |
| T1 uploads rent proof            | L1        | "Lim Wei Jian uploaded payment proof for May 2026"       |
| L1 approves payment              | T1        | "Your payment for May 2026 has been approved"            |
| L1 rejects payment               | T1        | "Your payment proof was rejected: Wrong account number"  |
| T3 requests agreement changes    | L1        | "Rajesh Kumar requested changes to the agreement"        |
| L1 proposes deposit settlement   | T1        | "Your landlord proposed deposit settlement terms"        |
| T1 disputes a deduction          | L1        | "Lim Wei Jian disputed: Stained bedroom wall"            |
| L1 terminates tenancy            | T2        | "Your tenancy has been terminated"                       |

---

## 5. Quick-Reference Cheatsheet

### Login Credentials

| Role                    | Email                        | Password      |
|-------------------------|------------------------------|---------------|
| ADMIN                   | `admin@rentalease.my`       | `Admin@12345` |
| LANDLORD (verified)     | `landlord1@rentalease.my`   | `Land@12345`  |
| LANDLORD (unverified)   | `landlord2@rentalease.my`   | `Land@12345`  |
| TENANT (full docs)      | `tenant1@rentalease.my`     | `Ten@12345`   |
| TENANT (IC only)        | `tenant2@rentalease.my`     | `Ten@12345`   |
| TENANT (no docs)        | `tenant3@rentalease.my`     | `Ten@12345`   |

### Malaysian IC Format

```
YYMMDD-SS-####
850101-14-5001  — Ahmad Razif (L1)
900215-10-6002  — Siti Nurhaliza (L2)
950322-07-3001  — Lim Wei Jian (T1)
991108-12-4002  — Nurul Ain Binti (T2)
880630-08-7003  — Rajesh Kumar (T3)
960412-10-5555  — Chua Wei Hong (Co-tenant)
```

### Tenancy State Summary

| ID        | Tenant | Status     | Agreement | Deposit | Purpose                          |
|-----------|--------|------------|-----------|---------|----------------------------------|
| Tenancy A | T1     | ACTIVE     | SIGNED    | PAID    | Happy path; full lifecycle       |
| Tenancy B | T2     | ACTIVE     | SIGNED    | PAID    | Overdue payment test             |
| Tenancy C | T3     | PENDING    | FINALIZED | PENDING | Awaiting signature / negotiation |
| Tenancy D | T2     | INVITED    | (none)    | (none)  | Invitation accept/decline test   |
| Tenancy E | T1     | EXPIRED    | SIGNED    | PAID    | Deposit settlement workflow      |
| Tenancy F | T3     | TERMINATED | SIGNED    | (N/A)   | Early termination test           |

---

## 6. Feature Coverage Checklist

### Authentication
- [ ] Register as LANDLORD with IC upload
- [ ] Register as TENANT with IC upload
- [ ] Login redirects correctly per role (ADMIN/LANDLORD/TENANT)
- [ ] Cross-role route blocked (tenant cannot access landlord pages)
- [ ] Forgot password — email sent
- [ ] Reset password via token
- [ ] Token expiry and reuse prevention

### Admin
- [ ] KYC queue: IC thumbnails, user info, IC number displayed
- [ ] Approve KYC — landlord gains property creation access
- [ ] Reject KYC with reason — reason shown to landlord
- [ ] Property queue: shows landlord's KYC status per property
- [ ] Approve property — landlord can invite tenants
- [ ] Reject property with reason — reason shown to landlord

### Landlord — Property
- [ ] Cannot add property before KYC approved
- [ ] Add property (address, city, state, postcode, type, description)
- [ ] "Pending Verification" badge shown after creation
- [ ] Upload property photos (Cloudinary)
- [ ] Add rooms with all detail fields (type, bathroom, rent, furnishing, utilities, gender)
- [ ] Room availability updates on tenancy create/termination

### Landlord — Tenancy
- [ ] Create invitation: property/room select, tenant lookup, date/rent/deposit fields
- [ ] Invitation email delivered to tenant
- [ ] Edit tenancy terms (INVITED/PENDING only; locked after ACTIVE)
- [ ] Add co-tenants (name, IC, phone)
- [ ] Remove co-tenants
- [ ] Co-tenant section read-only on EXPIRED/TERMINATED
- [ ] View tenant documents (IC + income proof) during active tenancy only
- [ ] Renew tenancy (new cycle, renewalOfTenancyId linked)
- [ ] Early termination with reason

### Landlord — Agreement
- [ ] Complete 6-step wizard (all steps)
- [ ] Partial wizard save and resume
- [ ] Generate agreement (Gemini API)
- [ ] View rawContent, EN summary, BM summary, EN red flags, BM red flags
- [ ] Rate limit: 6th attempt within 1 hour is rejected (429)
- [ ] Finalize → agreement sent to tenant
- [ ] Regenerate after tenant negotiation request
- [ ] AI Assist clause suggestions
- [ ] Download agreement as PDF

### Landlord — Payments & Deposits
- [ ] Approve deposit proof
- [ ] Reject deposit proof with reason
- [ ] Approve rent payment proof
- [ ] Reject rent payment proof with reason
- [ ] Payments hub: stats (total rent, under review, overdue, paid)
- [ ] Propose deposit deductions (multiple items)
- [ ] Withdraw disputed deduction
- [ ] Mark deposit refund as paid + upload proof

### Landlord — Condition Reports
- [ ] Create MOVE_IN report with notes
- [ ] Upload photos grouped by room with captions
- [ ] Create INSPECTION report
- [ ] Create MOVE_OUT report

### Tenant — Invitation & Tenancy
- [ ] View pending invitations on dashboard
- [ ] Accept invitation (status → PENDING)
- [ ] Decline invitation (status → TERMINATED)
- [ ] Withdraw from PENDING tenancy
- [ ] View tenancy details: room, property, landlord info, status

### Tenant — Agreement
- [ ] View agreement plain language summary (EN)
- [ ] Toggle to BM summary
- [ ] View red flags with severity colour coding
- [ ] Sign agreement — blockchain anchoring (contentHash, signedAt, IP, txHash)
- [ ] Request changes with negotiation notes
- [ ] Review regenerated agreement (round 2)

### Tenant — Payments
- [ ] View full rent payment schedule with all statuses
- [ ] Overdue pills appear dynamically (dueDate < today && status=PENDING)
- [ ] Upload rent payment proof
- [ ] View rejection reason for rejected proof
- [ ] Re-upload after rejection
- [ ] Upload deposit proof
- [ ] Re-upload rejected deposit proof

### Tenant — Deposit Settlement
- [ ] View proposed deductions list
- [ ] Accept individual deduction
- [ ] Dispute individual deduction with note

### Tenant — Condition Reports
- [ ] View MOVE_IN report with photos grouped by room
- [ ] Acknowledge report

### Messaging
- [ ] Landlord sends message
- [ ] Tenant receives message; unread badge on nav
- [ ] Tenant replies
- [ ] Read status clears on thread open

### Profile
- [ ] Update name and phone (email is read-only)
- [ ] Upload IC_COPY document
- [ ] Upload INCOME_PROOF document
- [ ] Re-upload replaces previous document
- [ ] Verification status badge shown correctly
- [ ] Language preference toggle (EN ↔ BM)

### Notifications
- [ ] All 13 trigger types generate notifications (see Scenario 25)
- [ ] Unread badge on nav icon
- [ ] Notification clears/marks read on click

### System / Backend
- [ ] Cron: ACTIVE tenancies past endDate auto-moved to EXPIRED
- [ ] Rent schedule auto-generated on agreement signing (1 payment per month)
- [ ] Blockchain txHash written to Sepolia at signing
- [ ] Overdue status computed (not stored as DB enum)
- [ ] PDPA: tenant docs inaccessible after tenancy ends
- [ ] IC number format validation (YYMMDD-SS-####)
- [ ] Cloudinary upload/delete for all photo types

---

*Last updated: 2026-05-08*
