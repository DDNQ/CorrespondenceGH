import { Info } from 'lucide-react'
import { useMemo, useState } from 'react'

import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import { ROLES } from '../../constants/roles'
import { useAuth } from '../../context/useAuth'
import { usePreferences } from '../../context/usePreferences'
import { useToast } from '../../context/useToast'

const TABS = [
  { id: 'account', label: 'Account & Office' },
  { id: 'preferences', label: 'Preferences' },
]

const preferenceFields = [
  {
    key: 'deadlineReminders',
    title: 'Deadline reminders',
    description: 'Show reminders for correspondence approaching its office deadline.',
  },
  {
    key: 'overdueAlerts',
    title: 'Overdue alerts',
    description: 'Highlight overdue correspondence requiring attention from your office.',
  },
  {
    key: 'compactListView',
    title: 'Compact list view',
    description: 'Use slightly tighter spacing when browsing correspondence lists.',
  },
]

function formatRoleLabel(role) {
  if (role === ROLES.OFFICE_SUPERVISOR) {
    return 'Office Supervisor'
  }

  if (role === ROLES.SYSTEM_ADMIN) {
    return 'System Administrator'
  }

  return 'Office User'
}

function getInitials(name) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'MR'
}

function getFieldValue(value) {
  return value || 'Not recorded'
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="settings-readonly-field">
      <label>{label}</label>
      <input value={getFieldValue(value)} readOnly tabIndex={-1} aria-readonly="true" />
    </div>
  )
}

function PreferenceToggle({ id, checked, title, description, onChange }) {
  const descriptionId = `${id}-description`

  return (
    <div className="settings-preference-row">
      <div className="settings-preference-row__copy">
        <h3>{title}</h3>
        <p id={descriptionId}>{description}</p>
      </div>
      <button
        type="button"
        id={id}
        className={`toggle-switch ${checked ? 'toggle-switch--checked' : ''}`.trim()}
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        onClick={onChange}
      >
        <span className="toggle-switch__track">
          <span className="toggle-switch__thumb"></span>
        </span>
      </button>
    </div>
  )
}

function SettingsPage() {
  const { currentUser } = useAuth()
  const { preferences, updatePreferences } = usePreferences()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('account')
  const [draftPreferences, setDraftPreferences] = useState(preferences)
  const [isSaving, setIsSaving] = useState(false)

  const identityLine = useMemo(
    () => `${formatRoleLabel(currentUser?.role)} • ${getFieldValue(currentUser?.officeName)}`,
    [currentUser?.officeName, currentUser?.role],
  )

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draftPreferences) !== JSON.stringify(preferences),
    [draftPreferences, preferences],
  )

  const handleTogglePreference = (key) => {
    setDraftPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const handleSavePreferences = async () => {
    setIsSaving(true)

    await new Promise((resolve) => {
      window.setTimeout(resolve, 350)
    })

    updatePreferences(draftPreferences)
    setIsSaving(false)
    showToast({
      title: 'Preferences saved successfully.',
      message: 'Your account preferences have been updated.',
    })
  }

  return (
    <section className="settings-page">
      <PageHeader
        title="Account & Preferences"
        description="View your account and office information and manage simple personal preferences."
      />

      <div className="settings-layout">
        <SectionCard className="settings-nav-card">
          <div className="settings-nav" role="tablist" aria-label="Account and preferences sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`settings-panel-${tab.id}`}
                className={activeTab === tab.id ? 'settings-nav__button settings-nav__button--active' : 'settings-nav__button'}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </SectionCard>

        {activeTab === 'account' ? (
          <SectionCard
            className="settings-content-card"
            title="Account Information"
            description="Your login identity and office association."
          >
            <div
              id="settings-panel-account"
              role="tabpanel"
              aria-labelledby="settings-tab-account"
              className="settings-panel"
            >
              <div className="settings-profile">
                <div className="settings-profile__avatar" aria-hidden="true">
                  {getInitials(currentUser?.fullName)}
                </div>
                <div className="settings-profile__copy">
                  <strong>{getFieldValue(currentUser?.fullName)}</strong>
                  <span>{identityLine}</span>
                </div>
              </div>

              <div className="account-fields">
                <ReadOnlyField label="Display Name" value={currentUser?.fullName} />
                <ReadOnlyField label="Email Address" value={currentUser?.email} />
                <ReadOnlyField label="Office" value={currentUser?.officeName} />
                <ReadOnlyField label="Role" value={formatRoleLabel(currentUser?.role)} />
              </div>

              <div className="settings-info-notice" role="note" aria-label="Administrator-managed account information notice">
                <div className="settings-info-notice__icon" aria-hidden="true">
                  <Info size={18} />
                </div>
                <div className="settings-info-notice__copy">
                  <p>
                    <strong>Administrator-controlled account:</strong> your name, email address, role, office assignment, password and access status can only be changed by the system administrator.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === 'preferences' ? (
          <SectionCard
            className="settings-content-card"
            title="System Preferences"
            description="Simple personal display and notification settings."
          >
            <div
              id="settings-panel-preferences"
              role="tabpanel"
              aria-labelledby="settings-tab-preferences"
              className="settings-panel"
            >
              <div className="settings-preferences-list">
                {preferenceFields.map((field) => (
                  <PreferenceToggle
                    key={field.key}
                    id={`preference-${field.key}`}
                    checked={draftPreferences[field.key]}
                    title={field.title}
                    description={field.description}
                    onChange={() => handleTogglePreference(field.key)}
                  />
                ))}
              </div>

              <div className="settings-actions">
                <button
                  type="button"
                  className="button button--primary"
                  disabled={isSaving || !hasUnsavedChanges}
                  onClick={handleSavePreferences}
                >
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </section>
  )
}

export default SettingsPage
