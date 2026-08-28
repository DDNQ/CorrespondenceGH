function FormalReportHeader({ officeName, reportTitle, periodLabel }) {
  return (
    <header className="formal-report-header">
      <p className="formal-report-header__ministry">MINISTRY OF ROADS AND HIGHWAYS</p>
      <p className="formal-report-header__system">CORRESPONDENCE MANAGEMENT AND TRACKING SYSTEM</p>
      <div className="formal-report-header__divider" aria-hidden="true"></div>
      <h2>{officeName}</h2>
      <h3>{reportTitle}</h3>
      <p className="formal-report-header__period">REPORTING PERIOD: {periodLabel}</p>
    </header>
  )
}

export default FormalReportHeader
