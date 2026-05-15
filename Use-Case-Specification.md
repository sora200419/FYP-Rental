# 4.2.2 Use Case Specification

## Use Case 1: Register Account

| Field | Specification |
|---|---|
| Use Case | Register Account |
| Description | Guest creates a new landlord or tenant account with personal details and required IC photo. |
| Actor | 1. Guest |
| Pre-Condition | 1. User is not logged in. |
|  | 2. Email and IC number are not already used. |
|  | 3. System is online. |
| Post-Condition | 1. New user account is created. |
|  | 2. Password is hashed. |
|  | 3. IC document is stored for admin KYC review. |
| Standard Process | 1. Open register page. |
|  | 2. Enter name, email, password, role, phone, IC number, and IC photo. |
|  | 3. Submit form. |
|  | 4. System validates required fields, IC number, and uploaded file. |
|  | 5. System hashes password and creates user account. |
|  | 6. System stores IC document metadata. |
| Alternative Flow | A1. IC upload fails after account creation; account may still exist but document review cannot proceed until corrected. |
| Exception Flow | E1. Missing required fields. |
|  | E2. Email already exists. |
|  | E3. IC number already exists. |
|  | E4. Invalid IC format. |
|  | E5. Invalid or oversized IC file. |

## Use Case 2: Login

| Field | Specification |
|---|---|
| Use Case | Login |
| Description | Registered user authenticates into the system and enters the correct role-based dashboard. |
| Actor | 1. Tenant |
|  | 2. Landlord |
|  | 3. Admin |
| Pre-Condition | 1. Account exists. |
|  | 2. Credentials are valid. |
| Post-Condition | 1. Session is created. |
|  | 2. User enters role-based dashboard. |
| Standard Process | 1. Open login page. |
|  | 2. Enter email and password. |
|  | 3. Submit login form. |
|  | 4. System validates credentials. |
|  | 5. System creates session and redirects user by role. |
| Alternative Flow | A1. User is already logged in and directly enters dashboard. |
| Exception Flow | E1. Invalid credentials. |
|  | E2. Authentication service failure. |
|  | E3. Account is suspended; system redirects to login page with suspended message. |

## Use Case 3: Reset Password

| Field | Specification |
|---|---|
| Use Case | Reset Password |
| Description | User requests a password reset link and sets a new password using a valid token. |
| Actor | 1. Tenant |
|  | 2. Landlord |
|  | 3. Admin |
| Pre-Condition | 1. User knows account email. |
|  | 2. Reset token is valid, not expired, and not used. |
| Post-Condition | 1. Password is updated. |
|  | 2. Reset token is marked as used. |
| Standard Process | 1. User submits email in forgot password page. |
|  | 2. System creates reset token and sends reset link. |
|  | 3. User opens reset link. |
|  | 4. User enters new password. |
|  | 5. System validates token and updates password. |
| Alternative Flow | A1. Non-existing email still returns generic success for security. |
| Exception Flow | E1. Token expired or invalid. |
|  | E2. Password below minimum length. |
|  | E3. Email sending fails. |

## Use Case 4: Manage Profile

| Field | Specification |
|---|---|
| Use Case | Manage Profile |
| Description | User updates profile information and uploads or replaces verification-related documents. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
|  | 2. Profile exists. |
| Post-Condition | 1. Profile details are updated. |
|  | 2. Uploaded documents are stored or replaced. |
|  | 3. Verification may be reset if IC information changes. |
| Standard Process | 1. Open profile page. |
|  | 2. Edit allowed profile fields. |
|  | 3. Upload or replace IC copy or income document if required. |
|  | 4. Submit changes. |
|  | 5. System validates profile data and file requirements. |
|  | 6. System saves updated profile and document records. |
| Alternative Flow | A1. User changes IC number; system marks account as unverified again. |
|  | A2. User replaces an existing uploaded document. |
| Exception Flow | E1. Invalid IC format. |
|  | E2. Duplicate IC number. |
|  | E3. Invalid file type or oversized file. |
|  | E4. Missing required name. |

## Use Case 5: View Notifications

| Field | Specification |
|---|---|
| Use Case | View Notifications |
| Description | User views in-app notifications about tenancy, agreement, payment, verification, and account events. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
| Post-Condition | 1. Notifications are displayed. |
|  | 2. Selected notification may be marked as read. |
| Standard Process | 1. User clicks notification bell. |
|  | 2. System retrieves notifications. |
|  | 3. User views notification list. |
|  | 4. User opens a notification or marks notifications as read. |
| Alternative Flow | A1. No notifications exist; system shows empty state. |
| Exception Flow | E1. Notification loading fails. |

## Use Case 6: Send Message

| Field | Specification |
|---|---|
| Use Case | Send Message |
| Description | Tenant and landlord communicate within a tenancy message thread. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
|  | 2. Tenancy exists. |
|  | 3. User is related to the tenancy. |
| Post-Condition | 1. Message is saved. |
|  | 2. Receiver can view the message. |
| Standard Process | 1. Open messages page. |
|  | 2. Select tenancy thread. |
|  | 3. Enter message content. |
|  | 4. Send message. |
|  | 5. System stores message and updates thread. |
| Alternative Flow | A1. Receiver opens thread and unread messages are marked read. |
| Exception Flow | E1. Empty message. |
|  | E2. Message too long. |
|  | E3. Access denied. |

## Use Case 7: Manage Property Listing

| Field | Specification |
|---|---|
| Use Case | Manage Property Listing |
| Description | Landlord creates and maintains property records, property photos, and room information. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Landlord is logged in. |
|  | 2. Landlord identity is verified. |
| Post-Condition | 1. Property details are saved or updated. |
|  | 2. Property photos are stored. |
|  | 3. Room records are created or updated. |
| Standard Process | 1. Open properties page. |
|  | 2. Add or edit property details. |
|  | 3. Upload property photos. |
|  | 4. Add or edit room information such as room type, rent, furnishing, utilities, and preferences. |
|  | 5. Submit changes. |
|  | 6. System saves property, photo, and room records. |
| Alternative Flow | A1. Landlord deletes a property photo. |
|  | A2. Landlord deletes a room if it has no active tenancy. |
| Exception Flow | E1. Missing property fields. |
|  | E2. Invalid postcode or room data. |
|  | E3. Invalid photo file. |
|  | E4. Property or room has related active records. |
|  | E5. Access denied. |

## Use Case 8: Manage Tenancy Invitation

| Field | Specification |
|---|---|
| Use Case | Manage Tenancy Invitation |
| Description | Landlord looks up tenant, sends tenancy invitation, and tenant accepts or declines the invitation. |
| Actor | 1. Landlord |
|  | 2. Tenant |
| Pre-Condition | 1. Landlord is logged in and owns the property. |
|  | 2. Property is verified. |
|  | 3. Room is available. |
|  | 4. Tenant account exists. |
| Post-Condition | 1. Tenancy invitation is created. |
|  | 2. Room is reserved while invitation is pending. |
|  | 3. If accepted, tenancy becomes pending. |
|  | 4. If declined, invitation is cancelled and room becomes available. |
| Standard Process | 1. Landlord opens create tenancy page. |
|  | 2. Landlord enters tenant email and looks up tenant account. |
|  | 3. Landlord enters tenancy terms. |
|  | 4. System validates tenant, room, and tenancy terms. |
|  | 5. System creates invited tenancy and notifies tenant. |
|  | 6. Tenant opens invitation and reviews details. |
|  | 7. Tenant accepts or declines invitation. |
|  | 8. System updates tenancy and room status. |
| Alternative Flow | A1. Corporate authorized signatory responds on behalf of a company tenant. |
|  | A2. Landlord corrects invitation recipient before the invitation is accepted. |
| Exception Flow | E1. Tenant not found. |
|  | E2. Room unavailable. |
|  | E3. Property not verified. |
|  | E4. Invitation already responded. |
|  | E5. Tenant is not verified. |
|  | E6. Access denied. |

## Use Case 9: Manage Tenancy

| Field | Specification |
|---|---|
| Use Case | Manage Tenancy |
| Description | User views tenancy details and landlord or tenant performs allowed tenancy lifecycle actions. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
|  | 2. Tenancy exists. |
|  | 3. User has access to the tenancy. |
| Post-Condition | 1. Tenancy details are displayed. |
|  | 2. Tenancy status or related records may be updated. |
| Standard Process | 1. Open tenancy page. |
|  | 2. System retrieves tenancy record and status. |
|  | 3. User views property, room, agreement, deposit, payment, occupant, and condition information. |
|  | 4. Tenant may withdraw from pending tenancy before signing agreement. |
|  | 5. Landlord may manage additional occupants. |
|  | 6. Landlord may renew eligible tenancy. |
|  | 7. Landlord may terminate tenancy with reason. |
| Alternative Flow | A1. Different sections appear based on tenancy status. |
|  | A2. Renewal creates a new invited tenancy. |
| Exception Flow | E1. Tenancy not found. |
|  | E2. Tenancy not eligible for selected action. |
|  | E3. Missing termination reason. |
|  | E4. Invalid renewal dates. |
|  | E5. Access denied. |

## Use Case 10: Manage Tenancy Agreement

| Field | Specification |
|---|---|
| Use Case | Manage Tenancy Agreement |
| Description | Landlord configures agreement preferences, generates AI agreement draft, revises and finalizes it, while tenant reviews, requests changes, signs, and downloads the signed agreement. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. Tenancy exists. |
|  | 2. Tenant has accepted invitation. |
|  | 3. User has access to the agreement. |
| Post-Condition | 1. Agreement may be drafted, revised, finalized, signed, or downloaded. |
|  | 2. Agreement revisions and events are recorded. |
|  | 3. Tenant and landlord are notified about important agreement changes. |
| Standard Process | 1. Landlord opens agreement wizard. |
|  | 2. Landlord configures agreement preferences. |
|  | 3. Landlord generates AI tenancy agreement draft. |
|  | 4. System stores draft agreement, summary, and red-flag analysis. |
|  | 5. Tenant and landlord view agreement details. |
|  | 6. Tenant may request agreement changes. |
|  | 7. Landlord reviews change requests and revises agreement. |
|  | 8. Landlord finalizes agreement after checklist and red-flag review. |
|  | 9. Tenant signs finalized agreement. |
|  | 10. Tenant uploads signed agreement proof. |
|  | 11. Landlord reviews signed agreement proof. |
|  | 12. User views or downloads signed agreement. |
| Alternative Flow | A1. Landlord uses AI assist to suggest revisions. |
|  | A2. User switches English or Bahasa Malaysia summary and red-flag view. |
|  | A3. Landlord rejects signed proof and tenant re-uploads corrected proof. |
| Exception Flow | E1. Wizard incomplete. |
|  | E2. AI generation failure. |
|  | E3. Agreement not finalized. |
|  | E4. Pending change requests. |
|  | E5. Invalid file type or oversized signed proof. |
|  | E6. Access denied. |

## Use Case 11: Manage Deposit Payment

| Field | Specification |
|---|---|
| Use Case | Manage Deposit Payment |
| Description | Tenant uploads deposit payment proof and landlord verifies or rejects the proof. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. Tenancy exists. |
|  | 2. Deposit is not confirmed paid. |
|  | 3. User has access to the tenancy. |
| Post-Condition | 1. Deposit proof is uploaded and stored. |
|  | 2. Deposit status becomes under review, paid, or rejected. |
|  | 3. Related party is notified. |
| Standard Process | 1. Tenant opens tenancy or payments page. |
|  | 2. Tenant chooses deposit proof file. |
|  | 3. System validates and stores proof. |
|  | 4. Landlord opens payments or tenancy page. |
|  | 5. Landlord views deposit proof. |
|  | 6. Landlord approves or rejects proof. |
|  | 7. System updates deposit status. |
| Alternative Flow | A1. Rejected deposit proof can be uploaded again by tenant. |
| Exception Flow | E1. Deposit already paid. |
|  | E2. Deposit not under review. |
|  | E3. Invalid file. |
|  | E4. Missing rejection reason. |
|  | E5. Access denied. |

## Use Case 12: Manage Rent Payment

| Field | Specification |
|---|---|
| Use Case | Manage Rent Payment |
| Description | Tenant views rent schedule and uploads rent proof, while landlord verifies or rejects rent payment proof. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. Active tenancy exists. |
|  | 2. Rent payment schedule exists. |
|  | 3. User has access to the tenancy. |
| Post-Condition | 1. Rent payment records are displayed. |
|  | 2. Payment proof is stored. |
|  | 3. Payment status becomes under review, paid, pending, or overdue. |
| Standard Process | 1. User opens payments page. |
|  | 2. System retrieves rent payment schedule. |
|  | 3. Tenant selects a rent payment and uploads proof. |
|  | 4. System stores proof and marks payment under review. |
|  | 5. Landlord reviews payment proof. |
|  | 6. Landlord approves or rejects payment. |
|  | 7. System updates payment status. |
| Alternative Flow | A1. Rejected payment returns to pending and tenant can upload proof again. |
| Exception Flow | E1. No active tenancy. |
|  | E2. No payment schedule found. |
|  | E3. Payment already paid. |
|  | E4. Invalid file. |
|  | E5. Missing rejection reason. |
|  | E6. Access denied. |

## Use Case 13: Manage Condition Report

| Field | Specification |
|---|---|
| Use Case | Manage Condition Report |
| Description | Tenant or landlord creates condition report, uploads condition photos, and acknowledges the other party's report. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
|  | 2. Tenancy exists. |
|  | 3. User has access to the tenancy. |
| Post-Condition | 1. Condition report is created. |
|  | 2. Condition photos are uploaded. |
|  | 3. Report may be marked as acknowledged. |
| Standard Process | 1. Open condition reports page. |
|  | 2. Select report type. |
|  | 3. Enter condition notes. |
|  | 4. Create report. |
|  | 5. Select room or area and upload condition photos. |
|  | 6. Other party reviews notes and photos. |
|  | 7. Other party acknowledges the report. |
|  | 8. System stores report, photos, and acknowledgement record. |
| Alternative Flow | A1. User deletes a condition photo before acknowledgement if allowed. |
| Exception Flow | E1. Invalid report type. |
|  | E2. Duplicate restricted report. |
|  | E3. Invalid file. |
|  | E4. User tries to acknowledge own report. |
|  | E5. Report already acknowledged. |
|  | E6. Access denied. |

## Use Case 14: Manage Deposit Settlement

| Field | Specification |
|---|---|
| Use Case | Manage Deposit Settlement |
| Description | Landlord proposes deposit refund deductions, tenant accepts or disputes deductions, and landlord marks refund as paid. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. Tenancy is expired or terminated. |
|  | 2. Deposit has been confirmed paid. |
|  | 3. User has access to the tenancy. |
| Post-Condition | 1. Deposit refund proposal is created. |
|  | 2. Deduction response is recorded. |
|  | 3. Refund status may become paid. |
| Standard Process | 1. Landlord opens deposit settlement page. |
|  | 2. Landlord proposes refund amount and deductions. |
|  | 3. System creates refund proposal and notifies tenant. |
|  | 4. Tenant views refund proposal. |
|  | 5. Tenant accepts or disputes proposed deduction. |
|  | 6. If agreed, landlord uploads refund payment proof. |
|  | 7. System marks refund as paid. |
| Alternative Flow | A1. Tenant disputes deduction and enters dispute note. |
|  | A2. Landlord proposes full refund with no deduction. |
| Exception Flow | E1. Tenancy not ended. |
|  | E2. Deposit not paid. |
|  | E3. Refund already exists. |
|  | E4. Missing dispute note. |
|  | E5. Settlement not agreed. |
|  | E6. Invalid refund proof file. |

## Use Case 15: View Admin Dashboard

| Field | Specification |
|---|---|
| Use Case | View Admin Dashboard |
| Description | Admin views platform overview counts and shortcut links for pending review queues. |
| Actor | 1. Admin |
| Pre-Condition | 1. Admin is logged in. |
| Post-Condition | 1. Dashboard statistics are displayed. |
|  | 2. Admin can navigate to KYC or property verification queues. |
| Standard Process | 1. Open admin dashboard. |
|  | 2. System retrieves total users, pending KYC count, total properties, and pending property count. |
|  | 3. System displays dashboard summary cards and blocking review queues. |
|  | 4. Admin selects KYC or property review shortcut if action is needed. |
| Alternative Flow | A1. No pending review items exist; system displays zero counts. |
| Exception Flow | E1. Dashboard data fails to load. |
|  | E2. Access denied. |

## Use Case 16: Manage User KYC Verification

| Field | Specification |
|---|---|
| Use Case | Manage User KYC Verification |
| Description | Admin views pending user KYC submissions and approves, rejects, or revokes user identity verification. |
| Actor | 1. Admin |
| Pre-Condition | 1. Admin is logged in. |
|  | 2. User KYC submission exists. |
| Post-Condition | 1. User verification status is updated. |
|  | 2. Rejection or revocation reason may be saved. |
|  | 3. User is notified. |
| Standard Process | 1. Open admin KYC verification page. |
|  | 2. System retrieves pending or verified users. |
|  | 3. Admin reviews user details and IC document. |
|  | 4. Admin approves, rejects, or revokes verification. |
|  | 5. If rejecting or revoking, admin enters reason. |
|  | 6. System updates user verification status and sends notification. |
| Alternative Flow | A1. Admin views previously verified users before revoking verification. |
| Exception Flow | E1. Missing rejection or revocation reason. |
|  | E2. User not found. |
|  | E3. User is not currently verified when revoking. |
|  | E4. Access denied. |

## Use Case 17: Manage Property Verification

| Field | Specification |
|---|---|
| Use Case | Manage Property Verification |
| Description | Admin views pending property verifications and approves, rejects, or revokes property verification. |
| Actor | 1. Admin |
| Pre-Condition | 1. Admin is logged in. |
|  | 2. Property submission exists. |
| Post-Condition | 1. Property verification status is updated. |
|  | 2. Rejection or revocation reason may be saved. |
|  | 3. Landlord is notified. |
| Standard Process | 1. Open admin property verification page. |
|  | 2. System retrieves pending or verified properties. |
|  | 3. Admin reviews property details, landlord information, and photos. |
|  | 4. Admin approves, rejects, or revokes property verification. |
|  | 5. If rejecting or revoking, admin enters reason. |
|  | 6. System updates property verification status and sends notification. |
| Alternative Flow | A1. Admin views additional property photos before deciding. |
| Exception Flow | E1. Missing rejection or revocation reason. |
|  | E2. Property not found. |
|  | E3. Property is not currently verified when revoking. |
|  | E4. Access denied. |

## Use Case 18: Manage User Accounts

| Field | Specification |
|---|---|
| Use Case | Manage User Accounts |
| Description | Admin views user accounts and suspends, reactivates, or deletes non-admin accounts when allowed. |
| Actor | 1. Admin |
| Pre-Condition | 1. Admin is logged in. |
|  | 2. Target account is not an admin account. |
| Post-Condition | 1. User list is displayed. |
|  | 2. Account may be suspended, reactivated, or deleted. |
|  | 3. User is notified for suspension or reactivation. |
| Standard Process | 1. Open admin user management page. |
|  | 2. Search or filter users by role or account status. |
|  | 3. Select target user account. |
|  | 4. Admin suspends or reactivates account. |
|  | 5. System updates account status and sends notification. |
|  | 6. Admin may delete account if there are no active obligations. |
|  | 7. System deletes account after validation. |
| Alternative Flow | A1. Suspended user is blocked from dashboard access and redirected to login with suspended message. |
| Exception Flow | E1. Target user not found. |
|  | E2. Target user is an admin. |
|  | E3. Delete blocked by active tenancy. |
|  | E4. Delete blocked by overdue payment. |
|  | E5. Delete blocked by pending deposit refund. |
|  | E6. Delete blocked by unfinished agreement. |
|  | E7. Access denied. |
