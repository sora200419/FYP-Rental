'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tenancyId: string;
  propertyAddress: string;
  propertyCity: string;
  roomLabel: string;
  rentAmount: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  landlordName: string;
  landlordEmail: string;
}

export default function TenancyInvitationCard({
  tenancyId,
  propertyAddress,
  propertyCity,
  roomLabel,
  rentAmount,
  depositAmount,
  startDate,
  endDate,
  landlordName,
  landlordEmail,
}: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responded, setResponded] = useState<'accepted' | 'declined' | null>(
    null,
  );

  const formatRM = (amount: number) =>
    `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const handleAction = async (action: 'accept' | 'decline') => {
    setIsLoading(action);
    setError(null);

    try {
      const res = await fetch(`/api/tenancies/${tenancyId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setResponded(action === 'accept' ? 'accepted' : 'declined');
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  if (responded) {
    return (
      <div
        className={`rounded-xl border p-6 ${responded === 'accepted' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
      >
        <p
          className={`font-semibold text-sm ${responded === 'accepted' ? 'text-green-800' : 'text-gray-600'}`}
        >
          {responded === 'accepted'
            ? '✓ Invitation accepted — your landlord will now prepare the agreement.'
            : 'Invitation declined.'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Refreshing your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-gray-900">{propertyAddress}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {propertyCity} &mdash;{' '}
            <span className="font-medium">{roomLabel}</span>
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 shrink-0">
          Invitation
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <p className="text-gray-400 text-xs">Monthly Rent</p>
          <p className="font-bold text-blue-600 mt-0.5">
            {formatRM(rentAmount)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Security Deposit</p>
          <p className="font-semibold text-gray-800 mt-0.5">
            {formatRM(depositAmount)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Start Date</p>
          <p className="font-medium text-gray-800 mt-0.5">
            {formatDate(startDate)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">End Date</p>
          <p className="font-medium text-gray-800 mt-0.5">
            {formatDate(endDate)}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
        <p className="text-xs text-gray-400 mb-1">Invited by</p>
        <p className="text-sm font-semibold text-gray-800">{landlordName}</p>
        <p className="text-xs text-gray-500">{landlordEmail}</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
        <p className="text-xs text-blue-700">
          <strong>Accepting</strong> means the landlord can proceed to generate
          a tenancy agreement for your review. You can still request changes
          before signing. <strong>Declining</strong> cancels this invitation.
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleAction('decline')}
          disabled={!!isLoading}
          className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          {isLoading === 'decline' ? 'Declining…' : 'Decline'}
        </button>
        <button
          onClick={() => handleAction('accept')}
          disabled={!!isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          {isLoading === 'accept' ? 'Accepting…' : 'Accept Invitation'}
        </button>
      </div>
    </div>
  );
}
