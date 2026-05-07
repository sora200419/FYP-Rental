import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProfileForm from '@/components/ui/ProfileForm';
import TenantDocumentUploader from '@/components/ui/TenantDocumentUploader';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Fetch the full user record — we need icNumber, phone, name for pre-filling the form
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      icNumber: true,
      isVerified: true,
      role: true,
      createdAt: true,
    },
  });

  // Both landlords and tenants need IC document upload for KYC
  const tenantDocuments = await prisma.tenantDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  });

  if (!user) redirect('/login');

  // Count how many agreements this user is a party to — shown as context
  // so the user understands why their IC matters for the platform
  const agreementCount =
    user.role === 'TENANT'
      ? await prisma.agreement.count({
          where: { tenancy: { tenantId: user.id } },
        })
      : await prisma.agreement.count({
          where: {
            tenancy: { room: { property: { landlordId: user.id } } },
          },
        });

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const hasIc = !!user.icNumber;
  const isVerified = user.isVerified;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your personal information and identity verification.
        </p>
      </div>

      {/* IC number prompt banner — shown only if IC is not yet entered.
          This is the primary call-to-action to encourage IC completion,
          framed in terms of what the user gets (better agreements) rather
          than what we want from them. */}
      {!hasIc && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">IC number not yet added</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Adding your Malaysian IC number ensures your tenancy agreements include the correct party identification details required under Malaysian tenancy law.
            </p>
          </div>
        </div>
      )}

      {/* Account overview card — read-only summary for context */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Account Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Member Since</p>
            <p className="font-medium text-gray-900 mt-0.5">
              {formatDate(user.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Role</p>
            <p className="font-medium text-gray-900 mt-0.5 capitalize">
              {user.role.toLowerCase()}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Agreements</p>
            <p className="font-medium text-gray-900 mt-0.5">
              {agreementCount}{' '}
              {agreementCount === 1 ? 'agreement' : 'agreements'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Verification</p>
            <p
              className={`font-medium mt-0.5 ${
                isVerified
                  ? 'text-green-600'
                  : hasIc
                    ? 'text-blue-600'
                    : 'text-amber-600'
              }`}
            >
              {isVerified ? 'Verified' : hasIc ? 'Pending Review' : 'Not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile edit form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ProfileForm
          initialName={user.name}
          initialPhone={user.phone}
          initialIcNumber={user.icNumber}
          email={user.email}
          role={user.role}
        />
      </div>

      {/* Identity documents — shown to both landlords and tenants for KYC */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Identity Documents
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          {user.role === 'LANDLORD'
            ? tenantDocuments.length > 0
              ? 'Your IC was submitted and is pending admin review. You may upload a replacement if needed.'
              : 'Upload your IC copy so an admin can verify your identity before you can list properties.'
            : 'Upload your IC copy and income proof. Landlords can view these only during an active tenancy.'}
        </p>
        <TenantDocumentUploader
          initialDocuments={tenantDocuments.map((d) => ({
            ...d,
            uploadedAt: d.uploadedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
