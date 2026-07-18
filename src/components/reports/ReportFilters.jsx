import FilterBar from '../common/FilterBar'

function ReportFilters({
  officeName,
  filters,
  stageOptions,
  contributorOptions,
  onChange,
  onSubmit,
}) {
  return (
    <form
      className="reports-filter-card"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <FilterBar className="reports-filter-grid">
        <div className="form-field">
          <label htmlFor="report-office" className="form-field__label">
            Office
          </label>
          <input id="report-office" value={officeName} readOnly className="readonly-field" />
        </div>

        <div className="form-field">
          <label htmlFor="report-period" className="form-field__label">
            Reporting Period
          </label>
          <select
            id="report-period"
            value={filters.period}
            onChange={(event) => onChange('period', event.target.value)}
          >
            {[
              'This Month',
              'Last Month',
              'Last 3 Months',
              'Last 6 Months',
              'This Year',
              'Custom Range',
            ].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {filters.period === 'Custom Range' ? (
          <>
            <div className="form-field">
              <label htmlFor="report-start-date" className="form-field__label">
                Start Date
              </label>
              <input
                id="report-start-date"
                type="date"
                value={filters.startDate}
                onChange={(event) => onChange('startDate', event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="report-end-date" className="form-field__label">
                End Date
              </label>
              <input
                id="report-end-date"
                type="date"
                value={filters.endDate}
                onChange={(event) => onChange('endDate', event.target.value)}
              />
            </div>
          </>
        ) : null}

        <div className="form-field">
          <label htmlFor="report-document-type" className="form-field__label">
            Document Type
          </label>
          <select
            id="report-document-type"
            value={filters.documentType}
            onChange={(event) => onChange('documentType', event.target.value)}
          >
            {['All document types', 'Contract', 'Letter', 'Memo', 'Report'].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="report-priority" className="form-field__label">
            Priority
          </label>
          <select
            id="report-priority"
            value={filters.priority}
            onChange={(event) => onChange('priority', event.target.value)}
          >
            {['All priorities', 'Normal', 'High', 'Urgent'].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="report-stage" className="form-field__label">
            Stage
          </label>
          <select
            id="report-stage"
            value={filters.stage}
            onChange={(event) => onChange('stage', event.target.value)}
          >
            <option value="All stages">All stages</option>
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="report-contributor" className="form-field__label">
            Staff Contributor
          </label>
          <select
            id="report-contributor"
            value={filters.contributor}
            onChange={(event) => onChange('contributor', event.target.value)}
          >
            <option value="All staff contributors">All staff contributors</option>
            {contributorOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="reports-filter-action">
          <div className="reports-filter-grid__actions">
            <button type="submit" className="button button--primary">
              Generate Report
            </button>
          </div>
        </div>
      </FilterBar>
    </form>
  )
}

export default ReportFilters
