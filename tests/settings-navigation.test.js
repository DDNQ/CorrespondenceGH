import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appPath = new URL('../src/App.jsx', import.meta.url)
const sidebarPath = new URL('../src/components/layout/Sidebar.jsx', import.meta.url)
const navigationPath = new URL('../src/utils/navigation.js', import.meta.url)
const settingsPagePath = new URL('../src/pages/office/SettingsPage.jsx', import.meta.url)

test('settings navigation remains canonically wired to /settings for office users, supervisors, and admins', () => {
  const navigationSource = readFileSync(navigationPath, 'utf8')

  assert.ok(
    navigationSource.includes("footer: [{ label: 'Settings', to: '/settings', icon: Settings }]"),
  )
  assert.ok(navigationSource.includes('[USER_ROLES.ADMIN]: {'))
  assert.ok(
    navigationSource.includes(
      "[USER_ROLES.ADMIN]: {\n    primary: [{ label: 'Dashboard', to: '/admin/dashboard', icon: Gauge }],",
    ),
  )
  assert.ok(
    navigationSource.includes(
      "{ label: 'Users & Offices', to: '/admin/users-offices', icon: UsersRound }",
    ),
  )
  assert.equal(
    navigationSource.includes("{ label: 'Audit Log', to: '/admin/audit-log', icon: Lock }"),
    false,
  )
})

test('settings route remains declared under the shared role gate that includes admins, while reports stay supervisor-only', () => {
  const appSource = readFileSync(appPath, 'utf8')

  assert.ok(
    appSource.includes(
      '<RoleRoute\n                allowedRoles={[USER_ROLES.OFFICE_USER, USER_ROLES.SUPERVISOR, USER_ROLES.ADMIN]}',
    ),
  )
  assert.ok(appSource.includes('<Route path="/settings" element={<SettingsPage />} />'))
  assert.ok(appSource.includes('<Route element={<RoleRoute allowedRoles={[USER_ROLES.SUPERVISOR]} />}>'))
  assert.ok(appSource.includes('<Route path="/reports" element={<OfficeReportsPage />} />'))
})

test('sidebar footer keeps settings route-driven active state and leaves logout as a separate action', () => {
  const sidebarSource = readFileSync(sidebarPath, 'utf8')

  assert.ok(sidebarSource.includes('to={item.to}'))
  assert.ok(sidebarSource.includes("isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'"))
  assert.ok(sidebarSource.includes("className=\"sidebar-link sidebar-link--button sidebar-link--logout\""))
  assert.equal(sidebarSource.includes("navigate('/settings'"), false)
})

test('settings page reuses the shared workspace and presents admins as system-wide users', () => {
  const settingsPageSource = readFileSync(settingsPagePath, 'utf8')

  assert.ok(settingsPageSource.includes("const officeName = isAdmin(currentUser) ? 'System-wide' : getOfficeDisplayName(currentUser?.office)"))
  assert.ok(settingsPageSource.includes('const displayName = getAdminUserDisplayName(currentUser)'))
  assert.ok(settingsPageSource.includes('<PageHeader title="Account & Preferences" />'))
  assert.ok(settingsPageSource.includes('<strong>{getFieldValue(displayName)}</strong>'))
  assert.ok(settingsPageSource.includes('<span>{identityLine}</span>'))
  assert.ok(settingsPageSource.includes('ReadOnlyField label="Office" value={officeName}'))
  assert.ok(settingsPageSource.includes('ReadOnlyField label="Display Name" value={displayName}'))
  assert.ok(settingsPageSource.includes('ReadOnlyField label="Role" value={getUserRoleLabel(currentUser?.role)}'))
})
