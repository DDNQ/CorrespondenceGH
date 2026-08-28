import { getUserRoleLabel, isAdmin, normalizeUserRole } from '../constants/roles.js'
import {
  getOfficeDisplayName,
  normalizeOffice,
} from './offices.js'
import { formatTimestampForDisplay } from './formalReports.js'

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function buildComposedName(user) {
  const parts = [user?.firstName, user?.middleName, user?.lastName]
    .filter(isNonEmptyString)
    .map((value) => value.trim())

  return parts.length ? parts.join(' ') : ''
}

function toCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function toOptionalCount(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.trim())

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

export function isActiveDirectoryStatus(status) {
  return normalizeText(status) === 'active'
}

export function getUserStatusLabel(user) {
  const value = user?.accountStatus ?? user?.status ?? ''
  return isNonEmptyString(value) ? String(value).trim() : 'Unavailable'
}

export function getOfficeStatusLabel(office) {
  const value = normalizeOffice(office)?.status ?? ''
  return isNonEmptyString(value) ? String(value).trim() : 'Unavailable'
}

export function getDirectoryOfficeFilterValue(office) {
  const normalizedOffice = normalizeOffice(office)

  if (!normalizedOffice) {
    return ''
  }

  if (isNonEmptyString(normalizedOffice.id)) {
    return normalizedOffice.id.trim()
  }

  if (isNonEmptyString(normalizedOffice.name)) {
    return normalizedOffice.name.trim()
  }

  return ''
}

export function getAdminIdentityPresentation(user) {
  if (isAdmin(user) && !normalizeOffice(user?.office)?.name) {
    return {
      secondaryLine: 'System Administrator',
      tertiaryLine: 'Administrator Access',
    }
  }

  return {
    secondaryLine: getOfficeDisplayName(user?.office),
    tertiaryLine: getUserRoleLabel(user?.role),
  }
}

export function getAdminUserDisplayName(user) {
  if (isNonEmptyString(user?.fullName)) {
    return user.fullName.trim()
  }

  const composedName = buildComposedName(user)

  if (composedName) {
    return composedName
  }

  if (isAdmin(user)) {
    return getUserRoleLabel(user?.role)
  }

  if (isNonEmptyString(user?.email)) {
    return user.email.trim()
  }

  return 'Unavailable'
}

export function getAdminUserSecondaryEmail(user) {
  if (!isNonEmptyString(user?.email)) {
    return ''
  }

  const email = user.email.trim()
  return email !== getAdminUserDisplayName(user) ? email : ''
}

export function getAdminUserOfficeLabel(user) {
  if (isAdmin(user) && !normalizeOffice(user?.office ?? user?.officeName ?? null)?.name) {
    return 'System-wide'
  }

  const officeLabel = getOfficeDisplayName(user?.office ?? user?.officeName ?? null)
  return officeLabel || 'Office not available'
}

export function getAdminUserLastLoginLabel(user) {
  const lastLogin = user?.lastLogin ?? user?.last_login ?? null

  if (!isNonEmptyString(lastLogin)) {
    return 'Not yet signed in'
  }

  const normalizedValue = lastLogin.trim()

  if (normalizedValue.toLowerCase() === 'not yet signed in') {
    return 'Not yet signed in'
  }

  const formattedValue = formatTimestampForDisplay(normalizedValue)
  return formattedValue === 'Not available' ? normalizedValue : formattedValue
}

export function summarizeUserDirectory(users = []) {
  const normalizedUsers = Array.isArray(users) ? users : []
  const officesRepresented = new Set()
  let activeUsers = 0
  let administrators = 0

  normalizedUsers.forEach((user) => {
    if (isActiveDirectoryStatus(getUserStatusLabel(user))) {
      activeUsers += 1
    }

    if (normalizeUserRole(user?.role) === 'ADMIN') {
      administrators += 1
    }

    const office = normalizeOffice(user?.office ?? user?.officeId ?? user?.officeName ?? null)
    const officeFilterValue = getDirectoryOfficeFilterValue(office)

    if (officeFilterValue) {
      officesRepresented.add(officeFilterValue)
    }
  })

  return {
    totalUsers: normalizedUsers.length,
    activeUsers,
    administrators,
    officesRepresented: officesRepresented.size,
  }
}

export function filterAdminUsers(users = [], filters = {}) {
  const searchTerm = normalizeText(filters.query)
  const roleFilter = normalizeUserRole(filters.role) ?? ''
  const officeFilter = String(filters.officeId ?? '').trim()
  const statusFilter = normalizeText(filters.status)

  return (Array.isArray(users) ? users : []).filter((user) => {
    const office = normalizeOffice(user?.office ?? user?.officeId ?? user?.officeName ?? null)
    const officeFilterValue = getDirectoryOfficeFilterValue(office)
    const searchHaystack = [
      getAdminUserDisplayName(user),
      user?.email,
      office?.name,
      getUserRoleLabel(user?.role),
    ]
      .filter(isNonEmptyString)
      .join(' ')
      .toLowerCase()

    if (searchTerm && !searchHaystack.includes(searchTerm)) {
      return false
    }

    if (roleFilter && normalizeUserRole(user?.role) !== roleFilter) {
      return false
    }

    if (officeFilter && officeFilterValue !== officeFilter) {
      return false
    }

    if (statusFilter && statusFilter !== 'all' && normalizeText(getUserStatusLabel(user)) !== statusFilter) {
      return false
    }

    return true
  })
}

export function buildOfficeDirectoryRows(offices = [], users = [], officeBreakdown = []) {
  const userList = Array.isArray(users) ? users : []
  const officeMetrics = new Map()

  ;(Array.isArray(officeBreakdown) ? officeBreakdown : []).forEach((entry) => {
    const office = normalizeOffice(
      entry?.office ?? {
        id: entry?.office_id ?? entry?.officeId ?? null,
        name: entry?.office_name ?? entry?.officeName ?? entry?.name ?? '',
        code: entry?.office_code ?? entry?.officeCode ?? null,
        status: entry?.office_status ?? entry?.officeStatus ?? null,
      },
    )
    const key = getDirectoryOfficeFilterValue(office)

    if (!key) {
      return
    }

    officeMetrics.set(key, {
      activeCorrespondence: toOptionalCount(
        entry?.activeCorrespondence,
        entry?.active_correspondence,
        entry?.active_count,
        entry?.count,
        entry?.total,
      ),
      overdue: toOptionalCount(entry?.overdue, entry?.overdue_count, entry?.overdueCount),
      activeUsers: toOptionalCount(
        entry?.activeUsers,
        entry?.active_users,
        entry?.user_count,
        entry?.users,
      ),
    })
  })

  return (Array.isArray(offices) ? offices : [])
    .map((officeEntry) => {
      const office = normalizeOffice(officeEntry)
      const officeKey = getDirectoryOfficeFilterValue(office)
      const assignedUsers = userList.filter(
        (user) =>
          getDirectoryOfficeFilterValue(user?.office ?? user?.officeId ?? user?.officeName ?? null) === officeKey,
      ).length
      const metrics = officeMetrics.get(officeKey) ?? {
        activeCorrespondence: null,
        overdue: null,
        activeUsers: null,
      }

      return {
        office,
        officeId: office?.id ?? null,
        officeName: office?.name ?? 'Office unavailable',
        officeCode: office?.code ?? 'Unavailable',
        status: getOfficeStatusLabel(office),
        assignedUsers,
        activeCorrespondence: metrics.activeCorrespondence,
        activeUsers: metrics.activeUsers,
        overdue: metrics.overdue,
      }
    })
    .sort((left, right) => left.officeName.localeCompare(right.officeName))
}

export function summarizeOfficeDirectory(rows = []) {
  const officeRows = Array.isArray(rows) ? rows : []

  return {
    totalOffices: officeRows.length,
    activeOffices: officeRows.filter((row) => isActiveDirectoryStatus(row?.status)).length,
    assignedUsers: officeRows.reduce((sum, row) => sum + toCount(row?.assignedUsers), 0),
    activeCorrespondence: officeRows.some((row) => typeof row?.activeCorrespondence === 'number')
      ? officeRows.reduce((sum, row) => sum + toCount(row?.activeCorrespondence), 0)
      : null,
  }
}

export function filterOfficeDirectory(rows = [], filters = {}) {
  const searchTerm = normalizeText(filters.query)
  const statusFilter = normalizeText(filters.status)

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const haystack = [row?.officeName, row?.officeCode]
      .filter(isNonEmptyString)
      .join(' ')
      .toLowerCase()

    if (searchTerm && !haystack.includes(searchTerm)) {
      return false
    }

    if (statusFilter && statusFilter !== 'all' && normalizeText(row?.status) !== statusFilter) {
      return false
    }

    return true
  })
}

export function buildSystemAccessSummary({ users = [], offices = [], adminSummary = null } = {}) {
  const userSummary = summarizeUserDirectory(users)
  const hasDirectoryUsers = Array.isArray(users) && users.length > 0
  const hasDirectoryOffices = Array.isArray(offices) && offices.length > 0
  const activeOfficeCountFromDirectory = (Array.isArray(offices) ? offices : []).filter((office) =>
    isActiveDirectoryStatus(getOfficeStatusLabel(office)),
  ).length

  return [
    {
      label: 'Total Accounts',
      value: userSummary.totalUsers,
    },
    {
      label: 'Administrators',
      value: userSummary.administrators,
    },
    {
      label: 'Active Users',
      value:
        hasDirectoryUsers
          ? userSummary.activeUsers
          : typeof adminSummary?.summary?.activeUsers === 'number'
            ? adminSummary.summary.activeUsers
            : 0,
    },
    {
      label: 'Active Offices',
      value:
        hasDirectoryOffices
          ? activeOfficeCountFromDirectory
          : typeof adminSummary?.summary?.activeOffices === 'number'
            ? adminSummary.summary.activeOffices
            : 0,
    },
  ]
}
