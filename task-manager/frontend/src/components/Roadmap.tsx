import React, { useState, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core'
import { Task } from '../types'

interface RoadmapProps {
  tasks: Task[]
  onStatusCycle: (id: number, currentStatus: Task['status']) => void
  onCellChange: (id: number, fields: Partial<Pick<Task, 'module' | 'quarter' | 'month' | 'week'>>) => void
}

type ModuleKey = 'GreenRAG' | 'Doc-Intelli' | 'Infra' | 'Integration' | 'Milestone' | 'Release'
type Granularity = 'quarter' | 'month' | 'week'

const MODULES: ModuleKey[] = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const monthToQuarter = (m: number): Task['quarter'] =>
  (['Q1','Q1','Q1','Q2','Q2','Q2','Q3','Q3','Q3','Q4','Q4','Q4'] as const)[m - 1]

const quarterFirstMonth: Record<string, number> = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 }
const quarterMonthRange: Record<string, [number, number]> = { Q1: [1,3], Q2: [4,6], Q3: [7,9], Q4: [10,12] }

export const STATUS_CYCLE: Record<Task['status'], Task['status']> = {
  pending: 'progress', progress: 'done', done: 'pending',
}

const isOverdue = (t: Task) => t.status !== 'done' && !!t.deadline && new Date(t.deadline) < new Date()

const taskColumn = (task: Task, granularity: Granularity, viewMonth?: number): string | null => {
  if (granularity === 'quarter') return task.quarter
  if (granularity === 'month') return String(task.month ?? quarterFirstMonth[task.quarter])
  const m = task.month ?? quarterFirstMonth[task.quarter]
  if (m !== viewMonth) return null
  return String(task.week ?? 1)
}

const RoadmapBar: React.FC<{ task: Task; onStatusCycle: () => void }> = ({ task, onStatusCycle }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  const overdue = isOverdue(task)
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      className={`roadmap-bar ${task.module}${isDragging ? ' roadmap-bar-dragging' : ''}${overdue ? ' roadmap-bar-overdue' : ''}`}
      title={overdue ? `⚠ Overdue: ${task.title}` : task.title}
      onClick={(e) => { e.stopPropagation(); onStatusCycle() }}
    >
      <span className={`roadmap-bar-status ${task.status}`} />
      <span className="roadmap-bar-title">{task.title}</span>
      {overdue && <span className="roadmap-bar-overdue-icon">Late</span>}
    </div>
  )
}

const MilestoneMarker: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={`milestone-marker${isDragging ? ' roadmap-bar-dragging' : ''}`}
      title={task.title} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <span className="milestone-diamond">◆</span>
      <span className="milestone-label">{task.title}</span>
    </div>
  )
}

const ReleaseTag: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={`release-tag${isDragging ? ' roadmap-bar-dragging' : ''}`}
      title={task.title} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <span className="release-icon">🚀</span>
      <span className="release-label">{task.title}</span>
    </div>
  )
}

const RoadmapCell: React.FC<{
  cellId: string; module: ModuleKey; tasks: Task[]
  onStatusCycle: (id: number, s: Task['status']) => void; isToday?: boolean
}> = ({ cellId, module, tasks, onStatusCycle, isToday }) => {
  const { setNodeRef, isOver } = useDroppable({ id: cellId })
  const cls = ['roadmap-cell',
    module === 'Milestone' ? 'roadmap-cell-milestone' : '',
    module === 'Release' ? 'roadmap-cell-release' : '',
    isToday ? 'roadmap-cell-today' : '',
    isOver ? 'roadmap-cell-over' : '',
  ].filter(Boolean).join(' ')

  return (
    <td ref={setNodeRef} className={cls}>
      {tasks.length === 0 ? <div className="roadmap-empty-cell">—</div> :
        module === 'Milestone' ? (
          <div className="roadmap-bars">{tasks.map((t) => <MilestoneMarker key={t.id} task={t} onClick={() => onStatusCycle(t.id, t.status)} />)}</div>
        ) : module === 'Release' ? (
          <div className="roadmap-bars">{tasks.map((t) => <ReleaseTag key={t.id} task={t} onClick={() => onStatusCycle(t.id, t.status)} />)}</div>
        ) : (
          <div className="roadmap-bars">{tasks.map((t) => <RoadmapBar key={t.id} task={t} onStatusCycle={() => onStatusCycle(t.id, t.status)} />)}</div>
        )}
    </td>
  )
}

const OverlayBar: React.FC<{ task: Task }> = ({ task }) => {
  if (task.module === 'Milestone') return (
    <div className="milestone-marker roadmap-bar-overlay"><span className="milestone-diamond">◆</span><span className="milestone-label">{task.title}</span></div>
  )
  if (task.module === 'Release') return (
    <div className="release-tag roadmap-bar-overlay"><span className="release-icon">🚀</span><span className="release-label">{task.title}</span></div>
  )
  return (
    <div className={`roadmap-bar ${task.module} roadmap-bar-overlay`}>
      <span className={`roadmap-bar-status ${task.status}`} />
      <span className="roadmap-bar-title">{task.title}</span>
    </div>
  )
}

const Roadmap: React.FC<RoadmapProps> = ({ tasks, onStatusCycle, onCellChange }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [granularity, setGranularity] = useState<Granularity>('quarter')
  const [dragging, setDragging] = useState<Task | null>(null)
  const [exporting, setExporting] = useState(false)
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1)
  const tableRef = useRef<HTMLDivElement>(null)

  const handleExport = async (format: 'png' | 'pdf') => {
    if (!tableRef.current) return
    setExporting(true)
    try {
      const tableEl = tableRef.current.querySelector('table') ?? tableRef.current
      const scrollEl = tableRef.current
      const prevOverflow = scrollEl.style.overflow
      const prevWidth = scrollEl.style.width
      const prevHeight = scrollEl.style.height
      scrollEl.style.overflow = 'visible'
      scrollEl.style.width = tableEl.scrollWidth + 'px'
      scrollEl.style.height = tableEl.scrollHeight + 'px'
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(tableEl, { scale: 2, backgroundColor: '#ffffff', useCORS: true, scrollX: 0, scrollY: 0, width: tableEl.scrollWidth, height: tableEl.scrollHeight })
      scrollEl.style.overflow = prevOverflow
      scrollEl.style.width = prevWidth
      scrollEl.style.height = prevHeight
      if (format === 'png') {
        const link = document.createElement('a')
        link.download = `roadmap-${granularity}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } else {
        const { jsPDF } = await import('jspdf')
        const imgW = canvas.width / 2, imgH = canvas.height / 2
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [imgW, imgH] })
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH)
        pdf.save(`roadmap-${granularity}.pdf`)
      }
    } finally { setExporting(false) }
  }

  const columns = (() => {
    if (granularity === 'quarter') return QUARTERS.map((q) => ({ id: q, label: q }))
    if (granularity === 'month') return MONTH_NAMES.map((name, i) => ({ id: String(i + 1), label: name, group: monthToQuarter(i + 1) }))
    return [1,2,3,4].map((w) => ({ id: String(w), label: `Week ${w}` }))
  })()

  const today = new Date()
  const todayMonth = today.getMonth() + 1
  const todayColId = granularity === 'quarter'
    ? monthToQuarter(todayMonth)
    : granularity === 'month' ? String(todayMonth)
    : (viewMonth === todayMonth ? String(Math.ceil(today.getDate() / 7)) : null)

  const getTasksForCell = (module: ModuleKey, colId: string) =>
    tasks.filter((t) => t.module === module && taskColumn(t, granularity, viewMonth) === colId)

  const handleDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const { active, over } = e
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    const [newModule, colId] = (over.id as string).split('__') as [ModuleKey, string]
    if (granularity === 'quarter') {
      const newQ = colId as Task['quarter']
      if (newModule === task.module && newQ === task.quarter) return
      onCellChange(task.id, { module: newModule, quarter: newQ, month: undefined, week: undefined })
    } else if (granularity === 'month') {
      const newMonth = parseInt(colId)
      const newQ = monthToQuarter(newMonth)
      if (newModule === task.module && task.month === newMonth) return
      onCellChange(task.id, { module: newModule, quarter: newQ, month: newMonth, week: undefined })
    } else {
      const newWeek = parseInt(colId)
      const newQ = monthToQuarter(viewMonth)
      if (newModule === task.module && task.month === viewMonth && task.week === newWeek) return
      onCellChange(task.id, { module: newModule, quarter: newQ, month: viewMonth, week: newWeek })
    }
  }

  return (
    <div className="roadmap-wrapper">
      <div className="roadmap-toolbar">
        <div className="granularity-toggle">
          {(['quarter','month','week'] as Granularity[]).map((g) => (
            <button key={g} className={`gran-btn${granularity === g ? ' active' : ''}`} onClick={() => setGranularity(g)}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        {granularity === 'week' && (
          <div className="month-nav">
            <button className="month-nav-btn" onClick={() => setViewMonth((m) => Math.max(1, m - 1))} disabled={viewMonth === 1}>‹</button>
            <span className="month-nav-label">{MONTH_NAMES[viewMonth - 1]} 2026 · {monthToQuarter(viewMonth)}</span>
            <button className="month-nav-btn" onClick={() => setViewMonth((m) => Math.min(12, m + 1))} disabled={viewMonth === 12}>›</button>
          </div>
        )}
        <div className="export-btns" style={{ marginLeft: 'auto' }}>
          <button className="btn btn-ghost export-btn" onClick={() => handleExport('png')} disabled={exporting}>⬇ PNG</button>
          <button className="btn btn-ghost export-btn" onClick={() => handleExport('pdf')} disabled={exporting}>⬇ PDF</button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragging(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={handleDragEnd}>
        <div className="roadmap-scroll" ref={tableRef}>
          <table className="roadmap-table">
            <thead>
              {granularity === 'month' && (
                <tr>
                  <th />
                  {QUARTERS.map((q) => {
                    const [s, end] = quarterMonthRange[q]
                    return <th key={q} colSpan={end - s + 1} className="roadmap-quarter-group">{q}</th>
                  })}
                </tr>
              )}
              <tr>
                <th className="roadmap-th-module">Module</th>
                {columns.map((col) => (
                  <th key={col.id} className={col.id === todayColId ? 'roadmap-th-today' : ''}>
                    {col.label}
                    {col.id === todayColId && <span className="today-badge">Today</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((module) => (
                <tr key={module}>
                  <td className="roadmap-row-label">
                    <div className="roadmap-row-label-inner">
                      <span className={`roadmap-module-dot ${module}`} />
                      <span className="roadmap-module-name">{module}</span>
                    </div>
                  </td>
                  {columns.map((col) => (
                    <RoadmapCell key={col.id} cellId={`${module}__${col.id}`} module={module}
                      tasks={getTasksForCell(module, col.id)} onStatusCycle={onStatusCycle} isToday={col.id === todayColId} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DragOverlay>{dragging ? <OverlayBar task={dragging} /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}

export default Roadmap
