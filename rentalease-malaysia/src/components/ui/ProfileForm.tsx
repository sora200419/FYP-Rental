'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  // Pre-filled from the server component — the current stored values
  initialName: string;
  initialPhone: string | null;
  initialIcNumber: string | null;
  email: string; // shown read-only — cannot be changed here
  role: string;
}

// Formats a raw 12-digit IC string into the human-readable YYMMDD-PB-NNNC format.
// This is purely for display — the API stores and receives the raw 12 digits.
function formatIcDisplay(raw: string): string {
  if (raw.length !== 12) return raw;
  return `${raw.slice(0, 6)}-${raw.slice(6, 8)}-${raw.slice(8)}`;
}

export default function ProfileForm({
  initialName,
  initialPhone,
  initialIcNumber,
  email,
  role,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  // Show the IC in formatted display for readability in the input
  const [icNumber, setIcNumber] = useState(
    initialIcNumber ? formatIcDisplay(initialIcNumber) : '',
  );
  const [phone, setPhone] = useState(initialPhone ?? '');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Track whether the user has changed anything so we can disable Save when not needed
  const hasChanges =
    name !== initialName ||
    phone !== (initialPhone ?? '') ||
    icNumber.replace(/-/g, '') !== (initialIcNumber ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const rawIc = icNumber.replace(/-/g, '');
      const icChanged = rawIc !== (initialIcNumber ?? '');

      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim() || null,
      };
      // Only include icNumber when it has actually changed — sending an unchanged
      // IC in every PATCH would incorrectly reset isVerified on the server.
      if (icChanged) {
        payload.icNumber = icNumber.trim() || null;
      }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update profile.');
        return;
      }

      setSuccess(true);
      // Refresh the server component so the page title and session name update
      router.refresh();
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Basic Info ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Basic Information
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            {/* Email is read-only — displayed for reference but not editable
                because changing it would require re-validating the NextAuth session */}
            <input
              type="email"
              value={email}
              disabled
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed after registration.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 012-3456789"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Identity Verification ───────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Identity Verification
        </p>

        {/* PDPA notice — explaining why we collect this and how it's used.
            This is important for FYP Problem Statement 3 and Objective 3
            around secure document management and PDPA 2010 compliance. */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-4">
          <p className="text-blue-800 text-sm font-medium mb-1">
            🔒 Why we collect your IC number
          </p>
          <p className="text-blue-700 text-xs leading-relaxed">
            Your Malaysian IC (MyKad) number is used solely to populate the
            party identification clause in your tenancy agreement, as required
            under Malaysian tenancy law. This information is stored securely and
            protected under the Personal Data Protection Act 2010 (PDPA). It
            will never be shared with third parties and is only visible to your
            landlord within the generated agreement document.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Malaysian IC Number (MyKad){' '}
            {!initialIcNumber && <span className="text-gray-400">(optional)</span>}
          </label>
          {initialIcNumber ? (
            <>
              <input
                type="text"
                value={icNumber}
                disabled
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">
                IC number cannot be changed after saving.
              </p>
            </>
          ) : (
            <>
              <input
                type="text"
                value={icNumber}
                onChange={(e) => setIcNumber(e.target.value)}
                placeholder="e.g. 901231-14-5678"
                maxLength={14}
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">
                Format: YYMMDD-PB-NNNC (12 digits, hyphens optional). Example:
                901231-14-5678
              </p>
            </>
          )}
        </div>

        {/* Role badge — shown as context so the user understands what they're
            signing up for in the tenancy workflow */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              role === 'LANDLORD'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {role === 'LANDLORD' ? '🔑 Landlord' : '🏠 Tenant'}
          </span>
          <p className="text-xs text-gray-400">
            {role === 'TENANT'
              ? 'Your IC number will appear in tenancy agreements as the Tenant party.'
              : 'Your IC number will appear in tenancy agreements as the Landlord party.'}
          </p>
        </div>
      </div>

      {/* ── Save Controls ───────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          ✓ Profile updated successfully.
          {icNumber &&
            ' Your IC number will appear in newly generated agreements.'}
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving || !hasChanges}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        {isSaving ? 'Saving…' : 'Save Profile'}
      </button>
    </form>
  );
}
