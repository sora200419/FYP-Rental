import { describe, expect, it } from 'vitest';
import {
  buildTenantPaymentsTenancyQuery,
  getTenantPaymentStats,
  getTenantRentPaymentDisplayStatus,
} from '../../src/lib/tenantPayments';

describe('tenant payments helpers', () => {
  it('builds a query that fetches all payment-visible tenancies for a tenant', () => {
    const query = buildTenantPaymentsTenancyQuery('tenant-1');

    expect(query.where).toEqual({
      tenantId: 'tenant-1',
      status: { in: ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'] },
    });
    expect(query.orderBy).toEqual({ createdAt: 'desc' });
    expect(query.include.rentPayments).toBeDefined();
    expect(query.include.depositProofs).toBeDefined();
  });

  it('aggregates rent stats across multiple tenancies', () => {
    const stats = getTenantPaymentStats([
      {
        rentPayments: [
          { status: 'PAID' },
          { status: 'PENDING' },
        ],
      },
      {
        rentPayments: [
          { status: 'UNDER_REVIEW' },
          { status: 'PENDING' },
        ],
      },
    ]);

    expect(stats).toEqual({
      total: 4,
      paid: 1,
      pending: 2,
      underReview: 1,
    });
  });

  it('counts future pending rent after termination as waived', () => {
    const terminatedAt = new Date('2026-05-19T00:00:00.000Z');
    const tenancy = {
      status: 'TERMINATED',
      terminatedAt,
      rentPayments: [
        {
          status: 'PENDING',
          dueDate: new Date('2026-07-15T00:00:00.000Z'),
        },
        {
          status: 'PENDING',
          dueDate: new Date('2026-04-15T00:00:00.000Z'),
        },
      ],
    };

    expect(
      getTenantRentPaymentDisplayStatus(tenancy, tenancy.rentPayments[0]),
    ).toBe('WAIVED');

    expect(getTenantPaymentStats([tenancy])).toEqual({
      total: 2,
      paid: 1,
      pending: 1,
      underReview: 0,
    });
  });
});
