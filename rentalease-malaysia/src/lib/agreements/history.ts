export type AgreementEventType =
  | 'GENERATED'
  | 'EDITED'
  | 'FINALIZED'
  | 'REQUESTED_CHANGES'
  | 'SIGNED';

export type AgreementChecklistInput = {
  hasRawContent: boolean;
  isWizardComplete: boolean;
  hasReviewedRedFlags: boolean;
  unresolvedStructuredRequests: number;
  hasRequiredIdentityData: boolean;
  isFinalizableStatus: boolean;
};

export type AgreementActorRole = 'LANDLORD' | 'TENANT' | 'ADMIN';

export type AgreementChecklistItem = {
  key:
    | 'has-content'
    | 'wizard-complete'
    | 'review-red-flags'
    | 'resolve-change-requests'
    | 'identity-ready'
    | 'status-finalizable';
  passed: boolean;
  blocking: true;
};

export type AgreementEvent = {
  agreementId: string;
  type: AgreementEventType;
  actorRole: AgreementActorRole;
  actorUserId: string | null;
  summary: string;
  metadata: null;
};

export function buildAgreementEvent(input: {
  agreementId: string;
  type: AgreementEventType;
  actorRole: AgreementActorRole;
  actorUserId: string | null;
  summary: string;
}): AgreementEvent {
  return {
    agreementId: input.agreementId,
    type: input.type,
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    summary: input.summary,
    metadata: null,
  };
}

export type AgreementRevision = {
  agreementId: string;
  versionNumber: number;
  rawContent: string;
  plainLanguageSummary: string;
  plainLanguageSummaryMs: string | null;
  redFlags: string;
  redFlagsMs: string | null;
  createdByUserId: string | null;
};

export function buildAgreementRevision(input: AgreementRevision): AgreementRevision {
  return input;
}

export type AgreementChangeRequest = {
  category: string;
  requestedChange: string;
  reason: string;
  note: string | null;
};

export function normalizeChangeRequest(input: {
  category: string;
  requestedChange: string;
  reason: string;
  note?: string | null;
}): AgreementChangeRequest {
  return {
    category: input.category.trim(),
    requestedChange: input.requestedChange.trim(),
    reason: input.reason.trim(),
    note: input.note?.trim() || null,
  };
}

export function formatChangeRequestSummary(
  requests: AgreementChangeRequest[],
  note?: string | null,
): string {
  const lines = requests.map(
    (request, index) =>
      `${index + 1}. ${request.category}: ${request.requestedChange}\nReason: ${request.reason}${request.note ? `\nAdditional note: ${request.note}` : ''}`,
  );

  if (note?.trim()) {
    lines.push(`General note: ${note.trim()}`);
  }

  return lines.join('\n\n');
}

export type AgreementChecklistResult = {
  blocked: boolean;
  items: AgreementChecklistItem[];
};

export function isFinalizeBlocked(
  input: AgreementChecklistInput,
): AgreementChecklistResult {
  const items: AgreementChecklistItem[] = [
    {
      key: 'has-content',
      passed: input.hasRawContent,
      blocking: true,
    },
    {
      key: 'wizard-complete',
      passed: input.isWizardComplete,
      blocking: true,
    },
    {
      key: 'review-red-flags',
      passed: input.hasReviewedRedFlags,
      blocking: true,
    },
    {
      key: 'resolve-change-requests',
      passed: input.unresolvedStructuredRequests === 0,
      blocking: true,
    },
    {
      key: 'identity-ready',
      passed: input.hasRequiredIdentityData,
      blocking: true,
    },
    {
      key: 'status-finalizable',
      passed: input.isFinalizableStatus,
      blocking: true,
    },
  ];

  return {
    blocked: items.some((item) => !item.passed),
    items,
  };
}
