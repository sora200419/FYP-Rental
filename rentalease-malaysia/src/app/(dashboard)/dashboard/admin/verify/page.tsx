import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import VerifyButton from '@/components/ui/VerifyButton';
import RevokeButton from '@/components/ui/RevokeButton';
import AdminTabBar from '@/components/ui/AdminTabBar';

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const { tab } = await searchParams;
  const activeTab = tab === 'verified' ? 'verified' : 'pending';

  const [pendingUsers, verifiedCount] = await Promise.all([
    prisma.user.findMany({
      where: {
        isVerified: false,
        role: { not: 'ADMIN' },
        tenantDocuments: { some: { type: 'IC_COPY' } },
      },
      include: {
        tenantDocuments: {
          where: { type: 'IC_COPY' },
          select: { imageUrl: true, uploadedAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.count({ where: { isVerified: true, role: { not: 'ADMIN' } } }),
  ]);

  const verifiedUsers =
    activeTab === 'verified'
      ? await prisma.user.findMany({
          where: { isVerified: true, role: { not: 'ADMIN' } },
          include: {
            tenantDocuments: {
              where: { type: 'IC_COPY' },
              select: { imageUrl: true, uploadedAt: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

  const displayUsers = activeTab === 'pending' ? pendingUsers : verifiedUsers;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/dashboard/admin" className="hover:text-blue-600 transition-colors">
          Admin
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">KYC Verification</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
      </div>

      <AdminTabBar
        activeTab={activeTab}
        pendingCount={pendingUsers.length}
        verifiedCount={verifiedCount}
      />

      {displayUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold">
            {activeTab === 'pending' ? 'No pending KYC submissions' : 'No verified users yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'pending'
              ? 'Users who have uploaded their IC will appear here.'
              : 'Approved users will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayUsers.map((user) => {
            const icDoc = user.tenantDocuments[0] ?? null;
            const wasRejected = !!user.kycRejectedReason;
            return (
              <div
                key={user.id}
                className={`bg-white border rounded-xl p-5 flex items-start gap-5 ${
                  wasRejected && activeTab === 'pending' ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center mt-0.5">
                  {icDoc ? (
                    <Image
                      src={icDoc.imageUrl}
                      alt="IC copy"
                      width={80}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 text-center leading-tight px-1">
                      No IC<br />uploaded
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === 'LANDLORD'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {user.role}
                    </span>
                    {wasRejected && activeTab === 'pending' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Previously rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  {user.icNumber ? (
                    <p className="text-xs text-gray-500 mt-0.5">IC: {user.icNumber}</p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-0.5">IC number not provided</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Registered:{' '}
                    {new Date(user.createdAt).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {icDoc && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      IC submitted:{' '}
                      {new Date(icDoc.uploadedAt).toLocaleDateString('en-MY', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  )}

                  {wasRejected && activeTab === 'pending' && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-700 mb-0.5">
                        Previous rejection reason
                      </p>
                      <p className="text-xs text-red-600">{user.kycRejectedReason}</p>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  {icDoc && (
                    <a
                      href={icDoc.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View full IC
                    </a>
                  )}
                  {activeTab === 'pending' ? (
                    <VerifyButton userId={user.id} disabled={!icDoc && !user.icNumber} />
                  ) : (
                    <RevokeButton revokeUrl={`/api/admin/users/${user.id}/revoke`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
