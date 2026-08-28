import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import ApiAnalyticsWorkspace from '../../components/reports/ApiAnalyticsWorkspace'
import FormalReportHistoryWorkspace from '../../components/reports/formal/FormalReportHistoryWorkspace'
import FormalReportsWorkspace from '../../components/reports/formal/FormalReportsWorkspace'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { getServiceBundle } from '../../services/serviceProvider.js'
import { getOfficeDisplayName } from '../../utils/offices.js'
import {
  resolveAnalyticsOfficeContext,
  resolveAnalyticsSummaryDateRange,
} from '../../utils/analyticsReports.js'

const REPORT_SECTIONS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'formal', label: 'Formal Reports' },
  { id: 'history', label: 'Report History' },
]

const REPORT_TABS = [
  { id: 'office-summary', label: 'Office Summary' },
  { id: 'pending-ageing', label: 'Pending & Ageing' },
  { id: 'staff-contribution', label: 'Staff Contribution' },
]

const INITIAL_FILTERS = {
  period: 'This Month',
  startDate: '',
  endDate: '',
  documentType: 'All document types',
  priority: 'All priorities',
  stage: 'All stages',
  contributor: 'All staff contributors',
}

const INITIAL_ANALYTICS_STATE = Object.freeze({
  summary: { status: 'idle', data: null, error: '' },
  backlog: { status: 'idle', data: null, error: '' },
  staffContribution: { status: 'idle', data: null, error: '' },
  trends: { status: 'idle', data: null, error: '' },
})

function createAnalyticsSectionState(status = 'idle', data = null, error = '') {
  return { status, data, error }
}

function normalizeAnalyticsErrorMessage(error, fallbackMessage) {
  const status = Number(error?.status)

  if (status === 400) {
    return 'The selected date range could not be processed. Check the dates and try again.'
  }

  if (status === 403) {
    return 'Office analytics are not available for the authenticated office.'
  }

  if (status === 404) {
    return 'The requested analytics resource is currently unavailable.'
  }

  if (status >= 500) {
    return 'The reports service is temporarily unavailable. Try again.'
  }

  return error?.message ?? fallbackMessage
}

function OfficeReportsPage() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const reportsService = useMemo(() => getServiceBundle().reports, [])
  const officeService = useMemo(() => getServiceBundle().offices, [])
  const [workspace, setWorkspace] = useState(null)
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true)
  const [workspaceError, setWorkspaceError] = useState('')
  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS)
  const [analyticsFilterError, setAnalyticsFilterError] = useState('')
  const [apiAnalyticsState, setApiAnalyticsState] = useState(INITIAL_ANALYTICS_STATE)
  const [analyticsRetryToken, setAnalyticsRetryToken] = useState(0)

  const requestedSection = searchParams.get('section') ?? REPORT_SECTIONS[0].id
  const requestedTab = searchParams.get('tab') ?? REPORT_TABS[0].id
  const activeSection =
    REPORT_SECTIONS.find((section) => section.id === requestedSection)?.id ??
    REPORT_SECTIONS[0].id
  const activeTab =
    REPORT_TABS.find((tab) => tab.id === requestedTab)?.id ?? REPORT_TABS[0].id

  const analyticsOfficeContext = useMemo(
    () => resolveAnalyticsOfficeContext(currentUser, workspace),
    [currentUser, workspace],
  )

  const apiAnalyticsWorkspaceState = useMemo(() => {
    if (analyticsOfficeContext.officeId) {
      return apiAnalyticsState
    }

    const unavailableMessage =
      'The authenticated office is unavailable for analytics requests.'

    return {
      summary: createAnalyticsSectionState('error', null, unavailableMessage),
      backlog: createAnalyticsSectionState('error', null, unavailableMessage),
      staffContribution: createAnalyticsSectionState('error', null, unavailableMessage),
      trends: createAnalyticsSectionState('error', null, unavailableMessage),
    }
  }, [analyticsOfficeContext.officeId, apiAnalyticsState])

  useEffect(() => {
    let isActive = true

    async function loadWorkspace() {
      setIsLoadingWorkspace(true)
      setWorkspaceError('')

      try {
        const [workspaceResult, officeResult] = await Promise.allSettled([
          reportsService.getOfficeReportWorkspace(currentUser),
          officeService.resolveOfficeFromDirectory(currentUser?.office),
        ])

        if (workspaceResult.status !== 'fulfilled') {
          throw workspaceResult.reason
        }

        if (!isActive) {
          return
        }

        const nextWorkspace = workspaceResult.value
        const effectiveOffice =
          (officeResult.status === 'fulfilled' ? officeResult.value : null) ??
          nextWorkspace.office ??
          currentUser?.office ??
          null
        const normalizedWorkspace = {
          ...nextWorkspace,
          office: effectiveOffice,
          officeName: getOfficeDisplayName(effectiveOffice),
          officeCode: effectiveOffice?.code ?? '',
          configuration: {
            ...nextWorkspace.configuration,
            officeName: getOfficeDisplayName(effectiveOffice),
            officeCode: effectiveOffice?.code ?? '',
          },
        }

        setWorkspace(normalizedWorkspace)
        const nextPeriod = normalizedWorkspace.defaultPeriod || INITIAL_FILTERS.period
        setDraftFilters((current) => ({ ...current, period: nextPeriod }))
        setAppliedFilters((current) => ({ ...current, period: nextPeriod }))
      } catch (error) {
        if (!isActive) {
          return
        }

        setWorkspace(null)
        setWorkspaceError(error?.message ?? 'Unable to load the office reports workspace.')
      } finally {
        if (isActive) {
          setIsLoadingWorkspace(false)
        }
      }
    }

    void loadWorkspace()

    return () => {
      isActive = false
    }
  }, [currentUser, officeService, reportsService])

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(searchParams)
    let changed = false

    if (!REPORT_SECTIONS.some((section) => section.id === requestedSection)) {
      nextSearchParams.set('section', REPORT_SECTIONS[0].id)
      changed = true
    }

    if (!REPORT_TABS.some((tab) => tab.id === requestedTab)) {
      nextSearchParams.set('tab', REPORT_TABS[0].id)
      changed = true
    }

    if (changed) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [requestedSection, requestedTab, searchParams, setSearchParams])

  useEffect(() => {
    if (activeSection !== 'analytics' || !workspace || !analyticsOfficeContext.officeId) {
      return
    }

    const summaryRange = resolveAnalyticsSummaryDateRange(appliedFilters)

    if (!summaryRange.valid) {
      return
    }

    let isActive = true

    async function loadApiAnalytics() {
      if (!isActive) {
        return
      }

      setApiAnalyticsState({
        summary: createAnalyticsSectionState('loading'),
        backlog: createAnalyticsSectionState('loading'),
        staffContribution: createAnalyticsSectionState('loading'),
        trends: createAnalyticsSectionState('loading'),
      })

      const [summaryResult, backlogResult, staffContributionResult, trendsResult] =
        await Promise.allSettled([
          reportsService.getOfficeSummaryReport(
            analyticsOfficeContext.officeId,
            summaryRange.usesCustomRange
              ? { start: summaryRange.start, end: summaryRange.end }
              : {},
          ),
          reportsService.getOfficeBacklogReport(analyticsOfficeContext.officeId),
          reportsService.getOfficeStaffContributionReport(analyticsOfficeContext.officeId),
          reportsService.getOfficeTrendsReport(analyticsOfficeContext.officeId),
        ])

      if (!isActive) {
        return
      }

      setApiAnalyticsState({
        summary:
          summaryResult.status === 'fulfilled'
            ? createAnalyticsSectionState('success', summaryResult.value)
            : createAnalyticsSectionState(
                'error',
                null,
                normalizeAnalyticsErrorMessage(
                  summaryResult.reason,
                  'The office summary could not be loaded.',
                ),
              ),
        backlog:
          backlogResult.status === 'fulfilled'
            ? createAnalyticsSectionState('success', backlogResult.value)
            : createAnalyticsSectionState(
                'error',
                null,
                normalizeAnalyticsErrorMessage(
                  backlogResult.reason,
                  'The office backlog could not be loaded.',
                ),
              ),
        staffContribution:
          staffContributionResult.status === 'fulfilled'
            ? createAnalyticsSectionState('success', staffContributionResult.value)
            : createAnalyticsSectionState(
                'error',
                null,
                normalizeAnalyticsErrorMessage(
                  staffContributionResult.reason,
                  'Staff contribution activity could not be loaded.',
                ),
              ),
        trends:
          trendsResult.status === 'fulfilled'
            ? createAnalyticsSectionState('success', trendsResult.value)
            : createAnalyticsSectionState(
                'error',
                null,
                normalizeAnalyticsErrorMessage(
                  trendsResult.reason,
                  'Monthly correspondence trends could not be loaded.',
                ),
              ),
      })
    }

    void loadApiAnalytics()

    return () => {
      isActive = false
    }
  }, [
    activeSection,
    analyticsOfficeContext.officeId,
    analyticsRetryToken,
    appliedFilters,
    reportsService,
    workspace,
  ])

  const handleDraftFilterChange = (field, value) => {
    setAnalyticsFilterError('')
    setDraftFilters((current) => ({ ...current, [field]: value }))
  }

  const handleApplyFilters = () => {
    const range = resolveAnalyticsSummaryDateRange(draftFilters)

    if (!range.valid) {
      setAnalyticsFilterError(range.error)
      return
    }

    setAnalyticsFilterError('')
    setAppliedFilters(draftFilters)
  }

  const handleAnalyticsRetry = () => {
    setAnalyticsRetryToken((current) => current + 1)
  }

  const handleSectionChange = (sectionId) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('section', sectionId)
    nextSearchParams.set('tab', activeTab)
    setSearchParams(nextSearchParams, { replace: true })
  }

  const handleTabChange = (tabId) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', tabId)
    setSearchParams(nextSearchParams, { replace: true })
  }

  const reportsCurrentUser = useMemo(() => {
    if (!currentUser) {
      return currentUser
    }

    return {
      ...currentUser,
      office: workspace?.office ?? currentUser.office ?? null,
    }
  }, [currentUser, workspace?.office])

  if (isLoadingWorkspace) {
    return (
      <section className="reports-page">
        <div className="report-page-content">
          <PageHeader title="Office Reports" />
          <SectionCard
            title="Reports"
            className="report-section-card"
          >
            <EmptyState
              title="Loading reports"
              description="Please wait."
            />
          </SectionCard>
        </div>
      </section>
    )
  }

  if (workspaceError || !workspace) {
    return (
      <section className="reports-page">
        <div className="report-page-content">
          <PageHeader title="Office Reports" />
          <SectionCard
            title="Reports unavailable"
            className="report-section-card"
          >
            <EmptyState
              title="Reports unavailable"
              description={
                workspaceError ||
                'Reports are not currently available.'
              }
            />
          </SectionCard>
        </div>
      </section>
    )
  }

  const baseOfficeName = getOfficeDisplayName(
    currentUser?.office ?? workspace?.office ?? workspace?.analyticsData?.office,
  )

  return (
    <section className="reports-page">
      <div className="report-page-content">
        <div className="reports-page-header formal-report-no-print">
          <h1>{`${baseOfficeName} Reports`}</h1>

          <div
            className="reports-primary-tabs"
            role="tablist"
            aria-label="Reports sections"
          >
            {REPORT_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={activeSection === section.id}
                aria-controls={`reports-section-${section.id}`}
                id={`reports-section-tab-${section.id}`}
                className={
                  activeSection === section.id
                    ? 'tab-button tab-button--active reports-primary-tab'
                    : 'tab-button reports-primary-tab'
                }
                onClick={() => handleSectionChange(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {activeSection === 'analytics' ? (
          <ApiAnalyticsWorkspace
            officeName={baseOfficeName}
            filters={draftFilters}
            filterError={analyticsFilterError}
            onFilterChange={handleDraftFilterChange}
            onFilterSubmit={handleApplyFilters}
            activeTab={activeTab}
            tabs={REPORT_TABS}
            onTabChange={handleTabChange}
            summaryState={apiAnalyticsWorkspaceState.summary}
            backlogState={apiAnalyticsWorkspaceState.backlog}
            staffContributionState={apiAnalyticsWorkspaceState.staffContribution}
            trendsState={apiAnalyticsWorkspaceState.trends}
            onRetry={handleAnalyticsRetry}
          />
        ) : null}

        {activeSection === 'formal' ? (
          <div
            id="reports-section-formal"
            role="tabpanel"
            aria-labelledby="reports-section-tab-formal"
            className="report-tab-panel"
          >
            <FormalReportsWorkspace
              currentUser={reportsCurrentUser}
              workspace={workspace}
              reportsService={reportsService}
              showToast={showToast}
            />
          </div>
        ) : null}

        {activeSection === 'history' ? (
          <div
            id="reports-section-history"
            role="tabpanel"
            aria-labelledby="reports-section-tab-history"
            className="report-tab-panel"
          >
            <FormalReportHistoryWorkspace
              currentUser={reportsCurrentUser}
              effectiveOffice={workspace?.office ?? null}
              reportsService={reportsService}
              showToast={showToast}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default OfficeReportsPage
