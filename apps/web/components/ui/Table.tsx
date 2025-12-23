import React, { useState } from 'react'
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
  itemsPerPage?: number
  maxHeight?: string
}

export function Table<T extends { id: string | number }>({ 
  data, 
  columns, 
  onRowClick,
  emptyMessage = 'No data available',
  actions,
  itemsPerPage = 50,
  maxHeight
}: TableProps<T>) {
  const isMobile = useMobile()
  const [currentPage, setCurrentPage] = useState(1)
  
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = data.slice(startIndex, endIndex)
  
  // Reset to page 1 when data changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [data.length])
  if (!data || data.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '48px',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)'
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
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        overflowX: 'auto',
        overflowY: maxHeight ? 'auto' : 'visible',
        WebkitOverflowScrolling: 'touch',
        maxHeight: maxHeight || 'none'
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
          {paginatedData.map((row, rowIndex) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: rowIndex < paginatedData.length - 1 ? '1px solid var(--color-border)' : 'none',
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-hover)'
        }}>
          <div style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} items
          </div>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                fontSize: 'var(--text-sm)',
                backgroundColor: currentPage === 1 ? 'var(--color-border)' : 'var(--color-primary)',
                color: currentPage === 1 ? 'var(--color-text-secondary)' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1
              }}
            >
              Previous
            </button>
            <span style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              padding: '0 12px'
            }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                fontSize: 'var(--text-sm)',
                backgroundColor: currentPage === totalPages ? 'var(--color-border)' : 'var(--color-primary)',
                color: currentPage === totalPages ? 'var(--color-text-secondary)' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
