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
|  | 3. IC document is stored. |
| Standard Process | 1. Open register page. |
|  | 2. Enter name, email, password, role, phone, IC number, and IC photo. |
|  | 3. Submit form. |
|  | 4. System validates fields and file. |
|  | 5. System creates user account. |
|  | 6. System stores IC document. |
| Alternative Flow | A1. IC upload fails after user creation; account may still be created depending on upload result handling. |
| Exception Flow | E1. Missing required fields. |
|  | E2. Email already exists. |
|  | E3. IC already exists. |
|  | E4. Invalid IC format. |
|  | E5. Invalid or oversized IC file. |

## Use Case 2: Login

| Field | Specification |
|---|---|
| Use Case | Login |
| Description | Registered user authenticates into the system dashboard. |
| Actor | 1. Tenant |
|  | 2. Landlord |
|  | 3. Admin |
| Pre-Condition | 1. Account exists. |
|  | 2. Credentials are valid. |
| Post-Condition | 1. Session is created. |
|  | 2. User enters role-based dashboard. |
| Standard Process | 1. Open login page. |
|  | 2. Enter email and password. |
|  | 3. Submit form. |
|  | 4. System validates credentials. |
|  | 5. System redirects user by role. |
| Alternative Flow | A1. User is already logged in and directly enters dashboard. |
| Exception Flow | E1. Invalid credentials. |
|  | E2. Authentication service failure. |
|  | E3. Account is suspended; system redirects to login page with suspended message. |

## Use Case 3: Reset Password

| Field | Specification |
|---|---|
| Use Case | Reset Password |
| Description | User requests password reset link and sets a new password using token. |
| Actor | 1. Tenant |
|  | 2. Landlord |
|  | 3. Admin |
| Pre-Condition | 1. User knows account email. |
|  | 2. Reset token is valid, not expired, and not used. |
| Post-Condition | 1. Password is updated. |
|  | 2. Reset token is marked used. |
| Standard Process | 1. User submits email in forgot password page. |
|  | 2. System creates reset token and sends reset link. |
|  | 3. User opens reset link. |
|  | 4. User submits new password. |
|  | 5. System validates token and updates password. |
| Alternative Flow | A1. Non-existing email still returns generic success for security. |
| Exception Flow | E1. Token expired or invalid. |
|  | E2. Password below minimum length. |
|  | E3. Email sending fails. |

## Use Case 4: Manage Profile

| Field | Specification |
|---|---|
| Use Case | Manage Profile |
| Description | User updates profile details such as name, phone, language, or IC information. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
|  | 2. Profile exists. |
| Post-Condition | 1. Profile details are updated. |
|  | 2. Verification may be reset if IC changes. |
| Standard Process | 1. Open profile page. |
|  | 2. Edit allowed profile fields. |
|  | 3. Submit form. |
|  | 4. System validates data. |
|  | 5. System saves updated profile. |
| Alternative Flow | A1. User changes IC number; system marks account as unverified again. |
| Exception Flow | E1. Invalid IC format. |
|  | E2. Duplicate IC number. |
|  | E3. Missing required name. |

## Use Case 5: View Notifications

| Field | Specification |
|---|---|
| Use Case | View Notifications |
| Description | User views in-app notifications about tenancy, agreement, payment, and verification events. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
| Post-Condition | 1. Notifications are displayed. |
|  | 2. Selected notification may be marked as read. |
| Standard Process | 1. User clicks notification bell. |
|  | 2. System retrieves notifications. |
|  | 3. User views notification list. |
|  | 4. User selects notification or marks all as read. |
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

## Use Case 7: Respond to Tenancy Invitation

| Field | Specification |
|---|---|
| Use Case | Respond to Tenancy Invitation |
| Description | Tenant accepts or declines tenancy invitation from landlord. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Tenant is logged in. |
|  | 2. Invitation exists. |
|  | 3. Tenancy status is invited. |
| Post-Condition | 1. If accepted, tenancy becomes pending. |
|  | 2. If declined, invitation is cancelled and room becomes available. |
| Standard Process | 1. Open tenancy invitation. |
|  | 2. Review tenancy details. |
|  | 3. Choose accept or decline. |
|  | 4. System validates response. |
|  | 5. System updates tenancy status. |
| Alternative Flow | A1. Corporate authorized signatory responds on behalf of company. |
| Exception Flow | E1. Invitation already responded. |
|  | E2. Tenant is not verified. |
|  | E3. Access denied. |

## Use Case 8: Withdraw from Tenancy

| Field | Specification |
|---|---|
| Use Case | Withdraw from Tenancy |
| Description | Tenant cancels a pending tenancy before signing agreement. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Tenant is logged in. |
|  | 2. Tenancy status is pending. |
|  | 3. Agreement is not signed. |
| Post-Condition | 1. Tenancy is cancelled. |
|  | 2. Room becomes available. |
| Standard Process | 1. Open tenancy page. |
|  | 2. Click withdraw from tenancy. |
|  | 3. Confirm action. |
|  | 4. System cancels tenancy. |
|  | 5. System notifies landlord. |
| Alternative Flow | A1. Tenant cancels before agreement is generated. |
| Exception Flow | E1. Tenancy is not pending. |
|  | E2. Access denied. |
|  | E3. System method mismatch may prevent withdrawal until fixed. |

## Use Case 9: View Tenancy Details

| Field | Specification |
|---|---|
| Use Case | View Tenancy Details |
| Description | User views tenancy details including property, room, agreement, deposit, and payment information. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
|  | 2. User has access to the tenancy. |
| Post-Condition | 1. Tenancy details are displayed. |
| Standard Process | 1. Open tenancy page. |
|  | 2. System retrieves tenancy record. |
|  | 3. System displays tenancy details and current status. |
| Alternative Flow | A1. Different sections appear based on tenancy status. |
| Exception Flow | E1. Tenancy not found. |
|  | E2. Access denied. |

## Use Case 10: Manage Property

| Field | Specification |
|---|---|
| Use Case | Manage Property |
| Description | Landlord creates, views, and deletes property records. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Landlord is logged in. |
|  | 2. Landlord identity is verified. |
| Post-Condition | 1. Property record is created, displayed, or deleted. |
| Standard Process | 1. Open properties page. |
|  | 2. Add or view property. |
|  | 3. Enter property details if creating. |
|  | 4. Submit form. |
|  | 5. System saves property. |
| Alternative Flow | A1. Landlord deletes property if allowed. |
| Exception Flow | E1. Missing property fields. |
|  | E2. Invalid postcode. |
|  | E3. Property has related active records. |

## Use Case 11: Upload Property Photos

| Field | Specification |
|---|---|
| Use Case | Upload Property Photos |
| Description | Landlord uploads photos for a property listing. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Property exists. |
|  | 2. Property belongs to landlord. |
|  | 3. File is valid. |
| Post-Condition | 1. Photo is stored and linked to property. |
| Standard Process | 1. Open property details. |
|  | 2. Choose photo. |
|  | 3. Submit upload. |
|  | 4. System stores photo. |
|  | 5. Photo appears in gallery. |
| Alternative Flow | A1. Landlord deletes uploaded photo. |
| Exception Flow | E1. Invalid file type. |
|  | E2. File too large. |
|  | E3. Upload failure. |

## Use Case 12: Manage Room

| Field | Specification |
|---|---|
| Use Case | Manage Room |
| Description | Landlord creates or deletes rentable room or unit under a property. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Property exists. |
|  | 2. Property belongs to landlord. |
| Post-Condition | 1. Room record is created or deleted. |
| Standard Process | 1. Open property details. |
|  | 2. Add room. |
|  | 3. Enter room type, rent, furnishing, utilities, and preferences. |
|  | 4. Submit form. |
|  | 5. System saves room. |
| Alternative Flow | A1. Landlord deletes room when it has no active tenancy. |
| Exception Flow | E1. Invalid room data. |
|  | E2. Room is linked to active tenancy. |
|  | E3. Access denied. |

## Use Case 13: Look Up Tenant

| Field | Specification |
|---|---|
| Use Case | Look Up Tenant |
| Description | Landlord searches for a tenant account by email before invitation. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Landlord is logged in. |
|  | 2. Tenant email is entered. |
| Post-Condition | 1. Tenant account result is displayed. |
| Standard Process | 1. Open create tenancy page. |
|  | 2. Enter tenant email. |
|  | 3. Click look up. |
|  | 4. System searches tenant account. |
|  | 5. System displays result. |
| Alternative Flow | A1. No account found; system asks landlord to tell tenant to register. |
| Exception Flow | E1. Invalid email. |
|  | E2. Access denied. |

## Use Case 14: Invite Tenant

| Field | Specification |
|---|---|
| Use Case | Invite Tenant |
| Description | Landlord creates tenancy invitation for individual tenant or corporate signatory. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Landlord is logged in. |
|  | 2. Property is verified. |
|  | 3. Room is available. |
|  | 4. Tenant account exists. |
| Post-Condition | 1. Tenancy invitation is created. |
|  | 2. Room is reserved. |
|  | 3. Tenant is notified. |
| Standard Process | 1. Select available room. |
|  | 2. Enter tenant and tenancy terms. |
|  | 3. Submit invitation. |
|  | 4. System validates room and tenant. |
|  | 5. System creates invited tenancy. |
| Alternative Flow | A1. Landlord creates corporate tenancy with authorized signatory and occupants. |
| Exception Flow | E1. Tenant not found. |
|  | E2. Room unavailable. |
|  | E3. Property not verified. |

## Use Case 15: Manage Additional Occupants

| Field | Specification |
|---|---|
| Use Case | Manage Additional Occupants |
| Description | Landlord manages co-tenants or corporate occupants listed under tenancy. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy exists. |
|  | 2. Landlord owns the tenancy. |
| Post-Condition | 1. Occupant list is updated. |
| Standard Process | 1. Open tenancy details. |
|  | 2. Add, edit, link, or remove occupant. |
|  | 3. Submit changes. |
|  | 4. System updates occupant record. |
| Alternative Flow | A1. Corporate occupant is linked to registered tenant account. |
| Exception Flow | E1. Missing occupant name. |
|  | E2. Invalid linked email. |
|  | E3. Access denied. |

## Use Case 16: Configure Agreement Preferences

| Field | Specification |
|---|---|
| Use Case | Configure Agreement Preferences |
| Description | Landlord completes agreement wizard settings used for AI agreement generation. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy exists. |
|  | 2. Tenancy is accepted and pending. |
| Post-Condition | 1. Agreement preferences are saved. |
|  | 2. Wizard may be marked complete. |
| Standard Process | 1. Open agreement wizard. |
|  | 2. Complete house rules, utilities, financial, maintenance, ending, and deposit sections. |
|  | 3. Save preferences. |
|  | 4. System stores wizard data. |
| Alternative Flow | A1. Landlord resumes incomplete wizard. |
| Exception Flow | E1. Missing required wizard fields. |
|  | E2. Invalid values. |
|  | E3. Access denied. |

## Use Case 17: Generate AI Agreement

| Field | Specification |
|---|---|
| Use Case | Generate AI Agreement |
| Description | Landlord generates AI tenancy agreement from tenancy data and preferences. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy is pending. |
|  | 2. Agreement preferences are complete. |
|  | 3. Generation limit is not exceeded. |
| Post-Condition | 1. Draft agreement is created. |
|  | 2. Agreement revision and event are recorded. |
| Standard Process | 1. Open tenancy or wizard page. |
|  | 2. Click generate agreement. |
|  | 3. System sends tenancy data to AI service. |
|  | 4. System stores draft agreement, summary, and red flags. |
| Alternative Flow | A1. Landlord regenerates agreement after tenant requests changes. |
| Exception Flow | E1. Wizard incomplete. |
|  | E2. AI generation failure. |
|  | E3. Rate limit exceeded. |

## Use Case 18: View Agreement

| Field | Specification |
|---|---|
| Use Case | View Agreement |
| Description | User views agreement content, plain-language summary, and red-flag analysis. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. Agreement exists. |
|  | 2. User has access to agreement. |
| Post-Condition | 1. Agreement details are displayed. |
| Standard Process | 1. Open agreement page. |
|  | 2. System retrieves agreement. |
|  | 3. System displays agreement content, summary, and red flags. |
| Alternative Flow | A1. User switches English/Bahasa Malaysia summary and red-flag view. |
| Exception Flow | E1. Agreement not found. |
|  | E2. Access denied. |

## Use Case 19: Request Agreement Changes

| Field | Specification |
|---|---|
| Use Case | Request Agreement Changes |
| Description | Tenant submits structured change requests for finalized agreement. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Agreement is finalized. |
|  | 2. Tenant has access. |
| Post-Condition | 1. Agreement status becomes negotiating. |
|  | 2. Landlord is notified. |
| Standard Process | 1. Open agreement. |
|  | 2. Choose request changes. |
|  | 3. Enter category, requested change, reason, and note. |
|  | 4. Submit request. |
|  | 5. System saves change request. |
| Alternative Flow | A1. Tenant submits multiple structured requests. |
| Exception Flow | E1. No valid request entered. |
|  | E2. Agreement not finalized. |
|  | E3. Access denied. |

## Use Case 20: Review / Revise Agreement

| Field | Specification |
|---|---|
| Use Case | Review / Revise Agreement |
| Description | Landlord edits draft or negotiating agreement manually or using AI assist. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Agreement exists. |
|  | 2. Agreement is draft or negotiating. |
| Post-Condition | 1. Revised draft is saved. |
|  | 2. New revision and event are recorded. |
| Standard Process | 1. Open agreement page. |
|  | 2. Review tenant requests or red flags. |
|  | 3. Edit agreement content. |
|  | 4. Save changes. |
|  | 5. System records revision. |
| Alternative Flow | A1. Landlord uses AI assist to suggest revisions. |
|  | A2. Landlord refreshes AI analysis. |
| Exception Flow | E1. Agreement already signed. |
|  | E2. Agreement content too short. |
|  | E3. Access denied. |

## Use Case 21: Finalize Agreement

| Field | Specification |
|---|---|
| Use Case | Finalize Agreement |
| Description | Landlord sends agreement to tenant for review and signing. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Agreement is draft or negotiating. |
|  | 2. Agreement content exists. |
|  | 3. Wizard is complete. |
|  | 4. Required identity data exists. |
|  | 5. Red flags reviewed. |
| Post-Condition | 1. Agreement status becomes finalized. |
|  | 2. Tenant is notified. |
| Standard Process | 1. Open agreement. |
|  | 2. Review checklist. |
|  | 3. Confirm red flags reviewed. |
|  | 4. Click finalize. |
|  | 5. System updates agreement status. |
| Alternative Flow | A1. Landlord resolves pending structured requests before finalizing. |
| Exception Flow | E1. Checklist incomplete. |
|  | E2. Pending change requests. |
|  | E3. Invalid agreement status. |

## Use Case 22: Sign Agreement

| Field | Specification |
|---|---|
| Use Case | Sign Agreement |
| Description | Tenant digitally signs finalized agreement after acknowledgement. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Agreement is finalized. |
|  | 2. Tenant has reviewed agreement. |
| Post-Condition | 1. Digital signature is recorded. |
|  | 2. Agreement waits for signed hard-copy proof. |
| Standard Process | 1. Open finalized agreement. |
|  | 2. Review content, summary, and red flags. |
|  | 3. Tick acknowledgement. |
|  | 4. Click sign. |
|  | 5. System records signature metadata and content hash. |
| Alternative Flow | A1. Corporate authorized signatory signs on behalf of company. |
| Exception Flow | E1. Agreement not finalized. |
|  | E2. Acknowledgement not checked. |
|  | E3. Access denied. |

## Use Case 23: Upload Signed Agreement Proof

| Field | Specification |
|---|---|
| Use Case | Upload Signed Agreement Proof |
| Description | Tenant uploads signed hard-copy agreement file for landlord approval. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Digital signature is completed. |
|  | 2. Agreement status is pending signature proof. |
| Post-Condition | 1. Signature proof is uploaded. |
|  | 2. Landlord is notified. |
| Standard Process | 1. Choose signed file. |
|  | 2. Submit upload. |
|  | 3. System validates file. |
|  | 4. System stores proof. |
|  | 5. System marks proof under review. |
| Alternative Flow | A1. Tenant re-uploads after landlord rejection. |
| Exception Flow | E1. Invalid file type. |
|  | E2. File too large. |
|  | E3. Proof already under review. |

## Use Case 24: Review Signed Agreement Proof

| Field | Specification |
|---|---|
| Use Case | Review Signed Agreement Proof |
| Description | Landlord approves or rejects tenant uploaded signed hard-copy agreement. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Signature proof is under review. |
|  | 2. Agreement is pending signature proof. |
| Post-Condition | 1. If approved, agreement is signed and tenancy becomes active. |
|  | 2. If rejected, tenant must re-upload proof. |
| Standard Process | 1. Open tenancy details. |
|  | 2. Open uploaded proof file. |
|  | 3. Approve or reject proof. |
|  | 4. System updates agreement and tenancy status. |
| Alternative Flow | A1. Reject proof with reason. |
| Exception Flow | E1. Proof not under review. |
|  | E2. Missing rejection reason. |
|  | E3. Access denied. |

## Use Case 25: View / Download Signed Agreement

| Field | Specification |
|---|---|
| Use Case | View / Download Signed Agreement |
| Description | User views or downloads tenancy agreement PDF. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. Agreement exists. |
|  | 2. User has access. |
| Post-Condition | 1. Agreement PDF is generated or downloaded. |
| Standard Process | 1. Open agreement page. |
|  | 2. Click download PDF. |
|  | 3. System generates PDF. |
|  | 4. User downloads file. |
| Alternative Flow | A1. User downloads agreement before or after final signing. |
| Exception Flow | E1. PDF generation failure. |
|  | E2. Agreement not found. |
|  | E3. Access denied. |

## Use Case 26: Upload Deposit Proof

| Field | Specification |
|---|---|
| Use Case | Upload Deposit Proof |
| Description | Tenant uploads proof of security deposit payment. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Tenancy exists. |
|  | 2. Deposit is not confirmed paid. |
| Post-Condition | 1. Deposit status becomes under review. |
|  | 2. Landlord is notified. |
| Standard Process | 1. Open tenancy or payments page. |
|  | 2. Choose deposit proof file. |
|  | 3. Submit upload. |
|  | 4. System stores proof. |
|  | 5. System updates deposit status. |
| Alternative Flow | A1. Tenant re-uploads proof after rejection. |
| Exception Flow | E1. Deposit already paid. |
|  | E2. Invalid file. |
|  | E3. Upload failure. |

## Use Case 27: Verify / Reject Deposit Proof

| Field | Specification |
|---|---|
| Use Case | Verify / Reject Deposit Proof |
| Description | Landlord approves or rejects tenant deposit payment proof. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Deposit proof is under review. |
|  | 2. Landlord owns tenancy. |
| Post-Condition | 1. Deposit is marked paid or rejected. |
|  | 2. Tenant is notified. |
| Standard Process | 1. Open payments or tenancy page. |
|  | 2. View deposit proof. |
|  | 3. Approve or reject. |
|  | 4. System updates deposit status. |
| Alternative Flow | A1. Reject with reason and request re-upload. |
| Exception Flow | E1. Deposit not under review. |
|  | E2. Missing rejection reason. |
|  | E3. Access denied. |

## Use Case 28: Upload Rent Payment Proof

| Field | Specification |
|---|---|
| Use Case | Upload Rent Payment Proof |
| Description | Tenant uploads monthly rent payment proof. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Rent payment schedule exists. |
|  | 2. Payment is not settled. |
| Post-Condition | 1. Payment status becomes under review. |
|  | 2. Landlord is notified. |
| Standard Process | 1. Open payments page. |
|  | 2. Select rent payment. |
|  | 3. Choose proof file. |
|  | 4. Upload proof. |
|  | 5. System updates payment status. |
| Alternative Flow | A1. Tenant replaces previous proof after rejection. |
| Exception Flow | E1. Payment already paid. |
|  | E2. Invalid file. |
|  | E3. Access denied. |

## Use Case 29: Verify / Reject Rent Payment Proof

| Field | Specification |
|---|---|
| Use Case | Verify / Reject Rent Payment Proof |
| Description | Landlord approves or rejects monthly rent payment proof. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Rent payment proof is under review. |
|  | 2. Landlord owns property for tenancy. |
| Post-Condition | 1. Payment is marked paid or returned to pending. |
|  | 2. Tenant is notified. |
| Standard Process | 1. Open landlord payments page. |
|  | 2. Review payment proof. |
|  | 3. Approve or reject. |
|  | 4. System updates payment status. |
| Alternative Flow | A1. Reject with reason and request re-upload. |
| Exception Flow | E1. Payment not under review. |
|  | E2. Missing rejection reason. |
|  | E3. Access denied. |

## Use Case 30: View Rent Payment Schedule

| Field | Specification |
|---|---|
| Use Case | View Rent Payment Schedule |
| Description | Tenant views monthly rent schedule and payment statuses. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Tenancy is active. |
|  | 2. Rent payment schedule is generated. |
| Post-Condition | 1. Payment schedule is displayed. |
| Standard Process | 1. Open payments page. |
|  | 2. System retrieves payment records. |
|  | 3. User views due dates, amounts, and statuses. |
| Alternative Flow | A1. System shows pending, under review, paid, or overdue status. |
| Exception Flow | E1. No active tenancy. |
|  | E2. No payment schedule found. |

## Use Case 31: Create Condition Report

| Field | Specification |
|---|---|
| Use Case | Create Condition Report |
| Description | Tenant or landlord creates move-in, move-out, or inspection condition report. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. User is logged in. |
|  | 2. Tenancy exists. |
|  | 3. User has access. |
| Post-Condition | 1. Condition report is created. |
|  | 2. Other party is notified. |
| Standard Process | 1. Open condition reports page. |
|  | 2. Select report type. |
|  | 3. Enter notes. |
|  | 4. Create report. |
|  | 5. System stores report. |
| Alternative Flow | A1. Either tenant or landlord creates the report. |
| Exception Flow | E1. Invalid report type. |
|  | E2. Duplicate restricted report. |
|  | E3. Access denied. |

## Use Case 32: Upload Condition Photos

| Field | Specification |
|---|---|
| Use Case | Upload Condition Photos |
| Description | User uploads photos to support a condition report. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. Condition report exists. |
|  | 2. Report is not acknowledged. |
| Post-Condition | 1. Photos are attached to condition report. |
| Standard Process | 1. Open condition report. |
|  | 2. Select room or area. |
|  | 3. Choose photo. |
|  | 4. Upload photo. |
|  | 5. System stores photo. |
| Alternative Flow | A1. Uploader deletes own photo before acknowledgement. |
| Exception Flow | E1. Invalid file. |
|  | E2. Upload failure. |
|  | E3. Access denied. |

## Use Case 33: Acknowledge Condition Report

| Field | Specification |
|---|---|
| Use Case | Acknowledge Condition Report |
| Description | Other party acknowledges that condition report has been reviewed. |
| Actor | 1. Tenant |
|  | 2. Landlord |
| Pre-Condition | 1. Report exists. |
|  | 2. Report was created by the other party. |
|  | 3. Report has photos. |
| Post-Condition | 1. Report is marked acknowledged. |
|  | 2. Creator is notified. |
| Standard Process | 1. Open condition report. |
|  | 2. Review notes and photos. |
|  | 3. Click acknowledge. |
|  | 4. System records acknowledgement. |
| Alternative Flow | A1. Tenant acknowledges landlord report, or landlord acknowledges tenant report. |
| Exception Flow | E1. User tries to acknowledge own report. |
|  | E2. Report already acknowledged. |
|  | E3. Access denied. |

## Use Case 34: Renew Tenancy

| Field | Specification |
|---|---|
| Use Case | Renew Tenancy |
| Description | Landlord creates renewal tenancy invitation from an existing tenancy. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Existing tenancy is eligible for renewal. |
|  | 2. Landlord owns tenancy. |
| Post-Condition | 1. New invited renewal tenancy is created. |
|  | 2. Tenant is notified. |
| Standard Process | 1. Open tenancy details. |
|  | 2. Click renew tenancy. |
|  | 3. Enter new start date, end date, rent, and deposit. |
|  | 4. Submit renewal. |
|  | 5. System creates new invited tenancy. |
| Alternative Flow | A1. Tenant must accept renewal invitation before new agreement workflow starts. |
| Exception Flow | E1. Invalid dates. |
|  | E2. Tenancy not eligible. |
|  | E3. Access denied. |

## Use Case 35: Terminate Tenancy

| Field | Specification |
|---|---|
| Use Case | Terminate Tenancy |
| Description | Landlord terminates an active tenancy early. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy exists. |
|  | 2. Landlord owns tenancy. |
|  | 3. Termination reason is provided. |
| Post-Condition | 1. Tenancy status becomes terminated. |
|  | 2. Room becomes available. |
| Standard Process | 1. Open tenancy details. |
|  | 2. Click terminate tenancy. |
|  | 3. Enter termination reason. |
|  | 4. Confirm action. |
|  | 5. System terminates tenancy. |
| Alternative Flow | A1. Termination may be used before deposit settlement starts. |
| Exception Flow | E1. Missing reason. |
|  | E2. Tenancy not found. |
|  | E3. Access denied. |

## Use Case 36: Manage Deposit Settlement

| Field | Specification |
|---|---|
| Use Case | Manage Deposit Settlement |
| Description | Landlord starts end-of-tenancy deposit refund process and manages proposed deductions. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy is expired or terminated. |
|  | 2. Deposit has been confirmed paid. |
| Post-Condition | 1. Deposit refund proposal is created. |
|  | 2. Tenant is notified. |
| Standard Process | 1. Open deposit settlement page. |
|  | 2. Start settlement. |
|  | 3. Add deduction reason and amount if needed. |
|  | 4. Submit proposal. |
|  | 5. System creates refund record. |
| Alternative Flow | A1. No deductions are added; settlement can become agreed directly. |
| Exception Flow | E1. Tenancy not ended. |
|  | E2. Deposit not paid. |
|  | E3. Refund already exists. |

## Use Case 37: View Deposit Refund Proposal

| Field | Specification |
|---|---|
| Use Case | View Deposit Refund Proposal |
| Description | Tenant reviews landlord proposed deposit refund and deductions. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Deposit refund proposal exists. |
|  | 2. Tenant has access. |
| Post-Condition | 1. Proposal details are displayed. |
| Standard Process | 1. Open tenancy page. |
|  | 2. View deposit settlement section. |
|  | 3. System displays original deposit, deductions, and refund amount. |
| Alternative Flow | A1. Tenant sees paid refund proof after landlord marks refund paid. |
| Exception Flow | E1. No refund record found. |
|  | E2. Access denied. |

## Use Case 38: Accept / Dispute Deduction

| Field | Specification |
|---|---|
| Use Case | Accept / Dispute Deduction |
| Description | Tenant accepts or disputes each proposed deposit deduction. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Deduction is proposed. |
|  | 2. Tenant has access to refund proposal. |
| Post-Condition | 1. Deduction status becomes accepted or disputed. |
|  | 2. Refund settlement status is updated. |
| Standard Process | 1. Review proposed deduction. |
|  | 2. Click accept or dispute. |
|  | 3. If disputing, enter dispute note. |
|  | 4. Submit response. |
|  | 5. System updates deduction. |
| Alternative Flow | A1. If all deductions are accepted, settlement becomes agreed. |
| Exception Flow | E1. Missing dispute note. |
|  | E2. Deduction already responded. |
|  | E3. Access denied. |

## Use Case 39: Mark Refund as Paid

| Field | Specification |
|---|---|
| Use Case | Mark Refund as Paid |
| Description | Landlord uploads refund payment proof and marks deposit refund as paid. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Deposit settlement is agreed. |
|  | 2. Refund proof file is valid. |
| Post-Condition | 1. Refund status becomes paid. |
|  | 2. Tenant is notified. |
| Standard Process | 1. Open deposit settlement page. |
|  | 2. Choose refund payment proof. |
|  | 3. Upload proof. |
|  | 4. System stores proof. |
|  | 5. System marks refund as paid. |
| Alternative Flow | A1. Tenant later views refund payment proof. |
| Exception Flow | E1. Settlement not agreed. |
|  | E2. Invalid file. |
|  | E3. Upload failure. |

## Use Case 40: View Pending KYC Submissions

| Field | Specification |
|---|---|
| Use Case | View Pending KYC Submissions |
| Description | Admin views users waiting for identity verification. |
| Actor | 1. Admin |
| Pre-Condition | 1. Admin is logged in. |
| Post-Condition | 1. KYC queue is displayed. |
| Standard Process | 1. Open admin KYC verification page. |
|  | 2. System retrieves unverified users. |
|  | 3. Admin reviews user details and IC document. |
| Alternative Flow | A1. Previously rejected users are shown with rejection reason. |
| Exception Flow | E1. Access denied. |
|  | E2. Data loading failure. |

## Use Case 41: Approve / Reject User KYC

| Field | Specification |
|---|---|
| Use Case | Approve / Reject User KYC |
| Description | Admin approves or rejects user identity verification. |
| Actor | 1. Admin |
| Pre-Condition | 1. User is pending verification. |
|  | 2. Admin has reviewed KYC details. |
| Post-Condition | 1. User is verified or rejection reason is saved. |
|  | 2. User is notified. |
| Standard Process | 1. Open pending KYC submission. |
|  | 2. Review user IC details and document. |
|  | 3. Click approve or reject. |
|  | 4. If rejecting, enter reason. |
|  | 5. System updates user verification status. |
| Alternative Flow | A1. Rejected user may update documents and wait for review again. |
| Exception Flow | E1. Missing rejection reason. |
|  | E2. User not found. |
|  | E3. Access denied. |

## Use Case 42: View Pending Property Verifications

| Field | Specification |
|---|---|
| Use Case | View Pending Property Verifications |
| Description | Admin views properties waiting for approval. |
| Actor | 1. Admin |
| Pre-Condition | 1. Admin is logged in. |
| Post-Condition | 1. Property verification queue is displayed. |
| Standard Process | 1. Open admin property verification page. |
|  | 2. System retrieves unverified properties. |
|  | 3. Admin reviews property details, landlord info, and photos. |
| Alternative Flow | A1. Previously rejected properties are shown with rejection reason. |
| Exception Flow | E1. Access denied. |
|  | E2. Data loading failure. |

## Use Case 43: Approve / Reject Property

| Field | Specification |
|---|---|
| Use Case | Approve / Reject Property |
| Description | Admin approves or rejects a landlord property listing. |
| Actor | 1. Admin |
| Pre-Condition | 1. Property is pending verification. |
|  | 2. Admin has reviewed property details. |
| Post-Condition | 1. Property is verified or rejection reason is saved. |
|  | 2. Landlord is notified. |
| Standard Process | 1. Open pending property submission. |
|  | 2. Review property details and photos. |
|  | 3. Click approve or reject. |
|  | 4. If rejecting, enter reason. |
|  | 5. System updates property verification status. |
| Alternative Flow | A1. Rejected property remains visible for later re-review. |
| Exception Flow | E1. Missing rejection reason. |
|  | E2. Property not found. |
|  | E3. Access denied. |

