import { describe, expect, it } from 'vitest';
import {
  getMoveInBaselineWarning,
  groupPhotosForComparison,
} from '../../src/lib/compareConditionReports';
import {
  attachEvidencePhotosToDeductions,
  canLandlordWithdrawDeduction,
  getDepositSettlementEntry,
  getLifecycleCompletionState,
  getRefundStatusAfterDeductionWithdrawal,
} from '../../src/lib/depositSettlementWorkflow';

describe('condition comparison and deposit settlement workflow', () => {
  it('warns when the move-in baseline is disputed', () => {
    expect(getMoveInBaselineWarning('DISPUTED')).toEqual({
      tone: 'danger',
      title: 'Move-in baseline is disputed',
      message:
        'Review both original move-in evidence and counter evidence before deciding deposit deductions.',
    });

    expect(getMoveInBaselineWarning('ACCEPTED')).toBeNull();
  });

  it('still groups move-in and move-out photos by room for comparison', () => {
    expect(
      groupPhotosForComparison(
        [{ id: 'in-1', room: 'Kitchen', imageUrl: '/in.jpg', caption: null }],
        [{ id: 'out-1', room: 'kitchen', imageUrl: '/out.jpg', caption: null }],
      ).matched,
    ).toHaveLength(1);
  });

  it('maps stored deduction photo ids to photos tenant can inspect', () => {
    expect(
      attachEvidencePhotosToDeductions(
        [
          {
            id: 'deduction-1',
            reason: 'Broken wardrobe',
            amount: 120,
            status: 'PROPOSED',
            tenantDisputeNote: null,
            photoIds: '["photo-2","missing","photo-1"]',
          },
        ],
        [
          {
            id: 'photo-1',
            area: 'Bedroom',
            imageUrl: '/bedroom-before.jpg',
          },
          {
            id: 'photo-2',
            area: 'Bedroom',
            imageUrl: '/bedroom-after.jpg',
          },
        ],
      )[0].evidencePhotos,
    ).toEqual([
      { id: 'photo-2', area: 'Bedroom', imageUrl: '/bedroom-after.jpg' },
      { id: 'photo-1', area: 'Bedroom', imageUrl: '/bedroom-before.jpg' },
    ]);
  });

  it('shows completed lifecycle state only after refund is paid', () => {
    expect(getLifecycleCompletionState('PAID')).toEqual({
      title: 'Lifecycle completed',
      message:
        'Deposit refund has been marked paid. This tenancy record is complete for move-out and settlement.',
    });

    expect(getLifecycleCompletionState('AGREED')).toBeNull();
  });

  it('lets landlords withdraw disputed deductions to resolve settlement', () => {
    expect(canLandlordWithdrawDeduction('PROPOSED')).toBe(true);
    expect(canLandlordWithdrawDeduction('DISPUTED')).toBe(true);
    expect(canLandlordWithdrawDeduction('ACCEPTED')).toBe(false);

    expect(
      getRefundStatusAfterDeductionWithdrawal('DISPUTED', [
        { id: 'accepted-1', status: 'ACCEPTED' },
        { id: 'disputed-1', status: 'DISPUTED' },
      ], 'disputed-1'),
    ).toBe('AGREED');

    expect(
      getRefundStatusAfterDeductionWithdrawal('DISPUTED', [
        { id: 'disputed-1', status: 'DISPUTED' },
        { id: 'disputed-2', status: 'DISPUTED' },
      ], 'disputed-1'),
    ).toBe('DISPUTED');
  });

  it('keeps the landlord deposit settlement entry visible after settlement starts', () => {
    expect(
      getDepositSettlementEntry({
        role: 'LANDLORD',
        acknowledgedMoveOut: true,
        depositRefundStatus: null,
      }),
    ).toEqual({
      label: 'Start Deposit Settlement',
      description: 'Create the deposit refund proposal for tenant review.',
    });

    expect(
      getDepositSettlementEntry({
        role: 'LANDLORD',
        acknowledgedMoveOut: true,
        depositRefundStatus: 'PROPOSED',
      }),
    ).toEqual({
      label: 'Continue Deposit Settlement',
      description: 'Review or update the existing deposit settlement.',
    });

    expect(
      getDepositSettlementEntry({
        role: 'TENANT',
        acknowledgedMoveOut: true,
        depositRefundStatus: 'PROPOSED',
      }),
    ).toBeNull();
  });
});
