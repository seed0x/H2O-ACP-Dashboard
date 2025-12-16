'use client'

import { useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '@/lib/config'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function ImportPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  const handleImport = async (file: File, tenantId: string) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const token = localStorage.getItem('token')
    const response = await axios.post(
      `${API_BASE_URL}/import/outlook-calendar?tenant_id=${tenantId}&skip_duplicates=true`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data
  }

  const importFile = async (fileInput: HTMLInputElement, tenantId: string, tenantName: string) => {
    if (!fileInput.files?.[0]) {
      throw new Error(`Please select ${tenantName} file`)
    }

    const result = await handleImport(fileInput.files[0], tenantId)
    return { tenantName, result }
  }

  const importAll = async () => {
    setLoading(true)
    setError('')
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Please log in first')
      }

      const allCountyInput = document.getElementById('all-county-file') as HTMLInputElement
      const h2oInput = document.getElementById('h2o-file') as HTMLInputElement

      const results: any = {}

      if (allCountyInput?.files?.[0]) {
        results.allCounty = await importFile(allCountyInput, 'all_county', 'All County')
      }

      if (h2oInput?.files?.[0]) {
        results.h2o = await importFile(h2oInput, 'h2o', 'H2O Service')
      }

      if (Object.keys(results).length === 0) {
        throw new Error('Please select at least one file')
      }

      setResults(results)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Import Calendar Data</h1>
      
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">All County Jobs (CSV)</label>
            <input
              id="all-county-file"
              type="file"
              accept=".csv"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">H2O Service Calendar (ICS)</label>
            <input
              id="h2o-file"
              type="file"
              accept=".ics"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <Button 
            onClick={importAll} 
            disabled={loading}
          >
            {loading ? 'Importing...' : 'Import Selected Files'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-6 space-y-4">
            {results.allCounty && (
              <div>
                <h3 className="font-semibold mb-2">All County: {results.allCounty.result.summary.jobs.created} jobs, {results.allCounty.result.summary.service_calls.created} service calls</h3>
              </div>
            )}
            {results.h2o && (
              <div>
                <h3 className="font-semibold mb-2">H2O Service: {results.h2o.result.summary.jobs.created} jobs, {results.h2o.result.summary.service_calls.created} service calls</h3>
              </div>
            )}
            <div className="text-green-600 font-semibold">Import complete!</div>
          </div>
        )}
      </Card>
    </div>
  )
}
