'use client'

import React from 'react'
import { Skeleton } from '../ui/Skeleton'

interface CalendarSkeletonProps {
  viewMode?: 'week' | 'month'
}

export function CalendarSkeleton({ viewMode = 'month' }: CalendarSkeletonProps) {
  const days = viewMode === 'month' ? 42 : 7 // Month view shows ~6 weeks, week view shows 7 days
  
  return (
    <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-px bg-[var(--color-border)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="p-3 bg-[var(--color-hover)] text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day Cells Skeleton */}
      <div className="grid grid-cols-7 gap-px bg-[var(--color-border)]">
        {Array.from({ length: days }).map((_, index) => (
          <div
            key={index}
            className="bg-[var(--color-card)] min-h-[100px] p-3 flex flex-col gap-2"
          >
            <Skeleton width="24px" height="16px" />
            <div className="flex flex-col gap-1.5">
              <Skeleton width="100%" height="16px" />
              <Skeleton width="80%" height="16px" />
              {viewMode === 'week' && (
                <>
                  <Skeleton width="90%" height="12px" />
                  <Skeleton width="70%" height="12px" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

