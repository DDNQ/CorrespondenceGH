import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import EmptyState from '../common/EmptyState.jsx'
import PageHeader from '../common/PageHeader.jsx'
import SectionCard from '../common/SectionCard.jsx'
import AdminDashboardWorkspace from './AdminDashboardWorkspace.jsx'
import { ApiError } from '../../services/api/errors.js'
import { getServiceBundle } from '../../services/serviceProvider.js'

function getAdminDashboardLoadErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return null
    }

    if (error.status === 404) {
      return 'The administrator dashboard summary is not available for this account.'
    }

    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }

    if (error.code === 'NETWORK_ERROR') {
      return 'Unable to reach the administrator dashboard service. Please check your connection and try again.'
    }

    if (error.code === 'REQUEST_TIMEOUT') {
      return 'The administrator dashboard service took too long to respond. Please try again.'
    }

    if (error.code === 'API_CONTRACT_MISMATCH') {
      return 'The administrator dashboard response could not be understood. Please try again later.'
    }

    if (error.status && error.status >= 500) {
      return 'The administrator dashboard is currently unavailable. Please try again later.'
    }
  }

  return 'The administrator dashboard could not be loaded right now. Please try again.'
}

function ApiAdminDashboardLoadingState() {
  return (
    <section className="admin-page admin-dashboard-page">
      <div className="admin-page-content">
        <PageHeader
          eyebrow="Administration"
          title="Administrator Dashboard"
        />

        <SectionCard className="admin-section-card" title="Loading dashboard">
          <EmptyState
            title="Loading administrator dashboard"
            description="Please wait."
            compact
          />
        </SectionCard>
      </div>
    </section>
  )
}

function ApiAdminDashboardErrorState({ message, onRetry }) {
  return (
    <section className="admin-page admin-dashboard-page">
      <div className="admin-page-content">
        <PageHeader
          eyebrow="Administration"
          title="Administrator Dashboard"
        />

        <SectionCard className="admin-section-card" title="Dashboard unavailable">
          <EmptyState
            title="Unable to load administrator dashboard"
            description={message}
            action={
              <button type="button" className="button button--secondary" onClick={onRetry}>
                Retry
              </button>
            }
          />
        </SectionCard>
      </div>
    </section>
  )
}

function ApiAdminDashboardWorkspace() {
  const serviceBundle = useMemo(() => getServiceBundle(), [])
  const dashboardService = serviceBundle.dashboards
  const userAdminService = serviceBundle.users
  const officeService = serviceBundle.offices
  const [retryCount, setRetryCount] = useState(0)
  const [summaryState, setSummaryState] = useState({
    status: 'loading',
    summary: null,
    users: [],
    offices: [],
    error: null,
  })

  useEffect(() => {
    let isActive = true
    const abortController = new AbortController()

    async function loadDashboard() {
      setSummaryState({
        status: 'loading',
        summary: null,
        users: [],
        offices: [],
        error: null,
      })

      try {
        const [summary, usersResult, officesResult] = await Promise.all([
          dashboardService.getAdminDashboardSummary({
            signal: abortController.signal,
          }),
          userAdminService?.listUsers
            ? userAdminService.listUsers({
                signal: abortController.signal,
              }).catch(() => [])
            : Promise.resolve([]),
          officeService?.listOffices
            ? officeService.listOffices({
                signal: abortController.signal,
              }).catch(() => [])
            : Promise.resolve([]),
        ])

        if (!isActive) {
          return
        }

        setSummaryState({
          status: 'success',
          summary,
          users: usersResult,
          offices: officesResult,
          error: null,
        })
      } catch (error) {
        if (!isActive || error?.name === 'AbortError') {
          return
        }

        setSummaryState({
          status: 'error',
          summary: null,
          users: [],
          offices: [],
          error,
        })
      }
    }

    void loadDashboard()

    return () => {
      isActive = false
      abortController.abort()
    }
  }, [dashboardService, officeService, retryCount, userAdminService])

  if (summaryState.status === 'loading') {
    return <ApiAdminDashboardLoadingState />
  }

  if (summaryState.error?.status === 403) {
    return <Navigate to="/access-denied" replace />
  }

  if (summaryState.status === 'error') {
    return (
      <ApiAdminDashboardErrorState
        message={getAdminDashboardLoadErrorMessage(summaryState.error)}
        onRetry={() => setRetryCount((current) => current + 1)}
      />
    )
  }

  return (
    <AdminDashboardWorkspace
      summary={summaryState.summary}
      users={summaryState.users}
      offices={summaryState.offices}
    />
  )
}

export default ApiAdminDashboardWorkspace
