import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  // Fetch all properties for this landlord, including the count of tenancies
  // so we can show whether each property is occupied or vacant
  const properties = await prisma.property.findMany({
    where: { landlordId: session.user.id },
    include: {
      // We only need the count and status, not the full tenancy data
      tenancies: {
        where: { status: 'ACTIVE' },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' }, // newest first
  });

  return (
    <div>
      {/* Page header with action button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {properties.length}{' '}
            {properties.length === 1 ? 'property' : 'properties'} in your
            portfolio
          </p>
        </div>
        <Link
          href="/dashboard/landlord/properties/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          + Add Property
        </Link>
      </div>

      {/* Empty state — shown when landlord has no properties yet */}
      {properties.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">🏠</p>
          <p className="text-gray-700 font-semibold text-lg">
            No properties yet
          </p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Add your first property to get started with RentalEase.
          </p>
          <Link
            href="/dashboard/landlord/properties/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Add Property
          </Link>
        </div>
      ) : (
        /* Property cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map((property) => {
            const isOccupied = property.tenancies.length > 0;

            return (
              <div
                key={property.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Occupancy badge */}
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isOccupied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isOccupied ? 'Occupied' : 'Vacant'}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">
                    {property.type}
                  </span>
                </div>

                {/* Address */}
                <p className="font-semibold text-gray-900 text-sm leading-snug">
                  {property.address}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {property.city}, {property.state} {property.postcode}
                </p>

                {/* Details row */}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span>🛏 {property.bedrooms} bed</span>
                  <span>🚿 {property.bathrooms} bath</span>
                </div>

                {/* Rent amount */}
                <p className="text-blue-600 font-bold text-lg mt-3">
                  RM {Number(property.rentAmount).toLocaleString()}
                  <span className="text-gray-400 text-xs font-normal">
                    {' '}
                    /month
                  </span>
                </p>

                {/* Action links */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/dashboard/landlord/properties/${property.id}`}
                    className="flex-1 text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    View Details
                  </Link>
                  {!isOccupied && (
                    <Link
                      href={`/dashboard/landlord/tenancies/new?propertyId=${property.id}`}
                      className="flex-1 text-center text-sm text-green-600 hover:text-green-700 font-medium py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      Add Tenant
                    </Link>
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
