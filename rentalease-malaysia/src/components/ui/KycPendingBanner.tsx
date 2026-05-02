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
    <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
      <span className="text-amber-500 text-xl mt-0.5 shrink-0">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-amber-800 font-semibold text-sm">
          Account pending identity verification
        </p>
        <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
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
