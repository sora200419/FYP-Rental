import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import PropertyCover from '@/components/ui/PropertyCover';
import { EmptyState, PageHeader, StatCard } from '@/components/ui/RedesignPrimitives';
import { getPropertyCover } from '@/lib/uiRedesign';

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const [properties, landlord] = await Promise.all([
    prisma.property.findMany({
      where: { landlordId: session.user.id },
      include: {
        photos: {
          select: { imageUrl: true, caption: true, order: true, createdAt: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          take: 1,
        },
        rooms: {
          include: {
            tenancies: {
              where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVerified: true, icNumber: true },
    }),
  ]);

  const isVerified = landlord?.isVerified ?? false;
  const hasIc = !!landlord?.icNumber;
  const totalRooms = properties.reduce((sum, property) => sum + property.rooms.length, 0);
  const occupiedRooms = properties.reduce(
    (sum, property) => sum + property.rooms.filter((room) => room.tenancies.length > 0).length,
    0,
  );
  const pendingVerification = properties.filter((property) => !property.isVerified).length;

  return (
    <div>
      {!isVerified && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Account not yet verified</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
              {hasIc
                ? 'Your IC is pending admin review. You will be able to add properties once your identity is verified.'
                : <>You need to upload your IC on your{' '}<Link href="/dashboard/profile" className="font-medium underline">Profile page</Link>{' '}and wait for admin approval before you can add properties.</>
              }
            </p>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Property portfolio"
        title="Properties"
        description={`${properties.length} ${properties.length === 1 ? 'property' : 'properties'} in your portfolio`}
        action={
          isVerified && (
            <Link
              href="/dashboard/landlord/properties/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Add Property
            </Link>
          )
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Properties" value={properties.length} tone="blue" />
        <StatCard label="Rooms" value={totalRooms} />
        <StatCard label="Occupied" value={occupiedRooms} detail={`${totalRooms - occupiedRooms} available`} tone="green" />
        <StatCard
          label="Pending verification"
          value={pendingVerification}
          tone={pendingVerification > 0 ? 'amber' : 'default'}
        />
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description={
            isVerified
              ? 'Add your first property to start building your RentalEase portfolio.'
              : 'Complete identity verification to start adding properties.'
          }
          action={
            isVerified && (
              <Link
                href="/dashboard/landlord/properties/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Add Property
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const cover = getPropertyCover(property.photos);
            const propertyTotalRooms = property.rooms.length;
            const propertyOccupiedRooms = property.rooms.filter((r) => r.tenancies.length > 0).length;
            const fullyOccupied = propertyTotalRooms > 0 && propertyOccupiedRooms === propertyTotalRooms;
            const hasVacancy = propertyTotalRooms > 0 && propertyOccupiedRooms < propertyTotalRooms;
            const noRooms = propertyTotalRooms === 0;

            const occupancyLabel = fullyOccupied
              ? 'Fully occupied'
              : noRooms
              ? 'No rooms'
              : hasVacancy
              ? `${propertyOccupiedRooms}/${propertyTotalRooms} occupied`
              : 'Vacant';

            const occupancyPill = fullyOccupied
              ? 'bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset'
              : noRooms
              ? 'bg-gray-100 text-gray-400 ring-1 ring-gray-200 ring-inset'
              : hasVacancy
              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset'
              : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset';

            return (
              <article key={property.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300">
                <div className="relative">
                  <PropertyCover
                    address={property.address}
                    imageUrl={cover?.imageUrl}
                    caption={cover?.caption}
                    className="rounded-t-xl"
                    heightClassName="h-44"
                  />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${occupancyPill}`}>
                      {occupancyLabel}
                    </span>
                    {!property.isVerified && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 ring-inset">
                        Pending verification
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  {!property.isVerified && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-medium text-amber-700">Pending admin verification</p>
                    </div>
                  )}

                  <p className="text-sm font-semibold leading-snug text-gray-900">{property.address}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {property.city}, {property.state} {property.postcode}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{property.type}</span>
                    <span>{propertyTotalRooms} {propertyTotalRooms === 1 ? 'room' : 'rooms'}</span>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <Link
                      href={`/dashboard/landlord/properties/${property.id}`}
                      className="block rounded-lg py-1.5 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    >
                      {noRooms ? 'Add Rooms' : 'Manage'}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
