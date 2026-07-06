import React from 'react'
import { Task } from '../types'

interface DashboardProps {
  tasks: Task[]
}

const MODULE_COLORS: Record<string, string> = {
  GreenRAG: '#16a34a',
  'Doc-Intelli': '#2563eb',
  Infra: '#d97706',
  Integration: '#7c3aed',
}

const QUARTER_COLORS: Record<string, string> = {
  Q1: '#16a34a',
  Q2: '#2563eb',
  Q3: '#d97706',
  Q4: '#7c3aed',
}

const isOverdue = (t: Task) => !!t.deadline && t.status !== 'done' && new Date(t.deadline) < new Date()

const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  const workTasks = tasks.filter((t) => t.module !== 'Milestone' && t.module !== 'Release')
  const total = workTasks.length
  const done = workTasks.filter((t) => t.status === 'done').length
  const inProgress = workTasks.filter((t) => t.status === 'progress').length
  const pending = workTasks.filter((t) => t.status === 'pending').length
  const overdue = workTasks.filter(isOverdue).length
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0

  const r = 36
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (completionPct / 100) * circumference

  const byModule = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration'].map((mod) => {
    const modTasks = workTasks.filter((t) => t.module === mod)
    const modDone = modTasks.filter((t) => t.status === 'done').length
    return { mod, total: modTasks.length, done: modDone, pct: modTasks.length > 0 ? Math.round((modDone / modTasks.length) * 100) : 0 }
  }).filter((m) => m.total > 0)

  const byQuarter = ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
    const qTasks = workTasks.filter((t) => t.quarter === q)
    return {
      q,
      total: qTasks.length,
      done: qTasks.filter((t) => t.status === 'done').length,
      progress: qTasks.filter((t) => t.status === 'progress').length,
      pending: qTasks.filter((t) => t.status === 'pending').length,
    }
  }).filter((q) => q.total > 0)

  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const dueSoon = workTasks
    .filter((t) => t.deadline && t.status !== 'done' && new Date(t.deadline) <= in30 && new Date(t.deadline) >= now)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))

  const milestones = tasks.filter((t) => t.module === 'Milestone' || t.module === 'Release')
    .filter((t) => t.deadline && new Date(t.deadline) >= now)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    .slice(0, 5)

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="db-wrapper">
      {/* Stat cards */}
      <div className="db-stats">
        <div className="db-stat-card db-stat-total">
          <div className="db-stat-donut">
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="44" cy="44" r={r} fill="none" stroke="#16a34a" strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" transform="rotate(-90 44 44)" />
            </svg>
            <div className="db-stat-donut-label">{completionPct}%</div>
          </div>
          <div className="db-stat-info">
            <div className="db-stat-value">{total}</div>
            <div className="db-stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-value" style={{ color: '#16a34a' }}>{done}</div>
          <div className="db-stat-label">Done</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-value" style={{ color: '#2563eb' }}>{inProgress}</div>
          <div className="db-stat-label">In Progress</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-value" style={{ color: '#d97706' }}>{pending}</div>
          <div className="db-stat-label">Pending</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-value" style={{ color: '#dc2626' }}>{overdue}</div>
          <div className="db-stat-label">Overdue</div>
        </div>
      </div>

      <div className="db-grid">
        {/* Progress by module */}
        <div className="db-card">
          <div className="db-card-title">Progress by Module</div>
          {byModule.length === 0 && <div className="db-empty">No data</div>}
          <div className="db-module-list">
            {byModule.map(({ mod, total: t, done: d, pct }) => (
              <div key={mod} className="db-module-row">
                <div className="db-module-header">
                  <span className="db-module-name" style={{ color: MODULE_COLORS[mod] }}>{mod}</span>
                  <span className="db-module-stat">{d}/{t} · {pct}%</span>
                </div>
                <div className="db-progress-track">
                  <div className="db-progress-bar" style={{ width: `${pct}%`, background: MODULE_COLORS[mod] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by quarter */}
        <div className="db-card">
          <div className="db-card-title">Tasks by Quarter</div>
          {byQuarter.length === 0 && <div className="db-empty">No data</div>}
          <div className="db-quarter-list">
            {byQuarter.map(({ q, total: t, done: d, progress: p, pending: pend }) => (
              <div key={q} className="db-quarter-row">
                <div className="db-quarter-label">
                  <span style={{ color: QUARTER_COLORS[q], fontWeight: 700 }}>{q}</span>
                  <span className="db-module-stat">{t} tasks</span>
                </div>
                <div className="db-stacked-bar">
                  {d > 0 && <div style={{ width: `${(d / t) * 100}%`, background: '#16a34a' }} title={`Done: ${d}`} />}
                  {p > 0 && <div style={{ width: `${(p / t) * 100}%`, background: '#2563eb' }} title={`In Progress: ${p}`} />}
                  {pend > 0 && <div style={{ width: `${(pend / t) * 100}%`, background: '#d97706' }} title={`Pending: ${pend}`} />}
                </div>
              </div>
            ))}
          </div>
          <div className="db-legend">
            <span className="db-legend-dot" style={{ background: '#16a34a' }} />Done
            <span className="db-legend-dot" style={{ background: '#2563eb' }} />In Progress
            <span className="db-legend-dot" style={{ background: '#d97706' }} />Pending
          </div>
        </div>

        {/* Due in next 30 days */}
        <div className="db-card">
          <div className="db-card-title">Due in Next 30 Days</div>
          {dueSoon.length === 0 && <div className="db-empty">Nothing due soon.</div>}
          <div className="db-due-list">
            {dueSoon.map((t) => {
              const days = daysUntil(t.deadline!)
              const urgent = days <= 7
              return (
                <div key={t.id} className="db-due-item">
                  <div className="db-due-title">{t.title}</div>
                  <div className="db-due-meta">
                    <span className={`module-badge ${t.module}`} style={{ fontSize: 10 }}>{t.module}</span>
                    <span style={{ color: urgent ? '#dc2626' : 'var(--text-muted)', fontSize: 12, fontWeight: urgent ? 700 : 400 }}>
                      {fmt(t.deadline!)} · {days}d
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming milestones & releases */}
        <div className="db-card">
          <div className="db-card-title">Upcoming Milestones &amp; Releases</div>
          {milestones.length === 0 && <div className="db-empty">No upcoming milestones.</div>}
          <div className="db-due-list">
            {milestones.map((t) => (
              <div key={t.id} className="db-due-item">
                <div className="db-due-title">
                  {t.module === 'Milestone' ? <span className="milestone-diamond" style={{ marginRight: 4 }}>◆</span> : <span style={{ marginRight: 4 }}>🚀</span>}
                  {t.title}
                </div>
                <div className="db-due-meta">
                  <span className="task-quarter-badge">{t.quarter}</span>
                  {t.deadline && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(t.deadline)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
