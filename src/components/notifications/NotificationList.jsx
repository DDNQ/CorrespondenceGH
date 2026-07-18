import EmptyState from '../common/EmptyState'
import NotificationListItem from './NotificationListItem'

function NotificationList({ notifications, hasAnyNotifications, onOpen }) {
  if (!notifications.length) {
    return hasAnyNotifications ? (
      <EmptyState
        title="No notifications found"
        description="Try changing the search or filter criteria."
        compact
      />
    ) : (
      <EmptyState
        title="No notifications available"
        description="There are currently no correspondence notifications for this office."
        compact
      />
    )
  }

  return (
    <div className="notification-list">
      {notifications.map((notification) => (
        <NotificationListItem
          key={notification.id}
          notification={notification}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

export default NotificationList
