import { describe, expect, it } from 'vitest';
import {
  buildTenantConditionReviewTenancyQuery,
  buildTenantConditionTenancyQuery,
  getTenantConditionsHref,
} from '../../src/lib/conditionReports';

describe('tenant condition report helpers', () => {
  it('builds notification links that preserve the tenancy context', () => {
    expect(getTenantConditionsHref('tenancy-older')).toBe(
      '/dashboard/tenant/conditions?tenancyId=tenancy-older',
    );
  });

  it('uses a requested tenancy id before falling back to the latest tenancy', () => {
    expect(
      buildTenantConditionTenancyQuery('tenant-1', 'tenancy-older').where,
    ).toEqual({
      id: 'tenancy-older',
      tenantId: 'tenant-1',
      status: { in: ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'] },
    });

    expect(buildTenantConditionTenancyQuery('tenant-1').where).toEqual({
      tenantId: 'tenant-1',
      status: { in: ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'] },
    });
  });

  it('can find a tenancy with a report waiting for tenant review', () => {
    expect(buildTenantConditionReviewTenancyQuery('tenant-1').where).toEqual({
      tenantId: 'tenant-1',
      status: { in: ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'] },
      conditionReports: {
        some: {
          OR: [
            {
              createdById: { not: 'tenant-1' },
              status: { in: ['SUBMITTED', 'PENDING_REVIEW'] },
            },
            {
              status: 'COUNTER_EVIDENCE_ADDED',
              reviewedById: { not: null },
              NOT: { reviewedById: 'tenant-1' },
            },
          ],
        },
      },
    });
  });
});
