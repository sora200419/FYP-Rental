'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface PasswordInputProps {
  registration: React.InputHTMLAttributes<HTMLInputElement>;
  label: string;
  placeholder: string;
  error?: string;
}

export function PasswordInput({
  registration,
  label,
  placeholder,
  error,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          {...registration}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={
            show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
          }
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
