'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddRoomForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [bathrooms, setBathrooms] = useState('1');
  const [rentAmount, setRentAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          label: label.trim(),
          bathrooms: Number(bathrooms),
          rentAmount: Number(rentAmount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create room');
        return;
      }

      setLabel('');
      setBathrooms('1');
      setRentAmount('');
      setOpen(false);
      router.refresh(); // re-runs the server component to show the new room
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-600 text-sm font-medium py-4 rounded-xl transition-colors"
      >
        + Add Room
      </button>
    );
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-blue-900 mb-4">New Room</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Room Label
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Entire Unit, Master Room, Room 2"
            className={inputClass}
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Use &ldquo;Entire Unit&rdquo; if letting out the whole property as
            one unit.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Bathrooms
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Monthly Rent (RM)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="e.g. 1500"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>
        {error && (
          <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="flex-1 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-300 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Room'}
          </button>
        </div>
      </form>
    </div>
  );
}
