import { isAdmin } from '../constants/roles.js'
import {
  getCorrespondenceApiId,
  getCorrespondenceDisplayReference,
} from './correspondence.js'
import { isSameOffice, normalizeOffice } from './offices.js'

const NOTIFICATION_STORAGE_KEY = 'mrh-correspondence-notifications'

export function getNotificationStorageKey() {
  return NOTIFICATION_STORAGE_KEY
}

export function normalizeNotification(notification) {
  if (!notification) {
    return null
  }

  const destinationOffice = normalizeOffice(
    notification.destinationOffice ??
      notification.destination_office ??
      notification.destinationOfficeId ??
      notification.destination_office_id ??
      notification.destinationOfficeName ??
      notification.destination_office_name ??
      null,
  )
  const sourceOffice = normalizeOffice(
    notification.sourceOffice ??
      notification.source_office ??
      notification.originatingOffice ??
      notification.originating_office ??
      notification.sourceOfficeId ??
      notification.source_office_id ??
      notification.sourceOfficeName ??
      notification.source_office_name ??
      null,
  )

  return {
    ...notification,
    type: notification.type ?? 'New',
    title: notification.title ?? 'Correspondence received from another office',
    message: notification.message ?? '',
    correspondenceId:
      notification.correspondenceId ?? notification.correspondence_id ?? null,
    referenceNumber:
      notification.referenceNumber ??
      notification.reference_number ??
      notification.correspondenceReference ??
      '',
    correspondenceReference: notification.correspondenceReference ?? '',
    correspondenceSubject: notification.correspondenceSubject ?? '',
    destinationOffice,
    destinationOfficeId: destinationOffice?.id ?? null,
    destinationOfficeName: destinationOffice?.name ?? '',
    sourceOffice,
    sourceOfficeId: sourceOffice?.id ?? null,
    sourceOfficeName: sourceOffice?.name ?? '',
    originatingOffice: sourceOffice?.name ?? '',
    relatedRoute:
      notification.relatedRoute ??
      ((notification.referenceNumber ?? notification.correspondenceReference)
        ? `/correspondence/${encodeURIComponent(
            notification.referenceNumber ?? notification.correspondenceReference,
          )}`
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

  if (isAdmin(user)) {
    return false
  }

  const normalizedNotification = normalizeNotification(notification)

  return isSameOffice(normalizedNotification.destinationOffice, user.office)
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
    normalizeOffice(destinationOffice ?? record?.currentOffice ?? record?.destinationOffice)
  const normalizedSourceOffice =
    normalizeOffice(sourceOffice ?? record?.registeringOffice ?? forwardingEvent?.fromOffice)

  return normalizeNotification({
    id: `notif-${eventId}`,
    type: 'New',
    title,
    message,
    correspondenceId: getCorrespondenceApiId(record),
    referenceNumber: getCorrespondenceDisplayReference(record),
    correspondenceReference: getCorrespondenceDisplayReference(record),
    correspondenceSubject: record.subject,
    destinationOffice: normalizedDestinationOffice,
    destinationOfficeId: normalizedDestinationOffice?.id ?? null,
    destinationOfficeName: normalizedDestinationOffice?.name ?? '',
    sourceOffice: normalizedSourceOffice,
    sourceOfficeId: normalizedSourceOffice?.id ?? null,
    sourceOfficeName: normalizedSourceOffice?.name ?? '',
    relatedRoute: `/correspondence/${encodeURIComponent(getCorrespondenceDisplayReference(record))}`,
    createdAt,
    isRead: false,
    readAt: '',
    eventId,
    eventType: 'Correspondence Received',
    deadlineState: record.deadlineState ?? 'normal',
  })
}
