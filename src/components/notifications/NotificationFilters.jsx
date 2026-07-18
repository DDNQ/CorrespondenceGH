import { RotateCcw } from 'lucide-react'

import FilterBar from '../common/FilterBar'

function NotificationFilters({ filters, onChange, onReset }) {
  return (
    <FilterBar className="notifications-filter-bar">
      <input
        type="search"
        value={filters.search}
        onChange={(event) => onChange('search', event.target.value)}
        placeholder="Search notifications or correspondence references..."
        aria-label="Search notifications"
        className="notifications-filter-bar__search"
      />
      <select
        value={filters.type}
        onChange={(event) => onChange('type', event.target.value)}
        aria-label="Filter by notification type"
      >
        <option value="All types">All types</option>
        <option value="New">New</option>
        <option value="Due Soon">Due Soon</option>
        <option value="Overdue">Overdue</option>
        <option value="Forwarded">Forwarded</option>
        <option value="Completed">Completed</option>
      </select>
      <select
        value={filters.readStatus}
        onChange={(event) => onChange('readStatus', event.target.value)}
        aria-label="Filter by read status"
      >
        <option value="All notifications">All notifications</option>
        <option value="Unread">Unread</option>
        <option value="Read">Read</option>
      </select>
      <button type="button" className="button button--secondary" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Reset</span>
      </button>
    </FilterBar>
  )
}

export default NotificationFilters
