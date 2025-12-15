'use client'
import { useState } from 'react'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white border-b p-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-6">
                <a href="/" className="font-bold text-lg">H2O-ACP Dashboard</a>
                <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="/builders" className="text-sm text-gray-600 hover:text-gray-900">Builders</a>
                <a href="/jobs" className="text-sm text-green-600 hover:text-green-700 font-medium">All County</a>
                <a href="/service-calls" className="text-sm text-blue-600 hover:text-blue-700 font-medium">H2O</a>
                <a href="/bids" className="text-sm text-gray-600 hover:text-gray-900">Bids</a>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setSearchOpen(!searchOpen)} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </button>
                <a href="/login" className="text-sm text-gray-600 hover:text-gray-900">Login</a>
              </div>
            </div>
            
            {searchOpen && (
              <div className="max-w-7xl mx-auto mt-3">
                <SearchBar onClose={() => setSearchOpen(false)} />
              </div>
            )}
          </nav>
          <div>{children}</div>
        </div>
      </body>
    </html>
  )
}

function SearchBar({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const [jobs, serviceCalls, builders] = await Promise.all([
        fetch(`${API_URL}/jobs?search=${encodeURIComponent(query)}`, { credentials: 'include' }).then(r => r.json()),
        fetch(`${API_URL}/service-calls?search=${encodeURIComponent(query)}`, { credentials: 'include' }).then(r => r.json()),
        fetch(`${API_URL}/builders?search=${encodeURIComponent(query)}`, { credentials: 'include' }).then(r => r.json())
      ])
      setResults({ jobs, serviceCalls, builders })
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && search()}
          placeholder="Search jobs, service calls, builders..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button onClick={search} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900">×</button>
      </div>
      
      {results && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {results.jobs?.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">All County Jobs ({results.jobs.length})</h3>
              {results.jobs.map((job: any) => (
                <a key={job.id} href={`/jobs/${job.id}`} className="block p-3 hover:bg-gray-50 rounded border-b">
                  <div className="font-medium">{job.community} - Lot {job.lot_number}</div>
                  <div className="text-sm text-gray-600">{job.address_line1}, {job.city}</div>
                </a>
              ))}
            </div>
          )}
          
          {results.serviceCalls?.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">H2O Service Calls ({results.serviceCalls.length})</h3>
              {results.serviceCalls.map((call: any) => (
                <a key={call.id} href={`/service-calls/${call.id}`} className="block p-3 hover:bg-gray-50 rounded border-b">
                  <div className="font-medium">{call.customer_name}</div>
                  <div className="text-sm text-gray-600">{call.issue_description.substring(0, 80)}...</div>
                </a>
              ))}
            </div>
          )}
          
          {results.builders?.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">Builders ({results.builders.length})</h3>
              {results.builders.map((builder: any) => (
                <a key={builder.id} href={`/builders`} className="block p-3 hover:bg-gray-50 rounded border-b">
                  <div className="font-medium">{builder.name}</div>
                </a>
              ))}
            </div>
          )}
          
          {results.jobs?.length === 0 && results.serviceCalls?.length === 0 && results.builders?.length === 0 && (
            <div className="text-center py-8 text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  )
}
