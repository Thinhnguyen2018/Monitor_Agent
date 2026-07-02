import React from 'react'
import { Task } from '../types'

interface RoadmapProps {
  tasks: Task[]
  onStatusCycle: (id: number, currentStatus: Task['status']) => void
}

type ModuleKey = 'GreenRAG' | 'Doc-Intelli' | 'Infra' | 'Integration'
const MODULES: ModuleKey[] = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration']
const QUARTERS: Task['quarter'][] = ['Q1', 'Q2', 'Q3', 'Q4']

const STATUS_CYCLE: Record<Task['status'], Task['status']> = {
  pending: 'progress',
  progress: 'done',
  done: 'pending',
}

const Roadmap: React.FC<RoadmapProps> = ({ tasks, onStatusCycle }) => {
  const getCell = (module: ModuleKey, quarter: Task['quarter']) =>
    tasks.filter((t) => t.module === module && t.quarter === quarter)

  return (
    <div className="roadmap-wrapper">
      <table className="roadmap-table">
        <thead>
          <tr>
            <th>Module</th>
            {QUARTERS.map((q) => (
              <th key={q}>{q} 2026</th>
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
              {QUARTERS.map((q) => {
                const cellTasks = getCell(module, q)
                return (
                  <td key={q} className="roadmap-cell">
                    {cellTasks.length === 0 ? (
                      <div className="roadmap-empty-cell">—</div>
                    ) : (
                      <div className="roadmap-bars">
                        {cellTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`roadmap-bar ${task.module}`}
                            title={`${task.title} — click to cycle status`}
                            onClick={() => onStatusCycle(task.id, task.status)}
                          >
                            <span className={`roadmap-bar-status ${task.status}`} />
                            <span className="roadmap-bar-title">{task.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { STATUS_CYCLE }
export default Roadmap
