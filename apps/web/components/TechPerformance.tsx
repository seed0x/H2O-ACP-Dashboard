'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'
import { StatCard } from './ui/StatCard'
import { Button } from './ui/Button'
import { handleApiError } from '../lib/error-handler'

interface TechStats {
  username: string
  completed: number
  sold: number
  lost: number
  conversion_rate: number | null
  total_outcomes: number
}

export function TechPerformance() {
  const router = useRouter()
  const [techStats, setTechStats] = useState<TechStats[]>([])
  const [loading, setLoading] = useState(true)
  const [periodDays, setPeriodDays] = useState(30)

  useEffect(() => {
    loadTechStats()
  }, [periodDays])

  async function loadTechStats() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await axios.get(
        `${API_BASE_URL}/tech-stats/all?tenant_id=h2o&days=${periodDays}`,
        { headers, withCredentials: true }
      )
      
      setTechStats(Array.isArray(response.data) ? response.data : [])
    } catch (error: any) {
      console.error('Failed to load tech stats:', handleApiError(error))
      setTechStats([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-5">
        <div className="text-center text-[var(--color-text-secondary)] py-8">
          Loading tech performance...
        </div>
      </div>
    )
  }

  if (techStats.length === 0) {
    return (
      <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] uppercase tracking-widest text-xs">
            Tech Performance
          </h2>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="text-xs bg-[var(--color-hover)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-primary)]"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div className="text-center text-[var(--color-text-secondary)] py-8 text-sm">
          No tech performance data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] uppercase tracking-widest text-xs">
          Tech Performance ({periodDays} days)
        </h2>
        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          className="text-xs bg-[var(--color-hover)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-primary)]"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="space-y-4">
        {techStats.map((tech) => (
          <div
            key={tech.username}
            className="bg-[var(--color-hover)] border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)]/30 transition-all cursor-pointer"
            onClick={() => router.push(`/service-calls?assigned_to=${tech.username}`)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-[var(--color-text-primary)]">
                {tech.username}
              </div>
              {tech.conversion_rate !== null && (
                <div className={`text-xs font-medium px-2 py-1 rounded ${
                  tech.conversion_rate >= 50 
                    ? 'bg-green-500/20 text-green-400' 
                    : tech.conversion_rate >= 30
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {tech.conversion_rate}% conversion
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">Completed</div>
                <div className="text-lg font-bold text-blue-400">{tech.completed}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">Sold</div>
                <div className="text-lg font-bold text-green-400">{tech.sold}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">Lost</div>
                <div className="text-lg font-bold text-red-400">{tech.lost}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

