import { describe, expect, it } from 'vitest';
import { getUserDeleteBlockers } from '../../src/app/api/admin/users/[id]/delete/route';

describe('getUserDeleteBlockers', () => {
  it('returns empty array when account has no active obligations', () => {
    expect(
      getUserDeleteBlockers({
        activeTenancyCount: 0,
        overduePaymentCount: 0,
        pendingDepositCount: 0,
        unfinishedAgreementCount: 0,
      }),
    ).toEqual([]);
  });

  it('blocks on a single active tenancy', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 1,
      overduePaymentCount: 0,
      pendingDepositCount: 0,
      unfinishedAgreementCount: 0,
    });
    expect(blockers).toEqual(['1 active tenancy']);
  });

  it('uses singular for one overdue payment', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 0,
      overduePaymentCount: 1,
      pendingDepositCount: 0,
      unfinishedAgreementCount: 0,
    });
    expect(blockers).toContain('1 overdue payment');
  });

  it('uses plural for multiple overdue payments', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 0,
      overduePaymentCount: 3,
      pendingDepositCount: 0,
      unfinishedAgreementCount: 0,
    });
    expect(blockers).toContain('3 overdue payments');
  });

  it('reports all four blockers when all are non-zero', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 1,
      overduePaymentCount: 2,
      pendingDepositCount: 1,
      unfinishedAgreementCount: 1,
    });
    expect(blockers).toHaveLength(4);
    expect(blockers).toContain('1 active tenancy');
    expect(blockers).toContain('2 overdue payments');
    expect(blockers).toContain('1 pending deposit refund');
    expect(blockers).toContain('1 unfinished agreement');
  });

  it('uses plural for multiple deposit refunds', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 0,
      overduePaymentCount: 0,
      pendingDepositCount: 2,
      unfinishedAgreementCount: 0,
    });
    expect(blockers).toContain('2 pending deposit refunds');
  });
});
