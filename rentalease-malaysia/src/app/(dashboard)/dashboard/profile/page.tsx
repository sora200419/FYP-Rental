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
      role: true,
      createdAt: true,
    },
  });

  const tenantDocuments =
    session.user.role === 'TENANT'
      ? await prisma.tenantDocument.findMany({
          where: { userId: session.user.id },
          orderBy: { uploadedAt: 'desc' },
        })
      : [];

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
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
          <span className="text-amber-500 text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-amber-800 font-semibold text-sm">
              IC number not yet added
            </p>
            <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
              Adding your Malaysian IC number ensures your tenancy agreements
              include the correct party identification details required under
              Malaysian tenancy law. Without it, agreements will show your name
              and email only.
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
            <p className="text-gray-400">IC Status</p>
            <p
              className={`font-medium mt-0.5 ${
                hasIc ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {hasIc ? '✓ Verified' : 'Not provided'}
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

      {/* Tenant identity documents — only shown to tenants */}
      {user.role === 'TENANT' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Identity Documents
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Upload your IC copy and income proof. Landlords can view these only during an active tenancy.
          </p>
          <TenantDocumentUploader
            initialDocuments={tenantDocuments.map((d) => ({
              ...d,
              uploadedAt: d.uploadedAt.toISOString(),
            }))}
          />
        </div>
      )}
    </div>
  );
}
