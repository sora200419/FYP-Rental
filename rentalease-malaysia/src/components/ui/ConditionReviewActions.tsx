'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  reportId: string;
}

type Action = 'accept' | 'correction' | 'counter' | null;

export default function ConditionReviewActions({ reportId }: Props) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<Action>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/accept`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to accept.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!correctionNote.trim()) {
      setError('Please describe what needs to be corrected.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/request-correction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctionNote: correctionNote.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to request correction.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCounterEvidence = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/counter-evidence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterNote: counterNote.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit counter evidence.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        Review this report and choose an action:
      </p>

      {/* Accept */}
      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800">Accept Report</p>
            <p className="text-xs text-green-600 mt-0.5">
              Confirms you reviewed the evidence and agree with the documented condition.
            </p>
          </div>
          <button
            onClick={() => { setActiveAction('accept'); handleAccept(); }}
            disabled={loading}
            className="ml-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {loading && activeAction === 'accept' ? 'Accepting…' : 'Accept'}
          </button>
        </div>
      </div>

      {/* Request Correction */}
      <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">Request Correction</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Ask the creator to add missing or clearer evidence.
            </p>
          </div>
          <button
            onClick={() => setActiveAction(activeAction === 'correction' ? null : 'correction')}
            className="ml-4 border border-amber-400 text-amber-700 hover:bg-amber-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Request
          </button>
        </div>
        {activeAction === 'correction' && (
          <div className="mt-3 space-y-2">
            <textarea
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder="e.g. Missing bathroom photos. The wall photo is too blurry."
              rows={3}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={handleRequestCorrection}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {loading && activeAction === 'correction' ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        )}
      </div>

      {/* Counter Evidence */}
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800">Add Counter Evidence</p>
            <p className="text-xs text-red-600 mt-0.5">
              Upload your own photos (using Add Photos above) then submit a note explaining your disagreement.
            </p>
          </div>
          <button
            onClick={() => setActiveAction(activeAction === 'counter' ? null : 'counter')}
            className="ml-4 border border-red-300 text-red-700 hover:bg-red-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Dispute
          </button>
        </div>
        {activeAction === 'counter' && (
          <div className="mt-3 space-y-2">
            <textarea
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              placeholder="e.g. The wall damage shown was pre-existing when I moved in."
              rows={3}
              className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              onClick={handleCounterEvidence}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {loading && activeAction === 'counter' ? 'Submitting…' : 'Submit Counter Evidence'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
