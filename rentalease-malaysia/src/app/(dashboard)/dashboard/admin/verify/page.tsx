import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import VerifyButton from '@/components/ui/VerifyButton';

export default async function AdminVerifyPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const unverifiedUsers = await prisma.user.findMany({
    where: { isVerified: false, role: { not: 'ADMIN' } },
    include: {
      tenantDocuments: {
        where: { type: 'IC_COPY' },
        select: { imageUrl: true, uploadedAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/dashboard/admin" className="hover:text-blue-600 transition-colors">
          Admin
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">KYC Verification</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KYC Verification Queue</h1>
        <p className="text-gray-500 text-sm mt-1">
          {unverifiedUsers.length} user{unverifiedUsers.length !== 1 ? 's' : ''} pending identity review
        </p>
      </div>

      {unverifiedUsers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-700 font-semibold">All users are verified</p>
          <p className="text-gray-400 text-sm mt-1">No pending KYC reviews.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unverifiedUsers.map((user) => {
            const icDoc = user.tenantDocuments[0] ?? null;
            const wasRejected = !!user.kycRejectedReason;
            return (
              <div
                key={user.id}
                className={`bg-white border rounded-xl p-5 flex items-start gap-5 ${
                  wasRejected ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                {/* IC document thumbnail */}
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

                {/* User details */}
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
                    {wasRejected && (
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
                    Registered: {new Date(user.createdAt).toLocaleDateString('en-MY', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>

                  {/* Previous rejection reason — shown so admin has context on re-review */}
                  {wasRejected && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-700 mb-0.5">Previous rejection reason</p>
                      <p className="text-xs text-red-600">{user.kycRejectedReason}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {icDoc ? (
                    <a
                      href={icDoc.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View full IC
                    </a>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">No IC uploaded</span>
                  )}
                  <VerifyButton userId={user.id} disabled={!icDoc} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
