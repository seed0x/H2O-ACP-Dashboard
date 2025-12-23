import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  className?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2.5 text-sm
          bg-[var(--color-hover)] border
          ${error ? 'border-red-500' : 'border-[var(--color-border)]'}
          rounded-lg text-[var(--color-text-primary)]
          outline-none transition-all
          focus:ring-2 focus:ring-primary/20 focus:border-[var(--color-primary)]
          disabled:opacity-50 disabled:cursor-not-allowed
          min-h-[44px] sm:min-h-[44px]
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
