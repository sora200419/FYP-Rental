import { describe, it, expect } from 'vitest';

// Tests the identity block formatting logic extracted from gemini.ts
// These mirror the helper functions used in generateTenancyAgreement

const formatLegalIdentity = (value?: string | null) =>
  value?.trim() ? value.trim() : 'Not provided';

const buildIndividualIdentityBlock = (tenancy: {
  landlord: { name: string; email: string; phone?: string | null; icNumber?: string | null };
  tenant: { name: string; email: string; phone?: string | null; icNumber?: string | null };
}) => `
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

const buildCorporateIdentityBlock = (tenancy: {
  leasePartyType?: string | null;
  companyName?: string | null;
  companyRegistrationNo?: string | null;
  authorizedSignatoryName?: string | null;
  authorizedSignatoryRole?: string | null;
  authorizedSignatoryIC?: string | null;
  tenant: { name: string; email: string; icNumber?: string | null };
}) =>
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

describe('agreement generation — individual identity block', () => {
  const baseTenancy = {
    landlord: {
      name: 'Ahmad bin Ali',
      email: 'ahmad@example.com',
      phone: '0112345678',
      icNumber: '900101-10-1111',
    },
    tenant: {
      name: 'Siti binti Omar',
      email: 'siti@example.com',
      phone: '0129876543',
      icNumber: '990202-14-2222',
    },
  };

  it('includes full landlord IC/NRIC without masking', () => {
    const output = buildIndividualIdentityBlock(baseTenancy);
    expect(output).toContain('Landlord IC/NRIC Number: 900101-10-1111');
  });

  it('includes full tenant IC/NRIC without masking', () => {
    const output = buildIndividualIdentityBlock(baseTenancy);
    expect(output).toContain('Tenant IC/NRIC Number: 990202-14-2222');
  });

  it('does not use masked IC format in the legal identity section', () => {
    const output = buildIndividualIdentityBlock(baseTenancy);
    expect(output).not.toContain('****-**-2222');
    expect(output).not.toContain('****-**-1111');
  });

  it('shows Not provided when landlord IC is missing', () => {
    const output = buildIndividualIdentityBlock({
      ...baseTenancy,
      landlord: { ...baseTenancy.landlord, icNumber: null },
    });
    expect(output).toContain('Landlord IC/NRIC Number: Not provided');
  });

  it('shows Not provided when tenant IC is missing', () => {
    const output = buildIndividualIdentityBlock({
      ...baseTenancy,
      tenant: { ...baseTenancy.tenant, icNumber: undefined },
    });
    expect(output).toContain('Tenant IC/NRIC Number: Not provided');
  });

  it('includes landlord and tenant contact details', () => {
    const output = buildIndividualIdentityBlock(baseTenancy);
    expect(output).toContain('Landlord Name: Ahmad bin Ali');
    expect(output).toContain('Landlord Email: ahmad@example.com');
    expect(output).toContain('Tenant Name: Siti binti Omar');
    expect(output).toContain('Tenant Email: siti@example.com');
  });
});

describe('agreement generation — corporate identity block', () => {
  const corporateTenancy = {
    leasePartyType: 'CORPORATE' as const,
    companyName: 'Syarikat Maju Sdn Bhd',
    companyRegistrationNo: '202401001234',
    authorizedSignatoryName: 'Lim Ah Kow',
    authorizedSignatoryRole: 'HR Manager',
    authorizedSignatoryIC: '880808-08-8888',
    tenant: {
      name: 'Lim Ah Kow',
      email: 'lim@syarikatmaju.com',
      icNumber: '880808-08-8888',
    },
  };

  it('includes company registration number', () => {
    const output = buildCorporateIdentityBlock(corporateTenancy);
    expect(output).toContain('Company Registration Number: 202401001234');
  });

  it('includes authorized signatory IC without masking', () => {
    const output = buildCorporateIdentityBlock(corporateTenancy);
    expect(output).toContain('Authorized Signatory IC/NRIC Number: 880808-08-8888');
  });

  it('includes authorized signatory role', () => {
    const output = buildCorporateIdentityBlock(corporateTenancy);
    expect(output).toContain('Authorized Signatory Role: HR Manager');
  });

  it('falls back to tenant IC when authorizedSignatoryIC is null', () => {
    const output = buildCorporateIdentityBlock({
      ...corporateTenancy,
      authorizedSignatoryIC: null,
    });
    expect(output).toContain('Authorized Signatory IC/NRIC Number: 880808-08-8888');
  });

  it('shows Not provided for missing company registration number', () => {
    const output = buildCorporateIdentityBlock({
      ...corporateTenancy,
      companyRegistrationNo: null,
    });
    expect(output).toContain('Company Registration Number: Not provided');
  });

  it('returns empty string for non-corporate tenancy', () => {
    const output = buildCorporateIdentityBlock({
      ...corporateTenancy,
      leasePartyType: 'INDIVIDUAL',
    });
    expect(output).toBe('');
  });
});
