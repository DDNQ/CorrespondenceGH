import { ROLES } from '../constants/roles'
import { getOfficeById, offices } from '../data/offices'

const NOTIFICATION_STORAGE_KEY = 'mrh-correspondence-notifications'

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getOfficeByName(officeName) {
  const normalizedOfficeName = normalizeText(officeName)

  return offices.find((office) => normalizeText(office.name) === normalizedOfficeName) ?? null
}

export function getNotificationStorageKey() {
  return NOTIFICATION_STORAGE_KEY
}

export function normalizeNotification(notification) {
  if (!notification) {
    return null
  }

  const destinationOfficeName =
    notification.destinationOfficeName ??
    notification.destinationOffice ??
    getOfficeById(notification.destinationOfficeId)?.name ??
    ''
  const sourceOfficeName =
    notification.sourceOfficeName ??
    notification.originatingOffice ??
    notification.sourceOffice ??
    getOfficeById(notification.sourceOfficeId)?.name ??
    ''

  return {
    ...notification,
    type: notification.type ?? 'New',
    title: notification.title ?? 'Correspondence received from another office',
    message: notification.message ?? '',
    correspondenceReference: notification.correspondenceReference ?? '',
    correspondenceSubject: notification.correspondenceSubject ?? '',
    destinationOfficeId:
      notification.destinationOfficeId ??
      getOfficeByName(destinationOfficeName)?.id ??
      '',
    destinationOfficeName,
    destinationOffice: destinationOfficeName,
    sourceOfficeId:
      notification.sourceOfficeId ??
      getOfficeByName(sourceOfficeName)?.id ??
      '',
    sourceOfficeName,
    sourceOffice: sourceOfficeName,
    originatingOffice: sourceOfficeName,
    relatedRoute:
      notification.relatedRoute ??
      (notification.correspondenceReference
        ? `/correspondence/${encodeURIComponent(notification.correspondenceReference)}`
        : '/notifications'),
    createdAt: notification.createdAt ?? '',
    isRead: notification.isRead ?? false,
    readAt: notification.readAt ?? '',
    eventId: notification.eventId ?? notification.id ?? '',
    eventType: notification.eventType ?? notification.type ?? 'Notification',
    deadlineState: notification.deadlineState ?? 'normal',
  }
}

export function notificationBelongsToOffice(notification, user) {
  if (!notification || !user) {
    return false
  }

  if (user.role === ROLES.SYSTEM_ADMIN) {
    return false
  }

  const normalizedNotification = normalizeNotification(notification)

  if (
    normalizedNotification.destinationOfficeId &&
    user.officeId &&
    normalizedNotification.destinationOfficeId === user.officeId
  ) {
    return true
  }

  return (
    normalizeText(normalizedNotification.destinationOfficeName) ===
    normalizeText(user.officeName)
  )
}

export function hasNotificationForEvent(currentNotifications, notification) {
  const normalizedNotification = normalizeNotification(notification)

  return currentNotifications.some((currentNotification) => {
    const normalizedCurrentNotification = normalizeNotification(currentNotification)

    return (
      normalizedCurrentNotification.eventId &&
      normalizedCurrentNotification.eventId === normalizedNotification.eventId &&
      normalizedCurrentNotification.eventType === normalizedNotification.eventType &&
      normalizedCurrentNotification.destinationOfficeId ===
        normalizedNotification.destinationOfficeId
    )
  })
}

export function createCorrespondenceReceivedNotification({
  record,
  forwardingEvent = null,
  sourceOffice,
  destinationOffice,
  createdAt,
  message,
  eventId,
  title = 'Correspondence received from another office',
}) {
  const normalizedDestinationOffice =
    destinationOffice?.id || destinationOffice?.name
      ? destinationOffice
      : getOfficeByName(
          record?.currentOfficeName ?? record?.currentOffice ?? record?.destinationOffice ?? '',
        )
  const normalizedSourceOffice =
    sourceOffice?.id || sourceOffice?.name
      ? sourceOffice
      : getOfficeByName(
          record?.registeringOfficeName ??
            record?.registeringOffice ??
            forwardingEvent?.fromOfficeName ??
            '',
        )

  return normalizeNotification({
    id: `notif-${eventId}`,
    type: 'New',
    title,
    message,
    correspondenceReference: record.reference,
    correspondenceSubject: record.subject,
    destinationOfficeId: normalizedDestinationOffice?.id ?? '',
    destinationOfficeName: normalizedDestinationOffice?.name ?? '',
    sourceOfficeId: normalizedSourceOffice?.id ?? '',
    sourceOfficeName: normalizedSourceOffice?.name ?? '',
    relatedRoute: `/correspondence/${encodeURIComponent(record.reference)}`,
    createdAt,
    isRead: false,
    readAt: '',
    eventId,
    eventType: 'Correspondence Received',
    deadlineState: record.deadlineState ?? 'normal',
  })
}
