import { useMemo, useState } from 'react'

import AdminMetricCard from '../../components/admin/AdminMetricCard'
import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import { getAuditLogs } from '../../data/auditLogs'
import { offices } from '../../data/offices'

const CORRESPONDENCE_AUDIT_TYPES = new Set([
  'Registered',
  'Forwarded',
  'Stage Updated',
  'Completed',
  'Receipt Acknowledged',
  'Attachment Added',
  'Correspondence Updated',
])

function getAuditDescription(entry) {
  if (!CORRESPONDENCE_AUDIT_TYPES.has(entry.type)) {
    return entry.description
  }

  const normalizedDescription = entry.description
    .replace('â€”', '—')
    .trim()

  if (!normalizedDescription.startsWith(entry.reference)) {
    return normalizedDescription
  }

  return normalizedDescription.slice(entry.reference.length).trimStart()
}

function AuditLogPage() {
  const auditLogs = getAuditLogs()
  const [filters, setFilters] = useState({
    search: '',
    actionType: 'All action types',
    office: 'All offices',
    date: 'Any date',
  })

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((entry) => {
      const haystack = [entry.title, entry.description, entry.reference, entry.user, entry.office]
        .join(' ')
        .toLowerCase()
      const matchesSearch =
        !filters.search.trim() || haystack.includes(filters.search.trim().toLowerCase())
      const matchesAction =
        filters.actionType === 'All action types' || entry.type === filters.actionType
      const matchesOffice = filters.office === 'All offices' || entry.office === filters.office
      const matchesDate = filters.date === 'Any date' || entry.dateGroup === filters.date

      return matchesSearch && matchesAction && matchesOffice && matchesDate
    })
  }, [auditLogs, filters])

  return (
    <section className="admin-page">
      <div className="admin-page-content">
        <PageHeader
          eyebrow="Administration"
          title="System Audit Log"
          description="Review accountable actions performed across the correspondence system."
          actions={
            <div className="admin-page-actions">
              <button type="button" className="button button--secondary">Export Audit Log</button>
            </div>
          }
        />

        <section className="admin-metric-grid admin-users-metrics">
          <AdminMetricCard label="Actions Today" value={126} description="Across all authorised offices" />
          <AdminMetricCard label="Correspondence Updates" value={84} description="Stage, status and routing changes" />
          <AdminMetricCard label="Security Actions" value={7} description="Account and access changes" tone="blue" />
          <AdminMetricCard label="Active Offices" value={8} description="Generating audit records" />
        </section>

        <SectionCard className="admin-section-card" title="Audit Activity" description="Every entry identifies the action, office, user account, role, and time.">
          <div className="filter-bar admin-audit-filter-grid">
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search by user, office, reference or action"
            />
            <select value={filters.actionType} onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value }))}>
              <option>All action types</option>
              <option>Registered</option>
              <option>Forwarded</option>
              <option>Stage Updated</option>
              <option>Completed</option>
              <option>Security</option>
            </select>
            <select value={filters.office} onChange={(event) => setFilters((current) => ({ ...current, office: event.target.value }))}>
              <option>All offices</option>
              {offices.map((office) => (
                <option key={office.id}>{office.name}</option>
              ))}
              <option>ICT Directorate</option>
            </select>
            <select value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}>
              <option>Any date</option>
              <option>Today</option>
              <option>Yesterday</option>
            </select>
            <button type="button" className="button button--secondary" onClick={() => setFilters({ search: '', actionType: 'All action types', office: 'All offices', date: 'Any date' })}>
              Reset
            </button>
          </div>

          <div className="admin-audit-list">
            {filteredLogs.map((entry) => (
              <article key={entry.id} className="audit-entry">
                <div className="audit-entry-header">
                  <div className="audit-entry__copy">
                    <strong className="audit-row__title">{entry.title}</strong>
                    <p>
                      <span className="audit-entry__reference">{entry.reference}</span>
                      <span>{getAuditDescription(entry)}</span>
                    </p>
                  </div>
                  <div className="audit-entry__time">{entry.time}</div>
                </div>

                <div className="audit-entry-meta">
                  <div className="audit-meta-item">
                    <span className="data-label">Recorded By</span>
                    <span>{entry.user}</span>
                  </div>
                  <div className="audit-meta-item">
                    <span className="data-label">Role</span>
                    <span>{entry.role}</span>
                  </div>
                  <div className="audit-meta-item">
                    <span className="data-label">Office Represented</span>
                    <span>{entry.office}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </section>
  )
}

export default AuditLogPage
