'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  read: boolean;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

interface Props {
  tenancyId: string;
  currentUserId: string;
  // The other party's name shown in the thread header
  otherPartyName: string;
}

export default function MessageThread({
  tenancyId,
  currentUserId,
  otherPartyName,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ref to the bottom of the message list — used for auto-scrolling
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetches the latest messages from the API.
  // useCallback memoises this function so we can safely use it in useEffect
  // dependencies without triggering infinite re-renders.
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/messages?tenancyId=${encodeURIComponent(tenancyId)}`,
      );
      if (!response.ok) return;
      const data = await response.json();
      setMessages(data.messages ?? []);
    } catch {
      // Silently fail on polling errors — don't disrupt the UI
    } finally {
      setIsLoading(false);
    }
  }, [tenancyId]);

  // Initial load + polling setup.
  // The interval fires every 10 seconds to check for new messages.
  // We clear it when the component unmounts to avoid memory leaks.
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll to bottom whenever messages change —
  // this is the expected behaviour in any chat interface.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenancyId, content }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error ?? 'Failed to send message');
        return;
      }

      setNewMessage('');
      // Immediately fetch updated messages so the sent message appears
      await fetchMessages();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Allow sending with Enter key (Shift+Enter inserts a newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-MY', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden h-[600px]">
      {/* Thread header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <p className="font-semibold text-gray-900 text-sm">{otherPartyName}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Messages are scoped to this tenancy
        </p>
      </div>

      {/* Message list — scrollable middle section */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Start the conversation below
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender.id === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}
              >
                {/* Sender name — shown for received messages */}
                {!isOwn && (
                  <p className="text-xs text-gray-400 px-1">
                    {msg.sender.name}
                  </p>
                )}

                {/* Bubble */}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isOwn
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Timestamp */}
                <p className="text-xs text-gray-400 px-1">
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Invisible div at the bottom — we scroll to this */}
        <div ref={bottomRef} />
      </div>

      {/* Message input area */}
      <div className="px-4 py-3 border-t border-gray-100">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl transition-colors text-sm font-semibold"
          >
            {isSending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
