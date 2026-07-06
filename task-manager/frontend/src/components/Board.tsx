import React, { useState, useEffect, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Task } from '../types'
import TaskCard from './TaskCard'
import TaskCardOverlay from './TaskCardOverlay'

interface BoardProps {
  tasks: Task[]
  onStatusChange: (id: number, status: Task['status']) => void
  onCardClick: (task: Task) => void
}

type ColumnItems = { pending: Task[]; progress: Task[]; done: Task[] }

const COLUMNS: { key: Task['status']; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

const Column: React.FC<{
  status: Task['status']
  label: string
  tasks: Task[]
  isOver: boolean
  onCardClick: (task: Task) => void
}> = ({ status, label, tasks, isOver, onCardClick }) => {
  const { setNodeRef } = useDroppable({ id: status })
  return (
    <div ref={setNodeRef} className={`column${isOver ? ' column-over' : ''}`}>
      <div className="column-header">
        <span className="column-title">{label}</span>
        <span className="column-count">{tasks.length}</span>
      </div>
      <div className="column-body">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onCardClick} />
          ))}
        </SortableContext>
        {tasks.length === 0 && <div className="column-empty">Drop tasks here</div>}
      </div>
    </div>
  )
}

const Board: React.FC<BoardProps> = ({ tasks, onStatusChange, onCardClick }) => {
  const [columns, setColumns] = useState<ColumnItems>({ pending: [], progress: [], done: [] })
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeOverColumn, setActiveOverColumn] = useState<Task['status'] | null>(null)
  const skipSync = useRef(false)

  useEffect(() => {
    if (skipSync.current) { skipSync.current = false; return }
    setColumns({
      pending: tasks.filter((t) => t.status === 'pending'),
      progress: tasks.filter((t) => t.status === 'progress'),
      done: tasks.filter((t) => t.status === 'done'),
    })
  }, [tasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const getColumn = (id: string | number): Task['status'] | null => {
    if (id === 'pending' || id === 'progress' || id === 'done') return id as Task['status']
    const task = tasks.find((t) => t.id === id)
    return task?.status ?? null
  }

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null)
  }

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    const fromCol = getColumn(active.id)
    const toCol = getColumn(over.id)
    if (!fromCol || !toCol) return
    setActiveOverColumn(toCol)
    if (fromCol === toCol) return

    setColumns((prev) => {
      const task = prev[fromCol].find((t) => t.id === active.id)
      if (!task) return prev
      return {
        ...prev,
        [fromCol]: prev[fromCol].filter((t) => t.id !== active.id),
        [toCol]: [...prev[toCol], task],
      }
    })
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    setActiveTask(null)
    setActiveOverColumn(null)
    if (!over) return

    const fromCol = getColumn(active.id)
    const toCol = getColumn(over.id)
    if (!fromCol || !toCol) return

    if (fromCol === toCol) {
      setColumns((prev) => {
        const items = prev[fromCol]
        const oldIdx = items.findIndex((t) => t.id === active.id)
        const newIdx = items.findIndex((t) => t.id === over.id)
        if (oldIdx === newIdx) return prev
        return { ...prev, [fromCol]: arrayMove(items, oldIdx, newIdx) }
      })
      return
    }

    const originalStatus = tasks.find((t) => t.id === active.id)?.status
    if (originalStatus !== toCol) {
      skipSync.current = true
      onStatusChange(active.id as number, toCol)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="board">
        {COLUMNS.map(({ key, label }) => (
          <Column
            key={key}
            status={key}
            label={label}
            tasks={columns[key]}
            isOver={activeOverColumn === key}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

export default Board
