'use client'
import { useEffect, useState } from 'react'
import { useMobile } from '../lib/useMobile'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  title: string
  message?: string
  type: ToastType
  action?: ToastAction
  duration?: number
}

export interface ToastOptions {
  title: string
  message?: string
  type?: ToastType
  action?: ToastAction
  duration?: number
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toastState: Toast[] = []

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toastState]))
}

export function showToast(titleOrOptions: string | ToastOptions, type: ToastType = 'info') {
  const id = Math.random().toString(36).substring(7)
  
  let toast: Toast
  
  if (typeof titleOrOptions === 'string') {
    toast = { id, title: titleOrOptions, type, duration: 5000 }
  } else {
    toast = {
      id,
      title: titleOrOptions.title,
      message: titleOrOptions.message,
      type: titleOrOptions.type || 'info',
      action: titleOrOptions.action,
      duration: titleOrOptions.duration || 5000
    }
  }
  
  if (toastState.length >= 3) { toastState = toastState.slice(1) }
  
  toastState = [...toastState, toast]
  notifyListeners()
  
  const duration = toast.action ? 10000 : toast.duration
  setTimeout(() => {
    toastState = toastState.filter(t => t.id !== id)
    notifyListeners()
  }, duration)
  
  return id
}

export function removeToast(id: string) {
  toastState = toastState.filter(t => t.id !== id)
  notifyListeners()
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState)
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts)
    toastListeners.push(listener)
    return () => { toastListeners = toastListeners.filter(l => l !== listener) }
  }, [])
  
  return { toasts, showToast, removeToast }
}

const toastIcons: Record<ToastType, string> = {
  success: 'âœ“', error: 'âœ•', warning: 'âš ', info: 'â„¹'
}

const toastColors: Record<ToastType, { bg: string; border: string }> = {
  error: { bg: 'rgba(220, 38, 38, 0.95)', border: '#ef4444' },
  success: { bg: 'rgba(16, 185, 129, 0.95)', border: '#10b981' },
  warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b' },
  info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6' }
}

export function ToastContainer() {
  const { toasts } = useToast()
  const isMobile = useMobile()
  
  if (toasts.length === 0) return null
  
  return (
    <div style={{ position: 'fixed', top: '20px', right: isMobile ? '16px' : '24px', left: isMobile ? '16px' : 'auto', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ backgroundColor: toastColors[toast.type].bg, border: `1px solid ${toastColors[toast.type].border}`, color: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)', minWidth: isMobile ? 'auto' : '340px', maxWidth: isMobile ? '100%' : '450px', pointerEvents: 'auto', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>{toastIcons[toast.type]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', lineHeight: '1.4', marginBottom: toast.message ? '4px' : 0 }}>{toast.title}</div>
              {toast.message && <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.4' }}>{toast.message}</div>}
            </div>
            <button onClick={() => removeToast(toast.id)} style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}>âœ•</button>
          </div>
          {toast.action && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { toast.action?.onClick(); removeToast(toast.id) }} style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '6px', color: 'white', cursor: 'pointer', padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}>{toast.action.label}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
