import EmptyState from '../../components/common/EmptyState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'

function NotificationsPage() {
  return (
    <section className="notifications-page">
      <PageHeader
        title="Notifications"
      />

      <SectionCard title="Notifications Unavailable">
        <EmptyState
          title="Notifications unavailable"
          description="Notification records are not currently available."
        />
      </SectionCard>
    </section>
  )
}

export default NotificationsPage
