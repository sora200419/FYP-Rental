# 4.5.2 User Acceptance Testing (UAT) Preparation

This User Acceptance Testing preparation is prepared for the RentalEase Malaysia system. The UAT form follows the FYP guideline format and is intended to be completed by real users after they test the system.

## 4.5.2.1 UAT Testing Scope

The tester should perform the role-based workflows that match their assigned role.

| Tester Role | Main Functions to Test | Expected Acceptance Criteria |
| --- | --- | --- |
| Admin | Login, dashboard, KYC verification, property verification, user suspension/reactivation/deletion | Admin can review platform records, approve or reject submissions, and control accounts with proper validation. |
| Landlord | Login, profile, property management, room management, tenancy invitation, agreement wizard, payment verification, condition report, deposit settlement | Landlord can manage rental properties and tenancy lifecycle without data inconsistency or access issues. |
| Tenant | Register/login, profile, invitation response, agreement review/signing, payment proof upload, condition report acknowledgement, messaging | Tenant can complete rental workflow clearly and receive proper feedback from the system. |
| Corporate Authorized Signatory | Corporate invitation, agreement review/signing, signed proof upload, corporate occupant checking | Authorized signatory can act for company tenancy while normal occupants are blocked from legal actions. |

## 4.5.2.2 Recommended UAT Tasks

| Task No. | Task Description | Role | Expected outcome |
| --- | --- | --- | --- |
| UAT-T1 | Login using a valid account and confirm correct dashboard. | Admin, Landlord, Tenant | User enters the correct role-based dashboard. |
| UAT-T2 | Register a new tenant or landlord account with IC document. | Guest | Account is created and placed under KYC review. |
| UAT-T3 | Approve or reject user KYC submission. | Admin | User verification status updates correctly and notification is sent. |
| UAT-T4 | Approve or reject property verification. | Admin | Property verification status updates correctly and landlord is notified. |
| UAT-T5 | Create a property and add room details. | Landlord | Property and rooms are saved and displayed correctly. |
| UAT-T6 | Create an individual tenancy invitation. | Landlord | Tenant receives invitation and room is reserved. |
| UAT-T7 | Accept or decline tenancy invitation. | Tenant | Tenancy and room status update correctly. |
| UAT-T8 | Complete agreement wizard and generate agreement. | Landlord | Agreement draft, summary and red-flag review are generated. |
| UAT-T9 | Request agreement changes. | Tenant | Landlord can view and address structured change requests. |
| UAT-T10 | Finalize and sign agreement, then upload signed proof. | Landlord, Tenant | Tenancy becomes active only after landlord approves signed proof. |
| UAT-T11 | Upload and verify deposit or rent payment proof. | Tenant, Landlord | Payment status updates to under review, paid or rejected correctly. |
| UAT-T12 | Create and acknowledge condition report. | Landlord, Tenant | Report, photos and acknowledgement are stored correctly. |
| UAT-T13 | Complete deposit settlement after tenancy ends. | Landlord, Tenant | Refund, deduction, dispute and paid statuses behave correctly. |
| UAT-T14 | Create and process corporate tenancy. | Landlord, Authorized Signatory | Only authorized signatory can accept and sign corporate tenancy. |
| UAT-T15 | Send messages and view notifications. | Landlord, Tenant | Message thread and notification read status update correctly. |

## 4.5.2.3 User Acceptance Testing Form: Admin Tester

Name of the Tester:

Job Position:

Date:

Time Start:

Time End:

| Name of parameter/Testing Category | Excellent (5) points | Very Good (4) points | Fair (2-3) points | Poor (1-0) points |
| --- | --- | --- | --- | --- |
| Meeting objectives |  |  |  |  |
| User-friendly |  |  |  |  |
| Overall performance |  |  |  |  |
| Security |  |  |  |  |
| Error-free |  |  |  |  |

| Feedback from the Tester | Response from the Developer |
| --- | --- |
|  |  |

## 4.5.2.4 User Acceptance Testing Form: Landlord Tester

Name of the Tester:

Job Position:

Date:

Time Start:

Time End:

| Name of parameter/Testing Category | Excellent (5) points | Very Good (4) points | Fair (2-3) points | Poor (1-0) points |
| --- | --- | --- | --- | --- |
| Meeting objectives |  |  |  |  |
| User-friendly |  |  |  |  |
| Overall performance |  |  |  |  |
| Security |  |  |  |  |
| Error-free |  |  |  |  |

| Feedback from the Tester | Response from the Developer |
| --- | --- |
|  |  |

## 4.5.2.5 User Acceptance Testing Form: Tenant Tester

Name of the Tester:

Job Position:

Date:

Time Start:

Time End:

| Name of parameter/Testing Category | Excellent (5) points | Very Good (4) points | Fair (2-3) points | Poor (1-0) points |
| --- | --- | --- | --- | --- |
| Meeting objectives |  |  |  |  |
| User-friendly |  |  |  |  |
| Overall performance |  |  |  |  |
| Security |  |  |  |  |
| Error-free |  |  |  |  |

| Feedback from the Tester | Response from the Developer |
| --- | --- |
|  |  |

## 4.5.2.6 User Acceptance Testing Form: Corporate Authorized Signatory Tester

Name of the Tester:

Job Position:

Date:

Time Start:

Time End:

| Name of parameter/Testing Category | Excellent (5) points | Very Good (4) points | Fair (2-3) points | Poor (1-0) points |
| --- | --- | --- | --- | --- |
| Meeting objectives |  |  |  |  |
| User-friendly |  |  |  |  |
| Overall performance |  |  |  |  |
| Security |  |  |  |  |
| Error-free |  |  |  |  |

| Feedback from the Tester | Response from the Developer |
| --- | --- |
|  |  |

## 4.5.2.7 UAT Summary Table

| Tester No. | Tester Role | Main Scenario Tested | Total Score / 25 | Acceptance Decision | Remarks |
| --- | --- | --- | --- | --- | --- |
| UAT1 | Admin | Admin dashboard, KYC, property verification, user management |  |  |  |
| UAT2 | Landlord | Property, tenancy invitation, agreement, payment review, deposit settlement |  |  |  |
| UAT3 | Tenant | Invitation, agreement review, signed proof upload, payment proof, condition report |  |  |  |
| UAT4 | Corporate Authorized Signatory | Corporate invitation, corporate agreement signing, occupant workflow |  |  |  |

## 4.5.2.8 UAT Scoring Guide

| Score Range | Interpretation |
| --- | --- |
| 21-25 | System is accepted with no major changes required. |
| 16-20 | System is accepted with minor improvements recommended. |
| 10-15 | System requires improvement before final acceptance. |
| 0-9 | System is not accepted and requires major revision. |
