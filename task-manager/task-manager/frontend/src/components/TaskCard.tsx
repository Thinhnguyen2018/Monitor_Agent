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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDeadline = (d?: string) => {
    if (!d) return null
    const date = new Date(d)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
    >
      <div className="task-card-top">
        <span className={`module-badge ${task.module}`}>{task.module}</span>
        <span className="task-quarter-badge">{task.quarter}</span>
      </div>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-footer">
        {task.assignee && (
          <span className="task-assignee">{task.assignee}</span>
        )}
        {task.deadline && (
          <span className="task-deadline">{formatDeadline(task.deadline)}</span>
        )}
      </div>
    </div>
  )
}

export default TaskCard
