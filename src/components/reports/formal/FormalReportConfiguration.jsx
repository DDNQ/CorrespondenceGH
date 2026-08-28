import DateField from '../../forms/DateField'
import SelectField from '../../forms/SelectField'
import TextAreaField from '../../forms/TextAreaField'
import { FORMAL_REPORT_YEAR_OPTIONS } from '../../../utils/formalReports.js'

function FormalReportConfiguration({
  metadata,
  value,
  previewReference,
  errors,
  disabled,
  onChange,
  onGenerate,
  onReset,
  onRegenerate,
  hasPreview,
}) {
  return (
    <form
      className="formal-report-config-form formal-report-no-print"
      onSubmit={(event) => {
        event.preventDefault()
        onGenerate()
      }}
    >
      <section className="formal-report-primary-fields">
        <SelectField
          id="formal-report-type"
          label="Report Type"
          required
          value={value.reportType}
          onChange={(event) => onChange('reportType', event.target.value)}
          options={metadata.reportTypes}
          placeholder="Select report type"
          error={errors.reportType}
          className="formal-report-primary-field formal-report-primary-field--type"
        />
        <SelectField
          id="formal-period-type"
          label="Period Type"
          required
          value={value.periodType}
          onChange={(event) => onChange('periodType', event.target.value)}
          options={metadata.periodTypes}
          error={errors.periodType}
          className="formal-report-primary-field"
        />

        {value.periodType === 'monthly' ? (
          <>
            <SelectField
              id="formal-period-year"
              label="Year"
              required
              value={value.year}
              onChange={(event) => onChange('year', event.target.value)}
              options={FORMAL_REPORT_YEAR_OPTIONS}
              placeholder="Select year"
              error={errors.year}
              className="formal-report-primary-field"
            />
            <SelectField
              id="formal-period-month"
              label="Month"
              required
              value={value.month}
              onChange={(event) => onChange('month', event.target.value)}
              options={metadata.monthOptions}
              error={errors.month}
              className="formal-report-primary-field"
            />
          </>
        ) : null}

        {value.periodType === 'annual' ? (
          <SelectField
            id="formal-annual-year"
            label="Year"
            required
            value={value.year}
            onChange={(event) => onChange('year', event.target.value)}
            options={FORMAL_REPORT_YEAR_OPTIONS}
            placeholder="Select year"
            error={errors.year}
            className="formal-report-primary-field"
          />
        ) : null}

        {value.periodType === 'custom' ? (
          <>
            <DateField
              id="formal-start-date"
              label="Start Date"
              required
              value={value.startDate}
              onChange={(event) => onChange('startDate', event.target.value)}
              error={errors.startDate}
              className="formal-report-primary-field"
            />
            <DateField
              id="formal-end-date"
              label="End Date"
              required
              value={value.endDate}
              onChange={(event) => onChange('endDate', event.target.value)}
              error={errors.endDate}
              className="formal-report-primary-field"
            />
          </>
        ) : null}
      </section>

      <section className="formal-report-context-section">
        <p className="formal-report-config-section__title">Report Context</p>
          <dl className="formal-report-context-grid formal-report-context-grid--full">
            <div className="formal-report-context-grid__item" title={value.officeName}>
              <dt>Office</dt>
              <dd>{value.officeName}</dd>
            </div>
            <div className="formal-report-context-grid__item" title={value.officeCode || 'Not available'}>
              <dt>Office Code</dt>
              <dd>{value.officeCode || 'Not available'}</dd>
            </div>
            <div className="formal-report-context-grid__item" title={value.preparedBy}>
              <dt>Prepared By</dt>
              <dd>{value.preparedBy}</dd>
            </div>
            <div className="formal-report-context-grid__item" title={value.preparedByRole}>
              <dt>Role</dt>
              <dd>{value.preparedByRole}</dd>
            </div>
            <div className="formal-report-context-grid__item" title={previewReference}>
              <dt>Report Reference</dt>
              <dd>{previewReference}</dd>
            </div>
          </dl>
      </section>

      <section className="formal-report-notes-section">
        <p className="formal-report-config-section__title">Report Notes</p>
        <div className="formal-report-notes-grid">
          <TextAreaField
            id="formal-observations"
            label="Supervisor Observations"
            value={value.observations}
            onChange={(event) => onChange('observations', event.target.value)}
            placeholder="Enter observations..."
            className="formal-report-notes-field"
          />
          <TextAreaField
            id="formal-recommendations"
            label="Recommendations"
            value={value.recommendations}
            onChange={(event) => onChange('recommendations', event.target.value)}
            placeholder="Enter recommendations..."
            className="formal-report-notes-field"
          />
        </div>
      </section>

      <footer className="formal-report-config-footer">
        <div className="formal-report-configuration__action-buttons">
          <button
            type="button"
            className="button button--ghost"
            onClick={onReset}
            disabled={disabled}
          >
            Reset
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={onRegenerate}
            disabled={disabled}
          >
            {hasPreview ? 'Regenerate Preview' : 'Generate Preview'}
          </button>
          <button
            type="submit"
            className="button button--primary formal-report-configuration__primary-action"
            disabled={disabled}
          >
            Generate Report
          </button>
        </div>
      </footer>
    </form>
  )
}

export default FormalReportConfiguration
