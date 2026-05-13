'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Occupant = {
  id: string;
  name: string;
  icNumber: string | null;
  phone: string | null;
  roleLabel: string | null;
  status: 'UNLINKED' | 'LINKED' | 'REPLACED' | 'REMOVED';
  linkedUser: { id: string; name: string; email: string } | null;
};

type Draft = {
  name: string;
  icNumber: string;
  phone: string;
  roleLabel: string;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  icNumber: '',
  phone: '',
  roleLabel: '',
};

export default function CorporateOccupantRosterManager({
  tenancyId,
  initialOccupants,
  canManage,
}: {
  tenancyId: string;
  initialOccupants: Occupant[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [occupants, setOccupants] = useState<Occupant[]>(initialOccupants);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(EMPTY_DRAFT);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleOccupants = useMemo(
    () => occupants.filter((occupant) => occupant.status !== 'REMOVED'),
    [occupants],
  );

  const resetDraft = () => setDraft(EMPTY_DRAFT);

  const handleCreate = async () => {
    if (!draft.name.trim()) return;
    setIsAdding(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tenancies/${tenancyId}/corporate-occupants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to add occupant.');
        return;
      }

      setOccupants((current) => [...current, result]);
      resetDraft();
      setShowAddForm(false);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (occupant: Occupant) => {
    setEditingId(occupant.id);
    setEditingDraft({
      name: occupant.name,
      icNumber: occupant.icNumber ?? '',
      phone: occupant.phone ?? '',
      roleLabel: occupant.roleLabel ?? '',
    });
    setError(null);
  };

  const handleReplace = async (occupantId: string) => {
    if (!editingDraft.name.trim()) return;
    setBusyId(occupantId);
    setError(null);

    try {
      const response = await fetch(
        `/api/tenancies/${tenancyId}/corporate-occupants/${occupantId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingDraft),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to replace occupant.');
        return;
      }

      setOccupants((current) =>
        current.map((occupant) =>
          occupant.id === occupantId ? result : occupant,
        ),
      );
      setEditingId(null);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (occupantId: string) => {
    setBusyId(occupantId);
    setError(null);

    try {
      const response = await fetch(
        `/api/tenancies/${tenancyId}/corporate-occupants/${occupantId}`,
        {
          method: 'DELETE',
        },
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to remove occupant.');
        return;
      }

      setOccupants((current) =>
        current.map((occupant) =>
          occupant.id === occupantId ? result : occupant,
        ),
      );
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleLink = async (occupantId: string) => {
    if (!linkEmail.trim()) return;
    setBusyId(occupantId);
    setError(null);

    try {
      const response = await fetch(
        `/api/tenancies/${tenancyId}/corporate-occupants/${occupantId}/link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: linkEmail }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to link occupant.');
        return;
      }

      setOccupants((current) =>
        current.map((occupant) =>
          occupant.id === occupantId ? result : occupant,
        ),
      );
      setLinkingId(null);
      setLinkEmail('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Corporate Occupant Roster
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Staff occupants can be listed first and linked to tenant accounts
            later. Only the landlord and authorized signatory should manage this
            roster.
          </p>
        </div>
        {canManage && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Occupant
          </button>
        )}
      </div>

      {visibleOccupants.length === 0 && !showAddForm && (
        <p className="text-xs text-gray-400 italic">
          No corporate occupants listed yet.
        </p>
      )}

      <div className="space-y-3">
        {visibleOccupants.map((occupant) => {
          const isEditing = editingId === occupant.id;
          const isLinking = linkingId === occupant.id;
          const isBusy = busyId === occupant.id;

          return (
            <div
              key={occupant.id}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4"
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editingDraft.name}
                      onChange={(event) =>
                        setEditingDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Occupant full name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={editingDraft.roleLabel}
                      onChange={(event) =>
                        setEditingDraft((current) => ({
                          ...current,
                          roleLabel: event.target.value,
                        }))
                      }
                      placeholder="Role label"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editingDraft.icNumber}
                      onChange={(event) =>
                        setEditingDraft((current) => ({
                          ...current,
                          icNumber: event.target.value,
                        }))
                      }
                      placeholder="IC / passport number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={editingDraft.phone}
                      onChange={(event) =>
                        setEditingDraft((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="Phone number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setError(null);
                      }}
                      className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReplace(occupant.id)}
                      disabled={isBusy || !editingDraft.name.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                    >
                      {isBusy ? 'Saving...' : 'Save Replacement'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {occupant.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {occupant.roleLabel || 'No role label'}
                        {occupant.icNumber
                          ? ` · IC: ${occupant.icNumber}`
                          : ''}
                        {occupant.phone ? ` · ${occupant.phone}` : ''}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        occupant.status === 'LINKED'
                          ? 'bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset'
                      }`}
                    >
                      {occupant.status === 'LINKED' ? 'Linked' : 'Unlinked'}
                    </span>
                  </div>

                  {occupant.linkedUser ? (
                    <p className="text-xs text-green-700 mt-3">
                      Linked to {occupant.linkedUser.name} (
                      {occupant.linkedUser.email})
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-3">
                      No tenant account linked yet.
                    </p>
                  )}

                  {canManage && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => startEditing(occupant)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Replace / Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLinkingId((current) =>
                            current === occupant.id ? null : occupant.id,
                          )
                        }
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        {occupant.linkedUser ? 'Relink Account' : 'Link Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(occupant.id)}
                        disabled={isBusy}
                        className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {isBusy ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  )}

                  {isLinking && canManage && (
                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Link to registered tenant email
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={linkEmail}
                          onChange={(event) => setLinkEmail(event.target.value)}
                          placeholder="tenant@example.com"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleLink(occupant.id)}
                          disabled={isBusy || !linkEmail.trim()}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isBusy ? 'Linking...' : 'Link'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {showAddForm && canManage && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Occupant full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={draft.roleLabel}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  roleLabel: event.target.value,
                }))
              }
              placeholder="Role label"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={draft.icNumber}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  icNumber: event.target.value,
                }))
              }
              placeholder="IC / passport number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={draft.phone}
              onChange={(event) =>
                setDraft((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="Phone number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                resetDraft();
                setError(null);
              }}
              className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isAdding || !draft.name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              {isAdding ? 'Adding...' : 'Add Occupant'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
    </div>
  );
}
