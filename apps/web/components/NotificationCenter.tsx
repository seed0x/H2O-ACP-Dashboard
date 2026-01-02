'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { notificationApi, Notification } from '../lib/api/notifications'
import { useMobile } from '../lib/useMobile'

export function NotificationCenter() {
  const router = useRouter()
  const isMobile = useMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount()
      if (isOpen) {
        loadNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function loadNotifications() {
    try {
      setLoading(true)
      const data = await notificationApi.list(false, 20, 0) // Get 20 most recent unread
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUnreadCount() {
    try {
      const count = await notificationApi.getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  async function handleMarkRead(notification: Notification, e: React.MouseEvent) {
    e.stopPropagation()
    if (!notification.read) {
      await notificationApi.markRead(notification.id)
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    handleNotificationClick(notification)
  }

  async function handleMarkAllRead(e: React.MouseEvent) {
    e.stopPropagation()
    await notificationApi.markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  function handleNotificationClick(notification: Notification) {
    if (notification.entity_type && notification.entity_id) {
      const routes: Record<string, string> = {
        'job': '/jobs',
        'service_call': '/service-calls',
        'review_request': '/review-requests',
        'recovery_ticket': '/recovery-tickets'
      }
      const baseRoute = routes[notification.entity_type]
      if (baseRoute) {
        router.push(`${baseRoute}/${notification.entity_id}`)
        setIsOpen(false)
      }
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            loadNotifications()
          }
        }}
        style={{
          position: 'relative',
          padding: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
          borderRadius: '8px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#EF5350',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--color-card)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: isMobile ? 'calc(100vw - 32px)' : '400px',
            maxWidth: isMobile ? 'none' : '400px',
            maxHeight: '500px',
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
              margin: 0
            }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  minHeight: '32px'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{
            overflowY: 'auto',
            flex: 1
          }}>
            {loading ? (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)'
              }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)'
              }}>
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={(e) => handleMarkRead(notification, e)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: notification.read ? 'transparent' : 'rgba(96, 165, 250, 0.1)',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read ? 'transparent' : 'rgba(96, 165, 250, 0.1)'
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: notification.read ? '400' : '600',
                    color: 'var(--color-text-primary)',
                    marginBottom: '4px'
                  }}>
                    {notification.title}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '8px'
                  }}>
                    {notification.message}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}






