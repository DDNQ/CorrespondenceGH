import { createApiError } from '../api/errors.js'
import { getAuditLogs } from '../../data/auditLogs.js'
import { getCorrespondenceRecords } from '../../data/correspondence.js'
import {
  getOfficeReportData,
  reportDocumentTypeOptions,
  reportPriorityOptions,
} from '../../data/reports.js'
import {
  createFormalExecutiveSummary,
  createFormalReportReference,
  createNotAvailableMetric,
  createSuggestedFormalReportFilename,
  FORMAL_REPORT_EMPTY_OBSERVATIONS,
  FORMAL_REPORT_EMPTY_RECOMMENDATIONS,
  FORMAL_REPORT_PREPARED_AT,
  FORMAL_REPORT_PREVIEW_NOTICE,
  formatCompactDate,
  formatTimestampForDisplay,
  getDefaultFormalReportConfig,
  getFormalReportConfigurationMetadata,
  getFormalReportTitle,
  mapStaffActionCategory,
  normalizeFormalReportText,
  parseReportDate,
  resolveFormalReportPeriod,
  validateFormalReportConfig,
} from '../../utils/formalReports.js'
import { getOfficeDisplayName, isSameOffice, normalizeOffice } from '../../utils/offices.js'
import { calculateAcknowledgementRate, calculateAverageAcknowledgementTime } from '../../utils/reportCalculations.js'

const REPORT_STATUS_LABELS = Object.freeze([
  'Registered',
  'Received',
  'In Progress',
  'Awaiting Action',
  'Forwarded',
  'Completed',
  'Filed',
])

function applyAnalyticsFilters(reportData, filters = {}) {
  const period = filters.period ?? reportData.defaultPeriod ?? 'This Month'
  return reportData.periods?.[period] ?? null
}

function requireSupervisorOffice(currentUser) {
  const office = normalizeOffice(currentUser?.office)

  if (!office?.id && !office?.name) {
    throw createApiError('A valid supervisor office is required to generate the report.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }

  return office
}

function toDayKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getFixedGeneratedDate() {
  return new Date(FORMAL_REPORT_PREPARED_AT)
}

function parseRecordPrimaryDate(record) {
  return (
    parseReportDate(record.dateReceived) ??
    parseReportDate(record.arrivedAtCurrentOffice) ??
    parseReportDate(record.receivedAt) ??
    parseReportDate(record.deadline) ??
    null
  )
}

function parseActionDate(action) {
  return parseReportDate(action?.timestamp ?? action?.time ?? null)
}

function parseDeadline(record) {
  return parseReportDate(record.stageDeadline ?? record.deadline ?? null)
}

function parseLastActionDate(record) {
  const actions = Array.isArray(record.actions) ? record.actions : []
  const datedActions = actions
    .map((action) => ({
      ...action,
      parsedDate: parseActionDate(action),
    }))
    .filter((action) => action.parsedDate)
    .sort((left, right) => right.parsedDate - left.parsedDate)

  return datedActions[0] ?? null
}

function isOfficeRecord(record, office) {
  return [
    record.currentOffice,
    record.currentOfficeName,
    record.currentOfficeId,
    record.registeringOffice,
    record.registeringOfficeName,
    record.registeringOfficeId,
    record.routeToOffice,
    record.routeToOfficeId,
    record.forwardedToOfficeName,
    record.forwardedToOfficeId,
    record.receivedByOfficeName,
    record.receivedByOfficeId,
  ].some((value) => isSameOffice(value, office))
}

function filterRecordsByOfficeAndPeriod(records, office, period) {
  const startKey = period.startDate
  const endKey = period.endDate

  return records
    .filter((record) => isOfficeRecord(record, office))
    .filter((record) => {
      const primaryDate = parseRecordPrimaryDate(record)
      const primaryKey = toDayKey(primaryDate)

      if (!primaryKey) {
        return false
      }

      return primaryKey >= startKey && primaryKey <= endKey
    })
    .map((record) => ({
      ...record,
      actions: Array.isArray(record.actions) ? record.actions.map((action) => ({ ...action })) : [],
      journey: Array.isArray(record.journey) ? record.journey.map((item) => ({ ...item })) : [],
      attachments: Array.isArray(record.attachments) ? record.attachments.map((item) => ({ ...item })) : [],
      notes: Array.isArray(record.notes) ? record.notes.map((item) => ({ ...item })) : [],
    }))
}

function getDaysBetween(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    return null
  }

  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000))
}

function getDaysPending(record, reportEndDate) {
  const startDate =
    parseReportDate(record.arrivedAtCurrentOffice) ??
    parseReportDate(record.dateReceived) ??
    parseReportDate(record.receivedAt)

  if (!startDate || !(reportEndDate instanceof Date)) {
    return null
  }

  // TODO: The backend reporting service must become authoritative for pending-duration rules.
  return getDaysBetween(startDate, reportEndDate)
}

function isExplicitlyOverdue(record, reportEndDate) {
  const dueDate = parseDeadline(record)

  if (dueDate && reportEndDate) {
    return dueDate.getTime() < reportEndDate.getTime()
  }

  return (
    record.deadlineState === 'overdue' ||
    String(record.timeRemaining ?? '').toLowerCase().includes('overdue') ||
    Boolean(record.isOverdue)
  )
}

function getDaysOverdue(record, reportEndDate) {
  const dueDate = parseDeadline(record)

  if (!dueDate || !(reportEndDate instanceof Date)) {
    return null
  }

  if (dueDate.getTime() >= reportEndDate.getTime()) {
    return 0
  }

  // TODO: The backend reporting service must become authoritative for overdue-duration rules.
  return getDaysBetween(dueDate, reportEndDate)
}

function getOverdueBand(daysOverdue) {
  if (!Number.isFinite(daysOverdue) || daysOverdue <= 0) {
    return null
  }
  if (daysOverdue <= 7) {
    return '1-7 Days Overdue'
  }
  if (daysOverdue <= 14) {
    return '8-14 Days Overdue'
  }
  if (daysOverdue <= 30) {
    return '15-30 Days Overdue'
  }
  return 'More Than 30 Days Overdue'
}

function getAgeingBand(daysPending) {
  if (!Number.isFinite(daysPending) || daysPending < 7) {
    return 'Less Than 7 Days'
  }
  if (daysPending < 15) {
    return '7-14 Days'
  }
  if (daysPending < 31) {
    return '15-30 Days'
  }
  return 'More Than 30 Days'
}

function buildStatusBreakdown(records) {
  return REPORT_STATUS_LABELS.map((label) => ({
    label,
    value: records.filter((record) => record.status === label).length,
  }))
}

function buildPriorityBreakdown(records) {
  return reportPriorityOptions
    .filter((item) => item !== 'All priorities')
    .map((label) => ({
      label,
      value: records.filter((record) => record.priority === label).length,
    }))
}

function buildTypeBreakdown(records) {
  return reportDocumentTypeOptions
    .filter((item) => item !== 'All document types')
    .map((label) => ({
      label,
      value: records.filter((record) => record.documentType === label).length,
    }))
}

function buildOverdueRows(records, reportEndDate) {
  return records
    .filter((record) => isExplicitlyOverdue(record, reportEndDate))
    .map((record) => {
      const lastAction = parseLastActionDate(record)
      const daysPending = getDaysPending(record, reportEndDate)
      const daysOverdue = getDaysOverdue(record, reportEndDate)

      return {
        id: record.id,
        referenceNumber: record.referenceNumber ?? record.reference ?? 'Reference unavailable',
        subject: record.subject ?? '',
        dateReceived: formatCompactDate(record.dateReceived),
        dueDate: parseDeadline(record) ? formatCompactDate(parseDeadline(record)) : 'Not available',
        currentStage: record.currentStage ?? '',
        currentStatus: record.status ?? '',
        daysPending: Number.isFinite(daysPending) ? daysPending : 'Not available',
        daysOverdue: Number.isFinite(daysOverdue) ? daysOverdue : 'Not available',
        lastActionDate: lastAction?.parsedDate ? formatTimestampForDisplay(lastAction.parsedDate) : 'Not available',
        lastActionBy: lastAction?.actor ?? 'Not available',
        overdueBand: getOverdueBand(daysOverdue),
      }
    })
    .sort((left, right) => {
      const leftValue = Number.isFinite(left.daysOverdue) ? left.daysOverdue : -1
      const rightValue = Number.isFinite(right.daysOverdue) ? right.daysOverdue : -1
      return rightValue - leftValue
    })
}

function buildPendingRows(records, reportEndDate, office) {
  return records
    .filter((record) => !['Completed', 'Filed'].includes(record.status))
    .map((record) => {
      const daysPending = getDaysPending(record, reportEndDate)
      const lastAction = parseLastActionDate(record)

      return {
        id: record.id,
        referenceNumber: record.referenceNumber ?? record.reference ?? 'Reference unavailable',
        subject: record.subject ?? '',
        dateReceived: formatCompactDate(record.dateReceived),
        currentStage: record.currentStage ?? '',
        currentStatus: record.status ?? '',
        priority: record.priority ?? '',
        daysPending: Number.isFinite(daysPending) ? daysPending : 'Not available',
        responsibleOffice: getOfficeDisplayName(record.currentOffice ?? record.currentOfficeName ?? office),
        lastActionDate: lastAction?.parsedDate ? formatTimestampForDisplay(lastAction.parsedDate) : 'Not available',
        ageingBand: getAgeingBand(daysPending),
      }
    })
    .sort((left, right) => {
      const leftValue = Number.isFinite(left.daysPending) ? left.daysPending : -1
      const rightValue = Number.isFinite(right.daysPending) ? right.daysPending : -1
      return rightValue - leftValue
    })
}

function buildStaffContributionRows(records, office, period) {
  const actions = records.flatMap((record) =>
    (Array.isArray(record.actions) ? record.actions : []).map((action) => ({
      ...action,
      referenceNumber: record.referenceNumber ?? record.reference ?? '',
    })),
  )
  const auditActions = getAuditLogs()
    .filter((entry) => isSameOffice(entry.office, office))
    .filter((entry) => {
      const timestamp = parseReportDate(entry.time)
      const key = toDayKey(timestamp)
      return key && key >= period.startDate && key <= period.endDate
    })
    .map((entry) => ({
      actor: entry.user,
      office: entry.office,
      role: entry.role,
      timestamp: entry.time,
      type: entry.type,
      title: entry.title,
    }))

  const grouped = new Map()

  ;[...actions, ...auditActions].forEach((action) => {
    const actorName = String(action.actor ?? action.user ?? '').trim()

    if (!actorName) {
      return
    }

    const category = mapStaffActionCategory(action.type ?? action.title ?? '')
    const current = grouped.get(actorName) ?? {
      name: actorName,
      registered: 0,
      forwarded: 0,
      stageUpdated: 0,
      completed: 0,
      filed: 0,
      notesAdded: 0,
      attachmentsAdded: 0,
      acknowledgements: 0,
      other: 0,
      totalActions: 0,
      lastActivityDate: null,
    }

    current[category] += 1
    current.totalActions += 1
    const actionDate = parseActionDate(action)
    if (actionDate && (!current.lastActivityDate || actionDate > current.lastActivityDate)) {
      current.lastActivityDate = actionDate
    }

    grouped.set(actorName, current)
  })

  return [...grouped.values()]
    .map((item) => ({
      staffMember: item.name,
      correspondenceRegistered: item.registered,
      forwardingActions: item.forwarded,
      stageUpdates: item.stageUpdated,
      completionActions: item.completed,
      filingActions: item.filed,
      notesAdded: item.notesAdded,
      attachmentsAdded: item.attachmentsAdded,
      acknowledgements: item.acknowledgements,
      totalActions: item.totalActions,
      otherRecordedActions: item.other,
      lastActivityDate: item.lastActivityDate
        ? formatTimestampForDisplay(item.lastActivityDate)
        : 'Not available',
    }))
    .sort((left, right) => left.staffMember.localeCompare(right.staffMember))
}

function calculateAverageTurnaround(records) {
  const durations = records
    .filter((record) => record.status === 'Completed')
    .map((record) => {
      const startDate = parseReportDate(record.dateReceived)
      const completedAction = (record.actions ?? [])
        .map((action) => ({ ...action, parsedDate: parseActionDate(action) }))
        .filter((action) => action.parsedDate && action.type === 'Completed')
        .sort((left, right) => right.parsedDate - left.parsedDate)[0]

      if (!startDate || !completedAction?.parsedDate) {
        return null
      }

      // TODO: Backend reporting must become authoritative for turnaround-time rules.
      return getDaysBetween(startDate, completedAction.parsedDate)
    })
    .filter((value) => Number.isFinite(value))

  if (!durations.length) {
    return null
  }

  return (durations.reduce((total, value) => total + value, 0) / durations.length).toFixed(1)
}

function buildPerformanceSummary(records, reportEndDate) {
  const overdueRows = buildOverdueRows(records, reportEndDate)
  const pendingRows = buildPendingRows(records, reportEndDate, null)
  const completed = records.filter((record) => record.status === 'Completed').length
  const totalRecords = records.length
  const completionRate = totalRecords ? `${((completed / totalRecords) * 100).toFixed(1)}%` : '0.0%'

  return {
    totalRecords,
    received: totalRecords,
    registered: records.filter((record) => record.status === 'Registered').length,
    inProgress: records.filter((record) => record.status === 'In Progress').length,
    awaitingAction: records.filter((record) => record.status === 'Awaiting Action').length,
    forwarded: records.filter((record) => record.status === 'Forwarded').length,
    completed,
    filed: records.filter((record) => record.status === 'Filed').length,
    pending: pendingRows.length,
    overdue: overdueRows.length,
    completionRate,
    averageTurnaroundTime: calculateAverageTurnaround(records) ?? createNotAvailableMetric(),
  }
}

function buildAcknowledgementSummary(records) {
  const acknowledgementRecords = records.filter((record) => record.receiptStatus)
  const acknowledged = acknowledgementRecords.filter(
    (record) => record.receiptStatus === 'Acknowledged',
  ).length
  const rate = calculateAcknowledgementRate(acknowledged, acknowledgementRecords.length)
  const averageMinutes = calculateAverageAcknowledgementTime(acknowledgementRecords)

  return {
    totalReceiptActions: acknowledgementRecords.length,
    acknowledged,
    pending: acknowledgementRecords.filter((record) => record.receiptStatus === 'Pending').length,
    rate: `${rate.toFixed(1)}%`,
    averageTime: averageMinutes ? `${Math.round(averageMinutes)} minutes` : createNotAvailableMetric(),
  }
}

function buildAgeingBands(rows) {
  const labels = ['Less Than 7 Days', '7-14 Days', '15-30 Days', 'More Than 30 Days']
  return labels.map((label) => ({
    label,
    count: rows.filter((row) => row.ageingBand === label).length,
  }))
}

function buildOverdueBands(rows) {
  const labels = [
    '1-7 Days Overdue',
    '8-14 Days Overdue',
    '15-30 Days Overdue',
    'More Than 30 Days Overdue',
  ]
  return labels.map((label) => ({
    label,
    count: rows.filter((row) => row.overdueBand === label).length,
  }))
}

function createFormalReportModel(currentUser, config, computed) {
  const office = requireSupervisorOffice(currentUser)
  const period = resolveFormalReportPeriod(config)
  const reportType = config.reportType
  const reportTitle = getFormalReportTitle(reportType)
  const generatedAt = getFixedGeneratedDate().toISOString()
  const observations = normalizeFormalReportText(
    config.observations,
    FORMAL_REPORT_EMPTY_OBSERVATIONS,
  )
  const recommendations = normalizeFormalReportText(
    config.recommendations,
    FORMAL_REPORT_EMPTY_RECOMMENDATIONS,
  )

  return {
    id: null,
    reference: createFormalReportReference(reportType, office.code, period),
    reportType,
    reportTitle,
    office: {
      id: office.id,
      name: office.name,
      code: office.code,
    },
    period,
    preparedBy: {
      id: currentUser?.id ?? null,
      name: currentUser?.fullName ?? '',
      role: 'Office Supervisor',
    },
    generatedAt,
    summary: computed.summary,
    sections: computed.sections,
    observations,
    recommendations,
    isMockPreview: true,
    previewNotice: FORMAL_REPORT_PREVIEW_NOTICE,
    printOrientation: computed.printOrientation,
    suggestedFilename: createSuggestedFormalReportFilename(reportType, office.code, period),
  }
}

export async function getOfficeReportWorkspace(currentUser) {
  const office = requireSupervisorOffice(currentUser)
  const reportData = getOfficeReportData(office)

  return {
    office,
    officeName: getOfficeDisplayName(office),
    officeCode: office.code ?? '',
    defaultPeriod: reportData.defaultPeriod ?? 'This Month',
    stageOptions: reportData.stageOptions ?? [],
    contributorOptions: reportData.contributorOptions ?? [],
    configuration: getDefaultFormalReportConfig(currentUser),
    metadata: getFormalReportConfigurationMetadata(),
    analyticsData: reportData,
  }
}

export async function getOfficeSummaryReport(officeId, filters = {}) {
  const reportData = getOfficeReportData(officeId)
  return {
    office: reportData.office,
    officeId: reportData.officeId,
    filters,
    snapshot: applyAnalyticsFilters(reportData, filters),
  }
}

export async function getOfficeStaffContributionReport(officeId, filters = {}) {
  return getOfficeSummaryReport(officeId, filters)
}

export async function getOfficeBacklogReport(officeId, filters = {}) {
  return getOfficeSummaryReport(officeId, filters)
}

export async function getOfficeTrendsReport(officeId, filters = {}) {
  return getOfficeSummaryReport(officeId, filters)
}

export async function generateFormalReportPreview(currentUser, config) {
  const validation = validateFormalReportConfig(config)

  if (!validation.valid) {
    throw createApiError('Formal report configuration is incomplete.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: validation.errors,
    })
  }

  const office = requireSupervisorOffice(currentUser)
  const period = resolveFormalReportPeriod(config)
  const reportEndDate = parseReportDate(period.endDate)
  const sourceRecords = getCorrespondenceRecords()
  const filteredRecords = filterRecordsByOfficeAndPeriod(sourceRecords, office, period)
  const overdueRows = buildOverdueRows(filteredRecords, reportEndDate)
  const pendingRows = buildPendingRows(filteredRecords, reportEndDate, office)
  const staffRows = buildStaffContributionRows(filteredRecords, office, period)
  const summary = buildPerformanceSummary(filteredRecords, reportEndDate)
  const acknowledgementSummary = buildAcknowledgementSummary(filteredRecords)
  const overdueBands = buildOverdueBands(overdueRows)
  const ageingBands = buildAgeingBands(pendingRows)

  const sectionsByType = {
    'office-performance': [
      {
        id: 'executive-summary',
        title: 'Executive Summary',
        kind: 'paragraph',
        content: createFormalExecutiveSummary(summary),
      },
      {
        id: 'performance-summary',
        title: 'Performance Summary',
        kind: 'metrics-table',
        rows: [
          ['Received', summary.received],
          ['Registered', summary.registered],
          ['In Progress', summary.inProgress],
          ['Awaiting Action', summary.awaitingAction],
          ['Forwarded', summary.forwarded],
          ['Completed', summary.completed],
          ['Filed', summary.filed],
          ['Pending', summary.pending],
          ['Overdue', summary.overdue],
          ['Completion Rate', summary.completionRate],
          ['Average Turnaround Time', summary.averageTurnaroundTime],
        ],
      },
      {
        id: 'status-breakdown',
        title: 'Status Breakdown',
        kind: 'table',
        columns: ['Status', 'Count'],
        rows: buildStatusBreakdown(filteredRecords).map((item) => [item.label, item.value]),
      },
      {
        id: 'priority-breakdown',
        title: 'Priority Breakdown',
        kind: 'table',
        columns: ['Priority', 'Count'],
        rows: buildPriorityBreakdown(filteredRecords).map((item) => [item.label, item.value]),
      },
      {
        id: 'type-breakdown',
        title: 'Correspondence Type Breakdown',
        kind: 'table',
        columns: ['Type', 'Count'],
        rows: buildTypeBreakdown(filteredRecords).map((item) => [item.label, item.value]),
      },
      {
        id: 'overdue-summary',
        title: 'Overdue Summary',
        kind: 'table',
        columns: ['Band', 'Count'],
        rows: overdueBands.map((item) => [item.label, item.count]),
      },
      {
        id: 'pending-summary',
        title: 'Pending and Ageing Summary',
        kind: 'table',
        columns: ['Band', 'Count'],
        rows: ageingBands.map((item) => [item.label, item.count]),
      },
      {
        id: 'staff-summary',
        title: 'Staff Contribution Summary',
        kind: 'table',
        columns: ['Staff Member', 'Total Actions', 'Last Activity Date'],
        rows: staffRows.map((item) => [item.staffMember, item.totalActions, item.lastActivityDate]),
      },
      {
        id: 'bottlenecks',
        title: 'Bottlenecks and Observations',
        kind: 'paragraph',
        content: observationsFromMetrics(summary, acknowledgementSummary),
      },
      {
        id: 'recommendations',
        title: 'Recommendations',
        kind: 'paragraph',
        content: normalizeFormalReportText(config.recommendations, FORMAL_REPORT_EMPTY_RECOMMENDATIONS),
      },
    ],
    'overdue-documents': [
      {
        id: 'overdue-summary',
        title: 'Overdue Summary',
        kind: 'metrics-table',
        rows: [
          ['Total Overdue', overdueRows.length],
          ['1-7 Days Overdue', overdueBands[0].count],
          ['8-14 Days Overdue', overdueBands[1].count],
          ['15-30 Days Overdue', overdueBands[2].count],
          ['More Than 30 Days Overdue', overdueBands[3].count],
          ['Oldest Overdue Item', overdueRows[0]?.referenceNumber ?? 'No overdue records'],
        ],
      },
      {
        id: 'overdue-table',
        title: 'Overdue Documents',
        kind: 'data-table',
        columns: [
          'Reference Number',
          'Subject',
          'Date Received',
          'Due Date',
          'Current Stage',
          'Current Status',
          'Days Pending',
          'Days Overdue',
          'Last Action Date',
          'Last Action By',
        ],
        rows: overdueRows.map((item) => [
          item.referenceNumber,
          item.subject,
          item.dateReceived,
          item.dueDate,
          item.currentStage,
          item.currentStatus,
          item.daysPending,
          item.daysOverdue,
          item.lastActionDate,
          item.lastActionBy,
        ]),
        emptyMessage: 'No overdue records were identified for the selected reporting period.',
      },
    ],
    'pending-ageing': [
      {
        id: 'ageing-summary',
        title: 'Pending and Ageing Summary',
        kind: 'table',
        columns: ['Band', 'Count'],
        rows: ageingBands.map((item) => [item.label, item.count]),
      },
      {
        id: 'pending-table',
        title: 'Pending Records',
        kind: 'data-table',
        columns: [
          'Reference Number',
          'Subject',
          'Date Received',
          'Current Stage',
          'Current Status',
          'Priority',
          'Days Pending',
          'Responsible Office',
          'Last Action Date',
        ],
        rows: pendingRows.map((item) => [
          item.referenceNumber,
          item.subject,
          item.dateReceived,
          item.currentStage,
          item.currentStatus,
          item.priority,
          item.daysPending,
          item.responsibleOffice,
          item.lastActionDate,
        ]),
        emptyMessage: 'No pending correspondence records were identified for the selected reporting period.',
      },
    ],
    'staff-contribution': [
      {
        id: 'staff-note',
        title: 'Staff Contribution Note',
        kind: 'paragraph',
        content:
          'Staff contribution figures represent actions recorded in the system audit trail. They do not indicate individual ownership of correspondence.',
      },
      {
        id: 'staff-table',
        title: 'Staff Contribution Summary',
        kind: 'data-table',
        columns: [
          'Staff Member',
          'Correspondence Registered',
          'Forwarding Actions',
          'Stage Updates',
          'Completion Actions',
          'Filing Actions',
          'Notes Added',
          'Attachments Added',
          'Acknowledgements',
          'Total Actions',
          'Last Activity Date',
          'Other Recorded Actions',
        ],
        rows: staffRows.map((item) => [
          item.staffMember,
          item.correspondenceRegistered,
          item.forwardingActions,
          item.stageUpdates,
          item.completionActions,
          item.filingActions,
          item.notesAdded,
          item.attachmentsAdded,
          item.acknowledgements,
          item.totalActions,
          item.lastActivityDate,
          item.otherRecordedActions,
        ]),
        emptyMessage: 'No staff actions were identified for the selected reporting period.',
      },
    ],
  }

  return createFormalReportModel(currentUser, config, {
    summary,
    sections: sectionsByType[config.reportType] ?? [],
    printOrientation:
      config.reportType === 'overdue-documents' || config.reportType === 'staff-contribution'
        ? 'landscape'
        : 'portrait',
  })
}

export async function generateFormalReport(currentUser, config) {
  const preview = await generateFormalReportPreview(currentUser, config)

  return {
    ...preview,
    reference: preview.reference.replace(/-PREVIEW$/, '-V1'),
    isMockPreview: false,
    previewNotice: '',
  }
}

export async function listFormalReportsHistory() {
  return []
}

export async function getFormalReportById() {
  throw createApiError('The requested report could not be found.', {
    code: 'NOT_FOUND',
    status: 404,
  })
}

function observationsFromMetrics(summary, acknowledgementSummary) {
  if (!summary.totalRecords) {
    return 'No observations were entered.'
  }

  return `A total of ${summary.totalRecords} records were included in this preview. ${summary.pending} remained pending at period close, ${summary.overdue} were overdue, and ${acknowledgementSummary.acknowledged} receipt acknowledgements were recorded.`
}

export const mockReportService = Object.freeze({
  getOfficeReportWorkspace,
  getOfficeSummaryReport,
  getOfficeStaffContributionReport,
  getOfficeBacklogReport,
  getOfficeTrendsReport,
  generateFormalReportPreview,
  generateFormalReport,
  listFormalReportsHistory,
  getFormalReportById,
})
