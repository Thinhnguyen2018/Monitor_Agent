import React from 'react'

interface FilterBarProps {
  search: string
  onSearch: (v: string) => void
  moduleFilter: string
  onModuleFilter: (v: string) => void
  statusFilter: string
  onStatusFilter: (v: string) => void
  totalCount: number
  filteredCount: number
  onNewTask: () => void
}

const MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration']
const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const FilterBar: React.FC<FilterBarProps> = ({
  search, onSearch, moduleFilter, onModuleFilter,
  statusFilter, onStatusFilter, totalCount, filteredCount, onNewTask,
}) => (
  <div className="filter-bar">
    <input
      className="filter-search"
      placeholder="Search tasks…"
      value={search}
      onChange={(e) => onSearch(e.target.value)}
    />
    <select className="filter-select" value={moduleFilter} onChange={(e) => onModuleFilter(e.target.value)}>
      <option value="">All modules</option>
      {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
    <select className="filter-select" value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
      <option value="">All statuses</option>
      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
    <span className="filter-count">
      {filteredCount === totalCount ? `${totalCount} tasks` : `${filteredCount} / ${totalCount}`}
    </span>
    <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={onNewTask}>
      + New task
    </button>
  </div>
)

export default FilterBar
