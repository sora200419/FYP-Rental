# Test Data

<<<<<<< ours
Prepared: 2026-05-13

This file is the main manual-testing reference for the current RentalEase build.
Use it when testing:
- admin bootstrap and verification
- landlord property and tenancy operations
- tenant invitation, agreement, payment, and condition flows
- dual-signature agreement activation
- renewal, termination, and deposit settlement
- corporate / employer tenancy workflow

## 1. Required `.env` values

Use real values for your existing app secrets, database, Cloudinary, Gemini, email, and blockchain config, then confirm these admin bootstrap values:
=======
Prepared: 2026-05-12

## 1. Required `.env` values

Use real values for the existing app secrets and database, then add or confirm these admin bootstrap values:
>>>>>>> theirs

```env
ADMIN_EMAIL=admin@rentalease.my
ADMIN_PASSWORD=Admin1234!
ADMIN_NAME=RentalEase Admin
NEXTAUTH_SECRET=replace-with-your-existing-secret
```

<<<<<<< ours
## 2. Admin bootstrap
=======
## 2. Bootstrap the admin account

Admin creation now comes only from `.env`.
>>>>>>> theirs

Primary behavior:
- start the app
- open any app page
<<<<<<< ours
- the server automatically creates or re-promotes the admin account if it is missing

Protected fallback:
=======
- the server will automatically create or re-promote the admin account if it is missing

Protected fallback:
- if you want to trigger the bootstrap manually, call the internal route once:
>>>>>>> theirs

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/internal/bootstrap-admin" `
  -Headers @{ "x-bootstrap-secret" = "<your NEXTAUTH_SECRET>" }
```

<<<<<<< ours
Expected manual route result if the admin did not exist:
=======
Expected manual route result:
>>>>>>> theirs

```json
{ "ok": true, "action": "created", "email": "admin@rentalease.my" }
```

<<<<<<< ours
Expected result if the email already exists as a normal user:
=======
If the email already exists as a normal user, expected result is:
>>>>>>> theirs

```json
{ "ok": true, "action": "promoted", "email": "admin@rentalease.my" }
```

<<<<<<< ours
## 3. Core manual-test accounts

If these accounts are not already present in your database, register them through the UI.
Use the same password for easier switching during manual testing.

### Shared password

```text
Test1234!
```

### Role matrix

| Role | Purpose | Name | Email | Password | Phone | IC Number |
| --- | --- | --- | --- | --- | --- | --- |
| Admin | Admin bootstrap and review | RentalEase Admin | `admin@rentalease.my` | `Admin1234!` | - | - |
| Landlord | Main landlord for most flows | Ahmad Razif bin Hassan | `landlord@test.my` | `Test1234!` | `011-2345678` | `850101-14-5678` |
| Landlord | Secondary landlord / access-control checks | Siti Nur Aisyah | `landlord2@test.my` | `Test1234!` | `011-9876543` | `870505-10-2233` |
| Tenant | Main individual tenancy tester | Lim Mei Ling | `tenant@test.my` | `Test1234!` | `012-3456789` | `900202-08-1234` |
| Tenant | Second individual tenant / alternate invite | Daniel Ong | `tenant2@test.my` | `Test1234!` | `012-7777888` | `910303-10-5678` |
| Tenant | Third tenant for linking occupant accounts | Nur Aina Binti Salleh | `tenant3@test.my` | `Test1234!` | `013-2222333` | `920404-06-8899` |
| Tenant | Corporate authorized signatory | Farid Rahman | `boss@test.my` | `Test1234!` | `014-1122334` | `840101-08-1111` |
| Tenant | Staff occupant account 1 | Worker A | `worker.a@test.my` | `Test1234!` | `016-1010101` | `950101-10-1234` |
| Tenant | Staff occupant account 2 | Worker B | `worker.b@test.my` | `Test1234!` | `016-2020202` | `960202-10-5678` |

## 4. Verification status setup

Before full-system testing, make sure these statuses are true:

### Landlord verification
- `landlord@test.my` should be verified so property creation and tenant invitation work
- `landlord2@test.my` can be left unverified first if you want to test admin approval flow

### Tenant verification
- `tenant@test.my` should be verified for the main agreement flow
- `tenant2@test.my` can be left unverified first if you want to test blocked invitation acceptance
- `boss@test.my` must be verified before accepting a corporate invitation
- `worker.a@test.my` and `worker.b@test.my` can be verified or unverified depending on whether you want to test linked-account behavior only

## 5. Property and room setup data

Create these properties and rooms under the main landlord account.

### Property A: Main apartment

| Field | Value |
| --- | --- |
| Address | 18 Jalan SS 15/4 |
| City | Subang Jaya |
| State | Selangor |
| Postcode | 47500 |
| Type | Apartment |
| Description | Tested main property for standard individual tenancy flow |

### Rooms under Property A

| Room Label | Room Type | Bathroom Type | Bathrooms | Furnishing | Rent | Max Occupants | WiFi | Water | Electric |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Master Room | MASTER | ATTACHED | 1 | FULLY_FURNISHED | 1500 | 2 | Yes | Yes | No |
| Room 2 | MEDIUM | SHARED | 1 | PARTIALLY_FURNISHED | 900 | 1 | Yes | No | No |

### Property B: Corporate house

| Field | Value |
| --- | --- |
| Address | 7 Jalan Industri 3/2 |
| City | Shah Alam |
| State | Selangor |
| Postcode | 40000 |
| Type | Terrace |
| Description | Used for employer-rents-for-staff and corporate-occupant roster tests |

### Rooms under Property B

| Room Label | Room Type | Bathroom Type | Bathrooms | Furnishing | Rent | Max Occupants | WiFi | Water | Electric |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Staff Room A | MEDIUM | SHARED | 1 | FULLY_FURNISHED | 850 | 2 | Yes | Yes | No |
| Entire Unit | ENTIRE_UNIT | ATTACHED | 2 | PARTIALLY_FURNISHED | 3200 | 6 | Yes | No | No |

## 6. Standard tenancy scenarios

Use these tenancy records for manual testing.

### Scenario A: Individual tenancy

| Field | Value |
| --- | --- |
| Landlord | `landlord@test.my` |
| Tenant | `tenant@test.my` |
| Property | `18 Jalan SS 15/4` |
| Room | `Master Room` |
| Start Date | `2026-06-01` |
| End Date | `2027-05-31` |
| Monthly Rent | `1500` |
| Deposit Amount | `3000` |
| Lease Party Type | `INDIVIDUAL` |

### Scenario B: Alternate invitation / blocked tenant test

| Field | Value |
| --- | --- |
| Landlord | `landlord@test.my` |
| Tenant | `tenant2@test.my` |
| Property | `18 Jalan SS 15/4` |
| Room | `Room 2` |
| Start Date | `2026-06-15` |
| End Date | `2027-06-14` |
| Monthly Rent | `900` |
| Deposit Amount | `1800` |
| Lease Party Type | `INDIVIDUAL` |

### Scenario C: Corporate tenancy

| Field | Value |
| --- | --- |
| Landlord | `landlord@test.my` |
| Lease Party Type | `CORPORATE` |
| Company Name | `Restoran Maju Sdn Bhd` |
| Company Registration No. | `202601001234` |
| Authorized Signatory Name | `Farid Rahman` |
| Authorized Signatory IC | `840101-08-1111` |
| Authorized Signatory Role | `Operations Director` |
| Authorized Signatory Email | `boss@test.my` |
| Property | `7 Jalan Industri 3/2` |
| Room | `Staff Room A` |
| Start Date | `2026-07-01` |
| End Date | `2027-06-30` |
| Monthly Rent | `850` |
| Deposit Amount | `1700` |
| Initial Occupants | `Worker A`, `Worker B` |

## 7. Agreement wizard sample values

Use these values so the agreement wizard can complete and the finalize checklist can pass.
=======
## 3. Suggested manual test accounts

Use these sample accounts in the UI:

| Role | Name | Email | Password | Phone | IC Number |
| --- | --- | --- | --- | --- | --- |
| Admin | RentalEase Admin | admin@rentalease.my | Admin1234! | - | - |
| Landlord | Ahmad Razif bin Hassan | landlord@test.my | Test1234! | 011-2345678 | 850101-14-5678 |
| Tenant | Lim Mei Ling | tenant@test.my | Test1234! | 012-3456789 | 900202-08-1234 |

## 4. Agreement flow setup data

Create one property and room with these values:

| Field | Value |
| --- | --- |
| Property address | 18 Jalan SS 15/4 |
| City | Subang Jaya |
| State | Selangor |
| Postcode | 47500 |
| Property type | Apartment |
| Room label | Master Room |
| Room type | MASTER |
| Bathroom type | ATTACHED |
| Monthly rent | 1500 |
| Deposit amount | 3000 |
| Start date | 2026-06-01 |
| End date | 2027-05-31 |

## 5. Agreement wizard sample values

Use a complete wizard so the finalize checklist can pass:
>>>>>>> theirs

| Section | Suggested value |
| --- | --- |
| Pets policy | APPROVAL |
<<<<<<< ours
| Pets max count | 1 |
| Pets deposit | 300 |
| Smoking policy | NOT_INDOORS |
| Overnight guests | NOTIFICATION |
| Overnight max nights | 2 |
| Quiet hours policy | STANDARD |
| Additional house rules | Keep common areas clean and do not block the hallway |
| Utility payment method | REIMBURSE_LANDLORD |
| Utility dispute method | SPLIT_50_50 |
| Internet provider | Unifi |
| Internet account manager | LANDLORD |
| AC servicing | LANDLORD |
| Pest control | LANDLORD |
=======
| Smoking policy | NOT_INDOORS |
| Overnight guests | NOTIFICATION |
| Utility payment method | REIMBURSE_LANDLORD |
| Utility dispute method | SPLIT_50_50 |
>>>>>>> theirs
| Rent due day | 5 |
| Grace period days | 3 |
| Late penalty type | FLAT |
| Late penalty amount | 50 |
<<<<<<< ours
| Acceptable payment methods | Bank transfer, DuitNow |
| Rent increase terms | Only after term renewal |
| Rent increase percent | 5 |
| Minor repair threshold | 150 |
| Minor repair responsible | TENANT |
| Plumbing responsible | LANDLORD |
| Electrical responsible | LANDLORD |
| Appliance responsible | LANDLORD |
| Structural responsible | LANDLORD |
| Urgent response time | 48 hours |
| Tenant notice months | 1 |
| Landlord notice months | 2 |
| Early termination penalty | FULL_DEPOSIT |
| Early termination months | 2 |
| Reinstatement level | BROOM_CLEAN |
| Subletting policy | PROHIBITED |
| Deposit refund days | 14 |
| Deduction categories | Cleaning, damage, unpaid bills |
| Dispute resolution | GOOD_FAITH_DISCUSSION |
| Utility deposit handling | INCLUDED_IN_SECURITY_DEPOSIT |
| Wizard status | Complete all steps |

## 8. Structured change-request samples

Use one or more of these for negotiation testing.

### Request A: Deposit terms
=======
| Minor repair threshold | 150 |
| Tenant notice months | 1 |
| Landlord notice months | 2 |
| Deposit refund days | 14 |
| Wizard status | Complete all 6 steps |

## 6. Structured tenant change-request samples

Use one or more of these when testing the negotiation flow:

### Request A
>>>>>>> theirs

| Field | Value |
| --- | --- |
| Category | Deposit terms |
| What should change? | Reduce the security deposit from RM 3,000 to RM 2,000. |
| Why? | The current deposit is too high for my move-in budget. |
| Optional note | I can pay the reduced deposit immediately together with the first month rent. |

<<<<<<< ours
### Request B: Notice period
=======
### Request B
>>>>>>> theirs

| Field | Value |
| --- | --- |
| Category | Notice period |
| What should change? | Change the tenant termination notice from 2 months to 1 month. |
| Why? | A shorter notice period is more practical for my work relocation risk. |
| Optional note | I am still fine with standard penalties for early termination. |

<<<<<<< ours
### Request C: Repairs
=======
### Request C
>>>>>>> theirs

| Field | Value |
| --- | --- |
| Category | Repairs and maintenance |
| What should change? | Clarify that repairs above RM 150 are landlord responsibility. |
| Why? | I want the written agreement to match the wizard settings clearly. |
| Optional note | Please mention urgent plumbing issues specifically. |

<<<<<<< ours
### Request D: Occupancy and guests

| Field | Value |
| --- | --- |
| Category | Occupancy and guests |
| What should change? | Clarify how much prior notice is needed for overnight guests. |
| Why? | I want a clearer rule before agreeing to the clause. |
| Optional note | A fixed notice period such as 1 day would be clearer. |

## 9. Deposit and payment proof data

Use these values when testing payment and deposit proof upload.

### Deposit proof

| Field | Value |
| --- | --- |
| Payment amount | `RM 3000.00` |
| Payment reference | `DEP-2026-0001` |
| Suggested upload filename | `deposit-proof-tenant-main.pdf` |
| Landlord approval result | Approve once, reject once for negative-path test |

### Rent payment proof

| Field | Value |
| --- | --- |
| First due date | `2026-07-05` |
| Amount | `RM 1500.00` |
| Payment reference | `RENT-JUL-2026-0001` |
| Suggested upload filename | `rent-july-proof.png` |

## 10. Condition report sample content

Use these notes and media ideas for move-in / move-out condition testing.

### Move-in report notes
- Bedroom wall clean with no major cracks
- Mattress frame stable
- Air-conditioner remote available
- Bathroom sink water pressure normal
- Window latch slightly loose but still functional

### Move-out report notes
- Small paint scuff near study table
- One light bulb not working
- Wardrobe interior clean
- Bathroom floor cleaned

### Suggested photo groups
- bedroom
- bathroom
- window
- wardrobe
- general room view

## 11. File upload suggestions

Use any local files you already have, or prepare simple placeholders with these formats:

### Identity / tenant document uploads
- `ic-copy-main.png`
- `income-proof-main.pdf`

### Agreement hard-copy signature proof
- `signed-agreement-proof.pdf`
- `signed-agreement-proof.jpg`
- `signed-agreement-proof.png`
- `signed-agreement-proof.heic`

### Deposit / rent proof
- `deposit-proof.pdf`
- `rent-transfer-proof.png`

## 12. Recommended end-to-end manual flows

### A. Admin verification flow

1. Login as admin.
2. Review landlord verification queue.
3. Approve `landlord@test.my` if still pending.
4. Review tenant verification queue.
5. Approve `tenant@test.my` and `boss@test.my`.
6. Optionally leave `tenant2@test.my` pending to test blocked invitation acceptance.

### B. Landlord property flow

1. Login as `landlord@test.my`.
2. Create Property A and Property B.
3. Add the listed rooms.
4. Confirm properties appear in landlord property listing.
5. Open property detail pages and confirm room data is shown correctly.

### C. Individual tenancy flow

1. Create Scenario A using `tenant@test.my`.
2. Login as `tenant@test.my`.
3. Accept invitation.
4. Return to landlord side and complete the agreement wizard.
5. Generate agreement.
6. Review Full Agreement, Plain Language, Red Flags, Edit Agreement, and History tabs.
7. Finalize agreement.
8. Tenant reviews and either signs or requests structured changes.

### D. Agreement negotiation flow

1. Use Request A and Request B from the tenant side.
2. Confirm landlord sees pending structured requests in `Edit Agreement`.
3. Mark requests addressed and save.
4. Refresh AI analysis if you changed a red-flag clause.
5. Re-finalize and send again.
6. Confirm history and version tracking update correctly.

### E. Dual-signature activation flow

1. Tenant signs digitally after acknowledgement.
2. Confirm agreement becomes `PENDING_SIGNATURE_PROOF`.
3. Confirm tenancy remains `PENDING`, not `ACTIVE`.
4. Upload signed hard-copy proof.
5. Landlord opens tenancy detail page and reviews the uploaded file.
6. Approve the file.
7. Confirm agreement becomes `SIGNED`.
8. Confirm tenancy becomes `ACTIVE`.
9. Confirm the rent payment schedule appears only after approval.

### F. Dual-signature rejection / re-upload flow

1. Repeat the digital-sign step.
2. Upload a signed proof file.
3. Landlord rejects it with a reason.
4. Confirm rejection without a reason is blocked.
5. Tenant sees the rejection reason.
6. Tenant re-uploads a corrected file.
7. Landlord approves the replacement file.
8. Confirm tenancy becomes `ACTIVE`.

### G. Payment flow

1. After tenancy activation, open tenant payments.
2. Upload a rent payment proof for the first due month.
3. Landlord reviews it from the payments side.
4. Approve once, reject once for negative-path testing.
5. Confirm tenant receives the correct status update.

### H. Condition report flow

1. Landlord starts a move-in condition report.
2. Add room-grouped photos and notes.
3. Tenant opens tenant condition page and acknowledges the report.
4. Later, create a move-out report for the same tenancy.
5. Confirm deposit settlement waits for the move-out flow where required.

### I. Deposit settlement flow

1. Use a terminated or expired tenancy.
2. Start deposit settlement from landlord side.
3. Add deduction items such as cleaning or damage.
4. Tenant reviews the refund proposal.
5. Confirm paid / disputed states behave correctly in UI.

### J. Renewal flow

1. Use an active tenancy.
2. Open the renewal page from landlord side.
3. Set a new end date and revised rent if needed.
4. Confirm a renewal tenancy is created correctly.

### K. Termination flow

1. Use an active tenancy.
2. Click `Serve Notice to Quit`.
3. Enter a reason such as `Mutual early termination due to relocation`.
4. Confirm the tenancy becomes `TERMINATED`.
5. Confirm end-of-tenancy next steps appear.

### L. Corporate tenancy workflow

1. Login as `landlord@test.my`.
2. Create Scenario C with `boss@test.my` as the authorized signatory.
3. Add initial occupants `Worker A` and `Worker B`.
4. Submit the invitation.
5. Login as `boss@test.my`.
6. Confirm the corporate invitation card appears.
7. Confirm a non-signatory occupant account cannot accept the invitation.
8. Accept as the authorized signatory.
9. Landlord completes the agreement wizard and generates the agreement.
10. Confirm agreement wording includes the corporate lease party / signatory context.
11. Sign as the authorized signatory.
12. Upload the signed hard-copy proof.
13. Landlord approves it.
14. Confirm the tenancy becomes `ACTIVE`.
15. Return to landlord tenancy detail page and use the corporate roster manager to:
    - add a new occupant
    - replace an occupant
    - remove an occupant
    - link `Worker A` or `Worker B` to a registered tenant account email

### M. Messaging and notifications

1. Send messages between landlord and tenant.
2. Confirm unread counts increase and clear correctly.
3. Trigger notifications from:
   - invitation sent
   - invitation accepted
   - agreement changes requested
   - digital signature completed
   - signed proof approved or rejected

## 13. Quick data cheatsheet

### Main individual flow
- Landlord: `landlord@test.my`
- Tenant: `tenant@test.my`
- Property: `18 Jalan SS 15/4`
- Room: `Master Room`

### Secondary invite / access-control flow
- Landlord: `landlord@test.my`
- Tenant: `tenant2@test.my`
- Room: `Room 2`

### Corporate flow
- Company: `Restoran Maju Sdn Bhd`
- Signatory: `boss@test.my`
- Occupants: `Worker A`, `Worker B`
- Property: `7 Jalan Industri 3/2`
- Room: `Staff Room A`

## 14. Important modeling notes

- `CoTenant` is for simple additional occupants in personal rentals.
- Corporate staff should use the dedicated corporate occupant roster, not `CoTenant`.
- Corporate legal actions belong to the authorized signatory, not ordinary occupants.
- The dual-signature flow is strict:
  - digital signature first
  - signed hard-copy upload second
  - landlord approval third
  - only then does the tenancy become `ACTIVE`
=======
## 7. Manual verification checklist

### Agreement-local bilingual toggle

1. Open the landlord agreement page.
2. Confirm there is no EN/BM toggle in the dashboard nav or sidebar.
3. Confirm the agreement page itself has the EN/BM toggle.
4. Switch to BM and verify:
   - Plain Language tab changes language.
   - Red Flags tab changes language when BM content exists.
   - Full Agreement tab stays English.

### Version history

1. Generate the first agreement.
2. Confirm History shows Version 1 and a generated event.
3. Edit and save the agreement.
4. Confirm History shows a new revision and edit event.
5. Finalize the agreement.
6. Confirm History shows a finalize event.

### Structured change requests

1. Login as tenant.
2. Open the finalized agreement.
3. Choose `Request Structured Changes`.
4. Submit Request A and Request B.
5. Confirm landlord side shows both requests in the editor.
6. Save the revised agreement and mark the requests addressed.
7. Confirm the checklist no longer reports unresolved change requests.

### Dual-signature agreement activation

1. Re-finalize the revised agreement.
2. Login as tenant.
3. Confirm the signing area shows the current version number.
4. Try signing without the acknowledgement checkbox.
5. Confirm signing is blocked.
6. Tick the checkbox and sign.
7. Confirm the agreement moves to `PENDING_SIGNATURE_PROOF`.
8. Confirm the tenancy itself stays `PENDING`, not `ACTIVE`.
9. Confirm no rent payment schedule appears yet.
10. Upload a signed hard-copy file using one of these formats:
   - `PDF`
   - `JPG`
   - `PNG`
   - `HEIC`
11. Confirm the tenant sees `Under Review`.
12. Login as landlord and open the tenancy detail page.
13. Confirm the signed-copy review card appears.
14. Approve the signed copy.
15. Confirm the agreement becomes `SIGNED`.
16. Confirm the tenancy becomes `ACTIVE`.
17. Confirm the rent payment schedule appears only after approval.

### Dual-signature rejection and re-upload

1. Repeat the digital-sign step until the tenant uploads a signed hard-copy file.
2. Login as landlord.
3. Reject the uploaded file without entering a reason and confirm the system blocks the action.
4. Enter a rejection reason of at least 10 characters and submit the rejection.
5. Confirm the tenancy remains `PENDING`.
6. Confirm the agreement remains `PENDING_SIGNATURE_PROOF`.
7. Login as tenant and confirm the rejection reason is visible.
8. Upload a replacement signed-copy file.
9. Confirm landlord can review the new file.
10. Approve the new file and confirm the tenancy becomes `ACTIVE`.

### Admin bootstrap

1. Remove any existing admin row if you want a clean bootstrap test.
2. Start the app and open `http://localhost:3000/login`.
3. Confirm the admin account is recreated automatically from `.env`.
4. Login with `admin@rentalease.my / Admin1234!`.
5. Confirm the admin dashboard opens.
6. Optionally call `POST /api/internal/bootstrap-admin` with `x-bootstrap-secret` and confirm it returns `noop` after the automatic bootstrap already restored the account.

## 8. Corporate tenancy workflow

Use this for the restaurant-boss / employer-rents-for-staff demo:
- Company: `Restoran Maju Sdn Bhd`
- Authorized signatory tenant account:
  - Name: `Ahmad Razif bin Hassan`
  - Email: `landlord@test.my` should **not** be used here
  - Create a tenant-role boss/signatory account such as `boss@test.my`
- Occupants:
  - `Worker A`
  - `Worker B`

Recommended manual flow:
1. Register `boss@test.my` as a tenant account and complete verification.
2. Login as landlord and create a new tenancy.
3. Choose `Corporate / Employer`.
4. Enter the company name and authorized signatory details.
5. Use `boss@test.my` as the authorized signatory email.
6. Add `Worker A` and `Worker B` to the occupant roster.
7. Submit the invitation.
8. Login as `boss@test.my` and confirm only the authorized signatory can accept the invitation.
9. Confirm the corporate invitation card appears on the tenant side.
10. Generate and finalize the agreement from the landlord side.
11. Login as `boss@test.my` and confirm the signing copy refers to the authorized signatory role.
12. Complete digital signing, upload the signed hard-copy proof, and let the landlord approve it.
13. Confirm the tenancy becomes `ACTIVE` only after proof approval.
14. Return to the landlord tenancy detail page and use the corporate roster manager to:
    - add another occupant
    - replace an occupant
    - link an occupant to a registered tenant account by email

Important modeling note:
- `CoTenant` is still for simple additional occupants in personal rentals.
- Corporate staff living in the room or unit should use the dedicated corporate occupant roster, not `CoTenant`.
>>>>>>> theirs
