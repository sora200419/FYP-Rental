# Final Party Identity Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the generated tenancy agreement contains a complete final-party identity section for individual and corporate tenancy cases.

**Architecture:** Reuse identity data already stored in `User` and `Tenancy`, then pass the missing fields into the agreement generation prompt and PDF output. Keep full IC values only inside legal agreement content and avoid exposing them in unrelated summaries or dashboards.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Gemini agreement generation, `@react-pdf/renderer`

---

## Specification

### Problem

The current agreement generation flow passes tenant name, email, phone, and IC into the AI prompt, but the IC is masked before being included. Landlord IC is not passed into agreement generation, and corporate signatory IC/company registration details are not fully included in the legal party details.

### Target Behavior

When an agreement is generated, the formal agreement content should include a clear "Parties and Identity Details" section.

For an individual tenancy, it should include:

- landlord full name
- landlord email
- landlord phone number
- landlord IC/NRIC number
- tenant full name
- tenant email
- tenant phone number
- tenant IC/NRIC number

For a corporate tenancy, it should include:

- company name
- company registration number
- authorized signatory name
- authorized signatory role
- authorized signatory IC/NRIC number
- authorized signatory email, where available through the linked tenant account
- occupant roster, if any

### Scope

In scope:

- pass landlord IC into agreement generation
- pass tenant full IC into formal agreement generation
- pass corporate company registration number and authorized signatory IC into agreement generation
- update the agreement prompt so the generated legal document contains the final-party identity section
- keep plain-language summary and red-flag analysis from unnecessarily repeating full IC numbers
- update tests or add focused tests for prompt input/identity formatting

Out of scope:

- changing KYC verification rules
- changing who can view agreements
- encrypting IC values in the database
- lawyer certification of the template
- LHDN stamping integration

### Acceptance Criteria

- Generated individual agreements contain landlord and tenant identity details.
- Generated corporate agreements contain company and authorized signatory identity details.
- Tenant/co-tenant IC masking is not used inside the final legal agreement identity section.
- Full IC values are not added to unrelated summary cards, notification messages, or red-flag output.
- Existing agreement generation still blocks when the wizard is incomplete.

## File Structure

### Modified files

- `src/app/api/agreements/generate/route.ts`
- `src/lib/gemini.ts`
- `src/lib/pdf/AgreementPDF.tsx`
- `tests/unit/agreement-generation-identity.test.ts` or a new equivalent unit test file

---

## Implementation Plan

### Task 1: Extend the agreement generation data shape

**Files:**

- Modify: `src/app/api/agreements/generate/route.ts`
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Add landlord IC to the landlord query**

Update the landlord lookup in `src/app/api/agreements/generate/route.ts` so it selects `icNumber`.

Expected data:

```ts
const landlord = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { name: true, email: true, phone: true, icNumber: true },
});
```

- [ ] **Step 2: Pass company registration number and authorized signatory IC**

Update the object passed to `generateTenancyAgreement` so it includes:

```ts
companyRegistrationNo: tenancy.companyRegistrationNo,
authorizedSignatoryIC: tenancy.authorizedSignatoryIC,
```

- [ ] **Step 3: Update the `TenancyForAgreement` type**

In `src/lib/gemini.ts`, update the type so the agreement generator accepts the new fields.

Expected fields:

```ts
leasePartyType?: 'INDIVIDUAL' | 'CORPORATE';
companyName?: string | null;
companyRegistrationNo?: string | null;
authorizedSignatoryName?: string | null;
authorizedSignatoryIC?: string | null;
authorizedSignatoryRole?: string | null;
landlord: {
  name: string;
  email: string;
  phone?: string | null;
  icNumber?: string | null;
};
tenant: {
  name: string;
  email: string;
  phone?: string | null;
  icNumber?: string | null;
};
```

### Task 2: Add a final-party identity block to the prompt

**Files:**

- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Replace masked legal identity lines with formal identity lines**

Add a helper that formats identity values for the legal agreement body.

```ts
const formatLegalIdentity = (value?: string | null) =>
  value?.trim() ? value.trim() : 'Not provided';
```

- [ ] **Step 2: Create an individual identity block**

Add this prompt block before the existing `PARTIES` section or replace the current party block with it.

```ts
const individualIdentityBlock = `
FINAL PARTY IDENTITY DETAILS
- Landlord Name: ${tenancy.landlord.name}
- Landlord Email: ${tenancy.landlord.email}
- Landlord Phone: ${tenancy.landlord.phone ?? 'Not provided'}
- Landlord IC/NRIC Number: ${formatLegalIdentity(tenancy.landlord.icNumber)}
- Tenant Name: ${tenancy.tenant.name}
- Tenant Email: ${tenancy.tenant.email}
- Tenant Phone: ${tenancy.tenant.phone ?? 'Not provided'}
- Tenant IC/NRIC Number: ${formatLegalIdentity(tenancy.tenant.icNumber)}
`;
```

- [ ] **Step 3: Create a corporate identity block**

Add corporate-specific details when `leasePartyType === 'CORPORATE'`.

```ts
const corporateIdentityBlock =
  tenancy.leasePartyType === 'CORPORATE'
    ? `
CORPORATE PARTY IDENTITY DETAILS
- Company Name: ${tenancy.companyName ?? 'Not provided'}
- Company Registration Number: ${tenancy.companyRegistrationNo ?? 'Not provided'}
- Authorized Signatory Name: ${tenancy.authorizedSignatoryName ?? tenancy.tenant.name}
- Authorized Signatory Role: ${tenancy.authorizedSignatoryRole ?? 'Not provided'}
- Authorized Signatory IC/NRIC Number: ${formatLegalIdentity(tenancy.authorizedSignatoryIC ?? tenancy.tenant.icNumber)}
- Authorized Signatory Email: ${tenancy.tenant.email}
`
    : '';
```

- [ ] **Step 4: Update the prompt instruction**

Add an explicit instruction:

```text
The rawContent must include a dedicated "Parties and Identity Details" section using the full identity details provided above. Do not mask IC/NRIC numbers in rawContent. Do not repeat full IC/NRIC numbers in plainLanguageSummary or redFlags unless legally necessary.
```

### Task 3: Keep PDF output focused on the final agreement text

**Files:**

- Modify: `src/lib/pdf/AgreementPDF.tsx`

- [ ] **Step 1: Confirm PDF renders `rawContent` unchanged**

The PDF already renders `rawContent`. Keep this behavior so the final identity section appears in the downloadable agreement.

- [ ] **Step 2: Avoid adding duplicate identity metadata outside `rawContent`**

Do not add a second IC display in the PDF subtitle or footer. The legal identity section should live inside `rawContent` only.

### Task 4: Add focused test coverage

**Files:**

- Create or modify: `tests/unit/agreement-generation-identity.test.ts`

- [ ] **Step 1: Test individual identity formatting**

Add a test that verifies a prompt or formatter output contains landlord and tenant IC values.

Example assertions:

```ts
expect(output).toContain('Landlord IC/NRIC Number: 900101-10-1111');
expect(output).toContain('Tenant IC/NRIC Number: 990202-14-2222');
expect(output).not.toContain('****-**-2222');
```

- [ ] **Step 2: Test corporate identity formatting**

Example assertions:

```ts
expect(output).toContain('Company Registration Number: 202401001234');
expect(output).toContain('Authorized Signatory IC/NRIC Number: 880808-08-8888');
expect(output).toContain('Authorized Signatory Role: HR Manager');
```

- [ ] **Step 3: Run the tests**

Run:

```bash
npm.cmd run test -- agreement-generation-identity
```

Expected: all identity formatting tests pass.

### Task 5: Manual verification

**Files:**

- Verify: generated agreement UI
- Verify: downloaded PDF

- [ ] Generate a new individual agreement.
- [ ] Confirm the agreement contains complete landlord and tenant identity details.
- [ ] Generate a new corporate agreement.
- [ ] Confirm the agreement contains company and authorized signatory identity details.
- [ ] Download the PDF and confirm the identity section appears in the formal agreement body.

## FYP Report Note

This feature strengthens the agreement generation workflow by ensuring that final legal party identity details are included in the generated tenancy agreement. However, the system still does not certify the identity data legally; it relies on the existing admin KYC process and should be paired with lawyer-reviewed templates in future work.
