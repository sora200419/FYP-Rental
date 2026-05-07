import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const [properties, landlord] = await Promise.all([
    prisma.property.findMany({
      where: { landlordId: session.user.id },
      include: {
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

  return (
    <div>
      {!isVerified && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Account not yet verified</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              {hasIc
                ? 'Your IC is pending admin review. You will be able to add properties once your identity is verified.'
                : <>You need to upload your IC on your{' '}<Link href="/dashboard/profile" className="underline font-medium">Profile page</Link>{' '}and wait for admin approval before you can add properties.</>
              }
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} in your portfolio
          </p>
        </div>
        {isVerified && (
          <Link
            href="/dashboard/landlord/properties/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Property
          </Link>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-base">No properties yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">
            {isVerified
              ? 'Add your first property to get started with RentalEase.'
              : 'Complete identity verification to start adding properties.'}
          </p>
          {isVerified && (
            <Link
              href="/dashboard/landlord/properties/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              Add Property
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map((property) => {
            const totalRooms = property.rooms.length;
            const occupiedRooms = property.rooms.filter((r) => r.tenancies.length > 0).length;
            const fullyOccupied = totalRooms > 0 && occupiedRooms === totalRooms;
            const hasVacancy = totalRooms > 0 && occupiedRooms < totalRooms;
            const noRooms = totalRooms === 0;

            const occupancyLabel = fullyOccupied
              ? 'Fully Occupied'
              : noRooms
              ? 'No Rooms'
              : hasVacancy
              ? `${occupiedRooms}/${totalRooms} Occupied`
              : 'Vacant';

            const occupancyPill = fullyOccupied
              ? 'bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset'
              : noRooms
              ? 'bg-gray-100 text-gray-400 ring-1 ring-gray-200 ring-inset'
              : hasVacancy
              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset'
              : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset';

            return (
              <div key={property.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${occupancyPill}`}>
                    {occupancyLabel}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{property.type}</span>
                </div>

                {!property.isVerified && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs text-amber-700 font-medium">Pending admin verification</p>
                  </div>
                )}

                <p className="font-semibold text-gray-900 text-sm leading-snug">{property.address}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {property.city}, {property.state} {property.postcode}
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  {totalRooms} {totalRooms === 1 ? 'room' : 'rooms'}
                </p>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/dashboard/landlord/properties/${property.id}`}
                    className="flex-1 text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {noRooms ? 'Add Rooms' : 'Manage'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
