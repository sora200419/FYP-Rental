import { t, tc, type Language, type MessageKey } from './i18n';

// Labels for the five-step tenancy timeline, in order (see getTenancyStep).
export const TENANCY_STEP_KEYS = [
  'step_invite',
  'step_agreement',
  'step_deposit',
  'step_condition',
  'step_active',
] as const satisfies readonly MessageKey[];

export function getTenancyStepLabels(lang: Language = 'en'): string[] {
  return TENANCY_STEP_KEYS.map((key) => t(key, lang));
}

export function getTenancyStep(
  status: string,
  agreementStatus?: string | null,
  depositStatus?: string | null,
): number {
  if (status === 'INVITED') return 0;
  if (!agreementStatus || agreementStatus !== 'SIGNED') return 1;
  if (depositStatus !== 'PAID') return 2;
  if (status !== 'ACTIVE') return 3;
  return 4;
}

export type PropertyPhotoLike = {
  id?: string;
  imageUrl: string;
  caption?: string | null;
  order?: number | null;
  createdAt?: Date | string;
};

export type Tone = 'default' | 'muted' | 'success' | 'warning' | 'danger' | 'info';

function getCreatedAtTime(value: PropertyPhotoLike['createdAt']) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

export function getPropertyCover(photos: PropertyPhotoLike[]) {
  if (photos.length === 0) return null;

  const [cover] = [...photos].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return getCreatedAtTime(a.createdAt) - getCreatedAtTime(b.createdAt);
  });

  return {
    imageUrl: cover.imageUrl,
    caption: cover.caption ?? null,
  };
}

export function getPropertyCoverAlt(address: string, caption?: string | null) {
  return caption ? `${caption} for ${address}` : `Property photo for ${address}`;
}

export function getOccupancySummary({
  totalRooms,
  occupiedRooms,
}: {
  totalRooms: number;
  occupiedRooms: number;
}): { label: string; tone: Tone } {
  if (totalRooms === 0) return { label: 'No rooms', tone: 'muted' };
  if (occupiedRooms === totalRooms) return { label: 'Fully occupied', tone: 'success' };
  if (occupiedRooms === 0) return { label: 'Vacant', tone: 'default' };
  return { label: `${occupiedRooms}/${totalRooms} occupied`, tone: 'warning' };
}

type AttentionInput =
  | {
      role: 'LANDLORD';
      pendingPaymentVerifications: number;
      pendingAgreementReviews: number;
      unacknowledgedConditionReports: number;
    }
  | {
      role: 'TENANT';
      pendingPaymentVerifications: number;
      pendingAgreementReviews: number;
      unacknowledgedConditionReports: number;
    }
  | {
      role: 'ADMIN';
      pendingKyc: number;
      pendingProperties: number;
    };

/** The single most important thing for this user to do next, in their language. */
export function getDashboardAttention(input: AttentionInput, lang: Language = 'en') {
  const entry = (
    titleBase: Parameters<typeof tc>[0],
    count: number,
    prefix: string,
  ) => ({
    title: tc(titleBase, count, lang),
    description: t(`${prefix}_desc` as MessageKey, lang),
    actionLabel: t(`${prefix}_action` as MessageKey, lang),
  });
  const clear = (prefix: string) => ({
    title: t(`${prefix}_title` as MessageKey, lang),
    description: t(`${prefix}_desc` as MessageKey, lang),
    actionLabel: t(`${prefix}_action` as MessageKey, lang),
  });

  if (input.role === 'ADMIN') {
    if (input.pendingKyc > 0) return entry('attn_admin_kyc_title', input.pendingKyc, 'attn_admin_kyc');
    if (input.pendingProperties > 0)
      return entry('attn_admin_props_title', input.pendingProperties, 'attn_admin_props');
    return clear('attn_admin_clear');
  }

  if (input.role === 'LANDLORD') {
    if (input.pendingPaymentVerifications > 0)
      return entry('attn_landlord_payments_title', input.pendingPaymentVerifications, 'attn_landlord_payments');
    if (input.pendingAgreementReviews > 0)
      return entry('attn_landlord_agreements_title', input.pendingAgreementReviews, 'attn_landlord_agreements');
    if (input.unacknowledgedConditionReports > 0)
      return entry('attn_landlord_reports_title', input.unacknowledgedConditionReports, 'attn_landlord_reports');
    return clear('attn_landlord_clear');
  }

  if (input.pendingAgreementReviews > 0)
    return entry('attn_tenant_agreement_title', input.pendingAgreementReviews, 'attn_tenant_agreement');
  if (input.pendingPaymentVerifications > 0)
    return entry('attn_tenant_payment_title', input.pendingPaymentVerifications, 'attn_tenant_payment');
  if (input.unacknowledgedConditionReports > 0)
    return entry('attn_tenant_report_title', input.unacknowledgedConditionReports, 'attn_tenant_report');
  return clear('attn_tenant_clear');
}
