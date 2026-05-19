import { describe, expect, it } from 'vitest';
import {
  canCreateMoveInConditionReport,
  getRentPaymentStatusForTenancyLifecycle,
  getTenancyStatusAfterAgreementSignatureApproval,
  getTenancyStatusAfterDepositApproval,
  validateImmediateTerminationDate,
  validateRenewalPeriod,
} from '../../src/lib/tenancyLifecycle';

describe('tenancy lifecycle helpers', () => {
  it('blocks renewal periods that overlap the current tenancy', () => {
    const currentEnd = new Date('2026-12-31T00:00:00.000Z');
    const today = new Date('2026-05-19T00:00:00.000Z');

    expect(
      validateRenewalPeriod({
        currentEndDate: currentEnd,
        startDate: new Date('2026-12-01T00:00:00.000Z'),
        endDate: new Date('2027-11-30T00:00:00.000Z'),
        today,
      }),
    ).toBe('Renewal must start after the current tenancy end date.');

    expect(
      validateRenewalPeriod({
        currentEndDate: currentEnd,
        startDate: new Date('2027-01-01T00:00:00.000Z'),
        endDate: new Date('2027-12-31T00:00:00.000Z'),
        today,
      }),
    ).toBeNull();
  });

  it('rejects future termination dates because termination is immediate', () => {
    const now = new Date('2026-05-19T00:00:00.000Z');

    expect(
      validateImmediateTerminationDate(
        new Date('2026-06-01T00:00:00.000Z'),
        now,
      ),
    ).toBe(
      'Future termination dates are not supported. Use the termination action on the actual termination date.',
    );

    expect(validateImmediateTerminationDate(now, now)).toBeNull();
  });

  it('keeps tenancy pending after agreement signing until deposit is paid', () => {
    expect(
      getTenancyStatusAfterAgreementSignatureApproval({
        currentTenancyStatus: 'PENDING',
        depositStatus: 'PENDING',
      }),
    ).toBe('PENDING');

    expect(
      getTenancyStatusAfterAgreementSignatureApproval({
        currentTenancyStatus: 'PENDING',
        depositStatus: 'UNDER_REVIEW',
      }),
    ).toBe('PENDING');

    expect(
      getTenancyStatusAfterAgreementSignatureApproval({
        currentTenancyStatus: 'PENDING',
        depositStatus: 'PAID',
      }),
    ).toBe('ACTIVE');
  });

  it('activates tenancy on deposit approval only after the agreement is signed', () => {
    expect(
      getTenancyStatusAfterDepositApproval({
        currentTenancyStatus: 'PENDING',
        agreementStatus: 'FINALIZED',
      }),
    ).toBe('PENDING');

    expect(
      getTenancyStatusAfterDepositApproval({
        currentTenancyStatus: 'PENDING',
        agreementStatus: 'SIGNED',
      }),
    ).toBe('ACTIVE');
  });

  it('allows move-in condition reports only after tenancy is active and deposit is paid', () => {
    expect(
      canCreateMoveInConditionReport({
        tenancyStatus: 'ACTIVE',
        depositStatus: 'PENDING',
      }),
    ).toBe(false);

    expect(
      canCreateMoveInConditionReport({
        tenancyStatus: 'PENDING',
        depositStatus: 'PAID',
      }),
    ).toBe(false);

    expect(
      canCreateMoveInConditionReport({
        tenancyStatus: 'ACTIVE',
        depositStatus: 'PAID',
      }),
    ).toBe(true);
  });

  it('waives future unpaid rent after tenancy termination', () => {
    const terminatedAt = new Date('2026-05-19T00:00:00.000Z');

    expect(
      getRentPaymentStatusForTenancyLifecycle({
        paymentStatus: 'PENDING',
        dueDate: new Date('2026-07-15T00:00:00.000Z'),
        tenancyStatus: 'TERMINATED',
        terminatedAt,
      }),
    ).toBe('WAIVED');

    expect(
      getRentPaymentStatusForTenancyLifecycle({
        paymentStatus: 'LATE',
        dueDate: new Date('2026-04-15T00:00:00.000Z'),
        tenancyStatus: 'TERMINATED',
        terminatedAt,
      }),
    ).toBe('LATE');

    expect(
      getRentPaymentStatusForTenancyLifecycle({
        paymentStatus: 'PAID',
        dueDate: new Date('2026-07-15T00:00:00.000Z'),
        tenancyStatus: 'TERMINATED',
        terminatedAt,
      }),
    ).toBe('PAID');

    expect(
      getRentPaymentStatusForTenancyLifecycle({
        paymentStatus: 'PENDING',
        dueDate: new Date('2026-07-15T00:00:00.000Z'),
        tenancyStatus: 'ACTIVE',
        terminatedAt: null,
      }),
    ).toBe('PENDING');
  });
});
