import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '../types'

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const overdue = task.status === 'progress' && task.deadline && new Date(task.deadline) < new Date()

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDeadline = (d?: string) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card${isDragging ? ' dragging' : ''}${overdue ? ' task-card-overdue' : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
    >
      <div className="task-card-top">
        <span className={`module-badge ${task.module}`}>{task.module}</span>
        <span className="task-quarter-badge">{task.quarter}</span>
      </div>
      <div className="task-card-title">{task.title}</div>
      {task.description && (
        <div className="task-card-desc">
          {task.description.length > 80 ? task.description.slice(0, 80) + '…' : task.description}
        </div>
      )}
      <div className="task-card-footer">
        {task.assignee && <span className="task-assignee">{task.assignee}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {(task.subtask_total ?? 0) > 0 && (
            <span className={`subtask-badge${task.subtask_done === task.subtask_total ? ' done' : ''}`}>
              ✓ {task.subtask_done}/{task.subtask_total}
            </span>
          )}
          {overdue && <span className="overdue-badge">Overdue</span>}
          {task.deadline && (
            <span className={`task-deadline${overdue ? ' task-deadline-overdue' : ''}`}>
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskCard
