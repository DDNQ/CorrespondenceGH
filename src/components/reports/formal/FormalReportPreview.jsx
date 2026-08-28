import FormalReportApproval from './FormalReportApproval'
import FormalReportDetails from './FormalReportDetails'
import FormalReportHeader from './FormalReportHeader'

function renderSection(section) {
  if (section.kind === 'paragraph') {
    return <p className="formal-report-section__paragraph">{section.content}</p>
  }

  if (section.kind === 'metrics-table' || section.kind === 'table') {
    return (
      <table className="formal-report-table">
        <tbody>
          {section.rows.map((row) => (
            <tr key={`${section.id}-${row[0]}`}>
              <th scope="row">{row[0]}</th>
              <td>{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (section.kind === 'data-table') {
    return section.rows.length ? (
      <div className="formal-report-table-wrap">
        <table className="formal-report-table formal-report-table--wide">
          <thead>
            <tr>
              {section.columns.map((column) => (
                <th key={`${section.id}-${column}`} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, rowIndex) => (
              <tr key={`${section.id}-row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${section.id}-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="formal-report-section__empty">{section.emptyMessage}</p>
    )
  }

  return null
}

function FormalReportPreview({ report }) {
  if (!report) {
    return null
  }

  const printableSections = report.sections.filter(
    (section) => section.id !== 'recommendations' && section.title !== 'Recommendations',
  )

  return (
    <article
      className={`formal-report-page formal-report-print-root formal-report-print-root--${report.printOrientation} formal-report-page--${report.printOrientation}`}
      data-report-reference={report.reference}
    >
      <FormalReportHeader
        officeName={report.office.name}
        reportTitle={report.reportTitle}
        periodLabel={report.period.label}
      />
      <FormalReportDetails report={report} />

      {printableSections.map((section) => (
        <section key={section.id} className="formal-report-section">
          <h4>{section.title}</h4>
          {renderSection(section)}
        </section>
      ))}

      <section className="formal-report-section">
        <h4>Supervisor Observations</h4>
        <p className="formal-report-section__paragraph">{report.observations}</p>
      </section>

      <section className="formal-report-section">
        <h4>Recommendations</h4>
        <p className="formal-report-section__paragraph">{report.recommendations}</p>
      </section>

      <FormalReportApproval report={report} />
    </article>
  )
}

export default FormalReportPreview
