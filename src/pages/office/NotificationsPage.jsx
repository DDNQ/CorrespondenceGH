import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import StatCard from '../../components/common/StatCard'
import NotificationFilters from '../../components/notifications/NotificationFilters'
import NotificationList from '../../components/notifications/NotificationList'
import { useAuth } from '../../context/useAuth'
import { useNotification } from '../../context/useNotification'

const INITIAL_FILTERS = {
  search: '',
  type: 'All types',
  readStatus: 'All notifications',
}

function NotificationsPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const {
    getNotificationsForOffice,
    markAllAsRead,
    markAsRead,
  } = useNotification()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [noticeMessage, setNoticeMessage] = useState('')

  const officeName = currentUser?.officeName ?? 'Office'
  const officeNotifications = useMemo(
    () => getNotificationsForOffice(currentUser),
    [currentUser, getNotificationsForOffice],
  )

  const filteredNotifications = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()

    return officeNotifications.filter((notification) => {
      const haystack = [
        notification.title,
        notification.message,
        notification.correspondenceReference,
        notification.correspondenceSubject,
        notification.sourceOfficeName,
        notification.destinationOfficeName,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !searchTerm || haystack.includes(searchTerm)
      const matchesType =
        filters.type === 'All types' || notification.type === filters.type
      const matchesReadStatus =
        filters.readStatus === 'All notifications' ||
        (filters.readStatus === 'Unread' && !notification.isRead) ||
        (filters.readStatus === 'Read' && notification.isRead)

      return matchesSearch && matchesType && matchesReadStatus
    })
  }, [filters.readStatus, filters.search, filters.type, officeNotifications])

  const summary = useMemo(
    () => ({
      unread: officeNotifications.filter((notification) => !notification.isRead).length,
      newlyReceived: officeNotifications.filter((notification) => notification.type === 'New').length,
      dueSoon: officeNotifications.filter((notification) => notification.type === 'Due Soon').length,
      overdue: officeNotifications.filter((notification) => notification.type === 'Overdue').length,
    }),
    [officeNotifications],
  )

  const visibleUnreadIds = filteredNotifications
    .filter((notification) => !notification.isRead)
    .map((notification) => notification.id)

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS)
  }

  const handleOpenNotification = (notification) => {
    markAsRead(notification.id)
    navigate(notification.relatedRoute || `/correspondence/${encodeURIComponent(notification.correspondenceReference)}`)
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead(visibleUnreadIds)
    setNoticeMessage('All notifications marked as read.')
  }

  return (
    <section className="notifications-page">
      <PageHeader
        title="Notifications"
        description="Review correspondence updates, deadlines and office-routing activity."
        actions={
          visibleUnreadIds.length ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read
            </button>
          ) : null
        }
      />

      {noticeMessage ? <div className="notice-strip">{noticeMessage}</div> : null}

      <section className="summary-cards-grid notifications-summary-grid">
        <StatCard
          title="Unread"
          value={summary.unread}
          description="Notifications requiring review"
          tone="info"
        />
        <StatCard
          title="Newly Received"
          value={summary.newlyReceived}
          description="Correspondence received by your office"
        />
        <StatCard
          title="Due Soon"
          value={summary.dueSoon}
          description="Deadlines within 48 hours"
          tone="warning"
        />
        <StatCard
          title="Overdue"
          value={summary.overdue}
          description="Office deadlines exceeded"
          tone="danger"
        />
      </section>

      <NotificationFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <SectionCard
        title="Office Notifications"
        description={`Correspondence events affecting ${officeName}.`}
        action={
          <span className="muted-copy">
            {filteredNotifications.length} notification{filteredNotifications.length === 1 ? '' : 's'}
          </span>
        }
      >
        <NotificationList
          notifications={filteredNotifications}
          hasAnyNotifications={officeNotifications.length > 0}
          onOpen={handleOpenNotification}
        />
      </SectionCard>
    </section>
  )
}

export default NotificationsPage
