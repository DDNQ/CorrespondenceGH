import {
  AlertCircle,
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  Clock3,
} from 'lucide-react'

const typeConfig = {
  New: {
    icon: Bell,
    tone: 'new',
  },
  'Due Soon': {
    icon: Clock3,
    tone: 'due-soon',
  },
  Overdue: {
    icon: AlertCircle,
    tone: 'overdue',
  },
  Forwarded: {
    icon: ArrowRightLeft,
    tone: 'forwarded',
  },
  Completed: {
    icon: CheckCircle2,
    tone: 'completed',
  },
}

function NotificationListItem({ notification, onOpen }) {
  const config = typeConfig[notification.type] ?? typeConfig.New
  const Icon = config.icon

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(notification)
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      className={`notification-item notification-item--${config.tone} ${
        notification.isRead ? 'notification-item--read' : 'notification-item--unread'
      }`.trim()}
      onClick={() => onOpen(notification)}
      onKeyDown={handleKeyDown}
      aria-label={`${notification.type} notification: ${notification.title}. ${
        notification.isRead ? 'Read' : 'Unread'
      }. Open correspondence ${notification.correspondenceReference}.`}
    >
      <span className={`notification-item__marker notification-item__marker--${config.tone}`} aria-hidden="true">
        <Icon size={16} />
      </span>

      <div className="notification-item__content">
        <strong>{notification.title}</strong>
        <p>{notification.message}</p>
        <div className="notification-item__meta">
          <span className="notification-item__reference">{notification.correspondenceReference}</span>
          <span>{notification.correspondenceSubject}</span>
          <span>
            {notification.sourceOfficeName || notification.originatingOffice} to {notification.destinationOfficeName || notification.destinationOffice}
          </span>
        </div>
      </div>

      <div className="notification-item__aside">
        <span className="notification-item__time">{notification.createdAt}</span>
        <span
          className={`notification-item__read-state ${
            notification.isRead
              ? 'notification-item__read-state--read'
              : 'notification-item__read-state--unread'
          }`}
        >
          {notification.isRead ? 'Read' : 'Unread'}
        </span>
      </div>
    </article>
  )
}

export default NotificationListItem
