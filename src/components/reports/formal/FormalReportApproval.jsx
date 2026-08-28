function SignatureBlock({ title, name, role, showNameLine = false }) {
  return (
    <div className="formal-report-approval__block">
      <p className="formal-report-approval__title">{title}</p>
      {name ? <p className="formal-report-approval__name">{name}</p> : null}
      {role ? <p className="formal-report-approval__role">{role}</p> : null}
      {showNameLine ? <div className="formal-report-approval__line"><span>Name</span></div> : null}
      <div className="formal-report-approval__line"><span>Signature</span></div>
      <div className="formal-report-approval__line"><span>Date</span></div>
    </div>
  )
}

function FormalReportApproval({ report }) {
  return (
    <section className="formal-report-approval">
      <SignatureBlock
        title="Prepared By"
        name={report.preparedBy.name}
        role={report.preparedBy.role}
      />
      <SignatureBlock
        title="Reviewed/Approved By"
        role="Office Director"
        showNameLine
      />
    </section>
  )
}

export default FormalReportApproval
