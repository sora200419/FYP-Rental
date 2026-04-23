'use client';

import Link from 'next/link';

interface EndOfTenancyBannerProps {
  tenancyId: string;
  daysLeft: number;
  role: 'LANDLORD' | 'TENANT';
  hasMoveOutReport: boolean;
  acknowledgedMoveOut: boolean;
  depositRefundStatus: string | null;
}

export function EndOfTenancyBanner({
  tenancyId,
  daysLeft,
  role,
  hasMoveOutReport,
  acknowledgedMoveOut,
  depositRefundStatus,
}: EndOfTenancyBannerProps) {
  const urgency = daysLeft <= 7 ? 'red' : daysLeft <= 14 ? 'amber' : 'blue';

  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
  }[urgency];

  return (
    <div className={`border rounded-xl px-5 py-4 ${colorClasses}`}>
      <p className="font-bold text-sm mb-1">
        ⏰ Tenancy ending in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
      </p>
      <p className="text-xs mb-3 opacity-80">
        Review your options below and prepare for the handover process.
      </p>

      {/* Action links */}
      <div className="flex flex-wrap gap-3">
        {role === 'LANDLORD' && (
          <>
            <Link
              href={`/dashboard/landlord/tenancies/${tenancyId}/renew`}
              className="text-xs font-semibold bg-white/60 hover:bg-white border border-current rounded-lg px-3 py-1.5 transition-colors"
            >
              🔄 Renew Tenancy
            </Link>
            <Link
              href={`/dashboard/landlord/tenancies/${tenancyId}/terminate`}
              className="text-xs font-semibold bg-white/60 hover:bg-white border border-current rounded-lg px-3 py-1.5 transition-colors"
            >
              🤝 End by Mutual Agreement
            </Link>
          </>
        )}

        {!hasMoveOutReport && (
          <Link
            href={
              role === 'LANDLORD'
                ? `/dashboard/landlord/tenancies/${tenancyId}/conditions`
                : `/dashboard/tenant/conditions`
            }
            className="text-xs font-semibold bg-white/60 hover:bg-white border border-current rounded-lg px-3 py-1.5 transition-colors"
          >
            📷 Create Move-Out Report
          </Link>
        )}

        {acknowledgedMoveOut && !depositRefundStatus && role === 'LANDLORD' && (
          <Link
            href={`/dashboard/landlord/tenancies/${tenancyId}/deposit-settlement`}
            className="text-xs font-semibold bg-white/60 hover:bg-white border border-current rounded-lg px-3 py-1.5 transition-colors"
          >
            💰 Start Deposit Settlement
          </Link>
        )}
      </div>
    </div>
  );
}
