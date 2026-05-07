import Link from 'next/link';

interface Props {
  role: string;
}

export default function KycPendingBanner({ role }: Props) {
  const detail =
    role === 'LANDLORD'
      ? 'You cannot add properties or invite tenants until your identity is approved.'
      : 'You cannot accept tenancy invitations until your identity is approved.';

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
      <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">Account pending identity verification</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          {detail} An admin will review your IC photo and approve your account.{' '}
          <Link href="/dashboard/profile" className="underline font-medium hover:text-amber-900">
            View your profile
          </Link>{' '}
          to check your submission status.
        </p>
      </div>
    </div>
  );
}
