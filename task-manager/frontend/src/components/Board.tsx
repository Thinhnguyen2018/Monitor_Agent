import React, { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Task } from '../types'
import TaskCard from './TaskCard'
import TaskCardOverlay from './TaskCardOverlay'

interface BoardProps {
  tasks: Task[]
  onStatusChange: (id: number, status: Task['status']) => void
  onCardClick: (task: Task) => void
}

type ColumnKey = 'pending' | 'progress' | 'done'

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

type ColumnItems = Record<ColumnKey, Task[]>

const buildColumns = (tasks: Task[]): ColumnItems => ({
  pending: tasks.filter((t) => t.status === 'pending'),
  progress: tasks.filter((t) => t.status === 'progress'),
  done: tasks.filter((t) => t.status === 'done'),
})

const findContainer = (columns: ColumnItems, id: string | number): ColumnKey | null => {
  if (typeof id === 'string' && id in columns) return id as ColumnKey
  for (const col of COLUMNS) {
    if (columns[col.key].some((t) => t.id === id)) return col.key
  }
  return null
}

const Board: React.FC<BoardProps> = ({ tasks, onStatusChange, onCardClick }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )
  const [columns, setColumns] = useState<ColumnItems>(() => buildColumns(tasks))
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeOverColumn, setActiveOverColumn] = useState<ColumnKey | null>(null)
  const skipSync = useRef(false)

  // Sync when tasks prop changes (e.g. add/delete/edit from modal)
  // but skip right after a drag-drop to avoid reverting optimistic position
  useEffect(() => {
    if (skipSync.current) { skipSync.current = false; return }
    if (!activeTask) setColumns(buildColumns(tasks))
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as number
    for (const col of COLUMNS) {
      const found = columns[col.key].find((t) => t.id === id)
      if (found) { setActiveTask(found); break }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) { setActiveOverColumn(null); return }

    const activeId = active.id as number
    const overId = over.id as string | number

    const activeContainer = findContainer(columns, activeId)
    const overContainer = findContainer(columns, overId)

    if (!activeContainer || !overContainer) { setActiveOverColumn(null); return }

    setActiveOverColumn(overContainer)

    if (activeContainer === overContainer) return

    setColumns((prev) => {
      const activeItems = [...prev[activeContainer]]
      const overItems = [...prev[overContainer]]

      const activeIndex = activeItems.findIndex((t) => t.id === activeId)
      const overIndex = typeof overId === 'number'
        ? overItems.findIndex((t) => t.id === overId)
        : overItems.length

      const [moved] = activeItems.splice(activeIndex, 1)
      const insertAt = overIndex >= 0 ? overIndex : overItems.length
      overItems.splice(insertAt, 0, moved)

      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveOverColumn(null)

    if (over) {
      const activeId = active.id as number
      const overId = over.id as string | number

      const activeContainer = findContainer(columns, activeId)
      const overContainer = findContainer(columns, overId)

      if (activeContainer && overContainer) {
        if (activeContainer === overContainer) {
          // Reorder within same column
          setColumns((prev) => {
            const items = [...prev[activeContainer]]
            const from = items.findIndex((t) => t.id === activeId)
            const to = typeof overId === 'number'
              ? items.findIndex((t) => t.id === overId)
              : items.length - 1
            return { ...prev, [activeContainer]: arrayMove(items, from, to) }
          })
        } else {
          // Persist status change to API
          const originalStatus = activeTask?.status as ColumnKey | undefined
          if (originalStatus && originalStatus !== overContainer) {
            skipSync.current = true
            onStatusChange(activeId, overContainer)
          }
        }
      }
    }

    setActiveTask(null)
  }

  return (
    <div className="board-wrapper">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board">
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.key}
              columnKey={col.key}
              label={col.label}
              tasks={columns[col.key]}
              isOver={activeOverColumn === col.key}
              onCardClick={onCardClick}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface DroppableColumnProps {
  columnKey: ColumnKey
  label: string
  tasks: Task[]
  isOver: boolean
  onCardClick: (task: Task) => void
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
  columnKey,
  label,
  tasks,
  isOver,
  onCardClick,
}) => {
  const { setNodeRef } = useDroppable({ id: columnKey })

  return (
    <div className={`column${isOver ? ' column-over' : ''}`}>
      <div className="column-header">
        <span className={`column-dot ${columnKey}`} />
        <span className="column-title">{label}</span>
        <span className="column-count">{tasks.length}</span>
      </div>
      <SortableContext
        id={columnKey}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-body" ref={setNodeRef}>
          {tasks.length === 0 && (
            <div className="column-empty">Drop tasks here</div>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onCardClick} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export default Board
