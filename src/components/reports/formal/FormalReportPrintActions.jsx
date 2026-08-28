function FormalReportPrintActions({
  suggestedFilename,
  isOfficial = false,
  onPrint,
  onSavePdf,
  disabled = false,
}) {
  return (
    <div className="formal-report-actions formal-report-print-actions formal-report-no-print">
      <div className="formal-report-actions__meta">
        <p className="formal-report-actions__label">
          {isOfficial ? 'Official report ready' : 'Preview ready'}
        </p>
        <p className="formal-report-actions__filename">{suggestedFilename}</p>
      </div>
      <div className="formal-report-actions__buttons">
        <button
          type="button"
          className="button button--secondary"
          onClick={onPrint}
          disabled={disabled}
        >
          Print Report
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={onSavePdf}
          disabled={disabled}
        >
          Save as PDF
        </button>
      </div>
    </div>
  )
}

export default FormalReportPrintActions
