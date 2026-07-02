import React, { useState } from 'react'
import { Task, TaskCreate } from '../types'
import { createTask, updateTask, deleteTask } from '../api'

interface Props {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
}

type ItemType = 'Milestone' | 'Release'

interface FormState {
  title: string
  deadline: string
  description: string
  quarter: Task['quarter']
}

const EMPTY_FORM: FormState = { title: '', deadline: '', description: '', quarter: 'Q1' }

const dateToQuarter = (dateStr: string): Task['quarter'] => {
  if (!dateStr) return 'Q1'
  const m = new Date(dateStr).getMonth() + 1
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

const formatDate = (d?: string) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isPast = (d?: string) => d ? new Date(d) < new Date() : false

// ── Item card ────────────────────────────────────────────────────
const ItemCard: React.FC<{
  task: Task
  type: ItemType
  onEdit: (task: Task) => void
  onDelete: (id: number) => void
}> = ({ task, type, onEdit, onDelete }) => {
  const past = isPast(task.deadline)
  return (
    <div className={`ml-card ${type === 'Milestone' ? 'ml-card-milestone' : 'ml-card-release'}`}>
      <div className="ml-card-top">
        {type === 'Milestone'
          ? <span className="ml-diamond">◆</span>
          : <span className="ml-rocket">🚀</span>
        }
        <span className="ml-card-title">{task.title}</span>
        <div className="ml-card-actions">
          <button className="ml-btn-icon" onClick={() => onEdit(task)} title="Edit">✏️</button>
          <button className="ml-btn-icon ml-btn-delete" onClick={() => onDelete(task.id)} title="Delete">×</button>
        </div>
      </div>
      <div className={`ml-date${past ? ' ml-date-past' : ''}`}>
        📅 {formatDate(task.deadline)}
        {past && <span className="ml-past-badge">Past</span>}
      </div>
      {task.description && <div className="ml-desc">{task.description}</div>}
      <div className="ml-quarter-tag">{task.quarter} 2026</div>
    </div>
  )
}

// ── Add/Edit modal ────────────────────────────────────────────────
const ItemModal: React.FC<{
  type: ItemType
  editing: Task | null
  onClose: () => void
  onSave: (form: FormState) => void
  onDelete?: () => void
}> = ({ type, editing, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState<FormState>(
    editing
      ? { title: editing.title, deadline: editing.deadline ?? '', description: editing.description ?? '', quarter: editing.quarter }
      : EMPTY_FORM
  )

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const quarter = form.deadline ? dateToQuarter(form.deadline) : form.quarter
    onSave({ ...form, quarter })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog">
        <div className="modal-header">
          <span className="modal-title">
            {editing ? 'Edit' : 'New'} {type}
          </span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">{type} name *</label>
              <input
                className="form-input"
                required
                placeholder={type === 'Milestone' ? 'e.g. MVP launch' : 'e.g. v1.0 release'}
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target date *</label>
              <input
                className="form-input"
                type="date"
                required
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="What does this mark?"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            {editing && onDelete && (
              <button type="button" className="btn btn-danger" onClick={onDelete}>Delete</button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {editing ? 'Save changes' : `Add ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main tab ─────────────────────────────────────────────────────
const MilestonesTab: React.FC<Props> = ({ tasks, onTasksChange }) => {
  const [modal, setModal] = useState<{ type: ItemType; task: Task | null } | null>(null)

  const milestones = tasks.filter(t => t.module === 'Milestone').sort((a, b) =>
    (a.deadline ?? '') < (b.deadline ?? '') ? -1 : 1
  )
  const releases = tasks.filter(t => t.module === 'Release').sort((a, b) =>
    (a.deadline ?? '') < (b.deadline ?? '') ? -1 : 1
  )

  const handleSave = async (form: FormState) => {
    const type = modal!.type
    const editing = modal!.task
    const payload: TaskCreate = {
      title: form.title,
      module: type,
      status: 'pending',
      quarter: form.quarter,
      year: 2026,
      deadline: form.deadline || undefined,
      description: form.description || undefined,
    }
    if (editing) {
      const updated = await updateTask(editing.id, payload)
      onTasksChange(tasks.map(t => t.id === editing.id ? updated : t))
    } else {
      const created = await createTask(payload)
      onTasksChange([...tasks, created])
    }
    setModal(null)
  }

  const handleDelete = async (id: number) => {
    await deleteTask(id)
    onTasksChange(tasks.filter(t => t.id !== id))
    setModal(null)
  }

  const Section: React.FC<{ type: ItemType; items: Task[] }> = ({ type, items }) => (
    <div className="ml-section">
      <div className="ml-section-header">
        <span className="ml-section-icon">{type === 'Milestone' ? '◆' : '🚀'}</span>
        <span className="ml-section-title">{type}s</span>
        <span className="ml-section-count">{items.length}</span>
        <button
          className="btn btn-primary ml-add-btn"
          onClick={() => setModal({ type, task: null })}
        >
          + Add {type}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="ml-empty">No {type.toLowerCase()}s yet — add one to get started.</div>
      ) : (
        <div className="ml-list">
          {items.map(t => (
            <ItemCard
              key={t.id}
              task={t}
              type={type}
              onEdit={task => setModal({ type, task })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="ml-wrapper">
      <Section type="Milestone" items={milestones} />
      <div className="ml-divider" />
      <Section type="Release" items={releases} />

      {modal && (
        <ItemModal
          type={modal.type}
          editing={modal.task}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal.task ? () => handleDelete(modal.task!.id) : undefined}
        />
      )}
    </div>
  )
}

export default MilestonesTab
