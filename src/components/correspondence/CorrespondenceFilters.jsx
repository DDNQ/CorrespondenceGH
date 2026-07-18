import { RotateCcw, Search } from 'lucide-react'

import FilterBar from '../common/FilterBar'

function CorrespondenceFilters({
  filters,
  documentTypeOptions,
  priorityOptions,
  dateGroupOptions,
  onChange,
  onReset,
}) {
  return (
    <FilterBar className="correspondence-filters">
      <label className="correspondence-search-field correspondence-filters__search" htmlFor="correspondence-search">
        <Search size={18} />
        <input
          id="correspondence-search"
          type="search"
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
          placeholder="Search by reference, subject, sender or stage..."
        />
      </label>

      <select
        value={filters.documentType}
        onChange={(event) => onChange('documentType', event.target.value)}
      >
        {documentTypeOptions.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>

      <select value={filters.priority} onChange={(event) => onChange('priority', event.target.value)}>
        {priorityOptions.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>

      <select value={filters.dateGroup} onChange={(event) => onChange('dateGroup', event.target.value)}>
        {dateGroupOptions.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>

      <button type="button" className="button button--secondary" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Reset</span>
      </button>
    </FilterBar>
  )
}

export default CorrespondenceFilters
