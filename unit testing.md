# 4.5.1 Unit Testing Preparation

This unit testing preparation is prepared for the RentalEase Malaysia system. The format follows the FYP guideline and sample documentation style, where the expected message or output is prepared before execution, while the actual output and result are completed after testing.

## 4.5.1.1 Name of the program: Login Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| LOGIN1 | Submit login form with empty fields | Email: blank; Password: blank | System displays required field validation and does not create a session. |  |  |
| LOGIN2 | Submit with unregistered email | Email: `unknown@test.my`; Password: `Test1234!` | System rejects login and displays invalid credentials message. |  |  |
| LOGIN3 | Submit with wrong password | Email: `tenant@test.my`; Password: `Wrong1234!` | System rejects login and displays invalid credentials message. |  |  |
| LOGIN4 | Login as tenant with valid credentials | Email: `tenant@test.my`; Password: `Test1234!` | User is authenticated and redirected to tenant dashboard. |  |  |
| LOGIN5 | Login as landlord with valid credentials | Email: `landlord@test.my`; Password: `Test1234!` | User is authenticated and redirected to landlord dashboard. |  |  |
| LOGIN6 | Login as admin with valid credentials | Email: `admin@rentalease.my`; Password: `Admin1234!` | User is authenticated and redirected to admin dashboard. |  |  |
| LOGIN7 | Login using suspended account | Account status is suspended | System blocks dashboard access and redirects to login page with suspended account message. |  |  |

## 4.5.1.2 Name of the program: Register Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| REG1 | Submit registration form with blank required fields | Name, email, password, role, phone, IC number, or IC photo left blank | System displays validation message and account is not created. |  |  |
| REG2 | Register with invalid email format | Email: `tenanttest.my` | System displays invalid email validation message. |  |  |
| REG3 | Register with duplicate email | Email already exists in database | System displays email already exists message and account is not created. |  |  |
| REG4 | Register with duplicate IC number | IC number already exists in database | System displays IC number already exists message and account is not created. |  |  |
| REG5 | Register with invalid IC format | IC number does not match Malaysian IC format | System displays invalid IC number message. |  |  |
| REG6 | Register with invalid IC file type | Upload file is not an accepted image or PDF type | System rejects file and displays invalid file message. |  |  |
| REG7 | Register with valid tenant details | Complete tenant details and valid IC photo | Tenant account is created and pending admin KYC verification. |  |  |
| REG8 | Register with valid landlord details | Complete landlord details and valid IC photo | Landlord account is created and pending admin KYC verification. |  |  |

## 4.5.1.3 Name of the program: Forgot Password and Reset Password Pages

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| PASS1 | Submit forgot password with blank email | Email: blank | System displays email required validation. |  |  |
| PASS2 | Submit forgot password with invalid email format | Email: `abc` | System displays invalid email validation. |  |  |
| PASS3 | Submit forgot password with registered email | Email exists in system | System creates reset token and displays generic reset email success message. |  |  |
| PASS4 | Submit forgot password with unregistered email | Email does not exist | System displays generic reset email success message for security. |  |  |
| PASS5 | Open reset password with invalid token | Token is invalid or expired | System blocks password reset and displays invalid or expired token message. |  |  |
| PASS6 | Submit weak new password | Password below minimum length | System displays password length validation. |  |  |
| PASS7 | Submit valid reset password | Valid token and valid new password | System updates password and marks reset token as used. |  |  |

## 4.5.1.4 Name of the program: Profile Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| PROF1 | Open profile page | Logged in tenant or landlord | System displays current profile details and uploaded document status. |  |  |
| PROF2 | Update profile with blank name | Name: blank | System displays name required validation and does not save changes. |  |  |
| PROF3 | Update profile with invalid IC number | IC number invalid | System displays invalid IC number validation. |  |  |
| PROF4 | Update IC number to duplicate IC | IC belongs to another user | System displays duplicate IC number message. |  |  |
| PROF5 | Upload invalid document type | File is not allowed | System rejects file and displays invalid file message. |  |  |
| PROF6 | Update valid profile details | Valid name, phone, IC and document | System saves profile changes successfully. |  |  |
| PROF7 | Change IC information after verification | Verified account changes IC number | System saves profile and resets verification status for admin review. |  |  |

## 4.5.1.5 Name of the program: Admin Dashboard

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| ADM1 | Open admin dashboard as admin | Valid admin session | System displays total users, pending KYC, total properties and pending property counts. |  |  |
| ADM2 | Open admin dashboard as tenant | Tenant session | System denies access or redirects user away from admin page. |  |  |
| ADM3 | Open admin dashboard as landlord | Landlord session | System denies access or redirects user away from admin page. |  |  |
| ADM4 | Open admin dashboard with no pending records | No pending KYC or property items | System displays zero counts and empty review queues. |  |  |

## 4.5.1.6 Name of the program: Admin KYC Verification Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| KYC1 | View pending KYC list | Pending users exist | System displays users with IC details and document preview link. |  |  |
| KYC2 | Approve pending user | Admin clicks approve | User verification status becomes approved and user receives notification. |  |  |
| KYC3 | Reject pending user without reason | Reason field blank | System blocks rejection and displays reason required message. |  |  |
| KYC4 | Reject pending user with reason | Valid rejection reason entered | User verification status becomes rejected and rejection notification is created. |  |  |
| KYC5 | Revoke verified user without reason | Reason field blank | System blocks revocation and displays reason required message. |  |  |
| KYC6 | Revoke verified user with reason | Valid revocation reason entered | User verification status becomes revoked and user receives notification. |  |  |

## 4.5.1.7 Name of the program: Admin Property Verification Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| PV1 | View pending property list | Pending property exists | System displays property details, landlord information and photos. |  |  |
| PV2 | Approve pending property | Admin clicks approve | Property verification status becomes approved and landlord receives notification. |  |  |
| PV3 | Reject property without reason | Reason field blank | System blocks rejection and displays reason required message. |  |  |
| PV4 | Reject property with reason | Valid rejection reason entered | Property verification status becomes rejected and landlord receives notification. |  |  |
| PV5 | Revoke verified property without reason | Reason field blank | System blocks revocation and displays reason required message. |  |  |
| PV6 | Revoke verified property with reason | Valid revocation reason entered | Property verification status becomes revoked and landlord receives notification. |  |  |

## 4.5.1.8 Name of the program: Admin User Management Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| AUM1 | Search user account | Search by name or email | System displays matching users only. |  |  |
| AUM2 | Filter users by role | Select Tenant, Landlord or Admin role filter | System displays users matching selected role. |  |  |
| AUM3 | Suspend active user | Non-admin user selected | User status becomes suspended and notification is created. |  |  |
| AUM4 | Reactivate suspended user | Suspended non-admin user selected | User status becomes active and notification is created. |  |  |
| AUM5 | Delete user with no active obligations | User has no active tenancy, overdue payment, pending refund or unfinished agreement | System deletes user account successfully. |  |  |
| AUM6 | Delete user with active tenancy | User has at least one active tenancy | System blocks deletion and displays active tenancy blocker. |  |  |
| AUM7 | Delete user with overdue payment | User has overdue payment record | System blocks deletion and displays overdue payment blocker. |  |  |
| AUM8 | Try to suspend or delete admin user | Target user role is Admin | System blocks action because admin accounts cannot be managed this way. |  |  |

## 4.5.1.9 Name of the program: Landlord Property and Room Pages

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| PROP1 | Create property with blank required fields | Address, city, state, postcode or type blank | System displays validation messages and property is not created. |  |  |
| PROP2 | Create property with invalid postcode | Postcode not valid | System displays postcode validation message. |  |  |
| PROP3 | Create property with valid details | Valid address, city, state, postcode, type and description | System creates property and shows it in landlord property list. |  |  |
| PROP4 | Upload valid property photo | JPG, PNG or supported file type | System stores photo and displays it in property gallery. |  |  |
| PROP5 | Upload invalid property photo | Unsupported file type or oversized file | System rejects upload and displays invalid file message. |  |  |
| ROOM1 | Add room with missing data | Room label, rent or room type blank | System displays validation message and room is not created. |  |  |
| ROOM2 | Add room with valid data | Master Room, rent RM1500, max occupants 2 | System creates room and displays room record under property. |  |  |
| ROOM3 | Delete room with active tenancy | Room is linked to active tenancy | System blocks deletion because room has related active records. |  |  |

## 4.5.1.10 Name of the program: Tenancy Invitation Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| TEN1 | Lookup existing tenant | Email: `tenant@test.my` | System displays tenant details for invitation. |  |  |
| TEN2 | Lookup non-existing tenant | Email does not exist | System displays tenant not found message. |  |  |
| TEN3 | Create tenancy with unavailable room | Room already reserved or occupied | System blocks invitation and displays room unavailable message. |  |  |
| TEN4 | Create tenancy for unverified property | Property is not verified by admin | System blocks invitation and displays property verification requirement. |  |  |
| TEN5 | Create tenancy with invalid dates | End date before start date | System displays invalid date validation. |  |  |
| TEN6 | Create valid individual tenancy invitation | Verified landlord, verified property, available room and valid tenant | System creates invited tenancy, reserves room and notifies tenant. |  |  |
| TEN7 | Change invitation recipient before acceptance | Invited tenancy is still pending acceptance | System updates recipient and sends updated invitation notification. |  |  |
| TEN8 | Change invitation recipient after acceptance | Tenancy status is pending or active | System blocks recipient change and displays invitation cannot be changed message. |  |  |
| TEN9 | Tenant accepts invitation | Tenant is verified and invitation is active | Tenancy status changes from invited to pending and room remains reserved. |  |  |
| TEN10 | Tenant declines invitation | Tenant declines invited tenancy | Tenancy is cancelled and room becomes available again. |  |  |
| TEN11 | Unverified tenant accepts invitation | Tenant verification status is pending or rejected | System blocks acceptance and displays verification requirement. |  |  |

## 4.5.1.11 Name of the program: Agreement Wizard and Agreement Generation

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| AGR1 | Open agreement wizard | Tenancy accepted and user is landlord | System displays agreement preference steps. |  |  |
| AGR2 | Submit wizard with incomplete required settings | One or more required steps incomplete | System prevents completion and displays missing settings. |  |  |
| AGR3 | Complete all wizard steps | House rules, utilities, financial, maintenance, ending and deposit sections completed | Wizard status becomes complete. |  |  |
| AGR4 | Generate agreement with completed wizard | Wizard complete and tenancy pending | System generates agreement draft, summary and red-flag analysis. |  |  |
| AGR5 | Generate agreement before wizard completion | Wizard incomplete | System blocks generation and displays incomplete wizard message. |  |  |
| AGR6 | View plain language summary | Agreement draft exists | System displays plain language summary. |  |  |
| AGR7 | View red-flag analysis | Agreement draft exists | System displays red-flag analysis. |  |  |
| AGR8 | Switch agreement summary language | EN/BM toggle selected | Summary and red-flag view change language when BM content exists. |  |  |
| AGR9 | Save edited agreement content | Landlord edits draft text and saves | System stores new agreement revision and updates version history. |  |  |
| AGR10 | View agreement history | Agreement has generated, edited or finalized events | System displays version and event history. |  |  |

## 4.5.1.12 Name of the program: Agreement Review, Finalize and Signature Proof

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| SIGN1 | Tenant requests structured change | Category, requested change and reason entered | System records request and notifies landlord. |  |  |
| SIGN2 | Tenant submits change request with missing reason | Reason blank | System displays validation message and request is not saved. |  |  |
| SIGN3 | Landlord finalizes agreement with unresolved change requests | Pending change requests exist | System blocks finalization and displays unresolved request warning. |  |  |
| SIGN4 | Landlord finalizes agreement after checklist passed | No unresolved requests and checklist completed | Agreement status changes to finalized and tenant is notified. |  |  |
| SIGN5 | Tenant signs without acknowledgement checkbox | Checkbox not selected | System blocks signing and displays acknowledgement required message. |  |  |
| SIGN6 | Tenant signs finalized agreement | Acknowledgement selected | Agreement status changes to pending signature proof. |  |  |
| SIGN7 | Tenant uploads invalid signed proof file | Unsupported file type | System rejects upload and displays invalid file message. |  |  |
| SIGN8 | Tenant uploads valid signed proof file | PDF, JPG, PNG or HEIC file | System stores proof and marks proof as under review. |  |  |
| SIGN9 | Landlord rejects signed proof without reason | Reason blank | System blocks rejection and displays reason required message. |  |  |
| SIGN10 | Landlord rejects signed proof with reason | Valid rejection reason entered | Proof status becomes rejected and tenant can view reason. |  |  |
| SIGN11 | Tenant re-uploads corrected signed proof | Previous proof rejected | System stores replacement proof for landlord review. |  |  |
| SIGN12 | Landlord approves signed proof | Valid proof under review | Agreement becomes signed, tenancy becomes active and payment schedule is generated. |  |  |

## 4.5.1.13 Name of the program: Payment and Deposit Proof Pages

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| PAY1 | Tenant views rent payments | Active tenancy with payment schedule | System displays rent payment records and current statuses. |  |  |
| PAY2 | Upload rent proof for paid payment | Payment already marked paid | System blocks upload because payment is already paid. |  |  |
| PAY3 | Upload invalid rent proof file | Unsupported file type | System rejects upload and displays invalid file message. |  |  |
| PAY4 | Upload valid rent proof | Valid file for pending rent payment | Payment status becomes under review and landlord is notified. |  |  |
| PAY5 | Landlord approves rent proof | Payment under review | Payment status becomes paid and tenant is notified. |  |  |
| PAY6 | Landlord rejects rent proof without reason | Reason blank | System blocks rejection and displays reason required message. |  |  |
| PAY7 | Landlord rejects rent proof with reason | Valid reason entered | Payment returns to pending or rejected status and tenant is notified. |  |  |
| DEP1 | Upload deposit proof | Tenancy deposit not confirmed paid | Deposit proof is stored and status becomes under review. |  |  |
| DEP2 | Approve deposit proof | Deposit proof under review | Deposit status becomes paid and tenant is notified. |  |  |
| DEP3 | Reject deposit proof without reason | Reason blank | System blocks rejection and displays reason required message. |  |  |
| DEP4 | Reject deposit proof with reason | Valid rejection reason entered | Deposit proof becomes rejected and tenant can upload again. |  |  |

## 4.5.1.14 Name of the program: Condition Report Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| CR1 | Create condition report with blank notes | Notes or required report fields blank | System displays validation message and report is not created. |  |  |
| CR2 | Create valid move-in report | Valid report type and condition notes | System creates condition report for the tenancy. |  |  |
| CR3 | Upload valid condition photo | Valid image file and area label | System stores photo and displays it under the report. |  |  |
| CR4 | Upload invalid condition photo | Unsupported file type | System rejects photo and displays invalid file message. |  |  |
| CR5 | Acknowledge other party report | Logged in user is not report creator | Report is marked as acknowledged. |  |  |
| CR6 | Acknowledge own report | Logged in user created the report | System blocks action because user cannot acknowledge own report. |  |  |
| CR7 | Acknowledge already acknowledged report | Report already acknowledged | System blocks action and displays already acknowledged message. |  |  |

## 4.5.1.15 Name of the program: Deposit Settlement Page

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| DS1 | Open deposit settlement for active tenancy | Tenancy has not ended | System blocks settlement because tenancy is not ended. |  |  |
| DS2 | Open deposit settlement without paid deposit | Deposit not confirmed paid | System blocks settlement because deposit is not paid. |  |  |
| DS3 | Create full refund proposal | Ended tenancy and no deduction | System creates full refund proposal and notifies tenant. |  |  |
| DS4 | Add deduction with blank reason | Deduction reason blank | System displays deduction reason validation. |  |  |
| DS5 | Add valid deduction | Deduction amount and reason entered | System saves deduction and updates refund amount. |  |  |
| DS6 | Tenant accepts deduction | Tenant selects accept | Deposit settlement status becomes agreed. |  |  |
| DS7 | Tenant disputes deduction without note | Dispute note blank | System blocks dispute and displays note required message. |  |  |
| DS8 | Tenant disputes deduction with note | Valid dispute note entered | Settlement status becomes disputed and landlord can review dispute note. |  |  |
| DS9 | Mark refund paid before settlement agreed | Settlement not agreed | System blocks mark paid action. |  |  |
| DS10 | Mark refund paid with valid proof | Settlement agreed and valid proof uploaded | Refund status becomes paid. |  |  |

## 4.5.1.16 Name of the program: Corporate Tenancy Workflow

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| CORP1 | Create corporate tenancy with blank company name | Company name blank | System displays company name required validation. |  |  |
| CORP2 | Create corporate tenancy with blank signatory email | Authorized signatory email blank | System displays signatory email required validation. |  |  |
| CORP3 | Add occupant row with blank name only | Occupant row contains no meaningful data | System ignores empty occupant row or displays validation based on form rule. |  |  |
| CORP4 | Create valid corporate tenancy invitation | Company, signatory and occupant data complete | System creates corporate invitation and notifies authorized signatory. |  |  |
| CORP5 | Non-signatory occupant accepts invitation | Logged in tenant is not authorized signatory | System blocks acceptance and displays only authorized signatory can accept message. |  |  |
| CORP6 | Authorized signatory accepts invitation | Logged in tenant matches authorized signatory | Tenancy status becomes pending and agreement workflow can continue. |  |  |
| CORP7 | Authorized signatory signs corporate agreement | Corporate tenancy finalized | System allows signing on behalf of company. |  |  |
| CORP8 | Non-signatory tenant signs corporate agreement | Tenant is not authorized signatory | System blocks signing action. |  |  |
| CORP9 | Landlord adds corporate occupant | Valid occupant details entered | Occupant is added to corporate roster. |  |  |
| CORP10 | Landlord links occupant to registered tenant account | Valid tenant account email entered | Occupant is linked to registered tenant account. |  |  |

## 4.5.1.17 Name of the program: Messaging and Notifications

| TCNO | Action | Input/Condition | Expected message/output | Actual message/output | Result |
| --- | --- | --- | --- | --- | --- |
| MSG1 | Open message page with tenancy thread | User has related tenancy | System displays available tenancy message thread. |  |  |
| MSG2 | Send blank message | Message content blank | System blocks sending and displays validation message. |  |  |
| MSG3 | Send valid message | Message content entered | Message is saved and receiver can view message. |  |  |
| MSG4 | Open thread with unread messages | Receiver opens message thread | Unread message count is cleared for that thread. |  |  |
| NOTI1 | Open notification dropdown | User has notifications | System displays notification list with read/unread status. |  |  |
| NOTI2 | Mark one notification as read | Select unread notification | Notification status becomes read. |  |  |
| NOTI3 | Mark all notifications as read | Multiple unread notifications exist | All notifications become read and unread count becomes zero. |  |  |
| NOTI4 | Open notification list with no records | No notifications exist | System displays empty notification state. |  |  |
