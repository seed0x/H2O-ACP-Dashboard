'use client'
import { useEffect, useState } from 'react'
import { useMobile } from '../lib/useMobile'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

// Simple toast implementation using React state
let toastListeners: ((toasts: Toast[]) => void)[] = []
let toastState: Toast[] = []

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toastState]))
}

export function showToast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).substring(7)
  toastState = [...toastState, { id, message, type }]
  notifyListeners()
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toastState = toastState.filter(t => t.id !== id)
    notifyListeners()
  }, 5000)
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState)
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts)
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])
  
  const removeToast = (id: string) => {
    toastState = toastState.filter(t => t.id !== id)
    notifyListeners()
  }
  
  return { toasts, removeToast }
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()
  const isMobile = useMobile()
  
  if (toasts.length === 0) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: isMobile ? '20px' : '20px',
      left: isMobile ? '20px' : 'auto',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          style={{
            padding: '12px 16px',
            backgroundColor: toast.type === 'error' ? '#dc2626' :
                            toast.type === 'success' ? '#10b981' :
                            toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            minWidth: isMobile ? 'auto' : '300px',
            maxWidth: isMobile ? '100%' : '500px',
            width: isMobile ? '100%' : 'auto',
            fontSize: '14px',
            animation: 'slideIn 0.3s ease-out',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {toast.message}
        </div>
      ))}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

