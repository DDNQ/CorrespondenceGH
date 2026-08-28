import { FileText } from 'lucide-react'

function FormalReportEmptyState() {
  return (
    <div className="formal-report-empty-state">
      <div className="formal-report-empty-state__icon" aria-hidden="true">
        <FileText size={20} />
      </div>
      <h3>No report generated</h3>
    </div>
  )
}

export default FormalReportEmptyState
