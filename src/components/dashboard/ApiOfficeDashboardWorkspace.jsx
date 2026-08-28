import {
  Building2,
  ChartNoAxesColumn,
  FilePlus2,
  FileText,
  Timer,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import EmptyState from '../common/EmptyState.jsx'
import PageHeader from '../common/PageHeader.jsx'
import SectionCard from '../common/SectionCard.jsx'
import StatCard from '../common/StatCard.jsx'
import QuickActionCard from './QuickActionCard.jsx'
import { ApiError } from '../../services/api/errors.js'
import { getServiceBundle } from '../../services/serviceProvider.js'
import { formatOfficeDashboardDate, getOfficeDashboardRecentRecordRoute } from '../../utils/dashboard.js'
import { getOfficeDisplayName } from '../../utils/offices.js'

function getDashboardLoadErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return null
    }

    if (error.status === 404) {
      return 'The office dashboard summary is not available for this account.'
    }

    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }

    if (error.code === 'NETWORK_ERROR') {
      return 'Unable to reach the dashboard service. Please check your connection and try again.'
    }

    if (error.code === 'REQUEST_TIMEOUT') {
      return 'The dashboard service took too long to respond. Please try again.'
    }

    if (error.status && error.status >= 500) {
      return 'The office dashboard is currently unavailable. Please try again later.'
    }
  }

  return 'The office dashboard could not be loaded right now. Please try again.'
}

function DashboardSummaryList({ title, items, emptyLabel }) {
  return (
    <section className="dashboard-breakdown" aria-label={title}>
      <p className="dashboard-breakdown__heading">{title}</p>
      {items.length ? (
        <div className="dashboard-breakdown__list">
          {items.map((item) => (
            <div key={`${title}-${item.label}`} className="dashboard-breakdown__row">
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="dashboard-breakdown__empty">{emptyLabel}</p>
      )}
    </section>
  )
}

function RecentCorrespondenceList({ records }) {
  if (!records.length) {
    return (
      <div className="attention-empty-state">
        <h3>No recent correspondence.</h3>
        <p>No recent correspondence is available for this office.</p>
      </div>
    )
  }

  return (
    <div className="attention-list">
      {records.map((record) => (
        <Link
          key={record.id}
          to={getOfficeDashboardRecentRecordRoute(record)}
          className="attention-item"
        >
          <div className="attention-item__primary">
            <p className="attention-item__reference">{record.referenceNumber}</p>
            <h3>{record.subject || 'Subject not available'}</h3>
            <p className="attention-item__meta">
              {record.type || 'Correspondence'} | {record.sender || 'Sender not available'}
            </p>
          </div>

          <div className="attention-item__stage">
            <p className="attention-item__label">Type</p>
            <p>{record.type || 'Not available'}</p>
          </div>

          <div className="attention-item__status">
            <p className="attention-item__label">Status</p>
            <p className="dashboard-recent__status-value">{record.status || 'Not available'}</p>
          </div>

          <div className="attention-item__time-block">
            <p className="attention-item__label">Date</p>
            <p className="attention-item__time">{formatOfficeDashboardDate(record.dashboardDate)}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

function ApiDashboardLoadingState({ heading }) {
  return (
    <section className="dashboard-page">
      <PageHeader title={heading} />

      <SectionCard title="Loading dashboard" className="dashboard-panel">
        <EmptyState
          title="Loading dashboard"
          description="Please wait while the office summary is being retrieved."
          compact
        />
      </SectionCard>
    </section>
  )
}

function ApiDashboardErrorState({ heading, message, onRetry }) {
  return (
    <section className="dashboard-page">
      <PageHeader title={heading} />

      <SectionCard title="Dashboard unavailable" className="dashboard-panel">
        <EmptyState
          title="Unable to load dashboard"
          description={message}
          action={
            <button type="button" className="button button--secondary" onClick={onRetry}>
              Retry
            </button>
          }
        />
      </SectionCard>
    </section>
  )
}

function ApiOfficeDashboardWorkspace({ currentUser }) {
  const dashboardService = useMemo(() => getServiceBundle().dashboards, [])
  const [retryCount, setRetryCount] = useState(0)
  const [summaryState, setSummaryState] = useState({
    status: 'loading',
    summary: null,
    error: null,
  })

  const fallbackOfficeName = getOfficeDisplayName(currentUser?.office)

  useEffect(() => {
    let isActive = true
    const abortController = new AbortController()

    async function loadDashboard() {
      setSummaryState({
        status: 'loading',
        summary: null,
        error: null,
      })

      try {
        const summary = await dashboardService.getOfficeDashboardSummary({
          signal: abortController.signal,
        })

        if (!isActive) {
          return
        }

        setSummaryState({
          status: 'success',
          summary,
          error: null,
        })
      } catch (error) {
        if (!isActive || error?.name === 'AbortError') {
          return
        }

        setSummaryState({
          status: 'error',
          summary: null,
          error,
        })
      }
    }

    void loadDashboard()

    return () => {
      isActive = false
      abortController.abort()
    }
  }, [dashboardService, retryCount])

  if (summaryState.status === 'loading') {
    return <ApiDashboardLoadingState heading={`${fallbackOfficeName} Dashboard`} />
  }

  if (summaryState.error?.status === 403) {
    return <Navigate to="/access-denied" replace />
  }

  if (summaryState.status === 'error') {
    return (
      <ApiDashboardErrorState
        heading={`${fallbackOfficeName} Dashboard`}
        message={getDashboardLoadErrorMessage(summaryState.error)}
        onRetry={() => setRetryCount((current) => current + 1)}
      />
    )
  }

  const summary = summaryState.summary
  const officeName = getOfficeDisplayName(summary?.office) || fallbackOfficeName
  const stats = [
    {
      title: 'Active',
      value: summary.activeCount,
      description: null,
      tone: 'default',
    },
    {
      title: 'Overdue',
      value: summary.overdueCount,
      description: 'Past office deadline',
      tone: 'danger',
    },
    {
      title: 'Completed',
      value: summary.completedCount,
      description: null,
      tone: 'default',
    },
    {
      title: 'Average Time in Office',
      value: summary.averageTimeInOfficeLabel,
      description: null,
      tone: 'default',
    },
  ]
  const quickActions = [
    {
      title: 'Register New Correspondence',
      description: 'Create a new record for office-owned correspondence.',
      to: '/correspondence/new',
      icon: FilePlus2,
    },
    {
      title: 'View All Correspondence',
      description: 'Open the office correspondence register.',
      to: '/correspondence',
      icon: FileText,
    },
  ]

  return (
    <section className="dashboard-page">
      <PageHeader
        title={`${officeName} Dashboard`}
        actions={
          <Link
            to="/correspondence/new"
            className="button button--primary dashboard-header__action"
          >
            <FilePlus2 size={18} aria-hidden="true" />
            <span>Register New Correspondence</span>
          </Link>
        }
      />

      <section className="dashboard-stats" aria-label="Office correspondence summary">
      {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            tone={stat.tone}
            className={
              stat.title === 'Average Time in Office'
                ? 'stat-card--duration stat-card--average-time'
                : ''
            }
            valueClassName={
              stat.title === 'Average Time in Office'
                ? 'stat-card__value--duration'
                : ''
            }
          />
        ))}
      </section>

      <div className="dashboard-grid">
        <SectionCard
          title="Recent Correspondence"
          action={
            <Link to="/correspondence" className="dashboard-panel__link">
              View all
            </Link>
          }
          className="dashboard-panel dashboard-panel--attention"
        >
          <RecentCorrespondenceList records={summary.recentRecords} />
        </SectionCard>

        <aside className="dashboard-sidebar">
          <SectionCard
            title="Quick Actions"
            className="dashboard-panel"
          >
            <div className="quick-actions-list">
              {quickActions.map((action) => (
                <QuickActionCard
                  key={action.title}
                  title={action.title}
                  description={action.description}
                  to={action.to}
                  icon={action.icon}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Office Position"
            className="dashboard-panel"
          >
            <div className="office-position-summary">
              <div className="office-position-summary__item">
                <span className="office-position-summary__icon">
                  <Building2 size={16} aria-hidden="true" />
                </span>
                <div>
                  <strong>{officeName}</strong>
                  <p>{summary.activeCount} active correspondence records.</p>
                </div>
              </div>
              <div className="office-position-summary__item">
                <span className="office-position-summary__icon office-position-summary__icon--amber">
                  <Timer size={16} aria-hidden="true" />
                </span>
                <div className="office-position-summary__copy">
                  <strong className="office-position-summary__value office-position-summary__value--duration">
                    Average time in office: {summary.averageTimeInOfficeLabel}
                  </strong>
                  <p>Based on the current office summary.</p>
                </div>
              </div>
            </div>

            <div className="dashboard-breakdown-stack">
              <DashboardSummaryList
                title="Status Breakdown"
                items={summary.statusBreakdown}
                emptyLabel="No status breakdown available."
              />
              <DashboardSummaryList
                title="Type Breakdown"
                items={summary.typeBreakdown}
                emptyLabel="No type breakdown available."
              />
            </div>

            <div className="dashboard-office-summary__footnote">
              <ChartNoAxesColumn size={15} aria-hidden="true" />
              <span>Breakdowns reflect the current office summary.</span>
            </div>
          </SectionCard>
        </aside>
      </div>
    </section>
  )
}

export default ApiOfficeDashboardWorkspace
