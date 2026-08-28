import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import Modal from '../../components/common/Modal.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import AdminMetricCard from '../../components/admin/AdminMetricCard.jsx'
import { USER_ROLES, getUserRoleLabel } from '../../constants/roles.js'
import { useToast } from '../../context/useToast.js'
import { ApiError } from '../../services/api/errors.js'
import { getServiceBundle } from '../../services/serviceProvider.js'
import {
  getOfficeDisplayLabel,
} from '../../utils/offices.js'
import {
  buildOfficeDirectoryRows,
  filterAdminUsers,
  filterOfficeDirectory,
  getAdminUserDisplayName,
  getAdminUserLastLoginLabel,
  getAdminUserOfficeLabel,
  getAdminUserSecondaryEmail,
  getDirectoryOfficeFilterValue,
  getOfficeStatusLabel,
  getUserStatusLabel,
  summarizeOfficeDirectory,
  summarizeUserDirectory,
} from '../../utils/adminUsersOffices.js'
import {
  buildCreateUserPayload,
  createCredentialResult,
  createEmptyOfficeForm,
  createEmptyUserForm,
  mapApiAdminActionError,
  validateOfficeCreateInput,
  validateUserCreateInput,
} from './apiAdminSetupUtils.js'

const ADMIN_TABS = Object.freeze({
  USERS: 'users',
  OFFICES: 'offices',
})

function createEmptyUserFilters() {
  return {
    query: '',
    role: '',
    officeId: '',
    status: '',
  }
}

function createEmptyOfficeFilters() {
  return {
    query: '',
    status: '',
  }
}

function getDirectoryLoadErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }

    if (error.status === 403) {
      return null
    }

    if (error.status === 404) {
      return 'The administrator directory could not be found.'
    }

    if (error.code === 'API_CONTRACT_MISMATCH') {
      return 'The administrator directory response could not be understood.'
    }

    if (error.code === 'NETWORK_ERROR') {
      return 'Unable to reach the administrator directory service. Please check your connection and try again.'
    }

    if (error.code === 'REQUEST_TIMEOUT') {
      return 'The administrator directory service took too long to respond. Please try again.'
    }

    if (error.status && error.status >= 500) {
      return 'The administrator directory is currently unavailable. Please try again later.'
    }
  }

  return 'The administrator directory could not be loaded right now. Please try again.'
}

function DirectoryLoadingState() {
  return (
    <section className="admin-page">
      <div className="admin-page-content">
        <PageHeader
          title="Users & Offices"
        />

        <SectionCard className="admin-section-card" title="Loading directory">
          <EmptyState
            title="Loading users and offices"
            description="Please wait."
            compact
          />
        </SectionCard>
      </div>
    </section>
  )
}

function DirectoryErrorState({ message, onRetry }) {
  return (
    <section className="admin-page">
      <div className="admin-page-content">
        <PageHeader
          title="Users & Offices"
        />

        <SectionCard className="admin-section-card" title="Directory unavailable">
          <EmptyState
            title="Unable to load users and offices"
            description={message}
            action={
              <button type="button" className="button button--secondary" onClick={onRetry}>
                Retry
              </button>
            }
          />
        </SectionCard>
      </div>
    </section>
  )
}

function ApiAdminSetupPage() {
  const { showToast } = useToast()
  const services = useMemo(() => getServiceBundle(), [])
  const officeService = services?.offices ?? null
  const userAdminService = services?.users ?? null
  const dashboardService = services?.dashboards ?? null

  const [retryCount, setRetryCount] = useState(0)
  const [activeTab, setActiveTab] = useState(ADMIN_TABS.USERS)
  const [directoryState, setDirectoryState] = useState({
    status: 'loading',
    users: [],
    offices: [],
    summary: null,
    error: null,
  })

  const [userFilters, setUserFilters] = useState(() => createEmptyUserFilters())
  const [officeFilters, setOfficeFilters] = useState(() => createEmptyOfficeFilters())

  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userForm, setUserForm] = useState(() => createEmptyUserForm())
  const [userFormErrors, setUserFormErrors] = useState({})
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false)
  const [officeForm, setOfficeForm] = useState(() => createEmptyOfficeForm())
  const [officeFormErrors, setOfficeFormErrors] = useState({})
  const [isCreatingOffice, setIsCreatingOffice] = useState(false)

  const [selectedUser, setSelectedUser] = useState(null)
  const [isConfirmingPasswordReset, setIsConfirmingPasswordReset] = useState(false)
  const [isRegeneratingPassword, setIsRegeneratingPassword] = useState(false)
  const [credentialResult, setCredentialResult] = useState(null)

  useEffect(() => {
    let isActive = true
    const abortController = new AbortController()

    async function loadDirectory() {
      setDirectoryState((currentState) => ({
        ...currentState,
        status: 'loading',
        error: null,
      }))

      try {
        const [offices, users, adminSummaryResult] = await Promise.all([
          officeService.listOffices({ signal: abortController.signal }),
          userAdminService.listUsers({ signal: abortController.signal }),
          dashboardService?.getAdminDashboardSummary
            ? dashboardService.getAdminDashboardSummary({ signal: abortController.signal }).catch(
                () => null,
              )
            : Promise.resolve(null),
        ])

        if (!isActive) {
          return
        }

        setDirectoryState({
          status: 'success',
          users,
          offices,
          summary: adminSummaryResult,
          error: null,
        })
      } catch (error) {
        if (!isActive || error?.name === 'AbortError') {
          return
        }

        setDirectoryState({
          status: 'error',
          users: [],
          offices: [],
          summary: null,
          error,
        })
      }
    }

    if (officeService && userAdminService) {
      void loadDirectory()
    }

    return () => {
      isActive = false
      abortController.abort()
    }
  }, [dashboardService, officeService, retryCount, userAdminService])

  const usersSummary = useMemo(
    () => summarizeUserDirectory(directoryState.users),
    [directoryState.users],
  )
  const officeRows = useMemo(
    () =>
      buildOfficeDirectoryRows(
        directoryState.offices,
        directoryState.users,
        directoryState.summary?.officeBreakdown ?? [],
      ),
    [directoryState.offices, directoryState.summary?.officeBreakdown, directoryState.users],
  )
  const officesSummary = useMemo(
    () => summarizeOfficeDirectory(officeRows),
    [officeRows],
  )
  const filteredUsers = useMemo(
    () => filterAdminUsers(directoryState.users, userFilters),
    [directoryState.users, userFilters],
  )
  const filteredOffices = useMemo(
    () => filterOfficeDirectory(officeRows, officeFilters),
    [officeFilters, officeRows],
  )

  const officeOptions = useMemo(
    () =>
      directoryState.offices.map((office) => ({
        value: getDirectoryOfficeFilterValue(office),
        label: getOfficeDisplayLabel(office),
      })),
    [directoryState.offices],
  )

  const handleDismissCredentialResult = () => {
    setCredentialResult(null)
  }

  const handleCopyValue = async (value, label) => {
    const safeValue = String(value ?? '').trim()

    if (!safeValue || !navigator?.clipboard?.writeText) {
      return
    }

    await navigator.clipboard.writeText(safeValue)
    showToast({
      title: `${label} copied.`,
    })
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()

    if (isCreatingUser || !userAdminService) {
      return
    }

    const validationErrors = validateUserCreateInput(userForm)
    setUserFormErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsCreatingUser(true)

    try {
      const response = await userAdminService.createUser(buildCreateUserPayload(userForm))

      setDirectoryState((currentState) => ({
        ...currentState,
        users: [
          response.user,
          ...currentState.users.filter((user) => user?.id !== response.user?.id),
        ],
      }))
      setUserForm(createEmptyUserForm())
      setUserFormErrors({})
      setIsUserModalOpen(false)
      setCredentialResult(
        createCredentialResult({
          title: 'User account created successfully',
          user: response.user,
          email: response.user?.email ?? '',
          generatedPassword: response.generatedPassword ?? '',
        }),
      )
      showToast({
        title: 'User account created successfully.',
      })
    } catch (error) {
      const normalizedError = mapApiAdminActionError(
        error,
        'Unable to create the user account. Please try again.',
      )

      setUserFormErrors({
        ...normalizedError.fields,
        form: normalizedError.form,
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleCreateOffice = async (event) => {
    event.preventDefault()

    if (isCreatingOffice || !officeService) {
      return
    }

    const validationErrors = validateOfficeCreateInput(officeForm)
    setOfficeFormErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsCreatingOffice(true)

    try {
      const createdOffice = await officeService.createOffice(officeForm)

      setDirectoryState((currentState) => ({
        ...currentState,
        offices: [
          createdOffice,
          ...currentState.offices.filter((office) => office?.id !== createdOffice?.id),
        ],
      }))
      setOfficeForm(createEmptyOfficeForm())
      setOfficeFormErrors({})
      setIsOfficeModalOpen(false)
      showToast({
        title: 'Office created successfully.',
      })
    } catch (error) {
      const normalizedError = mapApiAdminActionError(
        error,
        'Unable to create the office. Please try again.',
      )

      setOfficeFormErrors({
        ...normalizedError.fields,
        form: normalizedError.form,
      })
    } finally {
      setIsCreatingOffice(false)
    }
  }

  const handleConfirmPasswordRegeneration = async () => {
    if (isRegeneratingPassword || !userAdminService || !selectedUser?.id) {
      return
    }

    setIsRegeneratingPassword(true)

    try {
      const response = await userAdminService.regenerateUserPassword(selectedUser.id)

      setIsConfirmingPasswordReset(false)
      setSelectedUser(null)
      setCredentialResult(
        createCredentialResult({
          title: 'Temporary password regenerated',
          user: response.user ?? selectedUser,
          email: response.email ?? response.user?.email ?? selectedUser?.email ?? '',
          generatedPassword: response.generatedPassword ?? '',
        }),
      )
      showToast({
        title: 'Temporary password regenerated.',
      })
    } catch (error) {
      const normalizedError = mapApiAdminActionError(
        error,
        'Unable to regenerate the temporary password. Please try again.',
      )

      showToast({
        title: normalizedError.form,
      })
      setIsConfirmingPasswordReset(false)
    } finally {
      setIsRegeneratingPassword(false)
    }
  }

  if (directoryState.status === 'loading') {
    return <DirectoryLoadingState />
  }

  if (directoryState.error?.status === 403) {
    return <Navigate to="/access-denied" replace />
  }

  if (directoryState.status === 'error') {
    return (
      <DirectoryErrorState
        message={getDirectoryLoadErrorMessage(directoryState.error)}
        onRetry={() => setRetryCount((current) => current + 1)}
      />
    )
  }

  return (
    <>
      <section className="admin-page">
        <div className="admin-page-content">
          <PageHeader
            title="Users & Offices"
            actions={
              <div className="admin-page-actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    if (activeTab === ADMIN_TABS.USERS) {
                      setUserForm(createEmptyUserForm())
                      setUserFormErrors({})
                      setIsUserModalOpen(true)
                      return
                    }

                    setOfficeForm(createEmptyOfficeForm())
                    setOfficeFormErrors({})
                    setIsOfficeModalOpen(true)
                  }}
                >
                  {activeTab === ADMIN_TABS.USERS ? 'Add User' : 'Add Office'}
                </button>
              </div>
            }
          />

          <div className="tabs admin-tabs" role="tablist" aria-label="Users and offices">
            <button
              type="button"
              role="tab"
              className={`tab-button admin-tab-button${activeTab === ADMIN_TABS.USERS ? ' tab-button--active' : ''}`}
              aria-selected={activeTab === ADMIN_TABS.USERS}
              onClick={() => setActiveTab(ADMIN_TABS.USERS)}
            >
              Users
            </button>
            <button
              type="button"
              role="tab"
              className={`tab-button admin-tab-button${activeTab === ADMIN_TABS.OFFICES ? ' tab-button--active' : ''}`}
              aria-selected={activeTab === ADMIN_TABS.OFFICES}
              onClick={() => setActiveTab(ADMIN_TABS.OFFICES)}
            >
              Offices
            </button>
          </div>

          {activeTab === ADMIN_TABS.USERS ? (
            <>
              <section className="admin-metric-grid admin-users-metrics">
                <AdminMetricCard
                  label="Total Users"
                  value={usersSummary.totalUsers}
                  tone="default"
                />
                <AdminMetricCard
                  label="Active Users"
                  value={usersSummary.activeUsers}
                  tone="default"
                />
                <AdminMetricCard
                  label="Administrators"
                  value={usersSummary.administrators}
                  tone="blue"
                />
                <AdminMetricCard
                  label="Offices Represented"
                  value={usersSummary.officesRepresented}
                  tone="default"
                />
              </section>

              <div className="filter-bar admin-user-filter-grid">
                <input
                  type="search"
                  placeholder="Search name or email"
                  value={userFilters.query}
                  onChange={(event) =>
                    setUserFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  aria-label="Search users"
                />
                <select
                  value={userFilters.role}
                  onChange={(event) =>
                    setUserFilters((current) => ({
                      ...current,
                      role: event.target.value,
                    }))
                  }
                  aria-label="Filter users by role"
                >
                  <option value="">All roles</option>
                  {Object.values(USER_ROLES).map((role) => (
                    <option key={role} value={role}>
                      {getUserRoleLabel(role)}
                    </option>
                  ))}
                </select>
                <select
                  value={userFilters.officeId}
                  onChange={(event) =>
                    setUserFilters((current) => ({
                      ...current,
                      officeId: event.target.value,
                    }))
                  }
                  aria-label="Filter users by office"
                >
                  <option value="">All offices</option>
                  {officeOptions.map((office) => (
                    <option key={office.value} value={office.value}>
                      {office.label}
                    </option>
                  ))}
                </select>
                <select
                  value={userFilters.status}
                  onChange={(event) =>
                    setUserFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  aria-label="Filter users by status"
                >
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setUserFilters(createEmptyUserFilters())}
                >
                  Reset
                </button>
              </div>

              <SectionCard
                className="admin-section-card"
                title="System Users"
              >
                {filteredUsers.length ? (
                  <div className="table-card">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Office</th>
                          <th>Status</th>
                          <th>Last Login</th>
                          <th>Account Control</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id ?? `${user.email}-${user.fullName}`}>
                            <td>
                              <div className="admin-user-cell">
                                <strong>{getAdminUserDisplayName(user)}</strong>
                                {getAdminUserSecondaryEmail(user) ? (
                                  <span className="muted-copy">
                                    {getAdminUserSecondaryEmail(user)}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td>{getUserRoleLabel(user.role)}</td>
                            <td>{getAdminUserOfficeLabel(user)}</td>
                            <td>
                              {getUserStatusLabel(user) === 'Unavailable' ? (
                                'Unavailable'
                              ) : (
                                <StatusBadge status={getUserStatusLabel(user)} />
                              )}
                            </td>
                            <td>{getAdminUserLastLoginLabel(user)}</td>
                            <td>
                              <button
                                type="button"
                                className="button button--secondary admin-account-action"
                                onClick={() => setSelectedUser(user)}
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No users found"
                    description="Adjust the search or filters to view the user directory."
                    compact
                  />
                )}
              </SectionCard>
            </>
          ) : (
            <>
              <section className="admin-metric-grid admin-users-metrics">
                <AdminMetricCard
                  label="Total Offices"
                  value={officesSummary.totalOffices}
                  tone="default"
                />
                <AdminMetricCard
                  label="Active Offices"
                  value={officesSummary.activeOffices}
                  tone="default"
                />
                <AdminMetricCard
                  label="Assigned Users"
                  value={officesSummary.assignedUsers}
                  tone="blue"
                />
              </section>

              <div className="filter-bar admin-office-filter-grid">
                <input
                  type="search"
                  placeholder="Search office name or code"
                  value={officeFilters.query}
                  onChange={(event) =>
                    setOfficeFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  aria-label="Search offices"
                />
                <select
                  value={officeFilters.status}
                  onChange={(event) =>
                    setOfficeFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  aria-label="Filter offices by status"
                >
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setOfficeFilters(createEmptyOfficeFilters())}
                >
                  Reset
                </button>
              </div>

              <SectionCard
                className="admin-section-card"
                title="Office Directory"
              >
                {filteredOffices.length ? (
                  <div className="table-card">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Office</th>
                          <th>Code</th>
                          <th>Users</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOffices.map((officeRow) => (
                          <tr key={officeRow.officeId ?? officeRow.officeName}>
                            <td>{officeRow.officeName}</td>
                            <td>{officeRow.officeCode}</td>
                            <td>{officeRow.assignedUsers}</td>
                            <td>
                              {getOfficeStatusLabel(officeRow.office) === 'Unavailable' ? (
                                'Unavailable'
                              ) : (
                                <StatusBadge status={getOfficeStatusLabel(officeRow.office)} />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No offices found"
                    description="Adjust the search or filters to view the office directory."
                    compact
                  />
                )}
              </SectionCard>
            </>
          )}
        </div>
      </section>

      <Modal
        isOpen={isUserModalOpen}
        title="Add User"
        onClose={() => {
          if (!isCreatingUser) {
            setIsUserModalOpen(false)
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsUserModalOpen(false)}
              disabled={isCreatingUser}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-add-user-form"
              className="button button--primary"
              disabled={isCreatingUser}
            >
              {isCreatingUser ? 'Creating...' : 'Create User'}
            </button>
          </>
        }
      >
        <form id="admin-add-user-form" className="form-grid form-grid--two app-form" onSubmit={handleCreateUser}>
          {userFormErrors.form ? (
            <div className="form-field form-field--full-span">
              <span className="form-field__error" role="alert">
                {userFormErrors.form}
              </span>
            </div>
          ) : null}

          <div className="form-field">
            <label htmlFor="admin-user-first-name">First Name</label>
            <input
              id="admin-user-first-name"
              value={userForm.firstName}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
              aria-invalid={Boolean(userFormErrors.firstName)}
            />
            {userFormErrors.firstName ? (
              <span className="form-field__error" role="alert">
                {userFormErrors.firstName}
              </span>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="admin-user-middle-name">Middle Name</label>
            <input
              id="admin-user-middle-name"
              value={userForm.middleName}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  middleName: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="admin-user-last-name">Last Name</label>
            <input
              id="admin-user-last-name"
              value={userForm.lastName}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
              aria-invalid={Boolean(userFormErrors.lastName)}
            />
            {userFormErrors.lastName ? (
              <span className="form-field__error" role="alert">
                {userFormErrors.lastName}
              </span>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="admin-user-role">Role</label>
            <select
              id="admin-user-role"
              value={userForm.role}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  role: event.target.value,
                }))
              }
              aria-invalid={Boolean(userFormErrors.role)}
            >
              {Object.values(USER_ROLES).map((role) => (
                <option key={role} value={role}>
                  {getUserRoleLabel(role)}
                </option>
              ))}
            </select>
            {userFormErrors.role ? (
              <span className="form-field__error" role="alert">
                {userFormErrors.role}
              </span>
            ) : null}
          </div>

          <div className="form-field form-field--full-span">
            <label htmlFor="admin-user-office">Office Assignment</label>
            <select
              id="admin-user-office"
              value={userForm.officeId}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  officeId: event.target.value,
                }))
              }
              aria-invalid={Boolean(userFormErrors.officeId)}
            >
              <option value="">Select office</option>
              {officeOptions.map((office) => (
                <option key={office.value} value={office.value}>
                  {office.label}
                </option>
              ))}
            </select>
            {userFormErrors.officeId ? (
              <span className="form-field__error" role="alert">
                {userFormErrors.officeId}
              </span>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="admin-user-phone-number">Phone Number</label>
            <input
              id="admin-user-phone-number"
              value={userForm.phoneNumber}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  phoneNumber: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="admin-user-account-status">Account Status</label>
            <select
              id="admin-user-account-status"
              value={userForm.accountStatus}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  accountStatus: event.target.value,
                }))
              }
              aria-invalid={Boolean(userFormErrors.accountStatus)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            {userFormErrors.accountStatus ? (
              <span className="form-field__error" role="alert">
                {userFormErrors.accountStatus}
              </span>
            ) : null}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isOfficeModalOpen}
        title="Add Office"
        onClose={() => {
          if (!isCreatingOffice) {
            setIsOfficeModalOpen(false)
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsOfficeModalOpen(false)}
              disabled={isCreatingOffice}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-add-office-form"
              className="button button--primary"
              disabled={isCreatingOffice}
            >
              {isCreatingOffice ? 'Creating...' : 'Create Office'}
            </button>
          </>
        }
      >
        <form id="admin-add-office-form" className="form-grid app-form" onSubmit={handleCreateOffice}>
          {officeFormErrors.form ? (
            <div className="form-field">
              <span className="form-field__error" role="alert">
                {officeFormErrors.form}
              </span>
            </div>
          ) : null}

          <div className="form-field">
            <label htmlFor="admin-office-name">Office Name</label>
            <input
              id="admin-office-name"
              value={officeForm.name}
              onChange={(event) =>
                setOfficeForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              aria-invalid={Boolean(officeFormErrors.name)}
            />
            {officeFormErrors.name ? (
              <span className="form-field__error" role="alert">
                {officeFormErrors.name}
              </span>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="admin-office-code">Office Code</label>
            <input
              id="admin-office-code"
              value={officeForm.code}
              onChange={(event) =>
                setOfficeForm((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
              aria-invalid={Boolean(officeFormErrors.code)}
            />
            {officeFormErrors.code ? (
              <span className="form-field__error" role="alert">
                {officeFormErrors.code}
              </span>
            ) : null}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedUser) && !isConfirmingPasswordReset}
        title="Manage User Account"
        onClose={() => {
          if (!isRegeneratingPassword) {
            setSelectedUser(null)
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setSelectedUser(null)}
              disabled={isRegeneratingPassword}
            >
              Close
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => setIsConfirmingPasswordReset(true)}
              disabled={isRegeneratingPassword || !selectedUser?.id}
            >
              Regenerate Password
            </button>
          </>
        }
      >
        {selectedUser ? (
          <div className="form-grid form-grid--two app-form">
            <div className="form-field">
              <label>Full Name</label>
              <input value={getAdminUserDisplayName(selectedUser)} readOnly className="readonly-field" />
            </div>
            <div className="form-field">
              <label>Institutional Email</label>
              <input value={selectedUser.email || 'Unavailable'} readOnly className="readonly-field" />
            </div>
            <div className="form-field">
              <label>Role</label>
              <input value={getUserRoleLabel(selectedUser.role)} readOnly className="readonly-field" />
            </div>
            <div className="form-field">
              <label>Office Assignment</label>
              <input
                value={getAdminUserOfficeLabel(selectedUser)}
                readOnly
                className="readonly-field"
              />
            </div>
            <div className="form-field">
              <label>Account Status</label>
              <input value={getUserStatusLabel(selectedUser)} readOnly className="readonly-field" />
            </div>
            <div className="form-field">
              <label>Last Login</label>
              <input value={getAdminUserLastLoginLabel(selectedUser)} readOnly className="readonly-field" />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isConfirmingPasswordReset}
        title="Confirm Password Regeneration"
        onClose={() => {
          if (!isRegeneratingPassword) {
            setIsConfirmingPasswordReset(false)
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsConfirmingPasswordReset(false)}
              disabled={isRegeneratingPassword}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                void handleConfirmPasswordRegeneration()
              }}
              disabled={isRegeneratingPassword}
            >
              {isRegeneratingPassword ? 'Regenerating...' : 'Confirm'}
            </button>
          </>
        }
      >
        <div className="app-form">
          <p>
            The current password will stop working as soon as a replacement temporary password is issued for this account.
          </p>
          <div className="status-card__summary">
            <strong>{selectedUser?.fullName || 'Selected account'}</strong>
            <p>{selectedUser?.email || 'Email unavailable'}</p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(credentialResult)}
        title={credentialResult?.title ?? 'Credentials Ready'}
        onClose={handleDismissCredentialResult}
        actions={
          <>
            <button type="button" className="button button--secondary" onClick={handleDismissCredentialResult}>
              Dismiss
            </button>
            {credentialResult?.email ? (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  void handleCopyValue(credentialResult.email, 'Email')
                }}
              >
                Copy Email
              </button>
            ) : null}
            {credentialResult?.generatedPassword ? (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  void handleCopyValue(credentialResult.generatedPassword, 'Temporary password')
                }}
              >
                Copy Temporary Password
              </button>
            ) : null}
          </>
        }
      >
        {credentialResult ? (
          <div className="form-grid app-form">
            <div className="notice-strip">
              {credentialResult.notice}
            </div>

            <dl className="api-admin-credential-summary">
              <div className="api-admin-credential-summary__row">
                <dt>User ID</dt>
                <dd>{credentialResult.userId ?? 'Not returned'}</dd>
              </div>
              <div className="api-admin-credential-summary__row">
                <dt>Email</dt>
                <dd>{credentialResult.email || 'Not returned'}</dd>
              </div>
              <div className="api-admin-credential-summary__row">
                <dt>Role</dt>
                <dd>{credentialResult.roleLabel || 'Not returned'}</dd>
              </div>
              <div className="api-admin-credential-summary__row">
                <dt>Office</dt>
                <dd>{credentialResult.officeLabel}</dd>
              </div>
              <div className="api-admin-credential-summary__row">
                <dt>Temporary Password</dt>
                <dd>{credentialResult.generatedPassword || 'Not returned'}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </>
  )
}

export default ApiAdminSetupPage
