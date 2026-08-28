import EmptyState from '../../components/common/EmptyState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'

function AuditLogPage() {
  return (
    <section className="admin-page">
      <div className="admin-page-content">
        <PageHeader
          eyebrow="Administration"
          title="System Audit Log"
        />

        <SectionCard
          className="admin-section-card"
          title="Audit Log Unavailable"
        >
          <EmptyState
            title="Audit activity unavailable"
            description="System audit records are not currently available."
            compact
          />
        </SectionCard>
      </div>
    </section>
  )
}

export default AuditLogPage
