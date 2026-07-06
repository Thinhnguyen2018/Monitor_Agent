import React, { useState, useEffect, useCallback } from 'react'
import { Task, TaskCreate, TaskUpdate } from '../types'
import TaskModal from './TaskModal'

interface MeetingNote {
  id: number
  week_label: string
  content: string
  created_at: string
  updated_at: string
}

interface ExtractedTask {
  title: string
  module: string
  status: string
  quarter: string
  year: number
  assignee?: string
  deadline?: string
  description?: string
}

interface ExtractedMilestone {
  title: string
  deadline?: string
  description?: string
}

interface SuggestedUpdate {
  task_id: number
  task_title: string
  current_status: string
  suggested_status: string
  reason: string
}

interface ExtractResult {
  tasks: ExtractedTask[]
  milestones: ExtractedMilestone[]
  updates: SuggestedUpdate[]
}

interface Props {
  tasks: Task[]
  onTasksCreated: (tasks: Task[]) => void
  onTaskUpdated: (id: number, status: Task['status']) => void
}

const BASE = '/api'

const apiClient = {
  getNotes: (): Promise<MeetingNote[]> => fetch(`${BASE}/meeting-notes`).then(r => r.json()),
  createNote: (week_label: string): Promise<MeetingNote> =>
    fetch(`${BASE}/meeting-notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week_label, content: '' }) }).then(r => r.json()),
  updateNote: (id: number, content: string, week_label: string): Promise<MeetingNote> =>
    fetch(`${BASE}/meeting-notes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, week_label }) }).then(r => r.json()),
  deleteNote: (id: number): Promise<void> =>
    fetch(`${BASE}/meeting-notes/${id}`, { method: 'DELETE' }).then(() => {}),
  extract: (id: number): Promise<ExtractResult> =>
    fetch(`${BASE}/meeting-notes/${id}/extract`, { method: 'POST' }).then(async r => {
      if (!r.ok) { const t = await r.text(); throw new Error(t) }
      return r.json()
    }),
  getNoteTasks: (id: number): Promise<Task[]> =>
    fetch(`${BASE}/meeting-notes/${id}/tasks`).then(r => r.json()),
  createTask: (task: TaskCreate): Promise<Task> =>
    fetch(`${BASE}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) }).then(r => r.json()),
  updateTaskStatus: (id: number, status: string): Promise<Task> =>
    fetch(`${BASE}/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
  updateTask: (id: number, data: TaskUpdate): Promise<Task> =>
    fetch(`${BASE}/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteTask: (id: number): Promise<void> =>
    fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' }).then(() => {}),
}

const STATUS_ARROW: Record<string, string> = { pending: '⬜ Pending', progress: '🔵 In Progress', done: '✅ Done' }

const STATUS_LABEL: Record<string, string> = { pending: 'Pending', progress: 'In Progress', done: 'Done' }
const STATUS_COLOR: Record<string, string> = { pending: '#d97706', progress: '#2563eb', done: '#16a34a' }

const getWeekNumber = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

const getWeekLabel = () => {
  const now = new Date()
  return `Week ${getWeekNumber(now)}, ${now.getFullYear()}`
}

const getNextWeekLabel = () => {
  const next = new Date()
  next.setDate(next.getDate() + 7)
  return `Week ${getWeekNumber(next)}, ${next.getFullYear()}`
}

const buildPrepTemplate = (prevNote: MeetingNote | null, tasks: Task[]): string => {
  const now = new Date()
  const month = now.getMonth() + 1
  const q = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4'
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const regularTasks = tasks.filter(t => t.module !== 'Milestone' && t.module !== 'Release')
  const inProgress = regularTasks.filter(t => t.status === 'progress')
  const pending = regularTasks.filter(t => t.status === 'pending')

  const isOverdue = (t: Task) => t.deadline && new Date(t.deadline) < today

  const fmtProgress = (t: Task) => {
    let line = `- ${t.title}`
    if (t.assignee) line += ` (${t.assignee})`
    if (t.deadline) line += ` — deadline: ${t.deadline}`
    if (isOverdue(t)) line += ` ⚠️ OVERDUE`
    line += ` → done?`
    return line
  }

  const fmtPending = (t: Task) => {
    let line = `- ${t.title}`
    if (t.assignee) line += ` (${t.assignee})`
    if (t.deadline) line += ` — deadline: ${t.deadline}`
    return line
  }

  const lines: string[] = []

  if (prevNote) {
    lines.push(`## Recap từ ${prevNote.week_label}`)
    lines.push('')
    lines.push(prevNote.content.trim())
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  lines.push(`## Updates tuần này (${q})`)
  lines.push('')

  lines.push('### 🔵 In Progress — cần report')
  if (inProgress.length > 0) {
    const overdue = inProgress.filter(t => isOverdue(t))
    const normal = inProgress.filter(t => !isOverdue(t))
    if (overdue.length > 0) {
      overdue.forEach(t => lines.push(fmtProgress(t)))
    }
    normal.forEach(t => lines.push(fmtProgress(t)))
  } else {
    lines.push('- (không có task nào đang làm)')
  }
  lines.push('')

  lines.push('---')
  lines.push('')
  lines.push('## Items mới / Thảo luận')
  lines.push('- ')

  return lines.join('\n')
}

const MeetingNotesTab: React.FC<Props> = ({ tasks, onTasksCreated, onTaskUpdated }) => {
  const [notes, setNotes] = useState<MeetingNote[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [weekLabel, setWeekLabel] = useState('')
  const [editingLabel, setEditingLabel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [selectedMilestones, setSelectedMilestones] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [noteTasks, setNoteTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [selectedUpdates, setSelectedUpdates] = useState<Set<number>>(new Set())
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => {
    apiClient.getNotes().then(data => {
      setNotes(data)
      if (data.length > 0) selectNote(data[0])
    })
  }, [])

  const selectNote = (note: MeetingNote) => {
    setSelectedId(note.id)
    setContent(note.content)
    setWeekLabel(note.week_label)
    setExtractResult(null)
    setSelectedTasks(new Set())
    setSelectedMilestones(new Set())
    loadNoteTasks(note.id)
  }

  const loadNoteTasks = async (id: number) => {
    setLoadingTasks(true)
    try {
      const tasks = await apiClient.getNoteTasks(id)
      setNoteTasks(tasks)
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleNewNote = async () => {
    const label = getWeekLabel()
    const note = await apiClient.createNote(label)
    setNotes(prev => [note, ...prev])
    selectNote(note)
  }

  const handlePrepare = async () => {
    const prevNote = notes.length > 0 ? notes[0] : null
    const label = getNextWeekLabel()
    const content = buildPrepTemplate(prevNote, tasks)
    const note = await apiClient.createNote(label)
    await apiClient.updateNote(note.id, content, label)
    const updated = { ...note, content }
    setNotes(prev => [updated, ...prev])
    selectNote(updated)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this note?')) return
    await apiClient.deleteNote(id)
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    if (selectedId === id) {
      if (remaining.length > 0) selectNote(remaining[0])
      else { setSelectedId(null); setContent(''); setWeekLabel(''); setNoteTasks([]) }
    }
  }

  const autoSave = useCallback((id: number, newContent: string, label: string) => {
    if (saveTimer) clearTimeout(saveTimer)
    const t = setTimeout(async () => {
      setSaving(true)
      await apiClient.updateNote(id, newContent, label)
      setSaving(false)
    }, 800)
    setSaveTimer(t)
  }, [saveTimer])

  const handleContentChange = (val: string) => {
    setContent(val)
    if (selectedId) autoSave(selectedId, val, weekLabel)
  }

  const handleLabelSave = async () => {
    if (!selectedId) return
    setEditingLabel(false)
    await apiClient.updateNote(selectedId, content, weekLabel)
    setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, week_label: weekLabel } : n))
  }

  const handleExtract = async () => {
    if (!selectedId) return
    setExtracting(true)
    setExtractResult(null)
    try {
      const result = await apiClient.extract(selectedId)
      setExtractResult(result)
      setSelectedTasks(new Set(result.tasks.map((_, i) => i)))
      setSelectedMilestones(new Set(result.milestones.map((_, i) => i)))
      setSelectedUpdates(new Set((result.updates ?? []).map((_, i) => i)))
    } catch (e) {
      alert(`Extract failed: ${e}`)
    } finally {
      setExtracting(false)
    }
  }

  const handleCreateSelected = async () => {
    if (!extractResult || !selectedId) return
    setCreating(true)
    const created: Task[] = []
    for (const i of Array.from(selectedTasks)) {
      const t = extractResult.tasks[i]
      const task = await apiClient.createTask({
        title: t.title,
        module: t.module as Task['module'],
        status: t.status as Task['status'],
        quarter: t.quarter as Task['quarter'],
        year: t.year,
        assignee: t.assignee,
        deadline: t.deadline,
        description: t.description,
        meeting_note_id: selectedId,
      })
      created.push(task)
    }
    for (const i of Array.from(selectedMilestones)) {
      const m = extractResult.milestones[i]
      const now = new Date()
      const month = now.getMonth() + 1
      const q = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4'
      const task = await apiClient.createTask({
        title: m.title,
        module: 'Milestone',
        status: 'pending',
        quarter: q as Task['quarter'],
        year: 2026,
        deadline: m.deadline,
        description: m.description,
        meeting_note_id: selectedId,
      })
      created.push(task)
    }
    // Apply selected status updates
    for (const i of Array.from(selectedUpdates)) {
      const u = extractResult.updates[i]
      await apiClient.updateTaskStatus(u.task_id, u.suggested_status)
      onTaskUpdated(u.task_id, u.suggested_status as Task['status'])
    }

    onTasksCreated(created)
    setNoteTasks(prev => [...prev, ...created])
    setCreating(false)
    setExtractResult(null)
  }

  const handleTaskSave = async (data: TaskCreate) => {
    if (!editingTask) return
    const updated = await apiClient.updateTask(editingTask.id, data)
    setNoteTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t))
    onTaskUpdated(editingTask.id, updated.status)
    setEditingTask(null)
  }

  const handleTaskDelete = async (id: number) => {
    await apiClient.deleteTask(id)
    setNoteTasks(prev => prev.filter(t => t.id !== id))
    setEditingTask(null)
  }

  return (
    <div className="mn-wrapper">
      {/* Sidebar */}
      <div className="mn-sidebar">
        <div className="mn-sidebar-header">
          <span className="mn-sidebar-title">Meeting Notes</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost mn-new-btn" onClick={handleNewNote} title="Blank note">+ New</button>
            <button className="btn btn-primary mn-new-btn" onClick={handlePrepare} title="Prepare from last note + current tasks">📋 Prepare</button>
          </div>
        </div>
        <div className="mn-list">
          {notes.length === 0 && <div className="mn-empty">No notes yet</div>}
          {notes.map(note => (
            <div
              key={note.id}
              className={`mn-list-item${note.id === selectedId ? ' active' : ''}`}
              onClick={() => selectNote(note)}
            >
              <div className="mn-list-label">{note.week_label}</div>
              <div className="mn-list-preview">{note.content.slice(0, 60) || 'Empty note'}</div>
              <button className="mn-delete-btn" onClick={e => { e.stopPropagation(); handleDelete(note.id) }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      {selectedId ? (
        <div className="mn-editor">
          <div className="mn-editor-header">
            {editingLabel ? (
              <input
                className="mn-label-input"
                value={weekLabel}
                onChange={e => setWeekLabel(e.target.value)}
                onBlur={handleLabelSave}
                onKeyDown={e => e.key === 'Enter' && handleLabelSave()}
                autoFocus
              />
            ) : (
              <h2 className="mn-editor-title" onClick={() => setEditingLabel(true)} title="Click to rename">
                {weekLabel}
                <span className="mn-edit-icon">✎</span>
              </h2>
            )}
            <div className="mn-editor-actions">
              {saving && <span className="mn-saving">Saving…</span>}
              <button className="btn btn-primary mn-extract-btn" onClick={handleExtract} disabled={extracting || !content.trim()}>
                {extracting ? 'Analyzing…' : '✨ Extract with AI'}
              </button>
            </div>
          </div>

          <div className="mn-editor-body">
            <div className="mn-editor-main">
              <textarea
                className="mn-textarea"
                placeholder="Write your meeting notes here…&#10;&#10;Example:&#10;- Discussed deploying RAG pipeline by end of Q3&#10;- Kim will handle MCP auth integration by June 30&#10;- Need to set up staging infra before release v1.2"
                value={content}
                onChange={e => handleContentChange(e.target.value)}
              />

              {/* Extract result panel */}
              {extractResult && (
                <div className="mn-result-panel">
                  <div className="mn-result-header">
                    <span className="mn-result-title">✨ AI Suggestions</span>
                    <span className="mn-result-count">
                      {extractResult.tasks.length} new · {extractResult.milestones.length} milestones · {(extractResult.updates ?? []).length} updates
                    </span>
                  </div>

                  {extractResult.tasks.length > 0 && (
                    <div className="mn-result-section">
                      <div className="mn-result-section-title">Tasks</div>
                      {extractResult.tasks.map((t, i) => (
                        <label key={i} className="mn-result-item">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(i)}
                            onChange={e => {
                              const s = new Set(selectedTasks)
                              e.target.checked ? s.add(i) : s.delete(i)
                              setSelectedTasks(s)
                            }}
                          />
                          <div className="mn-result-item-body">
                            <div className="mn-result-item-title">{t.title}</div>
                            <div className="mn-result-item-meta">
                              <span className={`module-badge ${t.module}`}>{t.module}</span>
                              <span className="mn-meta-tag">{t.quarter}</span>
                              {t.assignee && <span className="mn-meta-tag">👤 {t.assignee}</span>}
                              {t.deadline && <span className="mn-meta-tag">📅 {t.deadline}</span>}
                            </div>
                            {t.description && <div className="mn-result-item-desc">{t.description}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {extractResult.milestones.length > 0 && (
                    <div className="mn-result-section">
                      <div className="mn-result-section-title">Milestones</div>
                      {extractResult.milestones.map((m, i) => (
                        <label key={i} className="mn-result-item">
                          <input
                            type="checkbox"
                            checked={selectedMilestones.has(i)}
                            onChange={e => {
                              const s = new Set(selectedMilestones)
                              e.target.checked ? s.add(i) : s.delete(i)
                              setSelectedMilestones(s)
                            }}
                          />
                          <div className="mn-result-item-body">
                            <div className="mn-result-item-title">◆ {m.title}</div>
                            <div className="mn-result-item-meta">
                              {m.deadline && <span className="mn-meta-tag">📅 {m.deadline}</span>}
                            </div>
                            {m.description && <div className="mn-result-item-desc">{m.description}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Status Updates section */}
                  {(extractResult.updates ?? []).length > 0 && (
                    <div className="mn-result-section mn-updates-section">
                      <div className="mn-result-section-title">🔄 Suggested Status Updates</div>
                      {(extractResult.updates ?? []).map((u, i) => (
                        <label key={i} className="mn-result-item mn-update-item">
                          <input
                            type="checkbox"
                            checked={selectedUpdates.has(i)}
                            onChange={e => {
                              const s = new Set(selectedUpdates)
                              e.target.checked ? s.add(i) : s.delete(i)
                              setSelectedUpdates(s)
                            }}
                          />
                          <div className="mn-result-item-body">
                            <div className="mn-result-item-title">{u.task_title}</div>
                            <div className="mn-update-status-row">
                              <span className={`mn-status-chip mn-status-${u.current_status}`}>{STATUS_ARROW[u.current_status]}</span>
                              <span className="mn-update-arrow">→</span>
                              <span className={`mn-status-chip mn-status-${u.suggested_status}`}>{STATUS_ARROW[u.suggested_status]}</span>
                            </div>
                            <div className="mn-result-item-desc">{u.reason}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {extractResult.tasks.length === 0 && extractResult.milestones.length === 0 && (extractResult.updates ?? []).length === 0 && (
                    <div className="mn-no-results">No suggestions found in this note.</div>
                  )}

                  {(extractResult.tasks.length > 0 || extractResult.milestones.length > 0 || (extractResult.updates ?? []).length > 0) && (
                    <div className="mn-result-footer">
                      <button className="btn btn-ghost" onClick={() => setExtractResult(null)}>Dismiss</button>
                      <button
                        className="btn btn-primary"
                        onClick={handleCreateSelected}
                        disabled={creating || (selectedTasks.size === 0 && selectedMilestones.size === 0 && selectedUpdates.size === 0)}
                      >
                        {creating ? 'Applying…' : `Apply (${selectedTasks.size + selectedMilestones.size + selectedUpdates.size})`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right panel: tasks created from this note */}
            <div className="mn-tasks-panel">
              <div className="mn-tasks-panel-header">
                <span className="mn-tasks-panel-title">Tasks from this note</span>
                <span className="mn-tasks-panel-count">{noteTasks.length}</span>
              </div>
              <div className="mn-tasks-panel-body">
                {loadingTasks ? (
                  <div className="mn-tasks-loading">Loading…</div>
                ) : noteTasks.length === 0 ? (
                  <div className="mn-tasks-empty">
                    <div className="mn-tasks-empty-icon">📋</div>
                    <div>No tasks yet</div>
                    <div className="mn-tasks-empty-hint">Use "Extract with AI" to create tasks from this note</div>
                  </div>
                ) : (
                  noteTasks.map(task => {
                    const overdue = task.status !== 'done' && task.deadline && new Date(task.deadline) < new Date()
                    return (
                      <div key={task.id} className={`mn-task-card${overdue ? ' mn-task-card-overdue' : ''}`} onClick={() => setEditingTask(task)} style={{ cursor: 'pointer' }}>
                        <div className="mn-task-card-top">
                          <span className={`module-badge ${task.module}`}>{task.module}</span>
                          <span
                            className="mn-task-status"
                            style={{ color: STATUS_COLOR[task.status] }}
                          >
                            {STATUS_LABEL[task.status]}
                          </span>
                        </div>
                        <div className="mn-task-card-title">{task.title}</div>
                        <div className="mn-task-card-footer">
                          {task.assignee && <span className="mn-task-assignee">👤 {task.assignee}</span>}
                          {task.deadline && (
                            <span className={`mn-task-deadline${overdue ? ' overdue' : ''}`}>
                              📅 {new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mn-empty-state">
          <div className="mn-empty-icon">📝</div>
          <div className="mn-empty-text">No note selected</div>
          <button className="btn btn-primary" onClick={handleNewNote}>Create first note</button>
        </div>
      )}

      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  )
}

export default MeetingNotesTab
