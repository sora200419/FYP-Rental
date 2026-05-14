import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import { AdminNav } from '@/components/ui/AdminTabBar';
import { PageHeader } from '@/components/ui/RedesignPrimitives';
import AdminKycActions from './AdminKycActions';

function scoreLabel(score: number | null) {
  if (score === null) return { text: 'No score', cls: 'bg-gray-100 text-gray-500' };
  if (score >= 80) return { text: `${score.toFixed(1)}% — High confidence`, cls: 'bg-green-100 text-green-700' };
  if (score >= 60) return { text: `${score.toFixed(1)}% — Moderate`, cls: 'bg-amber-100 text-amber-700' };
  return { text: `${score.toFixed(1)}% — Low confidence`, cls: 'bg-red-100 text-red-700' };
}

export default async function AdminKycPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard/admin');

  const submissions = await prisma.kycSubmission.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { submittedAt: 'asc' },
  });

  return (
    <div className="max-w-4xl">
      <AdminNav active="kyc" />
      <PageHeader
        eyebrow="Admin"
        title="KYC Review"
        description="Review identity verification submissions. Face match score is AI-assisted — you make the final decision."
      />

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="font-semibold text-gray-700">No pending submissions</p>
          <p className="mt-1 text-sm text-gray-400">New KYC submissions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const score = scoreLabel(sub.faceMatchScore);
            return (
              <div key={sub.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{sub.user.name}</p>
                    <p className="text-xs text-gray-500">{sub.user.email}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {sub.user.role} · Submitted{' '}
                      {new Date(sub.submittedAt).toLocaleDateString('en-MY', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${score.cls}`}>
                    {score.text}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { url: sub.icFrontUrl, label: 'IC Front' },
                    { url: sub.icBackUrl, label: 'IC Back' },
                    { url: sub.selfieUrl, label: 'Selfie' },
                  ].map(({ url, label }) => (
                    <a key={label} href={url} target="_blank" rel="noreferrer" className="group block">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        <Image src={url} alt={label} fill className="object-cover group-hover:opacity-90 transition-opacity" sizes="200px" />
                      </div>
                      <p className="mt-1 text-center text-xs text-gray-400">{label}</p>
                    </a>
                  ))}
                </div>

                <AdminKycActions submissionId={sub.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
