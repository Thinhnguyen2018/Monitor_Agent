import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Task, TaskCreate } from './types'
import { getTasks, createTask, updateTask, deleteTask, seedTasks } from './api'
import FilterBar from './components/FilterBar'
import Board from './components/Board'
import Roadmap, { STATUS_CYCLE } from './components/Roadmap'
import TaskModal from './components/TaskModal'

type Tab = 'board' | 'roadmap'

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('board')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modal state
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

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (moduleFilter && t.module !== moduleFilter) return false
      if (statusFilter && t.status !== statusFilter) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tasks, moduleFilter, statusFilter, search])

  const handleStatusChange = useCallback(
    async (id: number, status: Task['status']) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      )
      try {
        await updateTask(id, { status })
      } catch {
        fetchTasks() // revert on error
      }
    },
    [fetchTasks]
  )

  const handleStatusCycle = useCallback(
    (id: number, currentStatus: Task['status']) => {
      const next = STATUS_CYCLE[currentStatus]
      handleStatusChange(id, next)
    },
    [handleStatusChange]
  )

  const handleCardClick = useCallback((task: Task) => {
    setEditingTask(task)
    setModalOpen(true)
  }, [])

  const handleNewTask = () => {
    setEditingTask(null)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingTask(null)
  }

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
    try {
      await seedTasks()
      fetchTasks()
    } catch (e) {
      alert(String(e))
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          Green<span>Node</span> Tasks
        </div>
        <nav className="header-tabs">
          <button
            className={`tab-btn${tab === 'board' ? ' active' : ''}`}
            onClick={() => setTab('board')}
          >
            Board
          </button>
          <button
            className={`tab-btn${tab === 'roadmap' ? ' active' : ''}`}
            onClick={() => setTab('roadmap')}
          >
            Roadmap
          </button>
        </nav>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={handleSeed} title="Insert sample data">
            Seed data
          </button>
          <button className="btn btn-primary" onClick={handleNewTask}>
            + New task
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        moduleFilter={moduleFilter}
        onModuleFilter={setModuleFilter}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        totalCount={tasks.length}
        filteredCount={filteredTasks.length}
      />

      {/* Main content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading tasks…
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#f87171' }}>
          <p>Could not connect to backend.</p>
          <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-dim)' }}>{error}</p>
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={handleSeed}>
            Seed sample data
          </button>
        </div>
      ) : tab === 'board' ? (
        <Board
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onCardClick={handleCardClick}
        />
      ) : (
        <Roadmap tasks={filteredTasks} onStatusCycle={handleStatusCycle} />
      )}

      {/* Modal */}
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

export default App
