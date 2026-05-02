import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import VerifyPropertyButton from '@/components/ui/VerifyPropertyButton';

export default async function AdminPropertiesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const unverifiedProperties = await prisma.property.findMany({
    where: { isVerified: false },
    include: {
      landlord: { select: { name: true, email: true, icNumber: true, isVerified: true } },
      rooms: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/dashboard/admin" className="hover:text-blue-600 transition-colors">
          Admin
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Property Verification</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Property Verification Queue</h1>
        <p className="text-gray-500 text-sm mt-1">
          {unverifiedProperties.length} propert{unverifiedProperties.length !== 1 ? 'ies' : 'y'} pending review
        </p>
      </div>

      {unverifiedProperties.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-700 font-semibold">All properties are verified</p>
          <p className="text-gray-400 text-sm mt-1">No pending property approvals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unverifiedProperties.map((property) => {
            const wasRejected = !!property.rejectedReason;
            return (
              <div
                key={property.id}
                className={`bg-white border rounded-xl p-5 flex items-start gap-5 ${
                  wasRejected ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{property.address}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {property.type}
                    </span>
                    {wasRejected && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Previously rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {property.city}, {property.state} {property.postcode}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {property.rooms.length} room{property.rooms.length !== 1 ? 's' : ''} &middot; Listed{' '}
                    {new Date(property.createdAt).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>

                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-600 font-medium">
                      Landlord: {property.landlord.name}
                    </p>
                    <p className="text-xs text-gray-400">{property.landlord.email}</p>
                    {property.landlord.icNumber && (
                      <p className="text-xs text-gray-400">IC: {property.landlord.icNumber}</p>
                    )}
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${
                        property.landlord.isVerified
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      Landlord {property.landlord.isVerified ? 'Identity Verified' : 'Identity Pending'}
                    </span>
                  </div>

                  {/* Previous rejection reason — shown so admin has context on re-review */}
                  {wasRejected && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-700 mb-0.5">Previous rejection reason</p>
                      <p className="text-xs text-red-600">{property.rejectedReason}</p>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <VerifyPropertyButton propertyId={property.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
