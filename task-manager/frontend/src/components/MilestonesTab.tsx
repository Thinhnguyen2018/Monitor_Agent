import React, { useState } from 'react'
import { Task, TaskCreate } from '../types'
import { createTask, updateTask, deleteTask } from '../api'

interface MilestonesTabProps {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
}

interface ItemModalProps {
  type: 'Milestone' | 'Release'
  item: Task | null
  onClose: () => void
  onSave: (data: TaskCreate) => Promise<void>
  onDelete?: (id: number) => Promise<void>
}

const dateToQuarter = (dateStr: string): Task['quarter'] => {
  const m = new Date(dateStr).getMonth() + 1
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

const ItemModal: React.FC<ItemModalProps> = ({ type, item, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(item?.title ?? '')
  const [date, setDate] = useState(item?.deadline ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        module: type,
        status: item?.status ?? 'pending',
        quarter: dateToQuarter(date),
        year: new Date(date).getFullYear(),
        deadline: date,
        description: description || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog">
        <div className="modal-header">
          <span className="modal-title">{item ? `Edit ${type}` : `New ${type}`}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {date && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Quarter: <strong>{dateToQuarter(date)}</strong>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {item && onDelete && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(item.id).then(onClose)}>Delete</button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : item ? 'Save changes' : `Create ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ItemCard: React.FC<{ item: Task; onClick: () => void }> = ({ item, onClick }) => {
  const isPast = !!item.deadline && new Date(item.deadline) < new Date()
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="ml-card" onClick={onClick}>
      <div className="ml-card-top">
        <span className="ml-card-title">{item.title}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="task-quarter-badge">{item.quarter}</span>
          {isPast && <span className="overdue-badge">Past</span>}
        </div>
      </div>
      {item.deadline && (
        <div className="ml-card-date">{fmt(item.deadline)}</div>
      )}
      {item.description && (
        <div className="ml-card-desc">{item.description}</div>
      )}
    </div>
  )
}

const MilestonesTab: React.FC<MilestonesTabProps> = ({ tasks, onTasksChange }) => {
  const [modal, setModal] = useState<{ type: 'Milestone' | 'Release'; item: Task | null } | null>(null)

  const milestones = tasks.filter((t) => t.module === 'Milestone').sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
  const releases = tasks.filter((t) => t.module === 'Release').sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))

  const handleSave = async (data: TaskCreate) => {
    if (modal?.item) {
      const updated = await updateTask(modal.item.id, data)
      onTasksChange(tasks.map((t) => (t.id === modal.item!.id ? updated : t)))
    } else {
      const created = await createTask(data)
      onTasksChange([...tasks, created])
    }
  }

  const handleDelete = async (id: number) => {
    await deleteTask(id)
    onTasksChange(tasks.filter((t) => t.id !== id))
  }

  return (
    <div className="ml-wrapper">
      <div className="ml-section">
        <div className="ml-section-header">
          <span className="ml-section-title">
            <span className="milestone-diamond" style={{ marginRight: 6 }}>◆</span>
            Milestones
          </span>
          <button className="btn btn-primary" onClick={() => setModal({ type: 'Milestone', item: null })}>+ Add Milestone</button>
        </div>
        <div className="ml-list">
          {milestones.length === 0 && <div className="ml-empty">No milestones yet.</div>}
          {milestones.map((m) => (
            <ItemCard key={m.id} item={m} onClick={() => setModal({ type: 'Milestone', item: m })} />
          ))}
        </div>
      </div>

      <div className="ml-section">
        <div className="ml-section-header">
          <span className="ml-section-title">
            <span style={{ marginRight: 6 }}>🚀</span>
            Releases
          </span>
          <button className="btn btn-primary" onClick={() => setModal({ type: 'Release', item: null })}>+ Add Release</button>
        </div>
        <div className="ml-list">
          {releases.length === 0 && <div className="ml-empty">No releases yet.</div>}
          {releases.map((r) => (
            <ItemCard key={r.id} item={r} onClick={() => setModal({ type: 'Release', item: r })} />
          ))}
        </div>
      </div>

      {modal && (
        <ItemModal
          type={modal.type}
          item={modal.item}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={modal.item ? handleDelete : undefined}
        />
      )}
    </div>
  )
}

export default MilestonesTab
