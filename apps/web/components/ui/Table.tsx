import React from 'react'
import { QuickActions, QuickAction } from '../QuickActions'
import { useMobile } from '../../lib/useMobile'

interface Column<T> {
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  width?: string
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  actions?: (row: T) => QuickAction[]
}

export function Table<T extends { id: string | number }>({ 
  data, 
  columns, 
  onRowClick,
  emptyMessage = 'No data available',
  actions
}: TableProps<T>) {
  const isMobile = useMobile()
  if (data.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        color: 'var(--color-text-secondary)'
      }}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          minWidth: '600px'
        }}>
        <thead>
          <tr style={{
            backgroundColor: 'var(--color-hover)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            {columns.map((col, index) => (
              <th
                key={index}
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: col.width
                }}
              >
                {col.header}
              </th>
            ))}
            {actions && (
              <th style={{
                padding: '16px',
                textAlign: 'right',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '150px'
              }}>
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: rowIndex < data.length - 1 ? '1px solid var(--color-border)' : 'none',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {columns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  {typeof col.accessor === 'function' 
                    ? col.accessor(row) 
                    : String(row[col.accessor])}
                </td>
              ))}
              {actions && (
                <td
                  style={{
                    padding: '16px',
                    fontSize: '14px',
                    textAlign: 'right'
                  }}
                >
                  <QuickActions 
                    actions={actions(row)} 
                    isMobile={isMobile}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
