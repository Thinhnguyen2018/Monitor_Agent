import React, { useState, useEffect, useRef } from 'react'
import { Task, TaskCreate, Comment, Subtask, Activity } from '../types'
import {
  getComments, createComment, deleteComment,
  getSubtasks, createSubtask, updateSubtask, deleteSubtask,
  getActivity,
} from '../api'

interface TaskModalProps {
  task: Task | null
  onClose: () => void
  onSave: (data: TaskCreate) => void
  onDelete?: (id: number) => void
}

const MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration'] as const
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

type RightTab = 'comments' | 'subtasks' | 'activity'

const FIELD_LABELS: Record<string, string> = {
  status: 'Status', assignee: 'Assignee', title: 'Title',
  deadline: 'Deadline', module: 'Module', quarter: 'Quarter', description: 'Description',
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState<TaskCreate>({
    title: task?.title ?? '',
    module: task?.module ?? 'GreenRAG',
    status: task?.status ?? 'pending',
    quarter: task?.quarter ?? 'Q1',
    year: task?.year ?? 2026,
    assignee: task?.assignee ?? '',
    deadline: task?.deadline ?? '',
    description: task?.description ?? '',
  })

  const [rightTab, setRightTab] = useState<RightTab>('subtasks')

  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  // Activity
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    if (!task) return
    getComments(task.id).then(setComments).catch(() => {})
    getSubtasks(task.id).then(setSubtasks).catch(() => {})
    getActivity(task.id).then(setActivities).catch(() => {})
  }, [task])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (k: keyof TaskCreate, v: any) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ ...form, assignee: form.assignee || undefined, deadline: form.deadline || undefined, description: form.description || undefined })
  }

  // ── Comments ────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!commentText.trim() || !task) return
    setSubmittingComment(true)
    try {
      const c = await createComment(task.id, 'Me', commentText.trim())
      setComments((prev) => [...prev, c])
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (id: number) => {
    await deleteComment(id)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  // ── Subtasks ─────────────────────────────────────────────────
  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !task) return
    setAddingSubtask(true)
    try {
      const s = await createSubtask(task.id, newSubtask.trim())
      setSubtasks((prev) => [...prev, s])
      setNewSubtask('')
      subtaskInputRef.current?.focus()
    } finally {
      setAddingSubtask(false)
    }
  }

  const handleToggleSubtask = async (sub: Subtask) => {
    const updated = await updateSubtask(sub.id, { completed: !sub.completed })
    setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? updated : s)))
  }

  const handleDeleteSubtask = async (id: number) => {
    await deleteSubtask(id)
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  const doneCount = subtasks.filter((s) => s.completed).length
  const totalCount = subtasks.length

  // ── Activity ─────────────────────────────────────────────────
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const isExisting = !!task

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${isExisting ? ' modal-wide' : ''}`} role="dialog">
        <div className="modal-header">
          <span className="modal-title">{task ? 'Edit task' : 'New task'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className={isExisting ? 'modal-two-col' : ''}>
          {/* Left: form */}
          <form onSubmit={handleSubmit} className="modal-form-col">
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" required value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Module</label>
                  <select className="form-input" value={form.module} onChange={(e) => set('module', e.target.value as TaskCreate['module'])}>
                    {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value as TaskCreate['status'])}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Quarter</label>
                  <select className="form-input" value={form.quarter} onChange={(e) => set('quarter', e.target.value as TaskCreate['quarter'])}>
                    {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input className="form-input" type="date" value={form.deadline ?? ''} onChange={(e) => set('deadline', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <input className="form-input" value={form.assignee ?? ''} onChange={(e) => set('assignee', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
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

          {/* Right: tabs */}
          {isExisting && (
            <div className="modal-comments-col">
              <div className="modal-right-tabs">
                {(['subtasks', 'comments', 'activity'] as RightTab[]).map((t) => (
                  <button
                    key={t}
                    className={`modal-right-tab${rightTab === t ? ' active' : ''}`}
                    onClick={() => setRightTab(t)}
                  >
                    {t === 'subtasks'
                      ? `Subtasks${totalCount > 0 ? ` ${doneCount}/${totalCount}` : ''}`
                      : t === 'comments'
                      ? `Comments${comments.length > 0 ? ` ${comments.length}` : ''}`
                      : 'Activity'}
                  </button>
                ))}
              </div>

              {/* Subtasks tab */}
              {rightTab === 'subtasks' && (
                <div className="subtasks-panel">
                  {totalCount > 0 && (
                    <div className="subtask-progress">
                      <div className="subtask-progress-bar">
                        <div
                          className="subtask-progress-fill"
                          style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
                        />
                      </div>
                      <span className="subtask-progress-label">{Math.round((doneCount / totalCount) * 100)}%</span>
                    </div>
                  )}
                  <div className="subtasks-list">
                    {subtasks.length === 0 && (
                      <div className="comments-empty">No subtasks yet. Add one below.</div>
                    )}
                    {subtasks.map((s) => (
                      <div key={s.id} className={`subtask-item${s.completed ? ' completed' : ''}`}>
                        <input
                          type="checkbox"
                          className="subtask-checkbox"
                          checked={s.completed}
                          onChange={() => handleToggleSubtask(s)}
                        />
                        <span className="subtask-title">{s.title}</span>
                        <button className="subtask-delete" onClick={() => handleDeleteSubtask(s.id)}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="subtask-add-row">
                    <input
                      ref={subtaskInputRef}
                      className="subtask-input"
                      placeholder="Add subtask… (Enter)"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask() }}
                    />
                    <button
                      className="btn btn-primary subtask-add-btn"
                      onClick={handleAddSubtask}
                      disabled={addingSubtask || !newSubtask.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Comments tab */}
              {rightTab === 'comments' && (
                <>
                  <div className="comments-list">
                    {comments.length === 0 && <div className="comments-empty">No comments yet.</div>}
                    {comments.map((c) => (
                      <div key={c.id} className="comment-item">
                        <div className="comment-body">
                          <span className="comment-text">{c.content}</span>
                          <button className="comment-delete" onClick={() => handleDeleteComment(c.id)}>×</button>
                        </div>
                        <div className="comment-time">{formatTime(c.created_at)}</div>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                  <div className="comment-input-row">
                    <textarea
                      className="comment-input"
                      placeholder="Add a comment… (Ctrl+Enter to send)"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment() }}
                    />
                    <button
                      className="btn btn-primary comment-send"
                      onClick={handleAddComment}
                      disabled={submittingComment || !commentText.trim()}
                    >
                      Send
                    </button>
                  </div>
                </>
              )}

              {/* Activity tab */}
              {rightTab === 'activity' && (
                <div className="activity-panel">
                  {activities.length === 0 && (
                    <div className="comments-empty">No activity yet. Changes will appear here.</div>
                  )}
                  {activities.map((a) => (
                    <div key={a.id} className="activity-item">
                      <div className="activity-dot" />
                      <div className="activity-content">
                        <span className="activity-field">{FIELD_LABELS[a.field] ?? a.field}</span>
                        {' changed'}
                        {a.old_value && a.new_value && (
                          <> from <span className="activity-val old">{a.old_value}</span> to <span className="activity-val new">{a.new_value}</span></>
                        )}
                        {!a.old_value && a.new_value && (
                          <> set to <span className="activity-val new">{a.new_value}</span></>
                        )}
                        <div className="activity-time">{formatTime(a.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskModal
