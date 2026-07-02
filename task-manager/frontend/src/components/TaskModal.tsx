import React, { useState, useEffect, useRef } from 'react'
import { Task, TaskCreate, Comment } from '../types'
import { getComments, createComment, deleteComment } from '../api'

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

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState<TaskCreate>(EMPTY)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

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
      getComments(task.id).then(setComments).catch(() => {})
    } else {
      setForm(EMPTY)
      setComments([])
    }
  }, [task])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

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

  const handlePostComment = async () => {
    if (!task || !commentText.trim()) return
    setPosting(true)
    try {
      const c = await createComment(task.id, 'Me', commentText.trim())
      setComments((prev) => [...prev, c])
      setCommentText('')
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteComment = async (id: number) => {
    await deleteComment(id)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal modal-wide" role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="modal-title">{task ? 'Edit task' : 'New task'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-two-col">
          {/* ── Left: form ── */}
          <form onSubmit={handleSubmit} className="modal-form-col">
            <div className="modal-body">
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Module</label>
                  <select className="form-select" value={form.module} onChange={(e) => set('module', e.target.value as Task['module'])}>
                    <option value="GreenRAG">GreenRAG</option>
                    <option value="Doc-Intelli">Doc-Intelli</option>
                    <option value="Infra">Infra</option>
                    <option value="Integration">Integration</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value as Task['status'])}>
                    <option value="pending">Pending</option>
                    <option value="progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quarter</label>
                  <select className="form-select" value={form.quarter} onChange={(e) => set('quarter', e.target.value as Task['quarter'])}>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input className="form-input" type="number" min={2024} max={2030} value={form.year} onChange={(e) => set('year', parseInt(e.target.value))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <input className="form-input" placeholder="Name or team" value={form.assignee ?? ''} onChange={(e) => set('assignee', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input className="form-input" type="date" value={form.deadline ?? ''} onChange={(e) => set('deadline', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Optional description…" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>

            <div className="modal-footer">
              {task && onDelete && (
                <button type="button" className="btn btn-danger" onClick={() => onDelete(task.id)}>Delete</button>
              )}
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">{task ? 'Save changes' : 'Create task'}</button>
            </div>
          </form>

          {/* ── Right: comments (only for existing tasks) ── */}
          {task && (
            <div className="modal-comments-col">
              <div className="comments-header">
                <span className="form-label">Comments</span>
                <span className="comments-count">{comments.length}</span>
              </div>

              <div className="comments-list">
                {comments.length === 0 && (
                  <div className="comments-empty">No comments yet. Be the first!</div>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-meta">
                      <span className="comment-time">{formatTime(c.created_at)}</span>
                      <button className="comment-delete" onClick={() => handleDeleteComment(c.id)} title="Delete">×</button>
                    </div>
                    <div className="comment-content">{c.content}</div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>

              <div className="comment-input-area">
                <textarea
                  className="form-textarea comment-textarea"
                  placeholder="Write a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePostComment() }}
                />
                <button
                  className="btn btn-primary comment-submit"
                  onClick={handlePostComment}
                  disabled={posting || !commentText.trim()}
                >
                  {posting ? 'Posting…' : 'Post  ⌘↵'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskModal
