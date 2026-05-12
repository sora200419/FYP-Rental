# Test Data

Prepared: 2026-05-12

## 1. Required `.env` values

Use real values for the existing app secrets and database, then add or confirm these admin bootstrap values:

```env
ADMIN_EMAIL=admin@rentalease.my
ADMIN_PASSWORD=Admin1234!
ADMIN_NAME=RentalEase Admin
NEXTAUTH_SECRET=replace-with-your-existing-secret
```

## 2. Bootstrap the admin account

Admin creation now comes only from `.env`.

Primary behavior:
- start the app
- open any app page
- the server will automatically create or re-promote the admin account if it is missing

Protected fallback:
- if you want to trigger the bootstrap manually, call the internal route once:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/internal/bootstrap-admin" `
  -Headers @{ "x-bootstrap-secret" = "<your NEXTAUTH_SECRET>" }
```

Expected manual route result:

```json
{ "ok": true, "action": "created", "email": "admin@rentalease.my" }
```

If the email already exists as a normal user, expected result is:

```json
{ "ok": true, "action": "promoted", "email": "admin@rentalease.my" }
```

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

| Section | Suggested value |
| --- | --- |
| Pets policy | APPROVAL |
| Smoking policy | NOT_INDOORS |
| Overnight guests | NOTIFICATION |
| Utility payment method | REIMBURSE_LANDLORD |
| Utility dispute method | SPLIT_50_50 |
| Rent due day | 5 |
| Grace period days | 3 |
| Late penalty type | FLAT |
| Late penalty amount | 50 |
| Minor repair threshold | 150 |
| Tenant notice months | 1 |
| Landlord notice months | 2 |
| Deposit refund days | 14 |
| Wizard status | Complete all 6 steps |

## 6. Structured tenant change-request samples

Use one or more of these when testing the negotiation flow:

### Request A

| Field | Value |
| --- | --- |
| Category | Deposit terms |
| What should change? | Reduce the security deposit from RM 3,000 to RM 2,000. |
| Why? | The current deposit is too high for my move-in budget. |
| Optional note | I can pay the reduced deposit immediately together with the first month rent. |

### Request B

| Field | Value |
| --- | --- |
| Category | Notice period |
| What should change? | Change the tenant termination notice from 2 months to 1 month. |
| Why? | A shorter notice period is more practical for my work relocation risk. |
| Optional note | I am still fine with standard penalties for early termination. |

### Request C

| Field | Value |
| --- | --- |
| Category | Repairs and maintenance |
| What should change? | Clarify that repairs above RM 150 are landlord responsibility. |
| Why? | I want the written agreement to match the wizard settings clearly. |
| Optional note | Please mention urgent plumbing issues specifically. |

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

### Tenant signing step

1. Re-finalize the revised agreement.
2. Login as tenant.
3. Confirm the signing area shows the current version number.
4. Try signing without the acknowledgement checkbox.
5. Confirm signing is blocked.
6. Tick the checkbox and sign.
7. Confirm the tenancy becomes active and the audit record appears.

### Admin bootstrap

1. Remove any existing admin row if you want a clean bootstrap test.
2. Start the app and open `http://localhost:3000/login`.
3. Confirm the admin account is recreated automatically from `.env`.
4. Login with `admin@rentalease.my / Admin1234!`.
5. Confirm the admin dashboard opens.
6. Optionally call `POST /api/internal/bootstrap-admin` with `x-bootstrap-secret` and confirm it returns `noop` after the automatic bootstrap already restored the account.
