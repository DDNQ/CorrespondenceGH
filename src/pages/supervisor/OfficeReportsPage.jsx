import { FileSpreadsheet, FileText, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import ReportFilters from '../../components/reports/ReportFilters'
import ReportMetricCard from '../../components/reports/ReportMetricCard'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { getOfficeReportData } from '../../data/reports'
import {
  calculateAcknowledgementRate,
  calculateAverageAcknowledgementTime,
  calculateAverageTurnaroundTime,
  calculateOverdueRate,
  calculateProcessingRate,
  calculateWorkEngagementRate,
} from '../../utils/reportCalculations'

const REPORT_TABS = [
  { id: 'office-summary', label: 'Office Summary' },
  { id: 'processing-performance', label: 'Processing Performance' },
  { id: 'pending-ageing', label: 'Pending & Ageing' },
  { id: 'staff-contribution', label: 'Staff Contribution' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'routing-bottlenecks', label: 'Routing & Bottlenecks' },
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

function formatPercent(value) {
  return `${value.toFixed(1)}%`
}

function formatDays(value) {
  return `${value.toFixed(1)} days`
}

function formatMinutes(value) {
  if (!value) {
    return '0 minutes'
  }

  if (value >= 60) {
    const hours = Math.floor(value / 60)
    const minutes = Math.round(value % 60)
    return `${hours} hour${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} minute${minutes === 1 ? '' : 's'}` : ''}`
  }

  const rounded = Math.round(value)
  return `${rounded} minute${rounded === 1 ? '' : 's'}`
}

function sortStaffContribution(items) {
  // Staff contribution reflects office activity and must not be presented as a performance leaderboard.
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}

function getLongestAcknowledgementDelay(records) {
  const durations = records
    .map((record) => {
      if (!record.arrivedAtCurrentOffice || !record.receivedAt) {
        return 0
      }

      const arrivedAt = new Date(String(record.arrivedAtCurrentOffice).replace(',', ''))
      const receivedAt = new Date(String(record.receivedAt).replace(',', ''))

      if (Number.isNaN(arrivedAt.getTime()) || Number.isNaN(receivedAt.getTime())) {
        return 0
      }

      return Math.max(0, Math.round((receivedAt.getTime() - arrivedAt.getTime()) / 60000))
    })

  return durations.length ? Math.max(...durations) : 0
}

function resolveSnapshot(reportData, filters) {
  if (filters.period !== 'Custom Range') {
    return reportData.periods[filters.period] ?? null
  }

  if (!filters.startDate || !filters.endDate) {
    return null
  }

  const start = new Date(`${filters.startDate}T00:00:00`)
  const end = new Date(`${filters.endDate}T23:59:59`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null
  }

  if (start <= new Date('2026-07-31T23:59:59') && end >= new Date('2026-07-01T00:00:00')) {
    return reportData.periods['This Month'] ?? null
  }

  if (start <= new Date('2026-06-30T23:59:59') && end >= new Date('2026-06-01T00:00:00')) {
    return reportData.periods['Last Month'] ?? null
  }

  if (start <= new Date('2026-06-30T23:59:59') && end >= new Date('2026-04-01T00:00:00')) {
    return reportData.periods['Last 3 Months'] ?? null
  }

  if (start <= new Date('2026-06-30T23:59:59') && end >= new Date('2026-01-01T00:00:00')) {
    return reportData.periods['This Year'] ?? null
  }

  return null
}

function OfficeReportsPage() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const reportData = getOfficeReportData(currentUser?.officeId)
  const [draftFilters, setDraftFilters] = useState(() => ({
    ...INITIAL_FILTERS,
    period: reportData.defaultPeriod || INITIAL_FILTERS.period,
  }))
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...INITIAL_FILTERS,
    period: reportData.defaultPeriod || INITIAL_FILTERS.period,
  }))
  const requestedTab = searchParams.get('tab') ?? 'office-summary'
  const activeTab =
    REPORT_TABS.find((tab) => tab.id === requestedTab)?.id ?? REPORT_TABS[0].id

  // TODO: Backend API must independently enforce office report scope using the authenticated supervisor office on every report query.

  const snapshot = useMemo(
    () => resolveSnapshot(reportData, appliedFilters),
    [appliedFilters, reportData],
  )

  const filteredPendingItems = useMemo(() => {
    const items = snapshot?.pendingAgeing?.items ?? []

    return items.filter((item) => {
      const matchesDocumentType =
        appliedFilters.documentType === 'All document types' ||
        item.documentType === appliedFilters.documentType
      const matchesPriority =
        appliedFilters.priority === 'All priorities' ||
        item.priority === appliedFilters.priority
      const matchesStage =
        appliedFilters.stage === 'All stages' ||
        item.currentStage === appliedFilters.stage
      const matchesContributor =
        appliedFilters.contributor === 'All staff contributors' ||
        item.lastActor === appliedFilters.contributor

      return (
        matchesDocumentType &&
        matchesPriority &&
        matchesStage &&
        matchesContributor
      )
    })
  }, [appliedFilters, snapshot])

  const filteredOverdueItems = useMemo(() => {
    const items = snapshot?.overdue?.items ?? []

    return items.filter((item) => {
      const matchesDocumentType =
        appliedFilters.documentType === 'All document types' ||
        item.documentType === appliedFilters.documentType
      const matchesPriority =
        appliedFilters.priority === 'All priorities' ||
        item.priority === appliedFilters.priority
      const matchesStage =
        appliedFilters.stage === 'All stages' ||
        item.currentStage === appliedFilters.stage

      return matchesDocumentType && matchesPriority && matchesStage
    })
  }, [appliedFilters, snapshot])

  const filteredStaffContribution = useMemo(() => {
    const items = snapshot?.staffContribution ?? []

    if (appliedFilters.contributor === 'All staff contributors') {
      return sortStaffContribution(items)
    }

    return sortStaffContribution(
      items.filter((item) => item.name === appliedFilters.contributor),
    )
  }, [appliedFilters.contributor, snapshot])

  const overdueTabFilters = useMemo(
    () => ({
      priorities: ['All priorities', 'Normal', 'High', 'Urgent'],
      durations: ['All overdue durations', '1-2 days', '3-5 days', 'More than 5 days'],
      followUpStatuses: [
        'All follow-up statuses',
        'Awaiting final legal concurrence',
        'Reminder issued',
        'Follow-up required',
        'Supervisor follow-up planned',
      ],
    }),
    [],
  )
  const [overdueFilters, setOverdueFilters] = useState({
    priority: 'All priorities',
    duration: 'All overdue durations',
    followUpStatus: 'All follow-up statuses',
  })

  const visibleOverdueItems = useMemo(
    () =>
      filteredOverdueItems.filter((item) => {
        const matchesPriority =
          overdueFilters.priority === 'All priorities' ||
          item.priority === overdueFilters.priority
        const matchesDuration =
          overdueFilters.duration === 'All overdue durations' ||
          (overdueFilters.duration === '1-2 days' &&
            item.daysOverdueValue >= 1 &&
            item.daysOverdueValue <= 2) ||
          (overdueFilters.duration === '3-5 days' &&
            item.daysOverdueValue >= 3 &&
            item.daysOverdueValue <= 5) ||
          (overdueFilters.duration === 'More than 5 days' &&
            item.daysOverdueValue > 5)
        const matchesFollowUp =
          overdueFilters.followUpStatus === 'All follow-up statuses' ||
          item.followUpStatus === overdueFilters.followUpStatus

        return matchesPriority && matchesDuration && matchesFollowUp
      }),
    [filteredOverdueItems, overdueFilters],
  )

  const derivedSummary = useMemo(() => {
    if (!snapshot) {
      return null
    }

    const processingRate = calculateProcessingRate(
      snapshot.summary.completed,
      snapshot.summary.received,
    )
    const workEngagementRate = calculateWorkEngagementRate(
      snapshot.summary.workedOn,
      snapshot.summary.received,
    )
    const overdueRate = calculateOverdueRate(
      snapshot.summary.overdue,
      snapshot.summary.requiringAction,
    )
    const acknowledgementRecords = snapshot.receiptAcknowledgements ?? []
    const acknowledged = acknowledgementRecords.filter(
      (item) => item.receiptStatus === 'Acknowledged',
    ).length
    const pending = acknowledgementRecords.filter(
      (item) => item.receiptStatus === 'Pending',
    ).length
    const acknowledgementRate = calculateAcknowledgementRate(
      acknowledged,
      acknowledgementRecords.length,
    )
    const averageAcknowledgementMinutes =
      calculateAverageAcknowledgementTime(acknowledgementRecords)
    const longestAcknowledgementMinutes =
      getLongestAcknowledgementDelay(acknowledgementRecords)
    const averageTurnaroundTime = calculateAverageTurnaroundTime(
      snapshot.performanceByMonth.map((item) => ({
        turnaroundDays: item.averageTurnaroundDays,
      })),
    )
    const officeStageCompletionRate = calculateProcessingRate(
      snapshot.summary.completed,
      snapshot.summary.workedOn,
    )

    return {
      processingRate,
      workEngagementRate,
      overdueRate,
      acknowledgementRate,
      averageAcknowledgementMinutes,
      longestAcknowledgementMinutes,
      averageTurnaroundTime,
      officeStageCompletionRate,
      acknowledged,
      pending,
    }
  }, [snapshot])

  const handleTabChange = (tabId) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', tabId)
    setSearchParams(nextSearchParams, { replace: true })
  }

  const handleExport = (format) => {
    // TODO: Replace this toast-based placeholder with secure PDF export generation.
    // TODO: Replace this toast-based placeholder with secure Excel export generation.
    showToast({
      title:
        format === 'pdf'
          ? 'PDF report export prepared.'
          : 'Excel report export prepared.',
    })
  }

  const baseOfficeName = currentUser?.officeName ?? reportData.officeName

  return (
    <section className="reports-page">
      <div className="report-page-content">
        <PageHeader
          title={`${baseOfficeName} Reports`}
          description="Review correspondence activity and processing performance for your office."
          actions={
            <div className="split-actions reports-page__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => handleExport('pdf')}
              >
                <FileText size={16} aria-hidden="true" />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => handleExport('excel')}
              >
                <FileSpreadsheet size={16} aria-hidden="true" />
                <span>Export Excel</span>
              </button>
            </div>
          }
        />

        <div className="reports-confidentiality-notice" role="note">
          <Info size={16} aria-hidden="true" />
          <p>
            This report contains confidential performance information for {baseOfficeName} and is available only to authorised office supervisors.
          </p>
        </div>

        <ReportFilters
          officeName={baseOfficeName}
          filters={draftFilters}
          stageOptions={reportData.stageOptions}
          contributorOptions={reportData.contributorOptions}
          onChange={(field, value) =>
            setDraftFilters((current) => ({ ...current, [field]: value }))
          }
          onSubmit={() => setAppliedFilters(draftFilters)}
        />

        <section className="reports-tabs-shell">
          <div
            className="reports-tabs"
            role="tablist"
            aria-label="Office report sections"
          >
            {REPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`report-panel-${tab.id}`}
                id={`report-tab-${tab.id}`}
                className={activeTab === tab.id ? 'tab-button tab-button--active report-tab' : 'tab-button report-tab'}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {!snapshot ? (
          <SectionCard title="Office Reports" description="Selected reporting view." className="report-section-card">
            <EmptyState
              title="No report data available"
              description="No correspondence activity was recorded for the selected reporting period."
            />
          </SectionCard>
        ) : null}

        {snapshot && activeTab === 'office-summary' ? (
          <div
            id="report-panel-office-summary"
            role="tabpanel"
            aria-labelledby="report-tab-office-summary"
            className="report-tab-panel"
          >
          <section className="report-kpi-grid report-kpi-grid--office-summary">
            <ReportMetricCard
              label="Correspondence Received"
              value={snapshot.summary.received}
              description="Distinct records entering the office"
            />
            <ReportMetricCard
              label="Correspondence Worked On"
              value={snapshot.summary.workedOn}
              description="At least one meaningful office action"
            />
            <ReportMetricCard
              label="Completed by Office"
              value={snapshot.summary.completed}
              description="Office stages completed"
            />
            <ReportMetricCard
              label="Pending"
              value={snapshot.summary.pending}
              description="Still requiring office action"
            />
            <ReportMetricCard
              label="Due Soon"
              value={snapshot.summary.dueSoon}
              description="Approaching office deadline"
              tone="amber"
            />
            <ReportMetricCard
              label="Overdue"
              value={snapshot.summary.overdue}
              description="Past office deadline"
              tone="red"
            />
            <ReportMetricCard
              label="Processing Rate"
              value={formatPercent(derivedSummary.processingRate)}
              description="Completed by office divided by received"
              tone="blue"
            />
            <ReportMetricCard
              label="Average Turnaround Time"
              value={formatDays(snapshot.summary.averageTurnaroundDays)}
              description="Average time to complete office work"
            />
          </section>

          <div className="report-summary-grid">
            <SectionCard title="Receipt Acknowledgement" description="Receipt performance for correspondence entering the office from other offices." className="report-section-card">
              <div className="reports-kpi-grid receipt-metric-grid">
                <div className="metric-card">
                  <p className="data-label">Received from Other Offices</p>
                  <h3>{snapshot.receiptAcknowledgements.length}</h3>
                </div>
                <div className="metric-card">
                  <p className="data-label">Acknowledged</p>
                  <h3>{derivedSummary.acknowledged}</h3>
                </div>
                <div className="metric-card">
                  <p className="data-label">Awaiting Acknowledgement</p>
                  <h3>{derivedSummary.pending}</h3>
                </div>
                <div className="metric-card">
                  <p className="data-label">Acknowledgement Rate</p>
                  <h3>{formatPercent(derivedSummary.acknowledgementRate)}</h3>
                </div>
                <div className="metric-card">
                  <p className="data-label">Average Acknowledgement Time</p>
                  <h3>{formatMinutes(derivedSummary.averageAcknowledgementMinutes)}</h3>
                </div>
                <div className="metric-card">
                  <p className="data-label">Longest Acknowledgement Delay</p>
                  <h3>{formatMinutes(derivedSummary.longestAcknowledgementMinutes)}</h3>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Status Breakdown" description="Visible status labels remain available as text." className="report-section-card">
              <div className="summary-breakdown">
                {snapshot.statusBreakdown.map((item) => (
                  <div key={item.label} className="progress-row">
                    <div className="progress-row__meta">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="progress-row__track">
                      <div
                        className="progress-row__value"
                        style={{ width: `${Math.min(100, (item.value / snapshot.summary.received) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="report-summary-grid">
            <SectionCard title="Document Type Breakdown" description="Count and percentage by document type." className="report-section-card">
              <div className="summary-breakdown">
                {snapshot.documentTypeBreakdown.map((item) => (
                  <div key={item.label} className="progress-row">
                    <div className="progress-row__meta">
                      <span>{item.label}</span>
                      <span>
                        {item.count} / {item.percentage}%
                      </span>
                    </div>
                    <div className="progress-row__track">
                      <div
                        className="progress-row__value"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Monthly Correspondence Activity" description="Received, worked on, and completed by month." className="report-section-card">
              <div className="report-legend" aria-hidden="true">
                <span><i className="report-legend__swatch report-legend__swatch--blue"></i>Received</span>
                <span><i className="report-legend__swatch report-legend__swatch--slate"></i>Worked On</span>
                <span><i className="report-legend__swatch report-legend__swatch--green"></i>Completed</span>
              </div>
              <div className="mini-chart" aria-label="Monthly correspondence activity chart">
                {snapshot.monthlyActivity.map((item) => (
                  <div key={item.month} className="mini-chart__bar-group">
                    <div className="mini-chart__bars">
                      <div className="mini-chart__bar mini-chart__bar--primary" style={{ height: `${item.received}px` }}></div>
                      <div className="mini-chart__bar mini-chart__bar--secondary" style={{ height: `${item.workedOn}px` }}></div>
                      <div className="mini-chart__bar mini-chart__bar--success" style={{ height: `${item.completed}px` }}></div>
                    </div>
                    <span>{item.month}</span>
                  </div>
                ))}
              </div>
              <p className="tabs-note">
                {snapshot.monthlyActivity
                  .map(
                    (item) =>
                      `${item.month}: received ${item.received}, worked on ${item.workedOn}, completed ${item.completed}`,
                  )
                  .join('. ')}
              </p>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {snapshot && activeTab === 'processing-performance' ? (
        <div
          id="report-panel-processing-performance"
          role="tabpanel"
          aria-labelledby="report-tab-processing-performance"
          className="report-tab-panel"
        >
          <section className="report-kpi-grid report-kpi-grid--performance">
            <ReportMetricCard
              label="Processing Rate"
              value={formatPercent(derivedSummary.processingRate)}
              description="Completed by office divided by received"
              tone="blue"
            />
            <ReportMetricCard
              label="Work Engagement Rate"
              value={formatPercent(derivedSummary.workEngagementRate)}
              description="Worked on divided by received"
              tone="green"
            />
            <ReportMetricCard
              label="Overdue Rate"
              value={formatPercent(derivedSummary.overdueRate)}
              description="Overdue divided by requiring action"
              tone="amber"
            />
            <ReportMetricCard
              label="Average Turnaround Time"
              value={formatDays(derivedSummary.averageTurnaroundTime)}
              description="Average office turnaround"
            />
            <ReportMetricCard
              label="Median Turnaround Time"
              value={formatDays(snapshot.summary.medianTurnaroundDays)}
              description="Median office turnaround"
            />
            <ReportMetricCard
              label="Office Stage Completion Rate"
              value={formatPercent(derivedSummary.officeStageCompletionRate)}
              description="Completed by office divided by worked on"
              tone="blue"
            />
          </section>

          <SectionCard title="Performance Trend" description="Monthly processing, engagement, overdue, turnaround, and acknowledgement performance." className="report-section-card">
            <div className="table-card">
              <table className="report-table report-table--performance">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Processing Rate</th>
                    <th>Work Engagement Rate</th>
                    <th>Overdue Rate</th>
                    <th>Average Turnaround Time</th>
                    <th>Acknowledgement Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.performanceByMonth.map((item) => (
                    <tr key={item.month}>
                      <td>{item.month}</td>
                      <td>{formatPercent(calculateProcessingRate(item.completed, item.received))}</td>
                      <td>{formatPercent(calculateWorkEngagementRate(item.workedOn, item.received))}</td>
                      <td>{formatPercent(calculateOverdueRate(Math.max(1, Math.round(item.received * 0.07)), Math.max(1, item.workedOn - item.completed + 6)))}</td>
                      <td>{formatDays(item.averageTurnaroundDays)}</td>
                      <td>{formatPercent(item.acknowledgementRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {snapshot && activeTab === 'pending-ageing' ? (
        <div
          id="report-panel-pending-ageing"
          role="tabpanel"
          aria-labelledby="report-tab-pending-ageing"
          className="report-tab-panel"
        >
          <SectionCard title="Ageing Summary" description="Pending records grouped by time spent in office." className="report-section-card">
            <div className="reports-ageing-grid ageing-summary-grid">
              {snapshot.pendingAgeing.bands.map((band) => (
                <div key={band.label} className="metric-card">
                  <p className="data-label">{band.label}</p>
                  <h3>{band.count}</h3>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Pending Detail" description="Pending correspondence and current ageing position." className="report-section-card">
            {filteredPendingItems.length ? (
              <div className="table-card">
                <table className="report-table report-table--pending">
                  <colgroup>
                    <col className="report-col--reference" />
                    <col className="report-col--subject" />
                    <col className="report-col--stage" />
                    <col className="report-col--date-received" />
                    <col className="report-col--days" />
                    <col className="report-col--deadline" />
                    <col className="report-col--time" />
                    <col className="report-col--person" />
                    <col className="report-col--last-activity" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Subject</th>
                      <th>Current Stage</th>
                      <th>Date Received by Office</th>
                      <th>Days in Office</th>
                      <th>Deadline</th>
                      <th>Time Remaining</th>
                      <th>Last Person Who Acted</th>
                      <th>Last Action Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingItems.map((item) => (
                      <tr key={item.reference}>
                        <td>{item.reference}</td>
                        <td>{item.subject}</td>
                        <td>{item.currentStage}</td>
                        <td>{item.receivedAtOffice}</td>
                        <td>{item.daysInOffice}</td>
                        <td>{item.deadline}</td>
                        <td className={`report-time-cell report-time-cell--${item.timeRemainingState}`}>
                          {item.timeRemaining}
                        </td>
                        <td>{item.lastActor}</td>
                        <td>{item.lastActionDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No report data available"
                description="No correspondence activity was recorded for the selected reporting period."
              />
            )}
          </SectionCard>
        </div>
      ) : null}

      {snapshot && activeTab === 'staff-contribution' ? (
        <div
          id="report-panel-staff-contribution"
          role="tabpanel"
          aria-labelledby="report-tab-staff-contribution"
          className="report-tab-panel"
        >
          <SectionCard
            title="Staff Contribution"
            description={`Users who recorded meaningful actions on behalf of ${baseOfficeName}.`}
            className="report-section-card"
          >
            {filteredStaffContribution.length ? (
              <div className="staff-contribution-card">
                <div className="staff-contribution-table-wrap">
                  <table className="staff-contribution-table report-table report-table--staff">
                    <colgroup>
                      <col className="report-col--staff-member" />
                      <col className="report-col--staff-correspondence" />
                      <col className="report-col--staff-actions" />
                      <col className="report-col--staff-stages" />
                      <col className="report-col--staff-receipts" />
                      <col className="report-col--staff-response" />
                      <col className="report-col--staff-last-activity" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">Staff Member</th>
                        <th scope="col" aria-label="Correspondence Worked On">
                          Correspondence
                        </th>
                        <th scope="col" aria-label="Meaningful Actions Recorded">
                          Actions
                        </th>
                        <th scope="col" aria-label="Office Stages Completed">
                          Stages Completed
                        </th>
                        <th scope="col" aria-label="Receipt Acknowledgements">
                          Receipts
                        </th>
                        <th scope="col" aria-label="Average Response Time">
                          Avg. Response
                        </th>
                        <th scope="col">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaffContribution.map((staff) => (
                        <tr key={staff.name}>
                          <th scope="row">{staff.name}</th>
                          <td data-label="Correspondence">{staff.correspondenceWorkedOn}</td>
                          <td data-label="Actions">{staff.meaningfulActions}</td>
                          <td data-label="Stages Completed">{staff.stagesCompleted}</td>
                          <td data-label="Receipts">{staff.receiptAcknowledgements}</td>
                          <td data-label="Avg. Response">{staff.averageResponseTime}</td>
                          <td data-label="Last Activity">{staff.lastActivity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No report data available"
                description="No correspondence activity was recorded for the selected reporting period."
              />
            )}
          </SectionCard>
        </div>
      ) : null}

      {snapshot && activeTab === 'overdue' ? (
        <div
          id="report-panel-overdue"
          role="tabpanel"
          aria-labelledby="report-tab-overdue"
          className="report-tab-panel"
        >
          <section className="report-kpi-grid report-kpi-grid--overdue">
            <ReportMetricCard
              label="Total Overdue"
              value={snapshot.overdue.summary.total}
              description="Records past office deadline"
              tone="red"
            />
            <ReportMetricCard
              label="Average Days Overdue"
              value={formatDays(snapshot.overdue.summary.averageDaysOverdue)}
              description="Across overdue records"
              tone="blue"
            />
            <ReportMetricCard
              label="Urgent Overdue"
              value={snapshot.overdue.summary.urgentOverdue}
              description="Urgent records needing response"
              tone="red"
            />
            <ReportMetricCard
              label="Follow-up Required"
              value={snapshot.overdue.summary.followUpRequired}
              description="Records requiring follow-up action"
              tone="amber"
            />
          </section>

          <SectionCard title="Overdue Filters" description="Refine overdue records in the current office report." className="report-section-card">
            <div className="reports-overdue-filters overdue-filter-grid">
              <div className="form-field">
                <label htmlFor="overdue-priority" className="form-field__label">
                  Priority
                </label>
                <select
                  id="overdue-priority"
                  value={overdueFilters.priority}
                  onChange={(event) =>
                    setOverdueFilters((current) => ({ ...current, priority: event.target.value }))
                  }
                >
                  {overdueTabFilters.priorities.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="overdue-duration" className="form-field__label">
                  Overdue Duration
                </label>
                <select
                  id="overdue-duration"
                  value={overdueFilters.duration}
                  onChange={(event) =>
                    setOverdueFilters((current) => ({ ...current, duration: event.target.value }))
                  }
                >
                  {overdueTabFilters.durations.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="overdue-follow-up" className="form-field__label">
                  Follow-up Status
                </label>
                <select
                  id="overdue-follow-up"
                  value={overdueFilters.followUpStatus}
                  onChange={(event) =>
                    setOverdueFilters((current) => ({
                      ...current,
                      followUpStatus: event.target.value,
                    }))
                  }
                >
                  {overdueTabFilters.followUpStatuses.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Overdue Detail" description="Overdue correspondence requiring office follow-up." className="report-section-card">
            {visibleOverdueItems.length ? (
              <div className="table-card">
                <table className="report-table report-table--overdue">
                  <colgroup>
                    <col className="report-col--reference" />
                    <col className="report-col--subject" />
                    <col className="report-col--priority" />
                    <col className="report-col--stage" />
                    <col className="report-col--deadline" />
                    <col className="report-col--days-overdue" />
                    <col className="report-col--last-action" />
                    <col className="report-col--person" />
                    <col className="report-col--delay-reason" />
                    <col className="report-col--follow-up" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Subject</th>
                      <th>Priority</th>
                      <th>Current Stage</th>
                      <th>Deadline</th>
                      <th>Days Overdue</th>
                      <th>Last Action</th>
                      <th>Last Person Who Acted</th>
                      <th>Reason for Delay</th>
                      <th>Follow-up Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOverdueItems.map((item) => (
                      <tr key={item.reference}>
                        <td>{item.reference}</td>
                        <td>{item.subject}</td>
                        <td>{item.priority}</td>
                        <td>{item.currentStage}</td>
                        <td>{item.deadline}</td>
                        <td className="report-time-cell report-time-cell--overdue">{item.daysOverdue}</td>
                        <td>{item.lastAction}</td>
                        <td>{item.lastPerson}</td>
                        <td>{item.delayReason}</td>
                        <td>{item.followUpStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No report data available"
                description="No correspondence activity was recorded for the selected reporting period."
              />
            )}
          </SectionCard>
        </div>
      ) : null}

      {snapshot && activeTab === 'routing-bottlenecks' ? (
        <div
          id="report-panel-routing-bottlenecks"
          role="tabpanel"
          aria-labelledby="report-tab-routing-bottlenecks"
          className="report-tab-panel"
        >
          <div className="routing-report-grid">
            <SectionCard title="Incoming Routing" description="Source offices routing correspondence into this office." className="report-section-card">
              <div className="table-card">
                <table className="report-table report-table--routing">
                  <thead>
                    <tr>
                      <th>Originating Office</th>
                      <th>Records Received</th>
                      <th>Average Acknowledgement Time</th>
                      <th>Average Processing Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.routing.incomingRouting.map((item) => (
                      <tr key={item.office}>
                        <td>{item.office}</td>
                        <td>{item.recordsReceived}</td>
                        <td>{item.averageAcknowledgementTime}</td>
                        <td>{item.averageProcessingTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Outgoing Routing" description="Destination offices after current office action." className="report-section-card">
              <div className="table-card">
                <table className="report-table report-table--routing">
                  <thead>
                    <tr>
                      <th>Destination Office</th>
                      <th>Records Forwarded</th>
                      <th>Returned Records</th>
                      <th>Average Time Before Forwarding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.routing.outgoingRouting.map((item) => (
                      <tr key={item.office}>
                        <td>{item.office}</td>
                        <td>{item.recordsForwarded}</td>
                        <td>{item.returnedRecords}</td>
                        <td>{item.averageTimeBeforeForwarding}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <div className="routing-report-grid">
            <SectionCard title="Bottleneck Stages" description="Stages with the highest average time and overdue volume." className="report-section-card">
              <div className="table-card">
                <table className="report-table report-table--routing">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Records Processed</th>
                      <th>Average Time</th>
                      <th>Overdue Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.routing.bottlenecks.map((item) => (
                      <tr key={item.stage}>
                        <td>{item.stage}</td>
                        <td>{item.recordsProcessed}</td>
                        <td>{item.averageTime}</td>
                        <td>{item.overdueRecords}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Returned or Reopened Records" description="Common return and reopening signals within the office workflow." className="report-section-card">
              <div className="meta-grid returned-summary-grid">
                <div className="metric-card">
                  <p className="data-label">Total Returned</p>
                  <h3>{snapshot.routing.returnedOrReopened.totalReturned}</h3>
                </div>
                <div className="metric-card">
                  <p className="data-label">Total Reopened</p>
                  <h3>{snapshot.routing.returnedOrReopened.totalReopened}</h3>
                </div>
                <div className="metric-card">
                  <p className="data-label">Common Reason</p>
                  <h3>{snapshot.routing.returnedOrReopened.commonReason}</h3>
                </div>
                <div className="metric-card">
                  <p className="data-label">Affected Stages</p>
                  <h3>{snapshot.routing.returnedOrReopened.affectedStages}</h3>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
        ) : null}
      </div>
    </section>
  )
}

export default OfficeReportsPage
