'use client';

import React from 'react';
import { Check, MagnifyingGlass, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * Form controls.
 *
 * Inputs sit on an inset surface so they read as recessed against raised
 * panels, and focus is signalled by a cyan rim *plus* a glow rather than a
 * colour change alone - the state has to survive being viewed in greyscale.
 */

const control =
  'w-full rounded-md border border-line bg-surface-inset px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-faint ' +
  'transition-all duration-200 focus:border-cyan/70 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-cyan/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const invalidRing = 'border-rose/70 focus:border-rose focus:shadow-none';

export function Label({
  children,
  htmlFor,
  hint,
  required,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm font-bold text-white',
        className,
      )}
    >
      <span>
        {children}
        {required && (
          <span className="ml-1 text-cyan font-black" aria-hidden>
            *
          </span>
        )}
      </span>
      {hint && <span className="text-xs font-semibold text-cyan/90">{hint}</span>}
    </label>
  );
}

export function FieldError({ children, id }: { children?: string; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-rose font-bold">
      <span aria-hidden className="mt-px">
        ▲
      </span>
      {children}
    </p>
  );
}

export function FieldHelp({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className="mt-2 text-xs leading-relaxed text-white/80 font-medium">
      {children}
    </p>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'h-11 font-medium text-white placeholder:text-white/40', invalid && invalidRing, className)}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'min-h-[120px] resize-y py-3 font-medium text-white placeholder:text-white/40 leading-relaxed', invalid && invalidRing, className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'h-11 cursor-pointer appearance-none pr-10 font-bold text-white', invalid && invalidRing, className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2300f0ff' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition-all duration-300',
        checked ? 'border-cyan/50 bg-cyan/15 shadow-panel' : 'border-line/70 bg-surface/90 hover:border-cyan/30',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-white group-hover:text-cyan transition-colors">{label}</span>
        {description && <span className="mt-1.5 block text-xs font-medium leading-relaxed text-white/80">{description}</span>}
      </span>

      <span
        className={cn(
          'relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full border transition-colors duration-300',
          checked ? 'border-cyan/60 bg-cyan/30' : 'border-line-bright bg-surface-inset',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-300 shadow-panel',
            checked ? 'left-[22px] bg-cyan' : 'left-[3px] bg-white/40',
          )}
        />
      </span>
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
      <span
        className={cn(
          'relative mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border transition-all duration-150',
          checked ? 'border-cyan bg-cyan' : 'border-line-bright bg-surface-inset',
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        {checked && <Check weight="bold" className="h-3 w-3 text-on-accent" />}
      </span>
      <span className="leading-snug">{label}</span>
    </label>
  );
}

/** Search input with a leading icon and a clear control. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  id,
  ...rest
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className'>) {
  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlass
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(control, 'h-11 pl-10 pr-10 [&::-webkit-search-cancel-button]:appearance-none')}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink"
        >
          <X weight="bold" className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
