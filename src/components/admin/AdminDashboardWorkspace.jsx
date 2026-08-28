import { ChevronRight, ClipboardList, UsersRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import AdminMetricCard from './AdminMetricCard.jsx'
import PageHeader from '../common/PageHeader.jsx'
import SectionCard from '../common/SectionCard.jsx'
import {
  formatAdminDashboardMetricValue,
  getAdminDashboardActivityDescription,
  getAdminDashboardActivityOffice,
  getAdminDashboardActivityReference,
  getAdminDashboardActivityRecordedBy,
  getAdminDashboardActivityRoute,
  getAdminDashboardActivityTimeLabel,
  getAdminDashboardActivityTitle,
  getAdminDashboardRecentActivityItems,
} from '../../utils/adminDashboard.js'
import { buildSystemAccessSummary as buildAdminSystemAccessSummary } from '../../utils/adminUsersOffices.js'

function normalizeLookupKey(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function buildOfficeOverviewEntries(officeBreakdown = [], offices = []) {
  const officeDirectoryByName = new Map(
    (Array.isArray(offices) ? offices : [])
      .filter((office) => normalizeLookupKey(office?.name))
      .map((office) => [normalizeLookupKey(office.name), office]),
  )

  return (Array.isArray(officeBreakdown) ? officeBreakdown : []).map((officeEntry, index) => {
    const matchedOffice = officeDirectoryByName.get(normalizeLookupKey(officeEntry?.officeName))

    return {
      ...officeEntry,
      officeId: officeEntry?.officeId ?? matchedOffice?.id ?? null,
      officeCode: officeEntry?.officeCode ?? matchedOffice?.code ?? null,
      key:
        officeEntry?.officeId ??
        matchedOffice?.id ??
        officeEntry?.officeName ??
        officeEntry?.officeCode ??
        `office-overview-${index}`,
    }
  })
}

function ActivityReference({ activity }) {
  const reference = getAdminDashboardActivityReference(activity)
  const route = getAdminDashboardActivityRoute(activity)

  if (!reference) {
    return null
  }

  if (!route) {
    return <span className="audit-entry__reference">{reference}</span>
  }

  return (
    <Link to={route} className="audit-entry__reference">
      {reference}
    </Link>
  )
}

function ActivityList({ activities, available }) {
  const recentItems = getAdminDashboardRecentActivityItems(activities)

  if (!recentItems.length) {
    return (
      <p className="admin-dashboard-page__empty-copy">
        {available
          ? 'No recent activity is available right now.'
          : 'Recent activity will appear here when available.'}
      </p>
    )
  }

  return (
    <div className="admin-activity-list">
      {recentItems.map((activity) => {
        const reference = getAdminDashboardActivityReference(activity)
        const description = getAdminDashboardActivityDescription(activity)
        const recordedBy = getAdminDashboardActivityRecordedBy(activity)
        const officeName = getAdminDashboardActivityOffice(activity)

        return (
          <article key={activity.id} className="admin-activity-row">
            <div className="audit-entry-header">
              <div className="audit-entry__copy">
                <strong className="audit-row__title">
                  {getAdminDashboardActivityTitle(activity)}
                </strong>
                <p>
                  <ActivityReference activity={activity} />
                  <span>{reference ? ` ${description}` : description}</span>
                </p>
              </div>
              <div className="audit-entry__time">{getAdminDashboardActivityTimeLabel(activity)}</div>
            </div>

            <div className="audit-entry-meta">
              <div className="audit-meta-item">
                <span className="data-label">Recorded By</span>
                <span>{recordedBy}</span>
              </div>
              {officeName ? (
                <div className="audit-meta-item">
                  <span className="data-label">Office</span>
                  <span>{officeName}</span>
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function OfficeOverviewList({ officeEntries, available }) {
  if (!officeEntries.length) {
    return (
      <p className="admin-dashboard-page__empty-copy">
        {available
          ? 'No office breakdown is available right now.'
          : 'Office breakdown will appear here when available.'}
      </p>
    )
  }

  return (
    <div className="admin-office-list">
      {officeEntries.map((officeEntry) => (
        <div
          key={officeEntry.key}
          className="admin-office-row"
        >
          <div className="admin-office-row__identity">
            <strong>{officeEntry.officeName || 'Office not available'}</strong>
            {officeEntry.officeCode ? (
              <span className="muted-copy">{officeEntry.officeCode}</span>
            ) : null}
          </div>
          <div className="admin-office-row__metric">
            <span className="data-label">Active</span>
            <span>{formatAdminDashboardMetricValue(officeEntry.activeCorrespondence)}</span>
          </div>
          <div className="admin-office-row__metric">
            <span className="data-label">Overdue</span>
            <span>{formatAdminDashboardMetricValue(officeEntry.overdue)}</span>
          </div>
          <div className="admin-office-row__metric">
            <span className="data-label">Total</span>
            <span>{formatAdminDashboardMetricValue(officeEntry.totalCorrespondence)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function QuickAdministrationCard() {
  const navigate = useNavigate()

  return (
    <SectionCard
      className="admin-section-card"
      title="Quick Administration"
    >
      <div className="admin-quick-actions">
        <button
          type="button"
          className="admin-quick-action"
          onClick={() => navigate('/admin/users-offices')}
        >
          <span className="admin-quick-action__icon">
            <UsersRound size={17} />
          </span>
          <span className="admin-quick-action__copy">
            <strong>Manage Users &amp; Offices</strong>
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="admin-quick-action"
          onClick={() => navigate('/correspondence?status=overdue')}
        >
          <span className="admin-quick-action__icon">
            <ClipboardList size={17} />
          </span>
          <span className="admin-quick-action__copy">
            <strong>Review Overdue Correspondence</strong>
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </SectionCard>
  )
}

function SystemAccessSummary({ rows }) {
  return (
    <div className="admin-access-summary">
      {rows.map((row) => (
        <div key={row.label} className="admin-access-summary__row">
          <span>{row.label}</span>
          <strong>{formatAdminDashboardMetricValue(row.value)}</strong>
        </div>
      ))}
    </div>
  )
}

function AdminDashboardWorkspace({ summary, users = [], offices = [] }) {
  const navigate = useNavigate()
  const systemAccessSummary = buildAdminSystemAccessSummary({
    users,
    offices,
    adminSummary: summary,
  })
  const officeOverviewEntries = buildOfficeOverviewEntries(summary?.officeBreakdown, offices)
  const activeUsersMetric =
    systemAccessSummary.find((row) => row.label === 'Active Users')?.value ??
    summary?.summary?.activeUsers
  const activeOfficesMetric =
    systemAccessSummary.find((row) => row.label === 'Active Offices')?.value ??
    summary?.summary?.activeOffices
  const metricCards = [
    {
      label: 'Active Correspondence',
      value: formatAdminDashboardMetricValue(summary?.summary?.activeCorrespondence),
      description: null,
      tone: 'default',
    },
    {
      label: 'Overdue',
      value: formatAdminDashboardMetricValue(summary?.summary?.overdue),
      description: null,
      tone: 'red',
    },
    {
      label: 'Active Users',
      value: formatAdminDashboardMetricValue(activeUsersMetric),
      description: null,
      tone: 'default',
    },
    {
      label: 'Active Offices',
      value: formatAdminDashboardMetricValue(activeOfficesMetric),
      description: null,
      tone: 'default',
    },
  ]

  return (
    <section className="admin-page admin-dashboard-page">
      <div className="admin-page-content">
        <PageHeader
          eyebrow="Administration"
          title="Administrator Dashboard"
          actions={
            <div className="admin-page-actions">
              <button
                type="button"
                className="button button--primary"
                onClick={() => navigate('/admin/users-offices')}
              >
                Manage Users &amp; Offices
              </button>
            </div>
          }
        />

        <section className="admin-metric-grid admin-dashboard-metrics">
          {metricCards.map((metric) => (
            <AdminMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              description={metric.description}
              tone={metric.tone}
            />
          ))}
        </section>

        <div className="admin-dashboard-grid">
          <div className="admin-dashboard-main">
            <SectionCard
              className="admin-section-card"
              title="Office Overview"
              action={
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => navigate('/admin/users-offices')}
                >
                  Manage Offices
                </button>
              }
            >
              <OfficeOverviewList
                officeEntries={officeOverviewEntries}
                available={Boolean(summary?.availability?.officeBreakdown)}
              />
            </SectionCard>

            <SectionCard
              className="admin-section-card"
              title="Recent System Activity"
            >
              <ActivityList
                activities={summary?.recentActivity ?? []}
                available={Boolean(summary?.availability?.recentActivity)}
              />
            </SectionCard>
          </div>

          <div className="admin-dashboard-side">
            <SectionCard
              className="admin-section-card"
              title="System Access Summary"
            >
              <SystemAccessSummary rows={systemAccessSummary} />
            </SectionCard>

            <QuickAdministrationCard />
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminDashboardWorkspace
