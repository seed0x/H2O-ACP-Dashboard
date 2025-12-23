'use client'
import { useState } from 'react'
import { TaskCard } from './TaskCard'
import { Button } from './Button'
import { Input } from './Input'
import { Textarea } from './Textarea'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { showToast } from '../Toast'
import { handleApiError } from '../../lib/error-handler'

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to?: string
  due_date?: string
  completed_at?: string
}

interface TasksPanelProps {
  jobId: string
  tasks: Task[]
  onUpdate: () => void
}

export function TasksPanel({ jobId, tasks, onUpdate }: TasksPanelProps) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [creating, setCreating] = useState(false)

  async function createTask() {
    if (!newTaskTitle.trim()) {
      showToast('Task title is required', 'error')
      return
    }

    try {
      setCreating(true)
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_BASE_URL}/jobs/${jobId}/tasks`,
        {
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || undefined
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        }
      )
      showToast('Task created', 'success')
      setNewTaskTitle('')
      setNewTaskDescription('')
      setShowAddTask(false)
      onUpdate()
    } catch (error: any) {
      showToast(handleApiError(error), 'error')
    } finally {
      setCreating(false)
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${API_BASE_URL}/jobs/${jobId}/tasks/${taskId}`,
        { status: newStatus },
        {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        }
      )
      onUpdate()
    } catch (error: any) {
      showToast(handleApiError(error), 'error')
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${API_BASE_URL}/jobs/${jobId}/tasks/${taskId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        }
      )
      showToast('Task deleted', 'success')
      onUpdate()
    } catch (error: any) {
      showToast(handleApiError(error), 'error')
    }
  }

  const pendingTasks = tasks.filter(t => t.status !== 'completed')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] m-0">
          Phase Tasks
        </h3>
        <Button 
          size="sm" 
          onClick={() => setShowAddTask(!showAddTask)}
          variant="secondary"
        >
          {showAddTask ? 'Cancel' : '+ Add Task'}
        </Button>
      </div>

      {showAddTask && (
        <div className="p-4 bg-[var(--color-hover)] rounded-lg mb-4 flex flex-col gap-3">
          <Input
            placeholder="Task title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            rows={2}
          />
          <Button
            onClick={createTask}
            disabled={creating || !newTaskTitle.trim()}
            size="sm"
          >
            {creating ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm">
          <div className="text-3xl mb-2">📋</div>
          <div>No tasks yet. Tasks are created automatically when phase changes.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pendingTasks.length > 0 && (
            <>
              {pendingTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </>
          )}
          
          {completedTasks.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-[var(--color-text-secondary)] uppercase mb-2 font-semibold">
                Completed ({completedTasks.length})
              </div>
              {completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

