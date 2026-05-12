'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AgreementSuggestionDiff from './AgreementSuggestionDiff';

interface Props {
  agreementId: string;
  initialContent: string;
  negotiationNotes?: string | null;
  changeRequests?: Array<{
    id: string;
    category: string;
    requestedChange: string;
    reason: string;
    note?: string | null;
    status: string;
  }>;
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
  changeRequests = [],
}: Props) {
  const router = useRouter();

  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingAnalysis, setIsRefreshingAnalysis] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [resolvedRequestIds, setResolvedRequestIds] = useState<string[]>([]);

  const [instruction, setInstruction] = useState('');
  const [aiState, setAiState] = useState<AiState>({ status: 'idle' });

  const isDirty = content !== initialContent;
  const pendingRequestCount = changeRequests.filter(
    (request) =>
      request.status === 'PENDING' &&
      !resolvedRequestIds.includes(request.id),
  ).length;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setAnalysisError(null);
    setAnalysisSuccess(false);

    try {
      const res = await fetch(`/api/agreements/${agreementId}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: content,
          resolvedChangeRequestIds: resolvedRequestIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || 'Failed to save.');
        return;
      }

      setSaveSuccess(true);
      setResolvedRequestIds([]);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    if (isDirty) {
      setAnalysisError(
        'Save your latest agreement edits before refreshing AI analysis.',
      );
      setAnalysisSuccess(false);
      return;
    }

    setIsRefreshingAnalysis(true);
    setAnalysisError(null);
    setAnalysisSuccess(false);

    try {
      const res = await fetch(`/api/agreements/${agreementId}/analysis`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setAnalysisError(data.error || 'Failed to refresh AI analysis.');
        return;
      }

      setAnalysisSuccess(true);
      router.refresh();
      setTimeout(() => setAnalysisSuccess(false), 3000);
    } catch {
      setAnalysisError('Network error. Please try again.');
    } finally {
      setIsRefreshingAnalysis(false);
    }
  };

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

      setAiState({ status: 'suggestion', content: data.suggestedContent });
    } catch {
      setAiState({
        status: 'error',
        message: 'Network error. Please try again.',
      });
    }
  };

  const handleApplySuggestion = () => {
    if (aiState.status !== 'suggestion') return;
    setContent(aiState.content);
    setAiState({ status: 'idle' });
    setInstruction('');
  };

  const handleDiscardSuggestion = () => {
    setAiState({ status: 'idle' });
  };

  const handleReset = () => {
    if (!confirm('Reset all changes to the last saved version?')) return;
    setContent(initialContent);
    setAiState({ status: 'idle' });
    setSaveError(null);
    setAnalysisError(null);
  };

  return (
    <div className="space-y-5">
      {changeRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-blue-800 font-semibold text-sm">
                Structured tenant change requests
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Review each request, update the agreement text below, then mark
                the requests you addressed before saving.
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-full">
              {pendingRequestCount}{' '}
              pending
            </span>
          </div>

          <div className="space-y-3">
            {changeRequests.map((request) => {
              const isPending = request.status === 'PENDING';
              const isMarkedForResolution = resolvedRequestIds.includes(request.id);
              const isResolvedNow = request.status === 'RESOLVED';
              const statusLabel = isResolvedNow
                ? 'Resolved'
                : isMarkedForResolution
                  ? 'Will resolve on save'
                  : 'Pending';

              return (
                <div
                  key={request.id}
                  className="bg-white border border-blue-200 rounded-lg px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {request.category}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {request.requestedChange}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isResolvedNow
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : isMarkedForResolution
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Reason:</span>{' '}
                    {request.reason}
                  </p>
                  {request.note && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium text-gray-700">
                        Additional note:
                      </span>{' '}
                      {request.note}
                    </p>
                  )}

                  {isPending && (
                    <label className="flex items-start gap-3 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resolvedRequestIds.includes(request.id)}
                        onChange={(event) => {
                          setResolvedRequestIds((current) =>
                            event.target.checked
                              ? [...current, request.id]
                              : current.filter((id) => id !== request.id),
                          );
                        }}
                        className="mt-0.5 accent-blue-600 w-4 h-4 shrink-0"
                      />
                      <span className="text-sm text-gray-700">
                        Mark this request as addressed when you save the revised
                        agreement.
                      </span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          {resolvedRequestIds.length > 0 && (
            <p className="text-xs text-blue-700 mt-3">
              {resolvedRequestIds.length} request(s) will only leave the
              finalize checklist after you click Save Changes.
            </p>
          )}
        </div>
      )}

      {negotiationNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <p className="text-blue-800 font-semibold text-sm mb-2">
            Tenant summary note
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

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-semibold text-purple-900">AI Assist</p>
          <span className="text-xs text-purple-500 font-medium">optional</span>
        </div>
        <p className="text-xs text-purple-700 mb-3">
          Describe one specific change in English or Bahasa Malaysia. The AI
          will show you a suggestion - review it, then click{' '}
          <strong>Apply to Editor</strong> to accept, or{' '}
          <strong>Discard</strong> to ignore it.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            maxLength={1250}
            placeholder='e.g. "Change the deposit to 2 months rent" or "Tukar deposit kepada 2 bulan sewa"'
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
                Working...
              </span>
            ) : (
              'Get Suggestion'
            )}
          </button>
        </div>

        {aiState.status === 'suggestion' && (
          <div className="border border-purple-300 rounded-lg overflow-hidden">
            <div className="bg-purple-100 px-4 py-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-purple-800">
                AI Suggestion - review before applying
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
            <div className="max-h-[32rem] overflow-y-auto bg-white">
              <AgreementSuggestionDiff
                currentContent={content}
                suggestedContent={aiState.content}
                instruction={instruction.trim()}
              />
            </div>
          </div>
        )}

        {aiState.status === 'error' && (
          <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {aiState.message}
          </p>
        )}
      </div>

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
          placeholder="Agreement content..."
          spellCheck={false}
        />

        <p className="text-xs text-gray-400 mt-1">
          {content.length.toLocaleString()} characters ·{' '}
          {content.split('\n').length.toLocaleString()} lines
        </p>
        <p className="text-xs text-gray-500 mt-2">
          After manual edits, save first, then refresh AI analysis to update
          the plain-language summary and red flags.
        </p>
      </div>

      <div className="flex items-center gap-3 sticky bottom-4 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-lg">
        <div className="flex-1">
          {saveError && <p className="text-red-600 text-xs">{saveError}</p>}
          {analysisError && (
            <p className="text-red-600 text-xs">{analysisError}</p>
          )}
          {saveSuccess && (
            <p className="text-green-600 text-xs font-medium">
              Saved - agreement reset to Draft. Now refresh AI analysis to
              update the red flags before re-finalizing.
            </p>
          )}
          {analysisSuccess && (
            <p className="text-green-600 text-xs font-medium">
              AI analysis refreshed - summary and red flags have been updated.
            </p>
          )}
          {!saveError && !saveSuccess && resolvedRequestIds.length > 0 && (
            <p className="text-blue-600 text-xs font-medium">
              {resolvedRequestIds.length} structured request(s) will be marked
              as addressed when you save.
            </p>
          )}
          {!saveError &&
            !saveSuccess &&
            !analysisError &&
            !analysisSuccess &&
            isDirty && (
              <p className="text-amber-600 text-xs">
                You have unsaved changes.
              </p>
            )}
          {!saveError &&
            !saveSuccess &&
            !analysisError &&
            !analysisSuccess &&
            !isDirty && (
              <p className="text-gray-400 text-xs">No unsaved changes.</p>
            )}
        </div>
        <button
          onClick={handleRefreshAnalysis}
          disabled={isRefreshingAnalysis || isSaving || isDirty}
          className="border border-purple-300 bg-white hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed text-purple-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          {isRefreshingAnalysis ? 'Refreshing AI...' : 'Refresh AI Analysis'}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
