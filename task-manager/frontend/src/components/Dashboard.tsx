import React from 'react'
import { Task } from '../types'

interface Props {
  tasks: Task[]
}

const MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration'] as const
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
const MODULE_COLORS: Record<string, string> = {
  GreenRAG: '#16a34a',
  'Doc-Intelli': '#3B82F6',
  Infra: '#F59E0B',
  Integration: '#10B981',
}

const isOverdue = (t: Task) =>
  t.deadline && t.status !== 'done' && new Date(t.deadline) < new Date()

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
  <div className="db-progress-track">
    <div className="db-progress-fill" style={{ width: `${value}%`, background: color }} />
  </div>
)

const Dashboard: React.FC<Props> = ({ tasks }) => {
  // Exclude Milestone & Release from task stats
  const coreTasks = tasks.filter(t => t.module !== 'Milestone' && t.module !== 'Release')
  const milestones = tasks.filter(t => t.module === 'Milestone')
  const releases = tasks.filter(t => t.module === 'Release')

  const total = coreTasks.length
  const done = coreTasks.filter(t => t.status === 'done').length
  const inProgress = coreTasks.filter(t => t.status === 'progress').length
  const pending = coreTasks.filter(t => t.status === 'pending').length
  const overdue = coreTasks.filter(isOverdue).length
  const completionPct = total ? Math.round((done / total) * 100) : 0

  // Upcoming deadlines (next 30 days, not done)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86400000)
  const upcoming = coreTasks
    .filter(t => t.deadline && t.status !== 'done' && new Date(t.deadline) >= now && new Date(t.deadline) <= in30)
    .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1))
    .slice(0, 6)

  // Upcoming milestones & releases
  const upcomingML = [...milestones, ...releases]
    .filter(t => t.deadline && new Date(t.deadline) >= now)
    .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1))
    .slice(0, 5)

  return (
    <div className="db-wrapper">

      {/* ── Stat cards ── */}
      <div className="db-stats">
        <div className="db-stat-card">
          <div className="db-stat-value">{total}</div>
          <div className="db-stat-label">Total tasks</div>
          <div className="db-stat-sub">
            <span className="db-ring" style={{ '--pct': completionPct, '--color': '#16a34a' } as React.CSSProperties}>
              <svg viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#16a34a" strokeWidth="3"
                  strokeDasharray={`${completionPct * 0.942} 94.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)" />
              </svg>
              <span>{completionPct}%</span>
            </span>
          </div>
        </div>

        {[
          { label: 'Done', value: done, color: '#16a34a', bg: '#dcfce7' },
          { label: 'In Progress', value: inProgress, color: '#F59E0B', bg: '#fef3c7' },
          { label: 'Pending', value: pending, color: '#9CA3AF', bg: '#f3f4f6' },
          { label: 'Overdue', value: overdue, color: '#dc2626', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} className="db-stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="db-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="db-stat-label">{s.label}</div>
            {total > 0 && (
              <div className="db-stat-pct" style={{ color: s.color }}>
                {Math.round((s.value / total) * 100)}% of total
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="db-body">
        {/* ── Left column ── */}
        <div className="db-col">

          {/* Module breakdown */}
          <div className="db-card">
            <div className="db-card-title">Progress by module</div>
            <div className="db-module-list">
              {MODULES.map(mod => {
                const modTasks = coreTasks.filter(t => t.module === mod)
                const modDone = modTasks.filter(t => t.status === 'done').length
                const modPct = modTasks.length ? Math.round((modDone / modTasks.length) * 100) : 0
                const color = MODULE_COLORS[mod]
                return (
                  <div key={mod} className="db-module-row">
                    <div className="db-module-info">
                      <span className="db-module-dot" style={{ background: color }} />
                      <span className="db-module-name">{mod}</span>
                      <span className="db-module-count">{modDone}/{modTasks.length}</span>
                      <span className="db-module-pct" style={{ color }}>{modPct}%</span>
                    </div>
                    <ProgressBar value={modPct} color={color} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quarter breakdown */}
          <div className="db-card">
            <div className="db-card-title">Tasks by quarter</div>
            <div className="db-quarter-grid">
              {QUARTERS.map(q => {
                const qTasks = coreTasks.filter(t => t.quarter === q)
                const qDone = qTasks.filter(t => t.status === 'done').length
                const qProg = qTasks.filter(t => t.status === 'progress').length
                const qPend = qTasks.filter(t => t.status === 'pending').length
                return (
                  <div key={q} className="db-quarter-card">
                    <div className="db-quarter-label">{q}</div>
                    <div className="db-quarter-total">{qTasks.length} tasks</div>
                    <div className="db-quarter-stack">
                      {qDone > 0 && <div style={{ flex: qDone, background: '#16a34a' }} title={`Done: ${qDone}`} />}
                      {qProg > 0 && <div style={{ flex: qProg, background: '#F59E0B' }} title={`In progress: ${qProg}`} />}
                      {qPend > 0 && <div style={{ flex: qPend, background: '#e5e7eb' }} title={`Pending: ${qPend}`} />}
                    </div>
                    <div className="db-quarter-legend">
                      {qDone > 0 && <span style={{ color: '#16a34a' }}>✓ {qDone}</span>}
                      {qProg > 0 && <span style={{ color: '#F59E0B' }}>● {qProg}</span>}
                      {qPend > 0 && <span style={{ color: '#9CA3AF' }}>○ {qPend}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="db-col">

          {/* Upcoming deadlines */}
          <div className="db-card">
            <div className="db-card-title">Due in next 30 days
              <span className="db-card-badge">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="db-empty">No deadlines in the next 30 days.</div>
            ) : (
              <div className="db-deadline-list">
                {upcoming.map(t => {
                  const daysLeft = Math.ceil((new Date(t.deadline!).getTime() - now.getTime()) / 86400000)
                  const urgent = daysLeft <= 7
                  return (
                    <div key={t.id} className="db-deadline-row">
                      <span className="db-deadline-dot" style={{ background: MODULE_COLORS[t.module] ?? '#9CA3AF' }} />
                      <span className="db-deadline-title">{t.title}</span>
                      <span className="db-deadline-module" style={{ color: MODULE_COLORS[t.module] ?? '#9CA3AF' }}>{t.module}</span>
                      <span className={`db-deadline-days${urgent ? ' db-urgent' : ''}`}>
                        {daysLeft}d
                      </span>
                      <span className="db-deadline-date">{formatDate(t.deadline!)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Upcoming milestones & releases */}
          <div className="db-card">
            <div className="db-card-title">Upcoming milestones & releases
              <span className="db-card-badge">{upcomingML.length}</span>
            </div>
            {upcomingML.length === 0 ? (
              <div className="db-empty">No upcoming milestones or releases.</div>
            ) : (
              <div className="db-deadline-list">
                {upcomingML.map(t => (
                  <div key={t.id} className="db-deadline-row">
                    <span>{t.module === 'Milestone' ? '◆' : '🚀'}</span>
                    <span className="db-deadline-title">{t.title}</span>
                    <span className={`db-ml-badge ${t.module === 'Milestone' ? 'db-ml-milestone' : 'db-ml-release'}`}>
                      {t.module}
                    </span>
                    <span className="db-deadline-date">{t.deadline ? formatDate(t.deadline) : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
