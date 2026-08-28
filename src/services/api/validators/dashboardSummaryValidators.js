import { createApiContractMismatchError } from '../../apiClient.js'
import { normalizeCorrespondence } from '../../../utils/correspondence.js'
import { createEmptyAdminDashboardSummary } from '../../../utils/adminDashboard.js'
import { normalizeOffice } from '../../../utils/offices.js'
import { formatDuration } from '../../../utils/duration.js'
import { formatTimestampForDisplay } from '../../../utils/formalReports.js'

function getTopLevelType(value) {
  if (Array.isArray(value)) {
    return 'array'
  }

  if (value === null) {
    return 'null'
  }

  return typeof value
}

function getSafeTopLevelKeys(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  return Object.keys(value).sort()
}

function createContractMismatch(response, options = {}) {
  return createApiContractMismatchError(
    options.message ?? `${options.operation ?? 'dashboard.officeSummary'} returned an unsupported response shape.`,
    {
      operation: options.operation ?? 'dashboard.officeSummary',
      receivedTopLevelType: getTopLevelType(response),
      safeTopLevelKeys: getSafeTopLevelKeys(response),
      missingExpectedKeys: Array.isArray(options.missingExpectedKeys)
        ? [...options.missingExpectedKeys]
        : [],
    },
  )
}

function requireObjectResponse(response, options = {}) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw createContractMismatch(response, {
      operation: options.operation ?? 'dashboard.officeSummary',
      message:
        options.message ??
        `${options.operation ?? 'dashboard.officeSummary'} must return a single object response.`,
    })
  }

  return response
}

function normalizeCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getOfficeShapeCategory(rawOffice) {
  if (rawOffice === null || rawOffice === undefined) {
    return 'null'
  }

  if (typeof rawOffice === 'string') {
    return 'string'
  }

  if (Array.isArray(rawOffice)) {
    return 'array'
  }

  return typeof rawOffice
}

function normalizeBreakdownEntries(rawBreakdown, options = {}) {
  if (!rawBreakdown) {
    return {
      items: [],
      shape: 'none',
    }
  }

  if (Array.isArray(rawBreakdown)) {
    return {
      items: rawBreakdown
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return null
          }

          const labelValue =
            item.label ??
            item.status ??
            item.type ??
            item.name ??
            item.category ??
            null
          const label = typeof labelValue === 'string' ? labelValue.trim() : ''

          if (!label) {
            return null
          }

          return {
            label,
            count:
              normalizeCount(item.count ?? item.total ?? item.value ?? item.items ?? null) ?? 0,
          }
        })
        .filter(Boolean),
      shape: 'array',
    }
  }

  if (typeof rawBreakdown === 'object') {
    return {
      items: Object.entries(rawBreakdown)
        .map(([label, count]) => ({
          label: String(label ?? '').trim(),
          count: normalizeCount(count) ?? 0,
        }))
        .filter((item) => item.label),
      shape: 'object-map',
    }
  }

  throw createContractMismatch(rawBreakdown, {
    message: `dashboard.officeSummary returned an unsupported ${options.label ?? 'breakdown'} shape.`,
  })
}

function normalizeRecentRecord(rawRecord) {
  if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) {
    throw createContractMismatch(rawRecord, {
      message: 'dashboard.officeSummary returned an invalid recent correspondence record.',
    })
  }

  const normalizedRecord = normalizeCorrespondence(rawRecord)
  const normalizedId = typeof normalizedRecord.id === 'string' ? normalizedRecord.id.trim() : ''
  const referenceNumber =
    typeof normalizedRecord.referenceNumber === 'string'
      ? normalizedRecord.referenceNumber.trim()
      : ''

  if (!normalizedId) {
    throw createContractMismatch(rawRecord, {
      message:
        'dashboard.officeSummary recent correspondence must include a usable machine identifier.',
      missingExpectedKeys: ['id'],
    })
  }

  if (!referenceNumber || referenceNumber === 'Reference unavailable') {
    throw createContractMismatch(rawRecord, {
      message:
        'dashboard.officeSummary recent correspondence must include a human reference number.',
      missingExpectedKeys: ['reference_number'],
    })
  }

  return {
    ...normalizedRecord,
    receivedAt: rawRecord.received_at ?? rawRecord.receivedAt ?? null,
    dashboardDate:
      rawRecord.received_at ??
      rawRecord.receivedAt ??
      normalizedRecord.registeredAt ??
      normalizedRecord.createdAt ??
      normalizedRecord.updatedAt ??
      normalizedRecord.deadline ??
      null,
  }
}

function normalizeRecentRecords(rawRecords) {
  const normalizedRecords = []
  let skippedCount = 0

  rawRecords.forEach((rawRecord) => {
    try {
      normalizedRecords.push(normalizeRecentRecord(rawRecord))
    } catch {
      skippedCount += 1
    }
  })

  return {
    items: normalizedRecords,
    skippedCount,
  }
}

function normalizeAdminOfficeBreakdown(rawBreakdown) {
  if (rawBreakdown === null || rawBreakdown === undefined) {
    return {
      items: [],
      available: false,
      shape: 'none',
    }
  }

  if (!Array.isArray(rawBreakdown)) {
    throw createContractMismatch(rawBreakdown, {
      operation: 'dashboard.adminSummary',
      message: 'dashboard.adminSummary must return by_office as an array.',
      missingExpectedKeys: ['by_office'],
    })
  }

  return {
    items: rawBreakdown
      .map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return null
        }

        const office = normalizeOffice(
          entry.office ?? {
            id:
              entry.office_id ??
              entry.officeId ??
              entry.current_office ??
              entry.current_office_id ??
              entry.current_office__id ??
              null,
            name:
              entry.office_name ??
              entry.officeName ??
              entry.current_office__name ??
              entry.name ??
              '',
            code:
              entry.office_code ??
              entry.officeCode ??
              entry.current_office__code ??
              null,
            status: entry.office_status ?? entry.officeStatus ?? null,
          },
        )

        if (!office?.name && !office?.id) {
          return null
        }

        return {
          officeId: office?.id ?? null,
          officeName: office?.name ?? 'Office unavailable',
          officeCode: office?.code ?? entry.office_code ?? entry.officeCode ?? null,
          activeUsers:
            normalizeCount(
              entry.active_users ?? entry.activeUsers ?? entry.user_count ?? entry.users ?? null,
            ) ?? null,
          activeCorrespondence:
            normalizeCount(
              entry.active_correspondence ??
                entry.activeCorrespondence ??
                entry.active_count ??
                entry.active ??
                entry.count ??
                null,
            ) ?? null,
          totalCorrespondence:
            normalizeCount(
              entry.total_correspondence ??
                entry.totalCorrespondence ??
                entry.total ??
                entry.count ??
                null,
            ) ?? null,
          overdue:
            normalizeCount(
              entry.overdue_count ?? entry.overdueCount ?? entry.overdue ?? null,
            ) ?? null,
        }
      })
      .filter(Boolean),
    available: true,
    shape: 'array',
  }
}

function normalizeAdminRecentActivity(rawActivity) {
  if (rawActivity === null || rawActivity === undefined) {
    return {
      items: [],
      available: false,
      shape: 'none',
    }
  }

  if (!Array.isArray(rawActivity)) {
    throw createContractMismatch(rawActivity, {
      operation: 'dashboard.adminSummary',
      message: 'dashboard.adminSummary must return recent_activity as an array.',
      missingExpectedKeys: ['recent_activity'],
    })
  }

  return {
    items: rawActivity
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return null
        }

        const reference =
          entry.reference_number ??
          entry.referenceNumber ??
          entry.reference ??
          entry.correspondence_reference ??
          entry.correspondenceReference ??
          ''
        const timestamp =
          entry.timestamp ??
          entry.time ??
          entry.created_at ??
          entry.createdAt ??
          ''
        const actionType =
          entry.action_type ??
          entry.actionType ??
          entry.action ??
          entry.type ??
          entry.title ??
          ''

        return {
          id:
            entry.id ??
            entry.activity_id ??
            entry.activityId ??
            `activity-${index}`,
          actionType,
          title: '',
          actorName:
            entry.actor_name ??
            entry.actorName ??
            entry.user ??
            entry.user_name ??
            entry.performed_by ??
            '',
          actorEmail: entry.actor_email ?? entry.actorEmail ?? '',
          officeName:
            entry.to_office_name ?? entry.toOfficeName ?? entry.office_name ?? entry.officeName ?? '',
          toOfficeName:
            entry.to_office_name ?? entry.toOfficeName ?? '',
          fromOffice:
            entry.from_office ?? entry.fromOffice ?? '',
          toOffice:
            entry.to_office ?? entry.toOffice ?? '',
          previousStage:
            entry.previous_stage ?? entry.previousStage ?? '',
          newStage:
            entry.new_stage ?? entry.newStage ?? '',
          note:
            typeof (entry.note ?? entry.description ?? '') === 'string'
              ? (entry.note ?? entry.description ?? '').trim()
              : '',
          correspondenceReference: typeof reference === 'string' ? reference.trim() : '',
          displayDescription: '',
          timeLabel: formatTimestampForDisplay(timestamp),
          timestamp,
          routeTarget:
            entry.correspondence_id ??
            entry.correspondenceId ??
            entry.record_id ??
            entry.recordId ??
            '',
        }
      })
      .filter(Boolean)
      .slice(0, 5),
    available: true,
    shape: 'array',
  }
}

export function formatOfficeDashboardAverageTime(hoursValue) {
  const hours = normalizeCount(hoursValue)

  if (hours === null || hours < 0) {
    return 'Unavailable'
  }

  return formatDuration(hours, { inputUnit: 'hours' }) ?? 'Unavailable'
}

export function normalizeOfficeDashboardResponse(rawResponse) {
  const rawObject = requireObjectResponse(rawResponse, {
    operation: 'dashboard.officeSummary',
  })
  const officeValue = rawObject.office ?? rawObject.office_name ?? rawObject.officeName ?? null
  const statusBreakdown = normalizeBreakdownEntries(
    rawObject.by_status ?? rawObject.status_breakdown ?? rawObject.statusBreakdown ?? null,
    { label: 'status breakdown' },
  )
  const typeBreakdown = normalizeBreakdownEntries(
    rawObject.by_type ?? rawObject.type_breakdown ?? rawObject.typeBreakdown ?? null,
    { label: 'type breakdown' },
  )
  const recentRaw = rawObject.recent ?? rawObject.recent_records ?? rawObject.recentRecords ?? []

  if (!Array.isArray(recentRaw)) {
    throw createContractMismatch(rawObject, {
      message: 'dashboard.officeSummary must return recent correspondence as an array.',
      missingExpectedKeys: ['recent'],
    })
  }

  const normalizedRecentRecords = normalizeRecentRecords(recentRaw)

  return {
    office: normalizeOffice(officeValue),
    activeCount:
      normalizeCount(rawObject.active_count ?? rawObject.activeCount ?? rawObject.active) ?? 0,
    overdueCount:
      normalizeCount(rawObject.overdue_count ?? rawObject.overdueCount ?? rawObject.overdue) ?? 0,
    completedCount:
      normalizeCount(rawObject.completed_count ?? rawObject.completedCount ?? rawObject.completed) ??
      0,
    averageTimeInOfficeHours: normalizeCount(
      rawObject.avg_time_in_office_hours ??
        rawObject.average_time_in_office_hours ??
        rawObject.averageTimeInOfficeHours ??
        rawObject.averageResolutionHours ??
        rawObject.average_resolution_hours ??
        null,
    ),
    averageTimeInOfficeLabel: formatOfficeDashboardAverageTime(
      rawObject.avg_time_in_office_hours ??
        rawObject.average_time_in_office_hours ??
        rawObject.averageTimeInOfficeHours ??
        rawObject.averageResolutionHours ??
        rawObject.average_resolution_hours ??
        null,
    ),
    statusBreakdown: statusBreakdown.items,
    typeBreakdown: typeBreakdown.items,
    recentRecords: normalizedRecentRecords.items,
    contractDiagnostics: {
      sourceOperation: 'dashboard.officeSummary',
      responseEnvelope: 'object',
      safeTopLevelKeys: getSafeTopLevelKeys(rawObject),
      officeShapeCategory: getOfficeShapeCategory(officeValue),
      statusBreakdownShape: statusBreakdown.shape,
      typeBreakdownShape: typeBreakdown.shape,
      averageTimeField:
        rawObject.avg_time_in_office_hours !== undefined
          ? 'avg_time_in_office_hours'
          : rawObject.average_time_in_office_hours !== undefined
            ? 'average_time_in_office_hours'
            : rawObject.averageTimeInOfficeHours !== undefined
              ? 'averageTimeInOfficeHours'
              : rawObject.averageResolutionHours !== undefined
                ? 'averageResolutionHours'
                : rawObject.average_resolution_hours !== undefined
                  ? 'average_resolution_hours'
                  : null,
      averageTimeUnit:
        rawObject.avg_time_in_office_hours !== undefined ||
        rawObject.average_time_in_office_hours !== undefined ||
        rawObject.averageTimeInOfficeHours !== undefined ||
        rawObject.averageResolutionHours !== undefined ||
        rawObject.average_resolution_hours !== undefined
          ? 'hours'
          : null,
      skippedRecentRecordCount: normalizedRecentRecords.skippedCount,
    },
    raw: rawObject,
  }
}

export function normalizeAdminDashboardResponse(rawResponse) {
  const rawObject = requireObjectResponse(rawResponse, {
    operation: 'dashboard.adminSummary',
    message: 'dashboard.adminSummary must return a single object response.',
  })
  const officeBreakdown = normalizeAdminOfficeBreakdown(
    rawObject.by_office ?? rawObject.office_breakdown ?? rawObject.officeBreakdown ?? null,
  )
  const recentActivity = normalizeAdminRecentActivity(
    rawObject.recent_activity ?? rawObject.recentActivity ?? null,
  )
  const activeCorrespondence =
    normalizeCount(
      rawObject.active_count ?? rawObject.activeCount ?? rawObject.active_correspondence ?? null,
    ) ?? null
  const overdue =
    normalizeCount(
      rawObject.overdue_count ?? rawObject.overdueCount ?? rawObject.overdue ?? null,
    ) ?? null
  const activeUsers =
    normalizeCount(
      rawObject.user_count ?? rawObject.userCount ?? rawObject.active_users ?? null,
    ) ?? null
  const activeOffices =
    normalizeCount(
      rawObject.active_office_count ?? rawObject.activeOfficeCount ?? rawObject.office_count ?? null,
    ) ??
    (officeBreakdown.items.length ? officeBreakdown.items.length : null)
  const dueSoon =
    normalizeCount(
      rawObject.due_soon_count ?? rawObject.dueSoonCount ?? rawObject.due_soon ?? null,
    ) ?? null

  return createEmptyAdminDashboardSummary({
    summary: {
      activeCorrespondence,
      dueSoon,
      overdue,
      activeUsers,
      activeOffices,
    },
    officeBreakdown: officeBreakdown.items,
    recentActivity: recentActivity.items,
    availability: {
      officeBreakdown: officeBreakdown.available,
      recentActivity: recentActivity.available,
    },
    contractDiagnostics: {
      sourceOperation: 'dashboard.adminSummary',
      safeTopLevelKeys: getSafeTopLevelKeys(rawObject),
      officeBreakdownShape: officeBreakdown.shape,
      recentActivityShape: recentActivity.shape,
    },
    raw: rawObject,
  })
}
