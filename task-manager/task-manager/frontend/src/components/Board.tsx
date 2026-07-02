import React from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task } from '../types'
import TaskCard from './TaskCard'

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

const Board: React.FC<BoardProps> = ({ tasks, onStatusChange, onCardClick }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getColumnTasks = (status: ColumnKey) =>
    tasks.filter((t) => t.status === status)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as number
    const overId = over.id as string | number

    // Determine which column the card was dropped on
    // overId is either a task id (number) or column key (string)
    let targetStatus: ColumnKey | null = null

    if (typeof overId === 'string' && COLUMNS.some((c) => c.key === overId)) {
      targetStatus = overId as ColumnKey
    } else {
      // overId is a task id — find which column it's in
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) targetStatus = overTask.status as ColumnKey
    }

    if (!targetStatus) return

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return
    if (activeTask.status === targetStatus) return

    onStatusChange(activeId, targetStatus)
  }

  return (
    <div className="board-wrapper">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="board">
          {COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col.key)
            return (
              <DroppableColumn
                key={col.key}
                columnKey={col.key}
                label={col.label}
                tasks={colTasks}
                onCardClick={onCardClick}
              />
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}

interface DroppableColumnProps {
  columnKey: ColumnKey
  label: string
  tasks: Task[]
  onCardClick: (task: Task) => void
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
  columnKey,
  label,
  tasks,
  onCardClick,
}) => {
  return (
    <div className="column">
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
        <div className="column-body">
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
