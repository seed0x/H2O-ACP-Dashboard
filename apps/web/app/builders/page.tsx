'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { Input } from '../../components/ui/Input'

interface Builder {
  id: number
  name: string
  notes: string | null
  created_at: string
}

export default function BuildersPage() {
  const [builders, setBuilders] = useState<Builder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBuilderName, setNewBuilderName] = useState('')
  const [newBuilderNotes, setNewBuilderNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadBuilders()
  }, [])

  async function loadBuilders() {
    try {
      const response = await axios.get(`${API_BASE_URL}/builders`, { 
        withCredentials: true 
      })
      setBuilders(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load builders:', error)
      setLoading(false)
    }
  }

  async function createBuilder() {
    if (!newBuilderName.trim()) return
    
    setSubmitting(true)
    try {
      await axios.post(`${API_BASE_URL}/builders`, {
        name: newBuilderName,
        notes: newBuilderNotes || null
      }, { withCredentials: true })
      
      setNewBuilderName('')
      setNewBuilderNotes('')
      setShowAddForm(false)
      await loadBuilders()
    } catch (error) {
      console.error('Failed to create builder:', error)
      alert('Failed to create builder')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredBuilders = builders.filter(builder => 
    search === '' || builder.name.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    {
      header: 'Builder Name',
      accessor: 'name' as keyof Builder
    },
    {
      header: 'Notes',
      accessor: (row: Builder) => row.notes || '-'
    },
    {
      header: 'Created',
      accessor: (row: Builder) => new Date(row.created_at).toLocaleDateString(),
      width: '150px'
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          color: 'var(--color-text-secondary)'
        }}>
          Loading builders...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Builders"
        description="Manage builder contacts and information"
        action={
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ New Builder'}
          </Button>
        }
      />

      {/* Add Builder Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            marginBottom: '16px'
          }}>Add New Builder</h3>
          <div style={{ 
            display: 'grid', 
            gap: '16px', 
            marginBottom: '16px' 
          }}>
            <Input
              label="Builder Name"
              placeholder="Enter builder name..."
              value={newBuilderName}
              onChange={(e) => setNewBuilderName(e.target.value)}
            />
            <Input
              label="Notes (Optional)"
              placeholder="Additional notes..."
              value={newBuilderNotes}
              onChange={(e) => setNewBuilderNotes(e.target.value)}
            />
          </div>
          <Button 
            onClick={createBuilder} 
            disabled={submitting || !newBuilderName.trim()}
          >
            {submitting ? 'Creating...' : 'Create Builder'}
          </Button>
        </div>
      )}

      {/* Search */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <Input
          placeholder="Search builders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Table
        data={filteredBuilders}
        columns={columns}
        emptyMessage="No builders found. Create your first builder to get started."
      />
    </div>
  )
}
