# 4.2.2 Use Case Specification

## Use Case 1: Register Account

| Field | Specification |
|---|---|
| Use Case | Register Account |
| Description | Guest creates a new landlord or tenant account with personal details and required IC photo. |
| Actor | 1. Guest |
| Pre-Condition | 1. User is not logged in.<br>2. Email and IC number are not already used.<br>3. System is online. |
| Post-Condition | 1. New user account is created.<br>2. Password is hashed.<br>3. IC document is stored. |
| Standard Process | 1. Open register page.<br>2. Enter name, email, password, role, phone, IC number, and IC photo.<br>3. Submit form.<br>4. System validates fields and file.<br>5. System creates user account.<br>6. System stores IC document. |
| Alternative Flow | A1. IC upload fails after user creation; account may still be created depending on upload result handling. |
| Exception Flow | E1. Missing required fields.<br>E2. Email already exists.<br>E3. IC already exists.<br>E4. Invalid IC format.<br>E5. Invalid or oversized IC file. |

## Use Case 2: Login

| Field | Specification |
|---|---|
| Use Case | Login |
| Description | Registered user authenticates into the system dashboard. |
| Actor | 1. Tenant<br>2. Landlord<br>3. Admin |
| Pre-Condition | 1. Account exists.<br>2. Credentials are valid. |
| Post-Condition | 1. Session is created.<br>2. User enters role-based dashboard. |
| Standard Process | 1. Open login page.<br>2. Enter email and password.<br>3. Submit form.<br>4. System validates credentials.<br>5. System redirects user by role. |
| Alternative Flow | A1. User is already logged in and directly enters dashboard. |
| Exception Flow | E1. Invalid credentials.<br>E2. Authentication service failure. |

## Use Case 3: Reset Password

| Field | Specification |
|---|---|
| Use Case | Reset Password |
| Description | User requests password reset link and sets a new password using token. |
| Actor | 1. Tenant<br>2. Landlord<br>3. Admin |
| Pre-Condition | 1. User knows account email.<br>2. Reset token is valid, not expired, and not used. |
| Post-Condition | 1. Password is updated.<br>2. Reset token is marked used. |
| Standard Process | 1. User submits email in forgot password page.<br>2. System creates reset token and sends reset link.<br>3. User opens reset link.<br>4. User submits new password.<br>5. System validates token and updates password. |
| Alternative Flow | A1. Non-existing email still returns generic success for security. |
| Exception Flow | E1. Token expired or invalid.<br>E2. Password below minimum length.<br>E3. Email sending fails. |

## Use Case 4: Logout

| Field | Specification |
|---|---|
| Use Case | Logout |
| Description | User ends the current authenticated session. |
| Actor | 1. Tenant<br>2. Landlord<br>3. Admin |
| Pre-Condition | 1. User is logged in. |
| Post-Condition | 1. Session is cleared.<br>2. User is redirected to login page. |
| Standard Process | 1. User clicks logout.<br>2. System clears session.<br>3. System redirects user to login page. |
| Alternative Flow | A1. User session has already expired; system still redirects to login. |
| Exception Flow | E1. Sign-out service failure. |

## Use Case 5: Manage Profile

| Field | Specification |
|---|---|
| Use Case | Manage Profile |
| Description | User updates profile details such as name, phone, language, or IC information. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. User is logged in.<br>2. Profile exists. |
| Post-Condition | 1. Profile details are updated.<br>2. Verification may be reset if IC changes. |
| Standard Process | 1. Open profile page.<br>2. Edit allowed profile fields.<br>3. Submit form.<br>4. System validates data.<br>5. System saves updated profile. |
| Alternative Flow | A1. User changes IC number; system marks account as unverified again. |
| Exception Flow | E1. Invalid IC format.<br>E2. Duplicate IC number.<br>E3. Missing required name. |

## Use Case 6: Upload Identity / Income Documents

| Field | Specification |
|---|---|
| Use Case | Upload Identity / Income Documents |
| Description | User uploads IC copy or income proof for verification and tenancy processing. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. User is logged in.<br>2. File type and size are valid. |
| Post-Condition | 1. Document is stored.<br>2. Previous document of same type is replaced if it exists. |
| Standard Process | 1. Open document upload section.<br>2. Select document type.<br>3. Choose file.<br>4. Submit upload.<br>5. System stores file and document record. |
| Alternative Flow | A1. User replaces existing uploaded document. |
| Exception Flow | E1. Invalid file type.<br>E2. File too large.<br>E3. Upload service failure. |

## Use Case 7: View Notifications

| Field | Specification |
|---|---|
| Use Case | View Notifications |
| Description | User views in-app notifications about tenancy, agreement, payment, and verification events. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. User is logged in. |
| Post-Condition | 1. Notifications are displayed.<br>2. Selected notification may be marked as read. |
| Standard Process | 1. User clicks notification bell.<br>2. System retrieves notifications.<br>3. User views notification list.<br>4. User selects notification or marks all as read. |
| Alternative Flow | A1. No notifications exist; system shows empty state. |
| Exception Flow | E1. Notification loading fails. |

## Use Case 8: Send Message

| Field | Specification |
|---|---|
| Use Case | Send Message |
| Description | Tenant and landlord communicate within a tenancy message thread. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. User is logged in.<br>2. Tenancy exists.<br>3. User is related to the tenancy. |
| Post-Condition | 1. Message is saved.<br>2. Receiver can view the message. |
| Standard Process | 1. Open messages page.<br>2. Select tenancy thread.<br>3. Enter message content.<br>4. Send message.<br>5. System stores message and updates thread. |
| Alternative Flow | A1. Receiver opens thread and unread messages are marked read. |
| Exception Flow | E1. Empty message.<br>E2. Message too long.<br>E3. Access denied. |

## Use Case 9: Respond to Tenancy Invitation

| Field | Specification |
|---|---|
| Use Case | Respond to Tenancy Invitation |
| Description | Tenant accepts or declines tenancy invitation from landlord. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Tenant is logged in.<br>2. Invitation exists.<br>3. Tenancy status is invited. |
| Post-Condition | 1. If accepted, tenancy becomes pending.<br>2. If declined, invitation is cancelled and room becomes available. |
| Standard Process | 1. Open tenancy invitation.<br>2. Review tenancy details.<br>3. Choose accept or decline.<br>4. System validates response.<br>5. System updates tenancy status. |
| Alternative Flow | A1. Corporate authorized signatory responds on behalf of company. |
| Exception Flow | E1. Invitation already responded.<br>E2. Tenant is not verified.<br>E3. Access denied. |

## Use Case 10: Withdraw from Tenancy

| Field | Specification |
|---|---|
| Use Case | Withdraw from Tenancy |
| Description | Tenant cancels a pending tenancy before signing agreement. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Tenant is logged in.<br>2. Tenancy status is pending.<br>3. Agreement is not signed. |
| Post-Condition | 1. Tenancy is cancelled.<br>2. Room becomes available. |
| Standard Process | 1. Open tenancy page.<br>2. Click withdraw from tenancy.<br>3. Confirm action.<br>4. System cancels tenancy.<br>5. System notifies landlord. |
| Alternative Flow | A1. Tenant cancels before agreement is generated. |
| Exception Flow | E1. Tenancy is not pending.<br>E2. Access denied.<br>E3. System method mismatch may prevent withdrawal until fixed. |

## Use Case 11: View Tenancy Details

| Field | Specification |
|---|---|
| Use Case | View Tenancy Details |
| Description | User views tenancy details including property, room, agreement, deposit, and payment information. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. User is logged in.<br>2. User has access to the tenancy. |
| Post-Condition | 1. Tenancy details are displayed. |
| Standard Process | 1. Open tenancy page.<br>2. System retrieves tenancy record.<br>3. System displays tenancy details and current status. |
| Alternative Flow | A1. Different sections appear based on tenancy status. |
| Exception Flow | E1. Tenancy not found.<br>E2. Access denied. |

## Use Case 12: Manage Property

| Field | Specification |
|---|---|
| Use Case | Manage Property |
| Description | Landlord creates, views, and deletes property records. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Landlord is logged in.<br>2. Landlord identity is verified. |
| Post-Condition | 1. Property record is created, displayed, or deleted. |
| Standard Process | 1. Open properties page.<br>2. Add or view property.<br>3. Enter property details if creating.<br>4. Submit form.<br>5. System saves property. |
| Alternative Flow | A1. Landlord deletes property if allowed. |
| Exception Flow | E1. Missing property fields.<br>E2. Invalid postcode.<br>E3. Property has related active records. |

## Use Case 13: Upload Property Photos

| Field | Specification |
|---|---|
| Use Case | Upload Property Photos |
| Description | Landlord uploads photos for a property listing. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Property exists.<br>2. Property belongs to landlord.<br>3. File is valid. |
| Post-Condition | 1. Photo is stored and linked to property. |
| Standard Process | 1. Open property details.<br>2. Choose photo.<br>3. Submit upload.<br>4. System stores photo.<br>5. Photo appears in gallery. |
| Alternative Flow | A1. Landlord deletes uploaded photo. |
| Exception Flow | E1. Invalid file type.<br>E2. File too large.<br>E3. Upload failure. |

## Use Case 14: Manage Room

| Field | Specification |
|---|---|
| Use Case | Manage Room |
| Description | Landlord creates or deletes rentable room or unit under a property. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Property exists.<br>2. Property belongs to landlord. |
| Post-Condition | 1. Room record is created or deleted. |
| Standard Process | 1. Open property details.<br>2. Add room.<br>3. Enter room type, rent, furnishing, utilities, and preferences.<br>4. Submit form.<br>5. System saves room. |
| Alternative Flow | A1. Landlord deletes room when it has no active tenancy. |
| Exception Flow | E1. Invalid room data.<br>E2. Room is linked to active tenancy.<br>E3. Access denied. |

## Use Case 15: Look Up Tenant

| Field | Specification |
|---|---|
| Use Case | Look Up Tenant |
| Description | Landlord searches for a tenant account by email before invitation. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Landlord is logged in.<br>2. Tenant email is entered. |
| Post-Condition | 1. Tenant account result is displayed. |
| Standard Process | 1. Open create tenancy page.<br>2. Enter tenant email.<br>3. Click look up.<br>4. System searches tenant account.<br>5. System displays result. |
| Alternative Flow | A1. No account found; system asks landlord to tell tenant to register. |
| Exception Flow | E1. Invalid email.<br>E2. Access denied. |

## Use Case 16: Invite Tenant

| Field | Specification |
|---|---|
| Use Case | Invite Tenant |
| Description | Landlord creates tenancy invitation for individual tenant or corporate signatory. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Landlord is logged in.<br>2. Property is verified.<br>3. Room is available.<br>4. Tenant account exists. |
| Post-Condition | 1. Tenancy invitation is created.<br>2. Room is reserved.<br>3. Tenant is notified. |
| Standard Process | 1. Select available room.<br>2. Enter tenant and tenancy terms.<br>3. Submit invitation.<br>4. System validates room and tenant.<br>5. System creates invited tenancy. |
| Alternative Flow | A1. Landlord creates corporate tenancy with authorized signatory and occupants. |
| Exception Flow | E1. Tenant not found.<br>E2. Room unavailable.<br>E3. Property not verified. |

## Use Case 17: Manage Additional Occupants

| Field | Specification |
|---|---|
| Use Case | Manage Additional Occupants |
| Description | Landlord manages co-tenants or corporate occupants listed under tenancy. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy exists.<br>2. Landlord owns the tenancy. |
| Post-Condition | 1. Occupant list is updated. |
| Standard Process | 1. Open tenancy details.<br>2. Add, edit, link, or remove occupant.<br>3. Submit changes.<br>4. System updates occupant record. |
| Alternative Flow | A1. Corporate occupant is linked to registered tenant account. |
| Exception Flow | E1. Missing occupant name.<br>E2. Invalid linked email.<br>E3. Access denied. |

## Use Case 18: Configure Agreement Preferences

| Field | Specification |
|---|---|
| Use Case | Configure Agreement Preferences |
| Description | Landlord completes agreement wizard settings used for AI agreement generation. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy exists.<br>2. Tenancy is accepted and pending. |
| Post-Condition | 1. Agreement preferences are saved.<br>2. Wizard may be marked complete. |
| Standard Process | 1. Open agreement wizard.<br>2. Complete house rules, utilities, financial, maintenance, ending, and deposit sections.<br>3. Save preferences.<br>4. System stores wizard data. |
| Alternative Flow | A1. Landlord resumes incomplete wizard. |
| Exception Flow | E1. Missing required wizard fields.<br>E2. Invalid values.<br>E3. Access denied. |

## Use Case 19: Generate AI Agreement

| Field | Specification |
|---|---|
| Use Case | Generate AI Agreement |
| Description | Landlord generates AI tenancy agreement from tenancy data and preferences. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy is pending.<br>2. Agreement preferences are complete.<br>3. Generation limit is not exceeded. |
| Post-Condition | 1. Draft agreement is created.<br>2. Agreement revision and event are recorded. |
| Standard Process | 1. Open tenancy or wizard page.<br>2. Click generate agreement.<br>3. System sends tenancy data to AI service.<br>4. System stores draft agreement, summary, and red flags. |
| Alternative Flow | A1. Landlord regenerates agreement after tenant requests changes. |
| Exception Flow | E1. Wizard incomplete.<br>E2. AI generation failure.<br>E3. Rate limit exceeded. |

## Use Case 20: View Agreement

| Field | Specification |
|---|---|
| Use Case | View Agreement |
| Description | User views agreement content, plain-language summary, and red-flag analysis. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. Agreement exists.<br>2. User has access to agreement. |
| Post-Condition | 1. Agreement details are displayed. |
| Standard Process | 1. Open agreement page.<br>2. System retrieves agreement.<br>3. System displays agreement content, summary, and red flags. |
| Alternative Flow | A1. User switches English/Bahasa Malaysia summary and red-flag view. |
| Exception Flow | E1. Agreement not found.<br>E2. Access denied. |

## Use Case 21: Request Agreement Changes

| Field | Specification |
|---|---|
| Use Case | Request Agreement Changes |
| Description | Tenant submits structured change requests for finalized agreement. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Agreement is finalized.<br>2. Tenant has access. |
| Post-Condition | 1. Agreement status becomes negotiating.<br>2. Landlord is notified. |
| Standard Process | 1. Open agreement.<br>2. Choose request changes.<br>3. Enter category, requested change, reason, and note.<br>4. Submit request.<br>5. System saves change request. |
| Alternative Flow | A1. Tenant submits multiple structured requests. |
| Exception Flow | E1. No valid request entered.<br>E2. Agreement not finalized.<br>E3. Access denied. |

## Use Case 22: Review / Revise Agreement

| Field | Specification |
|---|---|
| Use Case | Review / Revise Agreement |
| Description | Landlord edits draft or negotiating agreement manually or using AI assist. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Agreement exists.<br>2. Agreement is draft or negotiating. |
| Post-Condition | 1. Revised draft is saved.<br>2. New revision and event are recorded. |
| Standard Process | 1. Open agreement page.<br>2. Review tenant requests or red flags.<br>3. Edit agreement content.<br>4. Save changes.<br>5. System records revision. |
| Alternative Flow | A1. Landlord uses AI assist to suggest revisions.<br>A2. Landlord refreshes AI analysis. |
| Exception Flow | E1. Agreement already signed.<br>E2. Agreement content too short.<br>E3. Access denied. |

## Use Case 23: Finalize Agreement

| Field | Specification |
|---|---|
| Use Case | Finalize Agreement |
| Description | Landlord sends agreement to tenant for review and signing. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Agreement is draft or negotiating.<br>2. Agreement content exists.<br>3. Wizard is complete.<br>4. Required identity data exists.<br>5. Red flags reviewed. |
| Post-Condition | 1. Agreement status becomes finalized.<br>2. Tenant is notified. |
| Standard Process | 1. Open agreement.<br>2. Review checklist.<br>3. Confirm red flags reviewed.<br>4. Click finalize.<br>5. System updates agreement status. |
| Alternative Flow | A1. Landlord resolves pending structured requests before finalizing. |
| Exception Flow | E1. Checklist incomplete.<br>E2. Pending change requests.<br>E3. Invalid agreement status. |

## Use Case 24: Sign Agreement

| Field | Specification |
|---|---|
| Use Case | Sign Agreement |
| Description | Tenant digitally signs finalized agreement after acknowledgement. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Agreement is finalized.<br>2. Tenant has reviewed agreement. |
| Post-Condition | 1. Digital signature is recorded.<br>2. Agreement waits for signed hard-copy proof. |
| Standard Process | 1. Open finalized agreement.<br>2. Review content, summary, and red flags.<br>3. Tick acknowledgement.<br>4. Click sign.<br>5. System records signature metadata and content hash. |
| Alternative Flow | A1. Corporate authorized signatory signs on behalf of company. |
| Exception Flow | E1. Agreement not finalized.<br>E2. Acknowledgement not checked.<br>E3. Access denied. |

## Use Case 25: Upload Signed Agreement Proof

| Field | Specification |
|---|---|
| Use Case | Upload Signed Agreement Proof |
| Description | Tenant uploads signed hard-copy agreement file for landlord approval. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Digital signature is completed.<br>2. Agreement status is pending signature proof. |
| Post-Condition | 1. Signature proof is uploaded.<br>2. Landlord is notified. |
| Standard Process | 1. Choose signed file.<br>2. Submit upload.<br>3. System validates file.<br>4. System stores proof.<br>5. System marks proof under review. |
| Alternative Flow | A1. Tenant re-uploads after landlord rejection. |
| Exception Flow | E1. Invalid file type.<br>E2. File too large.<br>E3. Proof already under review. |

## Use Case 26: Review Signed Agreement Proof

| Field | Specification |
|---|---|
| Use Case | Review Signed Agreement Proof |
| Description | Landlord approves or rejects tenant uploaded signed hard-copy agreement. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Signature proof is under review.<br>2. Agreement is pending signature proof. |
| Post-Condition | 1. If approved, agreement is signed and tenancy becomes active.<br>2. If rejected, tenant must re-upload proof. |
| Standard Process | 1. Open tenancy details.<br>2. Open uploaded proof file.<br>3. Approve or reject proof.<br>4. System updates agreement and tenancy status. |
| Alternative Flow | A1. Reject proof with reason. |
| Exception Flow | E1. Proof not under review.<br>E2. Missing rejection reason.<br>E3. Access denied. |

## Use Case 27: View / Download Signed Agreement

| Field | Specification |
|---|---|
| Use Case | View / Download Signed Agreement |
| Description | User views or downloads tenancy agreement PDF. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. Agreement exists.<br>2. User has access. |
| Post-Condition | 1. Agreement PDF is generated or downloaded. |
| Standard Process | 1. Open agreement page.<br>2. Click download PDF.<br>3. System generates PDF.<br>4. User downloads file. |
| Alternative Flow | A1. User downloads agreement before or after final signing. |
| Exception Flow | E1. PDF generation failure.<br>E2. Agreement not found.<br>E3. Access denied. |

## Use Case 28: Upload Deposit Proof

| Field | Specification |
|---|---|
| Use Case | Upload Deposit Proof |
| Description | Tenant uploads proof of security deposit payment. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Tenancy exists.<br>2. Deposit is not confirmed paid. |
| Post-Condition | 1. Deposit status becomes under review.<br>2. Landlord is notified. |
| Standard Process | 1. Open tenancy or payments page.<br>2. Choose deposit proof file.<br>3. Submit upload.<br>4. System stores proof.<br>5. System updates deposit status. |
| Alternative Flow | A1. Tenant re-uploads proof after rejection. |
| Exception Flow | E1. Deposit already paid.<br>E2. Invalid file.<br>E3. Upload failure. |

## Use Case 29: Verify / Reject Deposit Proof

| Field | Specification |
|---|---|
| Use Case | Verify / Reject Deposit Proof |
| Description | Landlord approves or rejects tenant deposit payment proof. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Deposit proof is under review.<br>2. Landlord owns tenancy. |
| Post-Condition | 1. Deposit is marked paid or rejected.<br>2. Tenant is notified. |
| Standard Process | 1. Open payments or tenancy page.<br>2. View deposit proof.<br>3. Approve or reject.<br>4. System updates deposit status. |
| Alternative Flow | A1. Reject with reason and request re-upload. |
| Exception Flow | E1. Deposit not under review.<br>E2. Missing rejection reason.<br>E3. Access denied. |

## Use Case 30: Upload Rent Payment Proof

| Field | Specification |
|---|---|
| Use Case | Upload Rent Payment Proof |
| Description | Tenant uploads monthly rent payment proof. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Rent payment schedule exists.<br>2. Payment is not settled. |
| Post-Condition | 1. Payment status becomes under review.<br>2. Landlord is notified. |
| Standard Process | 1. Open payments page.<br>2. Select rent payment.<br>3. Choose proof file.<br>4. Upload proof.<br>5. System updates payment status. |
| Alternative Flow | A1. Tenant replaces previous proof after rejection. |
| Exception Flow | E1. Payment already paid.<br>E2. Invalid file.<br>E3. Access denied. |

## Use Case 31: Verify / Reject Rent Payment Proof

| Field | Specification |
|---|---|
| Use Case | Verify / Reject Rent Payment Proof |
| Description | Landlord approves or rejects monthly rent payment proof. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Rent payment proof is under review.<br>2. Landlord owns property for tenancy. |
| Post-Condition | 1. Payment is marked paid or returned to pending.<br>2. Tenant is notified. |
| Standard Process | 1. Open landlord payments page.<br>2. Review payment proof.<br>3. Approve or reject.<br>4. System updates payment status. |
| Alternative Flow | A1. Reject with reason and request re-upload. |
| Exception Flow | E1. Payment not under review.<br>E2. Missing rejection reason.<br>E3. Access denied. |

## Use Case 32: View Rent Payment Schedule

| Field | Specification |
|---|---|
| Use Case | View Rent Payment Schedule |
| Description | Tenant views monthly rent schedule and payment statuses. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Tenancy is active.<br>2. Rent payment schedule is generated. |
| Post-Condition | 1. Payment schedule is displayed. |
| Standard Process | 1. Open payments page.<br>2. System retrieves payment records.<br>3. User views due dates, amounts, and statuses. |
| Alternative Flow | A1. System shows pending, under review, paid, or overdue status. |
| Exception Flow | E1. No active tenancy.<br>E2. No payment schedule found. |

## Use Case 33: Create Condition Report

| Field | Specification |
|---|---|
| Use Case | Create Condition Report |
| Description | Tenant or landlord creates move-in, move-out, or inspection condition report. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. User is logged in.<br>2. Tenancy exists.<br>3. User has access. |
| Post-Condition | 1. Condition report is created.<br>2. Other party is notified. |
| Standard Process | 1. Open condition reports page.<br>2. Select report type.<br>3. Enter notes.<br>4. Create report.<br>5. System stores report. |
| Alternative Flow | A1. Either tenant or landlord creates the report. |
| Exception Flow | E1. Invalid report type.<br>E2. Duplicate restricted report.<br>E3. Access denied. |

## Use Case 34: Upload Condition Photos

| Field | Specification |
|---|---|
| Use Case | Upload Condition Photos |
| Description | User uploads photos to support a condition report. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. Condition report exists.<br>2. Report is not acknowledged. |
| Post-Condition | 1. Photos are attached to condition report. |
| Standard Process | 1. Open condition report.<br>2. Select room or area.<br>3. Choose photo.<br>4. Upload photo.<br>5. System stores photo. |
| Alternative Flow | A1. Uploader deletes own photo before acknowledgement. |
| Exception Flow | E1. Invalid file.<br>E2. Upload failure.<br>E3. Access denied. |

## Use Case 35: Acknowledge Condition Report

| Field | Specification |
|---|---|
| Use Case | Acknowledge Condition Report |
| Description | Other party acknowledges that condition report has been reviewed. |
| Actor | 1. Tenant<br>2. Landlord |
| Pre-Condition | 1. Report exists.<br>2. Report was created by the other party.<br>3. Report has photos. |
| Post-Condition | 1. Report is marked acknowledged.<br>2. Creator is notified. |
| Standard Process | 1. Open condition report.<br>2. Review notes and photos.<br>3. Click acknowledge.<br>4. System records acknowledgement. |
| Alternative Flow | A1. Tenant acknowledges landlord report, or landlord acknowledges tenant report. |
| Exception Flow | E1. User tries to acknowledge own report.<br>E2. Report already acknowledged.<br>E3. Access denied. |

## Use Case 36: Renew Tenancy

| Field | Specification |
|---|---|
| Use Case | Renew Tenancy |
| Description | Landlord creates renewal tenancy invitation from an existing tenancy. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Existing tenancy is eligible for renewal.<br>2. Landlord owns tenancy. |
| Post-Condition | 1. New invited renewal tenancy is created.<br>2. Tenant is notified. |
| Standard Process | 1. Open tenancy details.<br>2. Click renew tenancy.<br>3. Enter new start date, end date, rent, and deposit.<br>4. Submit renewal.<br>5. System creates new invited tenancy. |
| Alternative Flow | A1. Tenant must accept renewal invitation before new agreement workflow starts. |
| Exception Flow | E1. Invalid dates.<br>E2. Tenancy not eligible.<br>E3. Access denied. |

## Use Case 37: Terminate Tenancy

| Field | Specification |
|---|---|
| Use Case | Terminate Tenancy |
| Description | Landlord terminates an active tenancy early. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy exists.<br>2. Landlord owns tenancy.<br>3. Termination reason is provided. |
| Post-Condition | 1. Tenancy status becomes terminated.<br>2. Room becomes available. |
| Standard Process | 1. Open tenancy details.<br>2. Click terminate tenancy.<br>3. Enter termination reason.<br>4. Confirm action.<br>5. System terminates tenancy. |
| Alternative Flow | A1. Termination may be used before deposit settlement starts. |
| Exception Flow | E1. Missing reason.<br>E2. Tenancy not found.<br>E3. Access denied. |

## Use Case 38: Manage Deposit Settlement

| Field | Specification |
|---|---|
| Use Case | Manage Deposit Settlement |
| Description | Landlord starts end-of-tenancy deposit refund process and manages proposed deductions. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Tenancy is expired or terminated.<br>2. Deposit has been confirmed paid. |
| Post-Condition | 1. Deposit refund proposal is created.<br>2. Tenant is notified. |
| Standard Process | 1. Open deposit settlement page.<br>2. Start settlement.<br>3. Add deduction reason and amount if needed.<br>4. Submit proposal.<br>5. System creates refund record. |
| Alternative Flow | A1. No deductions are added; settlement can become agreed directly. |
| Exception Flow | E1. Tenancy not ended.<br>E2. Deposit not paid.<br>E3. Refund already exists. |

## Use Case 39: View Deposit Refund Proposal

| Field | Specification |
|---|---|
| Use Case | View Deposit Refund Proposal |
| Description | Tenant reviews landlord proposed deposit refund and deductions. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Deposit refund proposal exists.<br>2. Tenant has access. |
| Post-Condition | 1. Proposal details are displayed. |
| Standard Process | 1. Open tenancy page.<br>2. View deposit settlement section.<br>3. System displays original deposit, deductions, and refund amount. |
| Alternative Flow | A1. Tenant sees paid refund proof after landlord marks refund paid. |
| Exception Flow | E1. No refund record found.<br>E2. Access denied. |

## Use Case 40: Accept / Dispute Deduction

| Field | Specification |
|---|---|
| Use Case | Accept / Dispute Deduction |
| Description | Tenant accepts or disputes each proposed deposit deduction. |
| Actor | 1. Tenant |
| Pre-Condition | 1. Deduction is proposed.<br>2. Tenant has access to refund proposal. |
| Post-Condition | 1. Deduction status becomes accepted or disputed.<br>2. Refund settlement status is updated. |
| Standard Process | 1. Review proposed deduction.<br>2. Click accept or dispute.<br>3. If disputing, enter dispute note.<br>4. Submit response.<br>5. System updates deduction. |
| Alternative Flow | A1. If all deductions are accepted, settlement becomes agreed. |
| Exception Flow | E1. Missing dispute note.<br>E2. Deduction already responded.<br>E3. Access denied. |

## Use Case 41: Mark Refund as Paid

| Field | Specification |
|---|---|
| Use Case | Mark Refund as Paid |
| Description | Landlord uploads refund payment proof and marks deposit refund as paid. |
| Actor | 1. Landlord |
| Pre-Condition | 1. Deposit settlement is agreed.<br>2. Refund proof file is valid. |
| Post-Condition | 1. Refund status becomes paid.<br>2. Tenant is notified. |
| Standard Process | 1. Open deposit settlement page.<br>2. Choose refund payment proof.<br>3. Upload proof.<br>4. System stores proof.<br>5. System marks refund as paid. |
| Alternative Flow | A1. Tenant later views refund payment proof. |
| Exception Flow | E1. Settlement not agreed.<br>E2. Invalid file.<br>E3. Upload failure. |

## Use Case 42: View Pending KYC Submissions

| Field | Specification |
|---|---|
| Use Case | View Pending KYC Submissions |
| Description | Admin views users waiting for identity verification. |
| Actor | 1. Admin |
| Pre-Condition | 1. Admin is logged in. |
| Post-Condition | 1. KYC queue is displayed. |
| Standard Process | 1. Open admin KYC verification page.<br>2. System retrieves unverified users.<br>3. Admin reviews user details and IC document. |
| Alternative Flow | A1. Previously rejected users are shown with rejection reason. |
| Exception Flow | E1. Access denied.<br>E2. Data loading failure. |

## Use Case 43: Approve / Reject User KYC

| Field | Specification |
|---|---|
| Use Case | Approve / Reject User KYC |
| Description | Admin approves or rejects user identity verification. |
| Actor | 1. Admin |
| Pre-Condition | 1. User is pending verification.<br>2. Admin has reviewed KYC details. |
| Post-Condition | 1. User is verified or rejection reason is saved.<br>2. User is notified. |
| Standard Process | 1. Open pending KYC submission.<br>2. Review user IC details and document.<br>3. Click approve or reject.<br>4. If rejecting, enter reason.<br>5. System updates user verification status. |
| Alternative Flow | A1. Rejected user may update documents and wait for review again. |
| Exception Flow | E1. Missing rejection reason.<br>E2. User not found.<br>E3. Access denied. |

## Use Case 44: View Pending Property Verifications

| Field | Specification |
|---|---|
| Use Case | View Pending Property Verifications |
| Description | Admin views properties waiting for approval. |
| Actor | 1. Admin |
| Pre-Condition | 1. Admin is logged in. |
| Post-Condition | 1. Property verification queue is displayed. |
| Standard Process | 1. Open admin property verification page.<br>2. System retrieves unverified properties.<br>3. Admin reviews property details, landlord info, and photos. |
| Alternative Flow | A1. Previously rejected properties are shown with rejection reason. |
| Exception Flow | E1. Access denied.<br>E2. Data loading failure. |

## Use Case 45: Approve / Reject Property

| Field | Specification |
|---|---|
| Use Case | Approve / Reject Property |
| Description | Admin approves or rejects a landlord property listing. |
| Actor | 1. Admin |
| Pre-Condition | 1. Property is pending verification.<br>2. Admin has reviewed property details. |
| Post-Condition | 1. Property is verified or rejection reason is saved.<br>2. Landlord is notified. |
| Standard Process | 1. Open pending property submission.<br>2. Review property details and photos.<br>3. Click approve or reject.<br>4. If rejecting, enter reason.<br>5. System updates property verification status. |
| Alternative Flow | A1. Rejected property remains visible for later re-review. |
| Exception Flow | E1. Missing rejection reason.<br>E2. Property not found.<br>E3. Access denied. |
