import EmptyState from '../common/EmptyState'
import SectionCard from '../common/SectionCard'
import ReportFilters from './ReportFilters'
import ReportMetricCard from './ReportMetricCard'

function formatMetricValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available'
  }

  return value
}

function renderStateCard({
  title,
  description,
  actionLabel = 'Retry',
  onRetry,
  tone = 'default',
}) {
  return (
    <SectionCard title={title} description={description} className="report-section-card">
      <div className={`reports-api-state reports-api-state--${tone}`}>
        <p>{description}</p>
        {typeof onRetry === 'function' ? (
          <button type="button" className="button button--secondary" onClick={onRetry}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </SectionCard>
  )
}

function renderBreakdownRows(items = []) {
  return items.length ? (
    <div className="summary-breakdown">
      {items.map((item) => (
        <div key={`${item.label}-${item.count}`} className="progress-row">
          <div className="progress-row__meta">
            <span>{item.label}</span>
            <span>{formatMetricValue(item.count)}</span>
          </div>
          <div className="progress-row__track">
            <div className="progress-row__value" style={{ width: '100%' }}></div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState
      title="No analytics data available"
      description="No breakdown values were returned for the selected reporting period."
    />
  )
}

function renderTrendsContent(trendsState, onRetry) {
  if (trendsState.status === 'loading') {
    return (
      <EmptyState
        title="Loading trends"
        description="Monthly correspondence trends are loading."
      />
    )
  }

  if (trendsState.status === 'error') {
    return (
      <div className="reports-api-state">
        <p>{trendsState.error}</p>
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Retry
        </button>
      </div>
    )
  }

  if (!trendsState.data?.periods?.length) {
    return (
      <EmptyState
        title="No trends available"
        description="No monthly correspondence trends were returned for the selected reporting period."
      />
    )
  }

  return (
    <div className="report-trends-list">
      {trendsState.data.periods.map((period) => (
        <div key={period.label} className="report-trends-period">
          <h3 className="report-trends-period__label">{period.label}</h3>
          <div className="report-trends-period__items">
            {period.values.map((value) => (
              <span key={`${period.label}-${value.type}`} className="report-trends-chip">
                {value.type}: {formatMetricValue(value.count)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderSummaryTab(summaryState, trendsState, onRetry) {
  if (summaryState.status === 'loading') {
    return (
      <SectionCard
        title="Office Summary"
        className="report-section-card"
      >
        <EmptyState
          title="Loading office summary"
          description="Summary metrics, breakdowns, and trends are loading."
        />
      </SectionCard>
    )
  }

  if (summaryState.status === 'error') {
    return renderStateCard({
      title: 'Office summary unavailable',
      description: summaryState.error,
      onRetry,
    })
  }

  const summary = summaryState.data

  if (!summary) {
    return (
      <SectionCard
        title="Office Summary"
        className="report-section-card"
      >
        <EmptyState
          title="No summary available"
          description="No summary metrics were returned for the selected reporting period."
        />
      </SectionCard>
    )
  }

  return (
    <div className="report-tab-panel">
      {summary.highlightMetrics.length ? (
        <section className="report-kpi-grid report-kpi-grid--office-summary">
          {summary.highlightMetrics.map((metric) => (
            <ReportMetricCard
              key={metric.key}
              label={metric.label}
              value={metric.displayValue ?? formatMetricValue(metric.value)}
            />
          ))}
        </section>
      ) : null}

      <div className="report-summary-grid">
        <SectionCard
          title="Status Breakdown"
          className="report-section-card"
        >
          {renderBreakdownRows(summary.statusBreakdown)}
        </SectionCard>

        <SectionCard
          title="Correspondence Type Breakdown"
          className="report-section-card"
        >
          {renderBreakdownRows(summary.typeBreakdown)}
        </SectionCard>
      </div>

      <SectionCard
        title="Monthly Correspondence Trends"
        className="report-section-card"
      >
        {renderTrendsContent(trendsState, onRetry)}
      </SectionCard>
    </div>
  )
}

function renderBacklogTab(backlogState, onRetry) {
  if (backlogState.status === 'loading') {
    return (
      <SectionCard
        title="Pending & Ageing"
        className="report-section-card"
      >
        <EmptyState
          title="Loading backlog"
          description="Backlog ageing bands are loading."
        />
      </SectionCard>
    )
  }

  if (backlogState.status === 'error') {
    return renderStateCard({
      title: 'Backlog unavailable',
      description: backlogState.error,
      onRetry,
    })
  }

  const backlog = backlogState.data

  if (!backlog?.bands?.length) {
    return (
      <SectionCard
        title="Pending & Ageing"
        className="report-section-card"
      >
        <EmptyState
          title="No backlog available"
          description="No backlog ageing bands were returned for the selected reporting period."
        />
      </SectionCard>
    )
  }

  return (
    <div className="report-tab-panel">
      <SectionCard
        title="Ageing Summary"
        className="report-section-card"
      >
        <div className="reports-ageing-grid ageing-summary-grid">
          <div className="metric-card">
            <p className="data-label">Total Open</p>
            <h3>{formatMetricValue(backlog.totalOpen)}</h3>
          </div>
          {backlog.bands.map((band) => (
            <div key={band.key} className="metric-card">
              <p className="data-label">{band.label}</p>
              <h3>{formatMetricValue(band.count)}</h3>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Backlog Bands"
        className="report-section-card"
      >
        <div className="table-card">
          <table className="report-table">
            <thead>
              <tr>
                <th>Band</th>
                <th>Range</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {backlog.bands.map((band) => (
                <tr key={band.key}>
                  <td>{band.label}</td>
                  <td>
                    {band.minDays === null && band.maxDays === null
                      ? 'Not available'
                      : band.maxDays === null
                        ? `${formatMetricValue(band.minDays)}+ days`
                        : `${formatMetricValue(band.minDays)}-${formatMetricValue(band.maxDays)} days`}
                  </td>
                  <td>{formatMetricValue(band.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

function renderStaffContributionTab(staffContributionState, onRetry) {
  if (staffContributionState.status === 'loading') {
    return (
      <SectionCard
        title="Staff Contribution"
        className="report-section-card"
      >
        <EmptyState
          title="Loading staff contribution"
          description="Recorded staff activity is loading."
        />
      </SectionCard>
    )
  }

  if (staffContributionState.status === 'error') {
    return renderStateCard({
      title: 'Staff contribution unavailable',
      description: staffContributionState.error,
      onRetry,
    })
  }

  const contributors = staffContributionState.data?.contributors ?? []

  if (!contributors.length) {
    return (
      <SectionCard
        title="Staff Contribution"
        className="report-section-card"
      >
        <EmptyState
          title="No staff contribution available"
          description="No staff activity was returned for the selected reporting period."
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Staff Contribution"
      className="report-section-card"
    >
      <div className="staff-contribution-card">
        <div className="staff-contribution-table-wrap">
          <table className="staff-contribution-table report-table report-table--staff">
            <colgroup>
              <col className="staff-contribution-col staff-contribution-col--member" />
              <col className="staff-contribution-col staff-contribution-col--email" />
              <col className="staff-contribution-col staff-contribution-col--registered" />
              <col className="staff-contribution-col staff-contribution-col--stage-updates" />
              <col className="staff-contribution-col staff-contribution-col--forwarded" />
              <col className="staff-contribution-col staff-contribution-col--completed" />
              <col className="staff-contribution-col staff-contribution-col--filed" />
              <col className="staff-contribution-col staff-contribution-col--notes" />
              <col className="staff-contribution-col staff-contribution-col--attachments" />
              <col className="staff-contribution-col staff-contribution-col--total-actions" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="staff-contribution-col staff-contribution-col--member">Staff Member</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--email">Email</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--registered">Registered</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--stage-updates">Stage Updates</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--forwarded">Forwarded</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--completed">Completed</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--filed">Filed</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--notes">Notes</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--attachments">Attachments</th>
                <th scope="col" className="staff-contribution-col staff-contribution-col--total-actions">Total Actions</th>
              </tr>
            </thead>
            <tbody>
              {contributors.map((contributor) => (
                <tr key={contributor.userId}>
                  <th scope="row" className="staff-contribution-col staff-contribution-col--member">{contributor.userName}</th>
                  <td className="staff-contribution-col staff-contribution-col--email" data-label="Email">{formatMetricValue(contributor.userEmail)}</td>
                  <td className="staff-contribution-col staff-contribution-col--registered" data-label="Registered">{formatMetricValue(contributor.registered)}</td>
                  <td className="staff-contribution-col staff-contribution-col--stage-updates" data-label="Stage Updates">
                    {formatMetricValue(contributor.stageUpdates)}
                  </td>
                  <td className="staff-contribution-col staff-contribution-col--forwarded" data-label="Forwarded">{formatMetricValue(contributor.forwarded)}</td>
                  <td className="staff-contribution-col staff-contribution-col--completed" data-label="Completed">{formatMetricValue(contributor.completed)}</td>
                  <td className="staff-contribution-col staff-contribution-col--filed" data-label="Filed">{formatMetricValue(contributor.filed)}</td>
                  <td className="staff-contribution-col staff-contribution-col--notes" data-label="Notes">{formatMetricValue(contributor.notesAdded)}</td>
                  <td className="staff-contribution-col staff-contribution-col--attachments" data-label="Attachments">
                    {formatMetricValue(contributor.attachmentsUploaded)}
                  </td>
                  <td className="staff-contribution-col staff-contribution-col--total-actions" data-label="Total Actions">
                    {formatMetricValue(contributor.totalActions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  )
}

function ApiAnalyticsWorkspace({
  officeName,
  filters,
  filterError,
  onFilterChange,
  onFilterSubmit,
  activeTab,
  tabs,
  onTabChange,
  summaryState,
  backlogState,
  staffContributionState,
  trendsState,
  onRetry,
}) {
  return (
    <>
      <ReportFilters
        officeName={officeName}
        filters={filters}
        stageOptions={[]}
        contributorOptions={[]}
        showDocumentFilters={false}
        showWorkflowFilters={false}
        errorMessage={filterError}
        onChange={onFilterChange}
        onSubmit={onFilterSubmit}
      />

      <section className="reports-tabs-shell">
        <div className="reports-tabs" role="tablist" aria-label="Office report sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`report-panel-${tab.id}`}
              id={`report-tab-${tab.id}`}
              className={
                activeTab === tab.id
                  ? 'tab-button tab-button--active report-tab'
                  : 'tab-button report-tab'
              }
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'office-summary'
        ? renderSummaryTab(summaryState, trendsState, onRetry)
        : null}
      {activeTab === 'pending-ageing' ? renderBacklogTab(backlogState, onRetry) : null}
      {activeTab === 'staff-contribution'
        ? renderStaffContributionTab(staffContributionState, onRetry)
        : null}
    </>
  )
}

export default ApiAnalyticsWorkspace
