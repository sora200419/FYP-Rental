import { describe, expect, it } from 'vitest';
import {
  canReviewConditionReport,
  getDefaultConditionReportType,
  getReviewNotificationRecipient,
  getCounterEvidenceNextStatus,
  isConditionReportLocked,
} from '../../src/lib/conditionReportWorkflow';

describe('condition report workflow', () => {
  it('keeps counter evidence editable before a final dispute lock', () => {
    expect(getCounterEvidenceNextStatus()).toBe('COUNTER_EVIDENCE_ADDED');
    expect(isConditionReportLocked('COUNTER_EVIDENCE_ADDED')).toBe(false);
    expect(isConditionReportLocked('DISPUTED')).toBe(true);
  });

  it('lets the other party review submitted reports', () => {
    expect(
      canReviewConditionReport({
        status: 'PENDING_REVIEW',
        createdById: 'landlord-1',
        reviewedById: null,
        currentUserId: 'tenant-1',
      }),
    ).toBe(true);

    expect(
      canReviewConditionReport({
        status: 'PENDING_REVIEW',
        createdById: 'landlord-1',
        reviewedById: null,
        currentUserId: 'landlord-1',
      }),
    ).toBe(false);
  });

  it('returns review control to the original creator after counter evidence', () => {
    expect(
      canReviewConditionReport({
        status: 'COUNTER_EVIDENCE_ADDED',
        createdById: 'landlord-1',
        reviewedById: 'tenant-1',
        currentUserId: 'landlord-1',
      }),
    ).toBe(true);

    expect(
      canReviewConditionReport({
        status: 'COUNTER_EVIDENCE_ADDED',
        createdById: 'landlord-1',
        reviewedById: 'tenant-1',
        currentUserId: 'tenant-1',
      }),
    ).toBe(false);

    expect(
      canReviewConditionReport({
        status: 'COUNTER_EVIDENCE_ADDED',
        createdById: 'landlord-1',
        reviewedById: null,
        currentUserId: 'landlord-1',
      }),
    ).toBe(false);
  });

  it('chooses a valid default report type for ended tenancies', () => {
    expect(getDefaultConditionReportType('ACTIVE')).toBe('MOVE_IN');
    expect(getDefaultConditionReportType('EXPIRED')).toBe('MOVE_OUT');
    expect(getDefaultConditionReportType('TERMINATED')).toBe('MOVE_OUT');
    expect(getDefaultConditionReportType('PENDING')).toBeNull();
  });

  it('routes review notifications to the opposite tenancy party', () => {
    expect(
      getReviewNotificationRecipient({
        creatorId: 'landlord-1',
        landlordId: 'landlord-1',
        tenantId: 'tenant-1',
      }),
    ).toBe('tenant-1');

    expect(
      getReviewNotificationRecipient({
        creatorId: 'tenant-1',
        landlordId: 'landlord-1',
        tenantId: 'tenant-1',
      }),
    ).toBe('landlord-1');
  });
});
