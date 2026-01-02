'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Textarea } from './ui/Textarea'
import { showToast } from './Toast'
import { handleApiError, logError } from '../lib/error-handler'
import UilClipboardNotes from '@iconscout/react-unicons/icons/uil-clipboard-notes'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'
import UilShoppingCart from '@iconscout/react-unicons/icons/uil-shopping-cart'
import UilEnvelopeSend from '@iconscout/react-unicons/icons/uil-envelope-send'
import UilPhoneAlt from '@iconscout/react-unicons/icons/uil-phone-alt'
import UilInvoice from '@iconscout/react-unicons/icons/uil-invoice'
import UilCheckCircle from '@iconscout/react-unicons/icons/uil-check-circle'

interface ServiceCallCheckoffsProps {
  serviceCallId: string
  customerName: string
}

/**
 * Component for managing follow-up tasks for service calls
 * Allows techs to create tasks that need office staff attention
 */
export function ServiceCallCheckoffs({ serviceCallId, customerName }: ServiceCallCheckoffsProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [taskType, setTaskType] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    loadTasks()
  }, [serviceCallId])

  async function loadTasks() {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await axios.get(
        `${API_BASE_URL}/service-calls/${serviceCallId}/tasks`,
        { headers, withCredentials: true }
      )
      setTasks(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      logError(error, 'loadServiceCallTasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTask() {
    if (!taskType || !taskTitle) {
      showToast('Please select a task type and enter a title', 'error')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      await axios.post(
        `${API_BASE_URL}/service-calls/${serviceCallId}/tasks`,
        {
          tenant_id: 'h2o',
          task_type: taskType,
          title: taskTitle,
          description: taskDescription || null,
          assigned_to: assignedTo || null,
          due_date: dueDate || null,
          status: 'pending'
        },
        { headers, withCredentials: true }
      )
      
      showToast('Task created! Office staff will be notified.', 'success')
      setShowAddForm(false)
      setTaskType('')
      setTaskTitle('')
      setTaskDescription('')
      setAssignedTo('')
      setDueDate('')
      await loadTasks()
    } catch (error: any) {
      logError(error, 'createServiceCallTask')
      showToast(handleApiError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const taskTypeOptions = [
    { value: 'pull_permit', label: 'Pull Permit', icon: UilFileAlt },
    { value: 'order_parts', label: 'Order Parts', icon: UilShoppingCart },
    { value: 'send_bid', label: 'Send Bid', icon: UilEnvelopeSend },
    { value: 'call_back_schedule', label: 'Call Back to Schedule', icon: UilPhoneAlt },
    { value: 'write_up_billing', label: 'Write Up Billing', icon: UilInvoice },
    { value: 'other', label: 'Other', icon: UilClipboardNotes }
  ]

  const officeStaff = ['sandi', 'skylee']

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: 'var(--color-text-primary)',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <UilClipboardNotes size={18} color="var(--color-text-primary)" />
          Follow-up Tasks for Office
        </h3>
        {!showAddForm && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            + Add Task
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card style={{ marginBottom: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Task Type *
              </label>
              <Select
                value={taskType}
                onChange={(e) => {
                  setTaskType(e.target.value)
                  // Auto-fill title based on type
                  const option = taskTypeOptions.find(opt => opt.value === e.target.value)
                  if (option && !taskTitle) {
                    setTaskTitle(option.label)
                  }
                }}
                options={[
                  { value: '', label: 'Select task type...' }, 
                  ...taskTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Title *
              </label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Pull permit for kitchen remodel"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Description
              </label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Assign To
                </label>
                <Select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  options={[
                    { value: '', label: 'Anyone' },
                    ...officeStaff.map(staff => ({ value: staff, label: staff.charAt(0).toUpperCase() + staff.slice(1) }))
                  ]}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setTaskType('')
                  setTaskTitle('')
                  setTaskDescription('')
                  setAssignedTo('')
                  setDueDate('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateTask}
                disabled={submitting || !taskType || !taskTitle}
              >
                {submitting ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ 
          padding: '20px', 
          backgroundColor: 'var(--color-surface-elevated)', 
          borderRadius: '8px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)'
        }}>
          No follow-up tasks yet. Add one above if office staff needs to do something.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                padding: '16px',
                backgroundColor: task.status === 'completed' 
                  ? 'rgba(34, 197, 94, 0.05)' 
                  : 'var(--color-surface-elevated)',
                border: task.status === 'completed'
                  ? '1px solid rgba(34, 197, 94, 0.2)'
                  : '1px solid var(--color-border)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                gap: '12px'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{ fontSize: '18px' }}>
                    {(() => {
                      const option = taskTypeOptions.find(opt => opt.value === task.task_type)
                      const Icon = option?.icon || UilClipboardNotes
                      return <Icon size={16} color="var(--color-text-primary)" />
                    })()}
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: 'var(--color-text-primary)',
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    opacity: task.status === 'completed' ? 0.6 : 1
                  }}>
                    {task.title}
                  </span>
                    {task.status === 'completed' && (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: 'rgb(34, 197, 94)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <UilCheckCircle size={12} color="rgb(34, 197, 94)" />
                        Done
                      </span>
                    )}
                </div>
                {task.description && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--color-text-secondary)',
                    marginTop: '4px'
                  }}>
                    {task.description}
                  </div>
                )}
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginTop: '8px',
                  fontSize: '11px',
                  color: 'var(--color-text-tertiary)'
                }}>
                  {task.assigned_to && (
                    <span>Assigned to: <strong>{task.assigned_to}</strong></span>
                  )}
                  {task.due_date && (
                    <span>Due: <strong>{new Date(task.due_date).toLocaleDateString()}</strong></span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

