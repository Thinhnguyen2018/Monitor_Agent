import React from 'react'
import { Task } from '../types'

interface Props { task: Task }

const TaskCardOverlay: React.FC<Props> = ({ task }) => {
  const formatDeadline = (d?: string) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }
  return (
    <div className="task-card task-card-overlay">
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
        {task.deadline && <span className="task-deadline">{formatDeadline(task.deadline)}</span>}
      </div>
    </div>
  )
}

export default TaskCardOverlay
