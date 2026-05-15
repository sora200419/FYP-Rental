import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KycWizard from '@/components/kyc/KycWizard';
import { getKycPageState } from '@/lib/kyc-workflow';

export default async function KycPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role === 'ADMIN') redirect('/dashboard/admin');

  const [user, submission] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVerified: true },
    }),
    prisma.kycSubmission.findUnique({
      where: { userId: session.user.id },
      select: { status: true, rejectedReason: true },
    }),
  ]);

  const pageState = getKycPageState({
    isVerified: user?.isVerified ?? false,
    submissionStatus: submission?.status ?? null,
  });

  if (pageState === 'redirect-profile') redirect('/dashboard/profile');
  if (pageState === 'under-review') {
    return (
      <div className="max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="font-semibold text-blue-800 text-sm">Under review</p>
          <p className="mt-0.5 text-xs text-blue-700">
            Your documents have been submitted and are being reviewed by an admin. You&apos;ll receive a notification once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
        <p className="mt-1 text-sm text-gray-500">
          Verify your identity to unlock full platform access. All documents are stored securely in accordance with PDPA 2010.
        </p>
      </div>

      {submission?.status === 'REJECTED' && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-800 text-sm">Previous submission rejected</p>
          <p className="mt-0.5 text-xs text-red-700">{submission.rejectedReason}</p>
          <p className="mt-1 text-xs text-red-600">Please resubmit with clearer photos.</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <KycWizard />
      </div>
    </div>
  );
}
