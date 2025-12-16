import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, ...props }: SelectProps) {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '500',
          color: 'var(--color-text-primary)',
          marginBottom: '6px'
        }}>
          {label}
        </label>
      )}
      <select
        style={{
          width: '100%',
          padding: '10px 14px',
          backgroundColor: 'var(--color-hover)',
          border: `1px solid ${error ? '#EF5350' : 'var(--color-border)'}`,
          borderRadius: '8px',
          color: 'var(--color-text-primary)',
          fontSize: '14px',
          outline: 'none',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-primary)'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(96, 165, 250, 0.1)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#EF5350' : 'var(--color-border)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{
            backgroundColor: 'var(--color-card)',
            color: 'var(--color-text-primary)'
          }}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{
          marginTop: '6px',
          fontSize: '12px',
          color: '#EF5350'
        }}>{error}</p>
      )}
    </div>
  )
}
