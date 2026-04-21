// src/components/ui/DashboardBanners.tsx
import Link from 'next/link';

/*
 * Dashboard banners — a compact attention-grabbing row at the top of
 * each dashboard page, showing items that need urgent action.
 *
 * How this differs from notifications
 * -----------------------------------
 * Notifications in the bell dropdown are historical — they show every
 * event that happened, whether or not the user still needs to act. Banners
 * are forward-looking — they surface only the items currently blocking
 * the user's workflow. If the tenant has three unread notifications but
 * nothing they need to do, the banners are empty. If the tenant has zero
 * unread notifications but an agreement waiting to be signed, a banner
 * appears.
 *
 * This means banners are computed from current database state, not from
 * the Notification table itself. The dashboard page queries for things
 * like "agreements in READY status assigned to this user" and passes the
 * counts to this component.
 *
 * Design choice: server component with props
 * ------------------------------------------
 * This is a server component (no 'use client'). It receives precomputed
 * counts from its parent dashboard page, which runs the Prisma queries
 * in server context. That means the banners render in the initial HTML
 * with correct values, no loading flash, no extra client-side fetch.
 * The tradeoff is that the banners don't update live without a page
 * reload — which is fine, because users typically refresh dashboards
 * frequently and the bell dropdown handles the real-time needs.
 */

interface BannerData {
  role: 'LANDLORD' | 'TENANT';

  // Tenant-side counts
  pendingAgreementReviews?: number; // agreements in READY/NEGOTIATING awaiting tenant sign
  rejectedPayments?: number; // payment proofs rejected, needing re-upload

  // Landlord-side counts
  pendingChangesRequested?: number; // agreements where tenant requested changes
  pendingPaymentVerifications?: number; // payment proofs awaiting landlord review

  // Either-side counts
  unacknowledgedConditionReports?: number; // reports the other party created, not yet ack'd
}

type BannerColor = 'blue' | 'red' | 'amber';

interface Banner {
  emoji: string;
  text: string;
  href: string;
  color: BannerColor;
}

/*
 * Color meaning convention:
 *   blue  = informational, user action welcome but not urgent
 *   amber = attention needed, user should act soon
 *   red   = problem, user should act now
 */
const COLOR_CLASSES: Record<BannerColor, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  red: 'bg-red-50 border-red-200 text-red-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
};

export function DashboardBanners(props: BannerData) {
  const banners: Banner[] = [];

  if (props.role === 'TENANT') {
    if (props.pendingAgreementReviews && props.pendingAgreementReviews > 0) {
      banners.push({
        emoji: '📝',
        text: `${props.pendingAgreementReviews} agreement${props.pendingAgreementReviews > 1 ? 's' : ''} awaiting your review`,
        href: '/dashboard/tenant',
        color: 'blue',
      });
    }
    if (props.rejectedPayments && props.rejectedPayments > 0) {
      banners.push({
        emoji: '⚠️',
        text: `${props.rejectedPayments} payment proof${props.rejectedPayments > 1 ? 's' : ''} rejected — please re-upload`,
        href: '/dashboard/tenant',
        color: 'red',
      });
    }
  }

  if (props.role === 'LANDLORD') {
    if (props.pendingChangesRequested && props.pendingChangesRequested > 0) {
      banners.push({
        emoji: '✏️',
        text: `${props.pendingChangesRequested} agreement${props.pendingChangesRequested > 1 ? 's' : ''} with tenant-requested changes`,
        href: '/dashboard/landlord',
        color: 'amber',
      });
    }
    if (
      props.pendingPaymentVerifications &&
      props.pendingPaymentVerifications > 0
    ) {
      banners.push({
        emoji: '💰',
        text: `${props.pendingPaymentVerifications} payment proof${props.pendingPaymentVerifications > 1 ? 's' : ''} awaiting verification`,
        href: '/dashboard/landlord',
        color: 'blue',
      });
    }
  }

  // Condition report acknowledgement is relevant to both roles
  if (
    props.unacknowledgedConditionReports &&
    props.unacknowledgedConditionReports > 0
  ) {
    banners.push({
      emoji: '📷',
      text: `${props.unacknowledgedConditionReports} condition report${props.unacknowledgedConditionReports > 1 ? 's' : ''} awaiting your acknowledgement`,
      href:
        props.role === 'TENANT' ? '/dashboard/tenant' : '/dashboard/landlord',
      color: 'amber',
    });
  }

  // No banners to show — return null to render nothing (not even an empty div).
  if (banners.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {banners.map((b, i) => (
        <Link
          key={i}
          href={b.href}
          className={`
            block border rounded-lg px-4 py-3 text-sm font-medium
            hover:opacity-90 transition-opacity
            ${COLOR_CLASSES[b.color]}
          `}
        >
          <span className="mr-2">{b.emoji}</span>
          {b.text}
        </Link>
      ))}
    </div>
  );
}
