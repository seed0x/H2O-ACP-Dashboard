'use client'
import { StatusBadge } from './StatusBadge'

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to?: string
  due_date?: string
  completed_at?: string
}

interface TaskCardProps {
  task: Task
  onStatusChange: (newStatus: string) => void
  onDelete?: () => void
}

export function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const statusLabels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }

  const statusVariants: Record<string, 'default' | 'success' | 'info'> = {
    pending: 'default',
    in_progress: 'info',
    completed: 'success',
    cancelled: 'default'
  }

  return (
    <div className={`p-3 border rounded-lg bg-[var(--color-card)] transition-all ${
      task.status === 'completed' ? 'opacity-70' : ''
    }`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={(e) => onStatusChange(e.target.checked ? 'completed' : 'pending')}
          className="mt-1 w-[18px] h-[18px] cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className={`font-semibold mb-1 ${
            task.status === 'completed' 
              ? 'line-through text-[var(--color-text-secondary)]' 
              : 'text-[var(--color-text-primary)]'
          }`}>
            {task.title}
          </div>
          {task.description && (
            <div className="text-xs text-[var(--color-text-secondary)] mb-2 leading-relaxed">
              {task.description}
            </div>
          )}
          <div className="flex gap-2 items-center flex-wrap text-xs">
            <StatusBadge 
              status={statusLabels[task.status as keyof typeof statusLabels]} 
              variant={statusVariants[task.status] || 'default'}
            />
            {task.assigned_to && (
              <span className="text-[var(--color-text-secondary)]">
                👤 {task.assigned_to}
              </span>
            )}
            {task.due_date && (
              <span className="text-[var(--color-text-secondary)]">
                📅 Due: {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
            {task.completed_at && (
              <span className="text-[var(--color-text-secondary)]">
                ✓ Completed {new Date(task.completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="bg-transparent border-none text-[var(--color-text-secondary)] cursor-pointer text-lg px-2 py-1 hover:text-[var(--color-text-primary)] transition-colors"
            title="Delete task"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

