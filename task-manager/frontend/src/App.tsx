import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth, RedirectToSignIn } from '@clerk/react'
import { Task, TaskCreate } from './types'
import { getTasks, createTask, updateTask, deleteTask, seedTasks, setTokenProvider } from './api'
import FilterBar from './components/FilterBar'
import Board from './components/Board'
import Roadmap, { STATUS_CYCLE } from './components/Roadmap'
import TaskModal from './components/TaskModal'
import MilestonesTab from './components/MilestonesTab'
import Dashboard from './components/Dashboard'
import MeetingNotesTab from './components/MeetingNotesTab'
import UserMenu from './components/UserMenu'

type Tab = 'board' | 'roadmap' | 'milestones' | 'dashboard' | 'meeting'

// ── Main app shell ────────────────────────────────────────────

const AppShell: React.FC<{ authDisabled: boolean }> = ({ authDisabled }) => {
  const [tab, setTab] = useState<Tab>('board')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getTasks()
      setTasks(data)
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const filteredTasks = useMemo(() =>
    tasks.filter((t) => {
      if (t.module === 'Milestone' || t.module === 'Release') return false
      if (moduleFilter && t.module !== moduleFilter) return false
      if (statusFilter && t.status !== statusFilter) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }), [tasks, moduleFilter, statusFilter, search])

  const roadmapTasks = useMemo(() =>
    tasks.filter((t) => {
      if (t.module === 'Milestone' || t.module === 'Release') return true
      if (moduleFilter && t.module !== moduleFilter) return false
      if (statusFilter && t.status !== statusFilter) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }), [tasks, moduleFilter, statusFilter, search])

  const handleStatusChange = useCallback(async (id: number, status: Task['status']) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    try { await updateTask(id, { status }) } catch { fetchTasks() }
  }, [fetchTasks])

  const handleStatusCycle = useCallback((id: number, currentStatus: Task['status']) => {
    handleStatusChange(id, STATUS_CYCLE[currentStatus])
  }, [handleStatusChange])

  const handleCellChange = useCallback(async (id: number, fields: Partial<Pick<Task, 'module' | 'quarter' | 'month' | 'week'>>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)))
    try { await updateTask(id, fields) } catch { fetchTasks() }
  }, [fetchTasks])

  const handleCardClick = useCallback((task: Task) => {
    setEditingTask(task)
    setModalOpen(true)
  }, [])

  const handleNewTask = () => { setEditingTask(null); setModalOpen(true) }
  const handleModalClose = () => { setModalOpen(false); setEditingTask(null) }

  const handleModalSave = async (data: TaskCreate) => {
    if (editingTask) {
      const updated = await updateTask(editingTask.id, data)
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)))
    } else {
      const created = await createTask(data)
      setTasks((prev) => [...prev, created])
    }
    handleModalClose()
  }

  const handleDelete = async (id: number) => {
    await deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    handleModalClose()
  }

  const handleSeed = async () => {
    try { await seedTasks(); fetchTasks() } catch (e) { alert(String(e)) }
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
    { id: 'board',      icon: '▦',  label: 'Board' },
    { id: 'roadmap',    icon: '↗',  label: 'Roadmap' },
    { id: 'milestones', icon: '⚑',  label: 'Milestones' },
    { id: 'dashboard',  icon: '◈',  label: 'Dashboard' },
    { id: 'meeting',    icon: '✎',  label: 'Meeting Notes' },
  ]

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && <div className="sidebar-logo">Task<span>Flow</span></div>}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`sidebar-nav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="sidebar-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!authDisabled && !sidebarCollapsed && <UserMenu />}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="main-content">
        {tab !== 'milestones' && tab !== 'dashboard' && tab !== 'meeting' && (
          <FilterBar
            search={search} onSearch={setSearch}
            moduleFilter={moduleFilter} onModuleFilter={setModuleFilter}
            statusFilter={statusFilter} onStatusFilter={setStatusFilter}
            totalCount={tasks.length} filteredCount={filteredTasks.length}
            onNewTask={handleNewTask}
          />
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading tasks…</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#f87171' }}>
            <p>Could not connect to backend.</p>
            <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-dim)' }}>{error}</p>
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={handleSeed}>Seed sample data</button>
          </div>
        ) : tab === 'meeting' ? (
          <MeetingNotesTab
            tasks={tasks}
            onTasksCreated={(newTasks) => setTasks(prev => [...prev, ...newTasks])}
            onTaskUpdated={(id, status) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))}
          />
        ) : tab === 'dashboard' ? (
          <Dashboard tasks={tasks} />
        ) : tab === 'milestones' ? (
          <MilestonesTab tasks={tasks} onTasksChange={setTasks} />
        ) : tab === 'board' ? (
          <Board tasks={filteredTasks} onStatusChange={handleStatusChange} onCardClick={handleCardClick} />
        ) : (
          <Roadmap tasks={roadmapTasks} onStatusCycle={handleStatusCycle} onCellChange={handleCellChange} />
        )}
      </div>

      {modalOpen && (
        <TaskModal
          task={editingTask}
          onClose={handleModalClose}
          onSave={handleModalSave}
          onDelete={editingTask ? handleDelete : undefined}
        />
      )}
    </div>
  )
}

// ── Clerk-aware root (rendered inside ClerkProvider) ─────────

const ClerkApp: React.FC = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    setTokenProvider(async () => {
      try { return await getToken() } catch { return null }
    })
  }, [getToken])

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  if (!isSignedIn) return <RedirectToSignIn />

  return <AppShell authDisabled={false} />
}

// ── Root export ───────────────────────────────────────────────

interface AppProps { authDisabled?: boolean }

const App: React.FC<AppProps> = ({ authDisabled = false }) => {
  if (authDisabled) return <AppShell authDisabled />
  return <ClerkApp />
}

export default App
