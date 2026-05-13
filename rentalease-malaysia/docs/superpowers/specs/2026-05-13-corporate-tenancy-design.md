# Corporate Tenancy Workflow Design

Date: 2026-05-13

## Goal

Add a real active corporate tenancy workflow for current landlords, so a company or employer can rent a room or entire unit for staff while keeping:

- one legal signing party
- one or more named occupants
- room-based tenancy management
- compatibility with the existing dual-signature proof flow

This design is intended to solve cases such as a restaurant boss renting accommodation for staff.

## Summary

The current system supports one primary tenant account per tenancy and optional additional occupants through `CoTenant`. That is enough for simple shared living, but it does not properly model employer-rents-for-staff cases because it does not distinguish:

- who is the legal lease party
- who is the authorized signatory
- who actually occupies the room or unit

The new workflow introduces a dedicated corporate tenancy mode while preserving the existing individual tenancy mode.

## Scope

This feature applies to:

- room rentals
- entire-unit rentals

The system will continue to use:

- one tenancy = one room or one entire unit

The system will allow:

- multiple tenancies under the same company or authorized signatory

## Non-Goals

This feature will not:

- combine multiple rooms into one tenancy record
- allow ordinary staff occupants to perform the binding legal signature
- replace the current `CoTenant` concept for individual/shared rentals
- remove the existing individual tenancy workflow

## Core Model

### Lease party types

Each tenancy has a lease party type:

- `INDIVIDUAL`
- `CORPORATE`

### Individual tenancy

For `INDIVIDUAL`:

- current behavior remains
- the tenant account is both the operational user and legal signing party
- `CoTenant` continues to represent additional named occupants only

### Corporate tenancy

For `CORPORATE`:

- the legal lease party is a company or employer
- one authorized signatory represents that lease party
- one or more occupants may stay in the room or unit
- some occupants may later be linked to real user accounts

## Roles and Permissions

### Landlord

The landlord can:

- create a corporate tenancy
- enter company details
- define the authorized signatory
- add occupant roster entries
- invite or link occupant accounts later
- replace or remove occupants
- review agreement status
- review hard-copy signature proof
- approve or reject hard-copy signature proof

### Authorized signatory

The authorized signatory is the legal company-side actor. This actor can:

- accept the corporate tenancy invitation
- review and negotiate the agreement
- perform the legal digital signature
- upload or coordinate signed hard-copy proof
- manage the occupant roster
- link, replace, or remove occupants

### Linked occupant

A linked occupant is an operational tenant-side user, but not the legal signer. This actor can:

- view tenancy details
- view the agreement
- upload payment proof
- upload deposit proof
- view condition reports
- message the landlord
- receive tenancy notifications

A linked occupant cannot:

- perform the binding legal acceptance
- perform the legal digital signature
- override company-side agreement decisions

### Unlinked occupant

An unlinked occupant exists in the roster only. This record:

- appears in the occupancy list
- has no portal access
- can later be linked to an existing user or invited to register

## Data Design

### Tenancy

The future scaffolding fields already added on `Tenancy` become active for this workflow:

- `leasePartyType`
- `companyName`
- `companyRegistrationNo`
- `authorizedSignatoryName`
- `authorizedSignatoryIC`
- `authorizedSignatoryRole`

These fields continue to be unused for `INDIVIDUAL` tenancies.

### Authorized signatory linkage

The system should add an optional relation from a corporate tenancy to the user who acts as the authorized signatory. This relation allows:

- signatory login and access control
- tenancy list visibility for the signatory
- legal action separation from ordinary occupants

Recommended shape:

- keep the existing descriptive signatory fields on `Tenancy`
- add `authorizedSignatoryUserId` as an optional user reference

This allows the tenancy to be created before the signatory has an account, while still supporting later linking.

### Occupant roster

Corporate occupancy should not rely only on `CoTenant`. Add a dedicated roster model for corporate tenancies with:

- tenancy reference
- occupant name
- optional IC/passport number
- optional phone
- optional job/role label
- optional linked user account
- status such as unlinked / linked / replaced / removed

This model allows:

- pre-registration roster entry
- later user linking
- staff replacement history

### CoTenant

`CoTenant` remains valid for:

- individual tenancies
- simple shared-living occupant lists

It should not be treated as the primary representation for corporate leasing.

## Workflow

### 1. Landlord creates tenancy

In the create-tenancy flow, landlord chooses:

- `Individual`
- `Corporate`

If `Corporate` is chosen, the landlord enters:

- company name
- registration number
- authorized signatory name
- authorized signatory IC
- authorized signatory role
- optional signatory email if available
- occupant roster entries by name

The landlord is allowed to create the tenancy even when occupant accounts do not exist yet.

### 2. Invite and linking

After creation:

- the authorized signatory can be invited to create or use an account
- occupants can remain unlinked initially
- later, landlord or signatory can invite or link occupant accounts

### 3. Agreement drafting

The agreement generation flow remains room-based. For corporate tenancies, agreement content must reflect:

- company/employer as lease party
- authorized signatory as company representative
- occupant roster as actual staying persons when relevant

### 4. Agreement approval and signature

The dual-signature proof workflow remains in force:

- authorized signatory performs digital signature in the system
- system stores agreement hash and best-effort Sepolia anchor
- signed hard-copy file is uploaded
- landlord reviews and approves
- only then agreement becomes fully signed and tenancy becomes active

Staff occupants do not perform the legal signature.

### 5. Ongoing tenancy

After activation:

- occupants can use operational tenant features
- landlord and authorized signatory can still maintain occupant assignments
- roster changes should be audited

## UI Design

### Landlord tenancy creation

Add a lease-party choice near tenant selection:

- `Individual`
- `Corporate / Employer`

If `Corporate / Employer` is selected, reveal:

- company information section
- authorized signatory section
- occupant roster section

The roster should allow:

- add occupant name
- save without account linkage
- later link existing account or send invite

### Landlord tenancy detail

Add dedicated sections:

- `Lease Party`
- `Authorized Signatory`
- `Occupant Roster`

Actions:

- add occupant
- link account
- replace occupant
- remove occupant

### Authorized signatory view

The authorized signatory should have a tenancy/agreement view that includes:

- legal agreement actions
- dual-signature workflow actions
- occupant roster management

### Occupant-linked tenant view

The occupant view should expose normal operational tenancy features, but not:

- legal acceptance controls
- binding signature controls

Where needed, the UI should explain that:

- legal agreement actions are handled by the authorized signatory

## Notifications

The system should add corporate-tenancy notifications for:

- authorized signatory invited
- occupant invited
- occupant linked
- occupant replaced
- occupant removed

Existing agreement and signature-proof notifications should work for corporate tenancies, but they should be addressed to:

- landlord
- authorized signatory
- relevant occupants when operationally useful

## Audit and History

The system should record events for:

- corporate tenancy created
- authorized signatory linked
- occupant added
- occupant linked
- occupant replaced
- occupant removed
- corporate agreement digitally signed
- hard-copy proof uploaded
- hard-copy proof approved or rejected

This keeps the corporate workflow explainable and traceable.

## Validation Rules

- Corporate tenancy requires company name.
- Corporate tenancy requires authorized signatory name.
- Only landlord and authorized signatory can manage occupant roster changes.
- Only authorized signatory can perform legal acceptance and digital signature.
- Linked occupants cannot become the legal signer unless they are explicitly assigned as the authorized signatory.
- Tenancy activation still requires:
  - digital signature
  - hard-copy upload
  - landlord approval

## Migration and Backward Compatibility

- Existing individual tenancies remain unchanged.
- Existing `CoTenant` records continue to work for individual/shared cases.
- Corporate fields already present on `Tenancy` remain nullable and backward-compatible.
- New corporate-specific relations and roster tables should not affect current individual flows.

## Testing Strategy

### Happy path

1. Landlord creates a corporate tenancy for a room or entire unit.
2. Landlord enters company and signatory details.
3. Landlord adds one or more occupant names without linked accounts.
4. Authorized signatory receives access and reviews agreement.
5. Authorized signatory digitally signs.
6. Hard-copy proof is uploaded.
7. Landlord approves proof.
8. Tenancy becomes active.
9. Occupant account is linked later and can use operational features.

### Roster management

1. Landlord adds occupant before registration.
2. Signatory later links that occupant to a user.
3. Signatory replaces one occupant with another.
4. Landlord verifies history and current roster are accurate.

### Permission checks

1. Linked occupant tries to access legal signature action and is blocked.
2. Ordinary tenant without signatory role cannot edit corporate signatory details.
3. Landlord and signatory can both update the roster.

## Recommendation

Implement this as a real active workflow, not just dormant scaffolding.

The design fits the current system because:

- the platform is already room-based
- agreement workflow already exists
- dual-signature proof workflow already exists
- the new feature mainly adds party structure, permissions, and roster management

This gives the system a credible real-world corporate rental story without forcing a redesign of rent, deposit, or room allocation logic.
