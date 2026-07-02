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
}

const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearch,
  moduleFilter,
  onModuleFilter,
  statusFilter,
  onStatusFilter,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="filter-bar">
      <input
        type="search"
        className="filter-search"
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <select
        className="filter-select"
        value={moduleFilter}
        onChange={(e) => onModuleFilter(e.target.value)}
      >
        <option value="">All modules</option>
        <option value="GreenRAG">GreenRAG</option>
        <option value="Doc-Intelli">Doc-Intelli</option>
        <option value="Infra">Infra</option>
        <option value="Integration">Integration</option>
      </select>
      <select
        className="filter-select"
        value={statusFilter}
        onChange={(e) => onStatusFilter(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="progress">In progress</option>
        <option value="done">Done</option>
      </select>
      <span className="filter-count">
        {filteredCount === totalCount
          ? `${totalCount} tasks`
          : `${filteredCount} of ${totalCount} tasks`}
      </span>
    </div>
  )
}

export default FilterBar
