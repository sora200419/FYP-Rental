import { describe, expect, it } from 'vitest';
import {
  getAdminVerificationHref,
  getKycPageState,
  shouldResetKycForIcChange,
} from '../../src/lib/kyc-workflow';

describe('kyc workflow helpers', () => {
  it('only redirects from the KYC page when the user account is verified', () => {
    expect(
      getKycPageState({ isVerified: false, submissionStatus: 'APPROVED' }),
    ).toBe('wizard');

    expect(
      getKycPageState({ isVerified: true, submissionStatus: null }),
    ).toBe('redirect-profile');
  });

  it('keeps pending submissions in the under-review state', () => {
    expect(
      getKycPageState({ isVerified: false, submissionStatus: 'PENDING' }),
    ).toBe('under-review');
  });

  it('requires resubmission after an IC number change when a KYC record exists', () => {
    expect(
      shouldResetKycForIcChange({
        previousIcNumber: '900101145678',
        nextIcNumber: '900101145679',
        hasKycSubmission: true,
      }),
    ).toBe(true);
  });

  it('does not reset KYC when the IC number is unchanged or no KYC record exists', () => {
    expect(
      shouldResetKycForIcChange({
        previousIcNumber: '900101145678',
        nextIcNumber: '900101145678',
        hasKycSubmission: true,
      }),
    ).toBe(false);

    expect(
      shouldResetKycForIcChange({
        previousIcNumber: '900101145678',
        nextIcNumber: '900101145679',
        hasKycSubmission: false,
      }),
    ).toBe(false);
  });

  it('sends admins to the KYC submission queue when KYC is pending', () => {
    expect(getAdminVerificationHref({ pendingKycSubmissions: 1 })).toBe(
      '/dashboard/admin/kyc',
    );
    expect(getAdminVerificationHref({ pendingKycSubmissions: 0 })).toBe(
      '/dashboard/admin/properties',
    );
  });
});
