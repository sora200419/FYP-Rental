'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  agreementId: string;
  initialContent: string;
  // If the tenant requested changes, we show their notes at the top
  // so the landlord knows what to address while editing.
  negotiationNotes?: string | null;
}

type AiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'suggestion'; content: string }
  | { status: 'error'; message: string };

export default function AgreementEditor({
  agreementId,
  initialContent,
  negotiationNotes,
}: Props) {
  const router = useRouter();

  // The textarea content — starts as the current rawContent
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI assist state
  const [instruction, setInstruction] = useState('');
  const [aiState, setAiState] = useState<AiState>({ status: 'idle' });

  // Track whether the content has been modified from the original
  const isDirty = content !== initialContent;

  // ── Save the manually edited content ──────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/agreements/${agreementId}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent: content }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || 'Failed to save.');
        return;
      }

      setSaveSuccess(true);
      // Refresh the server component so the status badge and timestamps update
      router.refresh();
      // Clear the success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Request AI suggestion ──────────────────────────────────────────────────
  const handleAiAssist = async () => {
    if (!instruction.trim()) return;
    setAiState({ status: 'loading' });

    try {
      const res = await fetch(`/api/agreements/${agreementId}/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent: content,
          instruction: instruction.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiState({
          status: 'error',
          message: data.error || 'AI request failed.',
        });
        return;
      }

      // Show the suggestion without applying it yet — landlord decides
      setAiState({ status: 'suggestion', content: data.suggestedContent });
    } catch {
      setAiState({
        status: 'error',
        message: 'Network error. Please try again.',
      });
    }
  };

  // ── Accept the AI suggestion ───────────────────────────────────────────────
  const handleApplySuggestion = () => {
    if (aiState.status !== 'suggestion') return;
    setContent(aiState.content);
    setAiState({ status: 'idle' });
    setInstruction('');
  };

  // ── Discard the AI suggestion ──────────────────────────────────────────────
  const handleDiscardSuggestion = () => {
    setAiState({ status: 'idle' });
    // Keep the instruction text so landlord can refine and try again
  };

  // ── Reset content to the original saved version ────────────────────────────
  const handleReset = () => {
    if (!confirm('Reset all changes to the last saved version?')) return;
    setContent(initialContent);
    setAiState({ status: 'idle' });
    setSaveError(null);
  };

  return (
    <div className="space-y-5">
      {/* Tenant's change request — shown prominently if in NEGOTIATING state */}
      {negotiationNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <p className="text-blue-800 font-semibold text-sm mb-2">
            💬 Tenant requested these changes
          </p>
          <div className="bg-white border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {negotiationNotes}
            </p>
          </div>
          <p className="text-blue-600 text-xs mt-2">
            Address these points in your edits below, then save and re-finalize.
          </p>
        </div>
      )}

      {/* ── AI Assist panel ─────────────────────────────────────────────── */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">✨</span>
          <p className="text-sm font-semibold text-purple-900">AI Assist</p>
          <span className="text-xs text-purple-500 font-medium">optional</span>
        </div>
        <p className="text-xs text-purple-700 mb-3">
          Describe one specific change in plain English. The AI will show you a
          suggestion — review it, then click <strong>Apply to Editor</strong> to
          accept, or <strong>Discard</strong> to ignore it.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='e.g. "Change the deposit to 2 months rent" or "Remove the subletting clause"'
            className="flex-1 border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            disabled={aiState.status === 'loading'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAiAssist();
            }}
          />
          <button
            onClick={handleAiAssist}
            disabled={
              aiState.status === 'loading' || instruction.trim().length < 10
            }
            className="shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {aiState.status === 'loading' ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Working…
              </span>
            ) : (
              'Get Suggestion'
            )}
          </button>
        </div>

        {/* AI suggestion preview */}
        {aiState.status === 'suggestion' && (
          <div className="border border-purple-300 rounded-lg overflow-hidden">
            <div className="bg-purple-100 px-4 py-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-purple-800">
                ✨ AI Suggestion — review before applying
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDiscardSuggestion}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  Discard
                </button>
                <button
                  onClick={handleApplySuggestion}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1 rounded-md transition-colors"
                >
                  Apply to Editor
                </button>
              </div>
            </div>
            <div className="bg-white px-4 py-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {aiState.content}
              </pre>
            </div>
          </div>
        )}

        {aiState.status === 'error' && (
          <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {aiState.message}
          </p>
        )}
      </div>

      {/* ── Manual editor ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-700">
              Agreement Text
            </p>
            {isDirty && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
          {isDirty && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
            >
              Reset to saved
            </button>
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={30}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          placeholder="Agreement content…"
          spellCheck={false}
        />

        <p className="text-xs text-gray-400 mt-1">
          {content.length.toLocaleString()} characters ·{' '}
          {content.split('\n').length.toLocaleString()} lines
        </p>
      </div>

      {/* Save controls */}
      <div className="flex items-center gap-3 sticky bottom-4 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-lg">
        <div className="flex-1">
          {saveError && <p className="text-red-600 text-xs">{saveError}</p>}
          {saveSuccess && (
            <p className="text-green-600 text-xs font-medium">
              ✓ Saved — agreement reset to Draft. Re-finalize to send to tenant.
            </p>
          )}
          {!saveError && !saveSuccess && isDirty && (
            <p className="text-amber-600 text-xs">You have unsaved changes.</p>
          )}
          {!saveError && !saveSuccess && !isDirty && (
            <p className="text-gray-400 text-xs">No unsaved changes.</p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
