import React, { useState, useEffect } from 'react'
import { Task, TaskCreate } from '../types'

interface TaskModalProps {
  task: Task | null
  onClose: () => void
  onSave: (data: TaskCreate) => void
  onDelete?: (id: number) => void
}

const EMPTY: TaskCreate = {
  title: '',
  module: 'GreenRAG',
  status: 'pending',
  quarter: 'Q1',
  year: 2026,
  assignee: '',
  deadline: '',
  description: '',
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState<TaskCreate>(EMPTY)

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        module: task.module,
        status: task.status,
        quarter: task.quarter,
        year: task.year,
        assignee: task.assignee ?? '',
        deadline: task.deadline ?? '',
        description: task.description ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [task])

  const set = <K extends keyof TaskCreate>(key: K, value: TaskCreate[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: TaskCreate = {
      ...form,
      assignee: form.assignee || undefined,
      deadline: form.deadline || undefined,
      description: form.description || undefined,
    }
    onSave(payload)
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="modal-title">{task ? 'Edit task' : 'New task'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                required
                placeholder="Task title"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>

            {/* Module + Status */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Module</label>
                <select
                  className="form-select"
                  value={form.module}
                  onChange={(e) => set('module', e.target.value as Task['module'])}
                >
                  <option value="GreenRAG">GreenRAG</option>
                  <option value="Doc-Intelli">Doc-Intelli</option>
                  <option value="Infra">Infra</option>
                  <option value="Integration">Integration</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as Task['status'])}
                >
                  <option value="pending">Pending</option>
                  <option value="progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            {/* Quarter + Year */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quarter</label>
                <select
                  className="form-select"
                  value={form.quarter}
                  onChange={(e) => set('quarter', e.target.value as Task['quarter'])}
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input
                  className="form-input"
                  type="number"
                  min={2024}
                  max={2030}
                  value={form.year}
                  onChange={(e) => set('year', parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Assignee + Deadline */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <input
                  className="form-input"
                  placeholder="Name or team"
                  value={form.assignee ?? ''}
                  onChange={(e) => set('assignee', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.deadline ?? ''}
                  onChange={(e) => set('deadline', e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Optional description…"
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            {task && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDelete(task.id)}
              >
                Delete
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
