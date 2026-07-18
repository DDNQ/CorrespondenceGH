import { useEffect, useState } from 'react'

import { useAuth } from './useAuth'
import PreferencesContext from './preferences-context'

const PREFERENCES_STORAGE_KEY = 'mrh-correspondence-preferences'

const defaultPreferences = {
  deadlineReminders: true,
  overdueAlerts: true,
  compactListView: false,
}

function getStoredPreferences() {
  const storedValue = localStorage.getItem(PREFERENCES_STORAGE_KEY)

  if (!storedValue) {
    return {}
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    localStorage.removeItem(PREFERENCES_STORAGE_KEY)
    return {}
  }
}

export function PreferencesProvider({ children }) {
  const { currentUser } = useAuth()
  const [storedPreferences, setStoredPreferences] = useState(getStoredPreferences)

  const currentUserPreferences = currentUser?.id
    ? {
        ...defaultPreferences,
        ...(storedPreferences[currentUser.id] ?? {}),
      }
    : { ...defaultPreferences }

  const updatePreferences = (nextPreferences) => {
    if (!currentUser?.id) {
      return
    }

    setStoredPreferences((current) => {
      const resolvedPreferences =
        typeof nextPreferences === 'function'
          ? nextPreferences({
              ...defaultPreferences,
              ...(current[currentUser.id] ?? {}),
            })
          : nextPreferences

      const updatedPreferences = {
        ...current,
        [currentUser.id]: {
          ...defaultPreferences,
          ...resolvedPreferences,
        },
      }

      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updatedPreferences))
      return updatedPreferences
    })
  }

  useEffect(() => {
    document.body.classList.toggle(
      'app-preference-compact',
      currentUserPreferences.compactListView,
    )

    return () => {
      document.body.classList.remove('app-preference-compact')
    }
  }, [currentUserPreferences.compactListView])

  const value = {
    preferences: currentUserPreferences,
    updatePreferences,
  }

  // TODO: Replace localStorage-backed preferences with the backend user-profile API.
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
