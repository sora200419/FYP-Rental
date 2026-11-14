import { describe, expect, it } from 'vitest';
import { getUnstartedTenancyCancellationBlocker } from '../../src/lib/tenancyLifecycle';
import { getPropertyEditEffect, propertySchema } from '../../src/lib/propertySchema';
import { tenantMessagesHref, tenantTenancyHref } from '../../src/lib/tenantLinks';

describe('getUnstartedTenancyCancellationBlocker', () => {
  it('allows cancelling an invitation or a tenancy with nothing paid or signed', () => {
    expect(getUnstartedTenancyCancellationBlocker({ tenancyStatus: 'INVITED' })).toBeNull();
    expect(
      getUnstartedTenancyCancellationBlocker({
        tenancyStatus: 'PENDING',
        depositStatus: 'PENDING',
        agreementStatus: 'FINALIZED',
      }),
    ).toBeNull();
    // A rejected deposit proof is not money received.
    expect(
      getUnstartedTenancyCancellationBlocker({ tenancyStatus: 'PENDING', depositStatus: 'REJECTED' }),
    ).toBeNull();
  });

  it('blocks once the deposit is submitted or paid', () => {
    for (const depositStatus of ['UNDER_REVIEW', 'PAID']) {
      expect(
        getUnstartedTenancyCancellationBlocker({ tenancyStatus: 'PENDING', depositStatus }),
      ).toMatch(/deposit/);
    }
  });

  it('blocks once the tenant has signed', () => {
    for (const agreementStatus of ['PENDING_SIGNATURE_PROOF', 'SIGNED']) {
      expect(
        getUnstartedTenancyCancellationBlocker({ tenancyStatus: 'PENDING', agreementStatus }),
      ).toMatch(/signed/);
    }
  });

  it('never applies to started or ended tenancies', () => {
    for (const tenancyStatus of ['ACTIVE', 'EXPIRED', 'TERMINATED']) {
      expect(getUnstartedTenancyCancellationBlocker({ tenancyStatus })).not.toBeNull();
    }
  });
});

describe('getPropertyEditEffect', () => {
  it('resubmits a rejected listing whatever changed', () => {
    expect(
      getPropertyEditEffect({ isVerified: false, rejectedReason: 'Blurry title', locationChanged: false }),
    ).toEqual({ needsReview: true });
  });

  it('sends a verified listing back to review only when the location changes', () => {
    expect(
      getPropertyEditEffect({ isVerified: true, rejectedReason: null, locationChanged: true }),
    ).toEqual({ needsReview: true });
    expect(
      getPropertyEditEffect({ isVerified: true, rejectedReason: null, locationChanged: false }),
    ).toEqual({ needsReview: false });
  });

  it('leaves a listing awaiting its first review as it is', () => {
    expect(
      getPropertyEditEffect({ isVerified: false, rejectedReason: null, locationChanged: true }),
    ).toEqual({ needsReview: false });
  });
});

describe('propertySchema', () => {
  it('requires a 5-digit postcode and trims the address', () => {
    const base = { address: '  12 Jalan Ampang  ', city: 'KL', state: 'Selangor', type: 'Condominium' };
    expect(propertySchema.safeParse({ ...base, postcode: '5045' }).success).toBe(false);
    const ok = propertySchema.parse({ ...base, postcode: '50450' });
    expect(ok.address).toBe('12 Jalan Ampang');
  });
});

describe('tenant links', () => {
  it('point at one specific tenancy', () => {
    expect(tenantTenancyHref('abc')).toBe('/dashboard/tenant/tenancy/abc');
    expect(tenantMessagesHref('abc')).toBe('/dashboard/tenant/messages?tenancyId=abc');
  });
});
