'use client';

// Shared layout wrapper for each wizard step — heading, description, children.

interface WizardStepLayoutProps {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function WizardStepLayout({ step, title, description, children }: WizardStepLayoutProps) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
          Step {step} of 6
        </p>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

// Reusable field group wrapper
export function FieldGroup({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      {help && <p className="text-xs text-gray-400 mb-2">{help}</p>}
      {children}
    </div>
  );
}

// Radio option button
export function RadioOption({
  value,
  current,
  onChange,
  label,
  description,
}: {
  value: string;
  current: string;
  onChange: (v: string) => void;
  label: string;
  description?: string;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
        selected
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
            selected ? 'border-blue-600 bg-blue-600' : 'border-gray-400'
          }`}
        >
          {selected && <div className="w-2 h-2 m-0.5 bg-white rounded-full" />}
        </div>
        <div>
          <p className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-gray-900'}`}>{label}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
    </button>
  );
}

// Number input
export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  prefix,
  suffix,
  placeholder,
}: {
  label?: string;
  value: number | null | '';
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
        <input
          type="number"
          min={min}
          max={max}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? null : Number(v));
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

// Text input
export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

// Checkbox group
export function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
