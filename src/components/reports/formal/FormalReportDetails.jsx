function DetailItem({ label, value }) {
  return (
    <div className="formal-report-details__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function FormalReportDetails({ report }) {
  return (
    <section className="formal-report-details" aria-label="Report details">
      <dl>
        <DetailItem label="Report Reference" value={report.reference} />
        <DetailItem label="Office" value={report.office.name} />
        <DetailItem label="Office Code" value={report.office.code || 'Not available'} />
        <DetailItem label="Report Type" value={report.reportTitle} />
        <DetailItem label="Reporting Period" value={report.period.label} />
        <DetailItem label="Prepared By" value={report.preparedBy.name} />
        <DetailItem label="Date Generated" value={report.generatedDateLabel} />
      </dl>
    </section>
  )
}

export default FormalReportDetails
