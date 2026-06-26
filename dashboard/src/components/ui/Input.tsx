import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-surface-800/70">{label}</label>
      )}
      <input
        className={cn(
          'w-full rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          className
        )}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-surface-800/70">{label}</label>
      )}
      <select
        className={cn(
          'w-full rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
