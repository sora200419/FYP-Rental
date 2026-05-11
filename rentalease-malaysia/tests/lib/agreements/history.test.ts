import { describe, expect, it } from 'vitest';
import {
  buildAgreementEvent,
  buildAgreementRevision,
  isFinalizeBlocked,
} from '@/lib/agreements/history';

describe('agreement history helpers', () => {
  it('builds a generated event summary', () => {
    const event = buildAgreementEvent({
      agreementId: 'agreement_1',
      type: 'GENERATED',
      actorRole: 'LANDLORD',
      actorUserId: 'user_1',
      summary: 'Agreement generated from wizard answers',
    });

    expect(event.type).toBe('GENERATED');
    expect(event.summary).toContain('generated');
  });

  it('builds a versioned revision snapshot', () => {
    const revision = buildAgreementRevision({
      agreementId: 'agreement_1',
      versionNumber: 2,
      rawContent: 'Clause 1',
      plainLanguageSummary: 'Summary',
      plainLanguageSummaryMs: null,
      redFlags: '[]',
      redFlagsMs: null,
      createdByUserId: 'user_1',
    });

    expect(revision.versionNumber).toBe(2);
    expect(revision.rawContent).toBe('Clause 1');
  });

  it('blocks finalization when required checklist items are missing', () => {
    const result = isFinalizeBlocked({
      hasRawContent: true,
      isWizardComplete: true,
      hasReviewedRedFlags: false,
      unresolvedStructuredRequests: 1,
      hasRequiredIdentityData: true,
      isFinalizableStatus: true,
    });

    expect(result.blocked).toBe(true);
    expect(result.items.some((item) => item.key === 'review-red-flags')).toBe(true);
    expect(
      result.items.some((item) => item.key === 'resolve-change-requests'),
    ).toBe(true);
  });
});
