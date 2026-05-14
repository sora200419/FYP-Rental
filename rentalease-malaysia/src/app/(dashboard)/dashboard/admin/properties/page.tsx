import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import VerifyPropertyButton from '@/components/ui/VerifyPropertyButton';
import RevokeButton from '@/components/ui/RevokeButton';
import AdminTabBar from '@/components/ui/AdminTabBar';
import PropertyCover from '@/components/ui/PropertyCover';
import { PageHeader } from '@/components/ui/RedesignPrimitives';

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const { tab } = await searchParams;
  const activeTab = tab === 'verified' ? 'verified' : 'pending';

  const [unverifiedProperties, verifiedCount] = await Promise.all([
    prisma.property.findMany({
      where: { isVerified: false },
      include: {
        landlord: { select: { name: true, email: true, icNumber: true, isVerified: true } },
        rooms: { select: { id: true } },
        photos: { select: { imageUrl: true, caption: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.property.count({ where: { isVerified: true } }),
  ]);

  const verifiedProperties =
    activeTab === 'verified'
      ? await prisma.property.findMany({
          where: { isVerified: true },
          include: {
            landlord: { select: { name: true, email: true, icNumber: true, isVerified: true } },
            rooms: { select: { id: true } },
            photos: { select: { imageUrl: true, caption: true }, orderBy: { order: 'asc' } },
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

  const displayProperties = activeTab === 'pending' ? unverifiedProperties : verifiedProperties;

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Admin"
        title="Property Verification"
        description="Review and approve property listings before landlords can invite tenants."
      />

      <AdminTabBar
        activeTab={activeTab}
        pendingCount={unverifiedProperties.length}
        verifiedCount={verifiedCount}
      />

      {displayProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold">
            {activeTab === 'pending' ? 'All properties are verified' : 'No verified properties yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'pending'
              ? 'No pending property approvals.'
              : 'Approved properties will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayProperties.map((property) => {
            const wasRejected = !!property.rejectedReason;
            return (
              <div
                key={property.id}
                className={`grid gap-4 rounded-xl border bg-white p-4 lg:grid-cols-[160px_1fr_auto] ${
                  wasRejected && activeTab === 'pending' ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                  <PropertyCover
                    address={property.address}
                    imageUrl={property.photos[0]?.imageUrl}
                    caption={property.photos[0]?.caption}
                    heightClassName="h-32 lg:h-full"
                    className="rounded-xl"
                  />
                  <div className="flex-1 min-w-0 p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{property.address}</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {property.type}
                      </span>
                      {wasRejected && activeTab === 'pending' && (
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

                    {wasRejected && activeTab === 'pending' && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-red-700 mb-0.5">Previous rejection reason</p>
                        <p className="text-xs text-red-600">{property.rejectedReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 p-5 flex items-start">
                    {activeTab === 'pending' ? (
                      <VerifyPropertyButton propertyId={property.id} />
                    ) : (
                      <RevokeButton revokeUrl={`/api/admin/properties/${property.id}/revoke`} />
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
