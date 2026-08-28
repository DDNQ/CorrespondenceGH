import { getAuditLogs } from '../../data/auditLogs.js'
import { getCorrespondenceRecords } from '../../data/correspondence.js'
import { offices } from '../../data/offices.js'
import { getUsers } from '../../data/users.js'
import { getCorrespondenceDisplayReference } from '../../utils/correspondence.js'
import { normalizeCorrespondenceRecord } from '../../utils/correspondencePermissions.js'
import { createEmptyAdminDashboardSummary } from '../../utils/adminDashboard.js'
import { isSameOffice, normalizeOffice } from '../../utils/offices.js'

const CORRESPONDENCE_AUDIT_TYPES = new Set([
  'Registered',
  'Forwarded',
  'Stage Updated',
  'Completed',
  'Receipt Acknowledged',
  'Attachment Added',
  'Correspondence Updated',
])

function countByStatus(records, status) {
  return records.filter((record) => record.status === status).length
}

function isActiveAccount(user) {
  return user?.accountStatus === 'Active' || user?.status === 'Active'
}

function isActiveOffice(office) {
  return office?.status === 'Active'
}

function normalizeAuditDescription(entry) {
  if (typeof entry?.description !== 'string') {
    return 'Activity details are not available.'
  }

  const normalizedDescription = entry.description.replace('Ã¢â‚¬â€', '—').trim()

  if (!CORRESPONDENCE_AUDIT_TYPES.has(entry.type)) {
    return normalizedDescription
  }

  if (!normalizedDescription.startsWith(entry.reference)) {
    return normalizedDescription
  }

  return normalizedDescription.slice(entry.reference.length).trimStart()
}

function createOfficeBreakdown(records, users, officeEntries) {
  return officeEntries
    .filter(isActiveOffice)
    .map((office) => {
      const normalizedOffice = normalizeOffice(office)
      const officeRecords = records.filter((record) =>
        isSameOffice(record.currentOffice, normalizedOffice),
      )

      return {
        officeId: normalizedOffice?.id ?? null,
        officeName: normalizedOffice?.name ?? '',
        officeCode: normalizedOffice?.code ?? null,
        activeUsers: users.filter(
          (user) => isActiveAccount(user) && isSameOffice(user.office, normalizedOffice),
        ).length,
        activeCorrespondence: officeRecords.filter(
          (record) => !['Completed', 'Filed'].includes(record.status),
        ).length,
        overdue: officeRecords.filter(
          (record) =>
            record.deadlineState === 'overdue' || record.status === 'Overdue',
        ).length,
      }
    })
    .sort((left, right) => {
      if (right.activeCorrespondence !== left.activeCorrespondence) {
        return right.activeCorrespondence - left.activeCorrespondence
      }

      return left.officeName.localeCompare(right.officeName)
    })
}

function createRecentActivity(auditLogs, records) {
  return auditLogs.slice(0, 5).map((entry) => {
    const matchingRecord = records.find((record) => {
      const reference = getCorrespondenceDisplayReference(record)
      return (
        typeof entry.reference === 'string' &&
        entry.reference.trim().length > 0 &&
        reference.toLowerCase() === entry.reference.trim().toLowerCase()
      )
    })

    return {
      id: entry.id,
      type: entry.type,
      title: entry.title,
      actorName: entry.user,
      actorRole: entry.role,
      officeName: entry.office,
      correspondenceId: matchingRecord?.id ?? null,
      correspondenceReference:
        typeof entry.reference === 'string' && entry.reference !== 'Account Access'
          ? entry.reference
          : '',
      displayDescription: normalizeAuditDescription(entry),
      timeLabel: entry.time,
      routeTarget: matchingRecord ? getCorrespondenceDisplayReference(matchingRecord) : null,
    }
  })
}

export function buildMockAdminDashboardSummary({
  users = getUsers(),
  records = getCorrespondenceRecords(),
  officeEntries = offices,
  auditLogs = getAuditLogs(),
} = {}) {
  const normalizedRecords = records
    .map((record) => normalizeCorrespondenceRecord(record))
    .filter(Boolean)
  const activeUsers = users.filter((user) => isActiveAccount(user)).length
  const activeOffices = officeEntries.filter(isActiveOffice).length

  return createEmptyAdminDashboardSummary({
    summary: {
      activeCorrespondence: normalizedRecords.filter(
        (record) => !['Completed', 'Filed'].includes(record.status),
      ).length,
      dueSoon: normalizedRecords.filter((record) => record.deadlineState === 'due-soon').length,
      overdue: normalizedRecords.filter(
        (record) => record.deadlineState === 'overdue' || record.status === 'Overdue',
      ).length,
      activeUsers,
      activeOffices,
    },
    officeBreakdown: createOfficeBreakdown(normalizedRecords, users, officeEntries),
    recentActivity: createRecentActivity(auditLogs, normalizedRecords),
    availability: {
      officeBreakdown: true,
      recentActivity: true,
    },
    contractDiagnostics: {
      sourceOperation: 'dashboard.adminSummary.mock',
      safeTopLevelKeys: ['officeBreakdown', 'recentActivity', 'summary'],
    },
    raw: null,
  })
}

export async function getOfficeDashboardSummary() {
  const records = getCorrespondenceRecords()

  return {
    summary: {
      total: records.length,
      awaitingAction: countByStatus(records, 'Awaiting Action'),
      inProgress: countByStatus(records, 'In Progress'),
      dueSoon: records.filter((record) => record.deadlineState === 'due-soon').length,
      overdue: records.filter((record) => record.deadlineState === 'overdue').length,
    },
    recentRecords: records.slice(0, 5),
    officeBreakdown: [],
    raw: null,
  }
}

export async function getAdminDashboardSummary() {
  return buildMockAdminDashboardSummary()
}

export const mockDashboardService = Object.freeze({
  getOfficeDashboardSummary,
  getAdminDashboardSummary,
})
