import { useCallback, useMemo, useState } from 'react'

import { notificationRecords } from '../data/notifications'
import {
  createCorrespondenceReceivedNotification,
  getNotificationStorageKey,
  hasNotificationForEvent,
  normalizeNotification,
  notificationBelongsToOffice,
} from '../utils/notifications'
import NotificationContext from './notification-context'
import { usePreferences } from './usePreferences'

function cloneNotification(notification) {
  return normalizeNotification({ ...notification })
}

function getStoredNotifications() {
  const storedValue = localStorage.getItem(getNotificationStorageKey())

  if (!storedValue) {
    return notificationRecords.map((notification) => cloneNotification(notification))
  }

  try {
    const parsedValue = JSON.parse(storedValue)
    return parsedValue.map((notification) => cloneNotification(notification))
  } catch {
    localStorage.removeItem(getNotificationStorageKey())
    return notificationRecords.map((notification) => cloneNotification(notification))
  }
}

export function NotificationProvider({ children }) {
  const { preferences } = usePreferences()
  const [notifications, setNotifications] = useState(getStoredNotifications)

  const persistNotifications = useCallback((nextNotifications) => {
    localStorage.setItem(getNotificationStorageKey(), JSON.stringify(nextNotifications))
  }, [])

  const markAsRead = useCallback((notificationId) => {
    setNotifications((current) => {
      const updatedNotifications = current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true, readAt: notification.readAt || new Date().toISOString() }
          : notification,
      )
      persistNotifications(updatedNotifications)
      return updatedNotifications
    })
  }, [persistNotifications])

  const markAsUnread = useCallback((notificationId) => {
    setNotifications((current) => {
      const updatedNotifications = current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: false, readAt: '' }
          : notification,
      )
      persistNotifications(updatedNotifications)
      return updatedNotifications
    })
  }, [persistNotifications])

  const markAllAsRead = useCallback((notificationIds = []) => {
    setNotifications((current) => {
      const idSet = new Set(notificationIds)
      const updatedNotifications = current.map((notification) =>
        !notificationIds.length || idSet.has(notification.id)
          ? {
              ...notification,
              isRead: true,
              readAt: notification.readAt || new Date().toISOString(),
            }
          : notification,
      )
      persistNotifications(updatedNotifications)
      return updatedNotifications
    })
  }, [persistNotifications])

  const addNotification = useCallback((notification) => {
    const normalizedNotification = normalizeNotification(notification)

    if (notification.type === 'Due Soon' && !preferences.deadlineReminders) {
      return
    }

    if (notification.type === 'Overdue' && !preferences.overdueAlerts) {
      return
    }

    setNotifications((current) => {
      if (hasNotificationForEvent(current, normalizedNotification)) {
        return current
      }

      const updatedNotifications = [cloneNotification(normalizedNotification), ...current]
      persistNotifications(updatedNotifications)
      return updatedNotifications
    })
  }, [persistNotifications, preferences.deadlineReminders, preferences.overdueAlerts])

  const markCorrespondenceNotificationAsRead = useCallback(
    ({ correspondenceReference, destinationOfficeId = '', destinationOfficeName = '', eventType = 'Correspondence Received' }) => {
      if (!correspondenceReference) {
        return
      }

      setNotifications((current) => {
        const updatedNotifications = current.map((notification) => {
          const normalizedNotification = normalizeNotification(notification)
          const matchesDestinationOffice =
            (destinationOfficeId &&
              normalizedNotification.destinationOfficeId === destinationOfficeId) ||
            (destinationOfficeName &&
              normalizedNotification.destinationOfficeName === destinationOfficeName)

          if (
            normalizedNotification.correspondenceReference === correspondenceReference &&
            normalizedNotification.eventType === eventType &&
            matchesDestinationOffice
          ) {
            return {
              ...normalizedNotification,
              isRead: true,
              readAt: normalizedNotification.readAt || new Date().toISOString(),
            }
          }

          return normalizedNotification
        })

        persistNotifications(updatedNotifications)
        return updatedNotifications
      })
    },
    [persistNotifications],
  )

  const getNotificationsForOffice = useCallback(
    (user) =>
      notifications
        .filter((notification) => notificationBelongsToOffice(notification, user))
        .map((notification) => cloneNotification(notification)),
    [notifications],
  )

  const getUnreadCountForOffice = useCallback(
    (user) =>
      notifications.filter(
        (notification) =>
          !notification.isRead && notificationBelongsToOffice(notification, user),
      ).length,
    [notifications],
  )

  const createReceivedNotification = useCallback((payload) => {
    return createCorrespondenceReceivedNotification(payload)
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      addNotification,
      markCorrespondenceNotificationAsRead,
      getNotificationsForOffice,
      getUnreadCountForOffice,
      createReceivedNotification,
    }),
    [
      addNotification,
      createReceivedNotification,
      getNotificationsForOffice,
      getUnreadCountForOffice,
      markAllAsRead,
      markAsRead,
      markAsUnread,
      markCorrespondenceNotificationAsRead,
      notifications,
    ],
  )

  // TODO: Replace this frontend notification store with protected backend notification APIs.
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
