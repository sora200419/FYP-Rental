'use client';

import { useState } from 'react';
import MessageThread from './MessageThread';

interface TenancyItem {
  id: string;
  propertyAddress: string;
  propertyCity: string;
  tenantName: string;
  unreadCount: number;
}

interface Props {
  tenancies: TenancyItem[];
  currentUserId: string;
}

export default function LandlordMessagesClient({
  tenancies,
  currentUserId,
}: Props) {
  // Default to the first tenancy so the landlord sees content immediately
  const [selectedId, setSelectedId] = useState<string>(tenancies[0]?.id ?? '');

  const selected = tenancies.find((t) => t.id === selectedId);

  return (
    <div className="flex gap-5 h-160">
      {/* Sidebar — list of tenancy conversations */}
      <div className="w-72 shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Conversations
          </p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {tenancies.map((tenancy) => (
            <button
              key={tenancy.id}
              onClick={() => setSelectedId(tenancy.id)}
              className={`w-full text-left px-4 py-3.5 transition-colors ${
                selectedId === tenancy.id
                  ? 'bg-blue-50 border-r-2 border-blue-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {tenancy.tenantName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {tenancy.propertyAddress}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {tenancy.propertyCity}
                  </p>
                </div>
                {/* Unread badge */}
                {tenancy.unreadCount > 0 && (
                  <span className="shrink-0 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {tenancy.unreadCount > 9 ? '9+' : tenancy.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread panel — right side */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <MessageThread
            tenancyId={selected.id}
            currentUserId={currentUserId}
            otherPartyName={selected.tenantName}
          />
        ) : (
          <div className="h-full bg-white rounded-xl border border-gray-200 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
