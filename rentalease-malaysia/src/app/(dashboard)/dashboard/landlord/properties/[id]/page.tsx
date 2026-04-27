import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AddRoomForm from '@/components/ui/AddRoomForm';
import PropertyPhotoUploader from '@/components/ui/PropertyPhotoUploader';
import PropertyPhotoGallery from '@/components/ui/PropertyPhotoGallery';

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: { id, landlordId: session.user.id },
    include: {
      photos: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      rooms: {
        include: {
          tenancies: {
            where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
            include: {
              tenant: { select: { name: true, email: true } },
              agreement: { select: { status: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!property) notFound();

  const formatRM = (amount: unknown) =>
    `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const totalRooms = property.rooms.length;
  const occupiedRooms = property.rooms.filter((r) => !r.isAvailable).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link
          href="/dashboard/landlord/properties"
          className="hover:text-blue-600 transition-colors"
        >
          Properties
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">
          {property.address}
        </span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {property.address}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {property.city}, {property.state} {property.postcode}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400 capitalize">
            {property.type}
          </span>
          {totalRooms > 0 && (
            <p className="text-xs font-medium text-gray-500 mt-1">
              {occupiedRooms}/{totalRooms} rooms occupied
            </p>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* Photos section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Property Photos
          </h2>
          <PropertyPhotoGallery
            propertyId={property.id}
            photos={property.photos}
          />
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3">
              Add a Photo
            </p>
            <PropertyPhotoUploader propertyId={property.id} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Property Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Type</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {property.type}
              </p>
            </div>
            {property.description && (
              <div className="col-span-2">
                <p className="text-gray-400">Description</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {property.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Rooms ({totalRooms})
            </h2>
            {totalRooms === 0 && (
              <p className="text-xs text-amber-600 font-medium">
                Add at least one room to create tenancies
              </p>
            )}
          </div>

          {totalRooms === 0 && (
            <div className="text-center py-6 mb-5">
              <p className="text-3xl mb-2">🚪</p>
              <p className="text-gray-600 font-medium text-sm">
                No rooms added yet
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Add &ldquo;Entire Unit&rdquo; for a single-tenant let, or
                individual rooms for room-by-room rentals.
              </p>
            </div>
          )}

          <div className="space-y-4 mb-5">
            {property.rooms.map((room) => {
              const currentTenancy = room.tenancies[0] ?? null;
              const isOccupied = !room.isAvailable;

              return (
                <div
                  key={room.id}
                  className={`border rounded-xl p-5 ${isOccupied ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {room.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        🚿 {room.bathrooms} bathroom
                        {room.bathrooms > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-600 font-bold">
                        {formatRM(room.rentAmount)}
                      </p>
                      <p className="text-xs text-gray-400">/month</p>
                    </div>
                  </div>

                  {isOccupied && currentTenancy ? (
                    <div className="bg-white rounded-lg border border-green-200 p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                          {currentTenancy.tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {currentTenancy.tenant.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {currentTenancy.tenant.email}
                          </p>
                        </div>
                        <span
                          className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                            currentTenancy.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : currentTenancy.status === 'INVITED'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {currentTenancy.status.charAt(0) +
                            currentTenancy.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <Link
                        href={`/dashboard/landlord/tenancies/${currentTenancy.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View Tenancy →
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-medium">
                        Vacant
                      </span>
                      <Link
                        href={`/dashboard/landlord/tenancies/new?roomId=${room.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        + Create Tenancy
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <AddRoomForm propertyId={property.id} />
        </div>
      </div>
    </div>
  );
}
