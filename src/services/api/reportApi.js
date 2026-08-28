import { canAccessOfficeReports, getUserRoleLabel } from '../../constants/roles.js'
import {
  createSuggestedFormalReportFilename,
  formatFormalReportPeriodLabel,
  formatTimestampForDisplay,
  getDefaultFormalReportConfig,
  getFormalReportBackendType,
  getFormalReportConfigurationMetadata,
  getFormalReportMetaByBackendType,
  getFormalReportPreviewPath,
  getFormalReportPrintOrientation,
  getFormalReportTitle,
  normalizeFormalReportText,
  resolveFormalReportPeriod,
} from '../../utils/formalReports.js'
import {
  normalizeOfficeAnalyticsSummaryResponse,
  normalizeOfficeBacklogResponse,
  normalizeOfficeStaffContributionResponse,
  normalizeOfficeTrendsResponse,
  resolveAnalyticsSummaryDateRange,
} from '../../utils/analyticsReports.js'
import { formatDuration } from '../../utils/duration.js'
import { getOfficeDisplayName, normalizeOffice } from '../../utils/offices.js'
import {
  apiRequest,
  createApiContractMismatchError,
  createApiError,
} from '../apiClient.js'
import { API_CAPABILITIES, assertApiCapability } from './capabilities.js'
import { buildQueryString } from './queryString.js'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePositiveInteger(value, field, message) {
  const normalized = normalizeText(value)

  if (!normalized) {
    throw createApiError(message, {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { [field]: message },
    })
  }

  const parsed = Number.parseInt(normalized, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createApiError(message, {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { [field]: message },
    })
  }

  return parsed
}

function getSafeObjectKeys(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  return Object.keys(value).sort()
}

function ensureObjectResponse(value, operation, missingExpectedKeys = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createApiContractMismatchError('The backend returned an invalid formal report response.', {
      operation,
      receivedTopLevelType: Array.isArray(value) ? 'array' : typeof value,
      safeTopLevelKeys: [],
      missingExpectedKeys,
    })
  }

  return value
}

function extractReportEnvelope(rawResponse, operation) {
  const response = ensureObjectResponse(rawResponse, operation)

  if (response.report && typeof response.report === 'object' && !Array.isArray(response.report)) {
    return ensureObjectResponse(response.report, operation)
  }

  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    if (response.data.report && typeof response.data.report === 'object' && !Array.isArray(response.data.report)) {
      return ensureObjectResponse(response.data.report, operation)
    }

    return ensureObjectResponse(response.data, operation)
  }

  return response
}

function mergeOffice(primaryOffice, fallbackOffice) {
  const normalizedPrimary = normalizeOffice(primaryOffice)
  const normalizedFallback = normalizeOffice(fallbackOffice)

  if (!normalizedPrimary && !normalizedFallback) {
    return null
  }

  return {
    id: normalizedPrimary?.id ?? normalizedFallback?.id ?? null,
    name: normalizedPrimary?.name ?? normalizedFallback?.name ?? '',
    code: normalizedPrimary?.code ?? normalizedFallback?.code ?? null,
    status: normalizedPrimary?.status ?? normalizedFallback?.status ?? null,
  }
}

function requireSupervisorContext(currentUser) {
  if (!canAccessOfficeReports(currentUser)) {
    throw createApiError('Formal office reports are available only to office supervisors.', {
      code: 'ACCESS_DENIED',
      status: 403,
    })
  }

  const office = normalizeOffice(currentUser?.office)

  if (!office?.id || !office?.name) {
    throw createApiError(
      'A valid supervisor office is required before confidential office reports can be opened.',
      {
        code: 'VALIDATION_ERROR',
        status: 422,
      },
    )
  }

  return office
}

function resolveRequestedReportType(configuration = {}) {
  const reportType = normalizeText(configuration.reportType)
  const backendType = getFormalReportBackendType(reportType)
  const previewPath = getFormalReportPreviewPath(reportType)

  if (!reportType || !backendType || !previewPath) {
    throw createApiError('Select a valid report type.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { reportType: 'Select a valid report type.' },
    })
  }

  return {
    reportType,
    backendType,
    previewPath,
  }
}

function buildNormalizedPeriod(configuration = {}) {
  try {
    return resolveFormalReportPeriod(configuration)
  } catch (error) {
    throw createApiError(error?.message ?? 'Select a valid reporting period.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }
}

export function buildFormalReportPreviewQuery(configuration = {}) {
  const period = buildNormalizedPeriod(configuration)

  if (period.type === 'monthly') {
    return {
      period_type: 'monthly',
      year: normalizePositiveInteger(configuration.year, 'year', 'Select a year.'),
      month: normalizePositiveInteger(configuration.month, 'month', 'Select a month.'),
    }
  }

  if (period.type === 'annual') {
    return {
      period_type: 'annual',
      year: normalizePositiveInteger(configuration.year, 'year', 'Select a year.'),
    }
  }

  return {
    period_type: 'custom',
    start_date: normalizeText(configuration.startDate),
    end_date: normalizeText(configuration.endDate),
  }
}

export function buildFormalReportGeneratePayload(configuration = {}) {
  const { backendType } = resolveRequestedReportType(configuration)
  const period = buildNormalizedPeriod(configuration)
  const observations = normalizeText(configuration.observations)
  const recommendations = normalizeText(configuration.recommendations)
  const payload = {
    report_type: backendType,
    period_type: period.type,
    observations,
    recommendations,
  }

  if (period.type === 'monthly') {
    payload.year = normalizePositiveInteger(configuration.year, 'year', 'Select a year.')
    payload.month = normalizePositiveInteger(configuration.month, 'month', 'Select a month.')
    return payload
  }

  if (period.type === 'annual') {
    payload.year = normalizePositiveInteger(configuration.year, 'year', 'Select a year.')
    return payload
  }

  payload.start_date = normalizeText(configuration.startDate)
  payload.end_date = normalizeText(configuration.endDate)
  return payload
}

function pickValue(source, keys = []) {
  for (const key of keys) {
    const value = source?.[key]

    if (value !== null && value !== undefined && value !== '') {
      return value
    }
  }

  return null
}

function formatMetricValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available'
  }

  return value
}

function formatDurationMetricValue(value, inputUnit) {
  const durationLabel = formatDuration(value, { inputUnit })
  return durationLabel ?? formatMetricValue(value)
}

function normalizePeriod(rawPeriod, requestedPeriod) {
  if (!rawPeriod || typeof rawPeriod !== 'object' || Array.isArray(rawPeriod)) {
    return {
      type: requestedPeriod.type,
      startDate: requestedPeriod.startDate,
      endDate: requestedPeriod.endDate,
      label: requestedPeriod.label,
    }
  }

  return {
    type: normalizeText(rawPeriod.type ?? rawPeriod.period_type) || requestedPeriod.type,
    startDate: normalizeText(rawPeriod.startDate ?? rawPeriod.start_date) || requestedPeriod.startDate,
    endDate: normalizeText(rawPeriod.endDate ?? rawPeriod.end_date) || requestedPeriod.endDate,
    label: normalizeText(rawPeriod.label) || requestedPeriod.label,
  }
}

function normalizeBreakdownEntries(input) {
  if (!input) {
    return []
  }

  if (Array.isArray(input)) {
    return input
      .map((entry) => {
        if (Array.isArray(entry)) {
          return [normalizeText(entry[0]), entry[1]]
        }

        if (entry && typeof entry === 'object') {
          const label = normalizeText(
            entry.label ??
              entry.name ??
              entry.status ??
              entry.type ??
              entry.priority ??
              entry.band ??
              entry.stage,
          )
          const value = pickValue(entry, ['count', 'value', 'total', 'items', 'amount'])
          return [label, value]
        }

        return ['', null]
      })
      .filter(([label]) => Boolean(label))
      .map(([label, value]) => [label, formatMetricValue(value)])
  }

  if (typeof input === 'object') {
    return Object.entries(input)
      .map(([label, value]) => [label, formatMetricValue(value)])
      .filter(([label]) => Boolean(normalizeText(label)))
  }

  return []
}

function normalizeParagraph(value, fallback = 'Not available.') {
  const normalized = normalizeText(value)
  return normalized || fallback
}

function normalizeOverdueItems(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => [
    normalizeText(item.reference_number ?? item.referenceNumber ?? item.reference) || 'Not available',
    normalizeText(item.subject) || 'Not available',
    normalizeText(item.date_received ?? item.dateReceived) || 'Not available',
    normalizeText(item.due_date ?? item.dueDate) || 'Not available',
    normalizeText(item.current_stage ?? item.currentStage) || 'Not available',
    normalizeText(item.current_status ?? item.currentStatus) || 'Not available',
    formatDurationMetricValue(item.days_pending ?? item.daysPending, 'days'),
    formatDurationMetricValue(item.days_overdue ?? item.daysOverdue, 'days'),
    normalizeText(item.last_action_date ?? item.lastActionDate) || 'Not available',
    normalizeText(item.last_action_by ?? item.lastActionBy) || 'Not available',
  ])
}

function normalizePendingItems(items = [], office) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => [
    normalizeText(item.reference_number ?? item.referenceNumber ?? item.reference) || 'Not available',
    normalizeText(item.subject) || 'Not available',
    normalizeText(item.date_received ?? item.dateReceived) || 'Not available',
    normalizeText(item.current_stage ?? item.currentStage) || 'Not available',
    normalizeText(item.current_status ?? item.currentStatus ?? item.status) || 'Not available',
    normalizeText(item.priority) || 'Not available',
    formatDurationMetricValue(item.days_pending ?? item.daysPending, 'days'),
    normalizeText(
      item.responsible_office ??
        item.responsibleOffice ??
        item.current_office ??
        item.currentOffice ??
        item.office_name ??
        item.officeName ??
        office?.name,
    ) || 'Not available',
    normalizeText(item.last_action_date ?? item.lastActionDate) || 'Not available',
  ])
}

function normalizeStaffContributionRows(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => {
    const registered = Number(item.registered ?? item.correspondence_registered ?? 0)
    const forwarded = Number(item.forwarded ?? item.forwarding_actions ?? 0)
    const stageUpdated = Number(item.stage_updates ?? item.stage_updated ?? item.stageUpdates ?? 0)
    const completed = Number(item.completed ?? item.completion_actions ?? 0)
    const filed = Number(item.filed ?? item.filing_actions ?? 0)
    const notesAdded = Number(item.notes_added ?? item.notesAdded ?? 0)
    const attachmentsAdded = Number(
      item.attachments_uploaded ?? item.attachments_added ?? item.attachmentsAdded ?? 0,
    )
    const acknowledgements = Number(item.acknowledgements ?? item.receipt_acknowledgements ?? 0)
    const explicitTotal = item.total_actions ?? item.totalActions
    const otherRecordedActions = Number(item.other_actions ?? item.otherRecordedActions ?? 0)
    const totalActions = Number.isFinite(Number(explicitTotal))
      ? Number(explicitTotal)
      : registered +
        forwarded +
        stageUpdated +
        completed +
        filed +
        notesAdded +
        attachmentsAdded +
        acknowledgements +
        otherRecordedActions

    return {
      staffMember:
        normalizeText(
          item.staff_member ??
            item.staffMember ??
            item.name ??
            item.user_name ??
            item.userName ??
            item.user_email ??
            item.userEmail,
        ) ||
        'Not available',
      registered,
      forwarded,
      stageUpdated,
      completed,
      filed,
      notesAdded,
      attachmentsAdded,
      acknowledgements,
      totalActions,
      otherRecordedActions,
      lastActivity:
        normalizeText(item.last_action_date ?? item.lastActivityDate ?? item.last_activity) ||
        'Not available',
    }
  })
}

function buildOfficePerformanceSections(rawReport, staffRows) {
  const summary = rawReport.summary ?? {}
  const statusBreakdown = normalizeBreakdownEntries(
    rawReport.status_breakdown ?? rawReport.by_status,
  )
  const priorityBreakdown = normalizeBreakdownEntries(
    rawReport.priority_breakdown ?? rawReport.by_priority,
  )
  const typeBreakdown = normalizeBreakdownEntries(rawReport.type_breakdown ?? rawReport.by_type)
  const overdueSummary = normalizeBreakdownEntries(
    rawReport.overdue_summary?.bands ??
      rawReport.overdue_summary ??
      rawReport.overdue_bands ??
      rawReport.ageing?.overdue_bands,
  )
  const pendingSummary = normalizeBreakdownEntries(
    rawReport.pending_ageing_summary?.bands ??
      rawReport.pending_ageing_summary ??
      rawReport.ageing_summary?.bands ??
      rawReport.ageing_summary ??
      rawReport.pending_bands,
  )
  const executiveSummary = pickValue(rawReport, [
    'executive_summary',
    'summary_text',
    'narrative',
  ])
  const bottlenecks = pickValue(rawReport, ['bottlenecks', 'busiest_stage', 'observations'])

  return {
    summary: {
      totalRecords: pickValue(summary, ['total_records', 'totalRecords', 'received']),
      completed: pickValue(summary, ['completed']),
      pending: pickValue(summary, ['pending']),
      overdue: pickValue(summary, ['overdue', 'total_overdue']),
      completionRate: pickValue(summary, ['completion_rate', 'completionRate']),
      averageTurnaroundTime: pickValue(summary, [
        'average_turnaround_time',
        'averageTurnaroundTime',
      ]),
    },
    sections: [
      {
        id: 'executive-summary',
        title: 'Executive Summary',
        kind: 'paragraph',
        content: normalizeParagraph(executiveSummary),
      },
      {
        id: 'performance-summary',
        title: 'Performance Summary',
        kind: 'metrics-table',
        rows: [
          ['Received', formatMetricValue(pickValue(summary, ['received', 'total_records', 'totalRecords']))],
          ['Registered', formatMetricValue(pickValue(summary, ['registered']))],
          ['In Progress', formatMetricValue(pickValue(summary, ['in_progress', 'inProgress']))],
          ['Awaiting Action', formatMetricValue(pickValue(summary, ['awaiting_action', 'awaitingAction']))],
          ['Forwarded', formatMetricValue(pickValue(summary, ['forwarded']))],
          ['Completed', formatMetricValue(pickValue(summary, ['completed']))],
          ['Filed', formatMetricValue(pickValue(summary, ['filed']))],
          ['Pending', formatMetricValue(pickValue(summary, ['pending']))],
          ['Overdue', formatMetricValue(pickValue(summary, ['overdue', 'total_overdue']))],
          ['Completion Rate', formatMetricValue(pickValue(summary, ['completion_rate', 'completionRate']))],
          [
            'Average Turnaround Time',
            formatDurationMetricValue(
              pickValue(summary, ['average_turnaround_time', 'averageTurnaroundTime']),
              'hours',
            ),
          ],
        ],
      },
      {
        id: 'status-breakdown',
        title: 'Status Breakdown',
        kind: 'table',
        rows: statusBreakdown.length ? statusBreakdown : [['Not available', 'Not available']],
      },
      {
        id: 'priority-breakdown',
        title: 'Priority Breakdown',
        kind: 'table',
        rows: priorityBreakdown.length ? priorityBreakdown : [['Not available', 'Not available']],
      },
      {
        id: 'type-breakdown',
        title: 'Correspondence Type Breakdown',
        kind: 'table',
        rows: typeBreakdown.length ? typeBreakdown : [['Not available', 'Not available']],
      },
      {
        id: 'overdue-summary',
        title: 'Overdue Summary',
        kind: 'table',
        rows: overdueSummary.length ? overdueSummary : [['Not available', 'Not available']],
      },
      {
        id: 'pending-summary',
        title: 'Pending and Ageing Summary',
        kind: 'table',
        rows: pendingSummary.length ? pendingSummary : [['Not available', 'Not available']],
      },
      {
        id: 'staff-summary',
        title: 'Staff Contribution Summary',
        kind: 'table',
        rows: staffRows.length
          ? staffRows.map((item) => [item.staffMember, item.totalActions])
          : [['Not available', 'Not available']],
      },
      {
        id: 'bottlenecks',
        title: 'Bottlenecks and Observations',
        kind: 'paragraph',
        content: normalizeParagraph(bottlenecks),
      },
    ],
  }
}

function buildOverdueSections(rawReport) {
  const summary = rawReport.overdue_summary ?? rawReport.summary ?? {}
  const bands = normalizeBreakdownEntries(
    summary.bands ?? rawReport.bands ?? rawReport.overdue_bands,
  )
  const oldestOverdueItem =
    normalizeText(
      summary.oldest_overdue_item?.reference_number ??
        summary.oldest_overdue_item?.referenceNumber ??
        summary.oldest_overdue_item ??
        rawReport.oldest_overdue_item?.reference_number ??
        rawReport.oldest_overdue_item?.referenceNumber ??
        rawReport.oldest_overdue_item,
    ) || 'Not available'

  return {
    summary: {
      totalOverdue: pickValue(summary, ['total_overdue', 'totalOverdue']),
    },
    sections: [
      {
        id: 'overdue-summary',
        title: 'Overdue Summary',
        kind: 'metrics-table',
        rows: [
          ['Total Overdue', formatMetricValue(pickValue(summary, ['total_overdue', 'totalOverdue']))],
          ...bands,
          ['Oldest Overdue Item', oldestOverdueItem],
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
        rows: normalizeOverdueItems(rawReport.items),
        emptyMessage: 'No overdue records were identified for the selected reporting period.',
      },
    ],
  }
}

function buildPendingAgeingSections(rawReport, office) {
  const summary = rawReport.pending_ageing_summary ?? rawReport.ageing_summary ?? rawReport.summary ?? {}
  const bands = normalizeBreakdownEntries(summary.bands ?? rawReport.ageing_bands ?? rawReport.bands)

  return {
    summary: {
      totalPending: pickValue(summary, ['total_pending', 'totalPending']),
    },
    sections: [
      {
        id: 'ageing-summary',
        title: 'Pending and Ageing Summary',
        kind: 'table',
        rows: bands.length ? bands : [['Not available', 'Not available']],
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
        rows: normalizePendingItems(rawReport.items, office),
        emptyMessage:
          'No pending correspondence records were identified for the selected reporting period.',
      },
    ],
  }
}

function buildStaffContributionSections(rawReport) {
  const rows = normalizeStaffContributionRows(
    rawReport.items ??
      rawReport.contributors ??
      rawReport.staff_contribution ??
      rawReport.staffContribution ??
      [],
  )

  return {
    summary: {
      contributors: rows.length,
    },
    sections: [
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
        rows: rows.map((item) => [
          item.staffMember,
          item.registered,
          item.forwarded,
          item.stageUpdated,
          item.completed,
          item.filed,
          item.notesAdded,
          item.attachmentsAdded,
          item.acknowledgements,
          item.totalActions,
          item.lastActivity,
          item.otherRecordedActions,
        ]),
        emptyMessage: 'No staff actions were identified for the selected reporting period.',
      },
    ],
  }
}

export function normalizeFormalReportResponse(
  rawResponse,
  { configuration = {}, currentUser = null, operation = 'formalReport' } = {},
) {
  const envelope = extractReportEnvelope(rawResponse, operation)
  const requestedPeriod = buildNormalizedPeriod(configuration)
  const responseReportType =
    normalizeText(envelope.report_type ?? envelope.reportType).toUpperCase() || null
  const reportMeta =
    getFormalReportMetaByBackendType(responseReportType) ??
    getFormalReportMetaByBackendType(getFormalReportBackendType(configuration.reportType)) ??
    null

  if (!reportMeta) {
    throw createApiContractMismatchError('The backend returned an unknown formal report type.', {
      operation,
      receivedTopLevelType: 'object',
      safeTopLevelKeys: getSafeObjectKeys(envelope),
      missingExpectedKeys: ['report_type'],
    })
  }

  const reference = normalizeText(
    envelope.report_reference ?? envelope.reportReference ?? envelope.reference,
  )

  if (!reference) {
    throw createApiContractMismatchError('The backend returned a formal report without a reference.', {
      operation,
      receivedTopLevelType: 'object',
      safeTopLevelKeys: getSafeObjectKeys(envelope),
      missingExpectedKeys: ['report_reference'],
    })
  }

  const office = mergeOffice(
    envelope.office ?? envelope.office_context ?? envelope.officeContext ?? null,
    currentUser?.office ?? null,
  ) ?? {
    id: null,
    name: '',
    code: null,
    status: null,
  }
  const period = normalizePeriod(envelope.period, requestedPeriod)
  const generatedAt = normalizeText(envelope.generated_at ?? envelope.generatedAt)
  const staffRows = normalizeStaffContributionRows(
    envelope.staff_contribution_summary ??
      envelope.staff_contribution ??
      envelope.staffContribution ??
      [],
  )

  let sectionsModel = { summary: {}, sections: [] }

  if (reportMeta.value === 'office-performance') {
    sectionsModel = buildOfficePerformanceSections(envelope, staffRows)
  } else if (reportMeta.value === 'overdue-documents') {
    sectionsModel = buildOverdueSections(envelope)
  } else if (reportMeta.value === 'pending-ageing') {
    sectionsModel = buildPendingAgeingSections(envelope, office)
  } else if (reportMeta.value === 'staff-contribution') {
    sectionsModel = buildStaffContributionSections(envelope)
  }

  return {
    id: envelope.id ?? envelope.report_id ?? envelope.reportId ?? null,
    reference,
    reportType: reportMeta.value,
    reportTitle: reportMeta.label ?? getFormalReportTitle(reportMeta.value),
    office,
    period,
    preparedBy: {
      id: currentUser?.id ?? null,
      name: normalizeText(
        envelope.prepared_by?.name ??
          envelope.preparedBy?.name ??
          envelope.generated_by?.name ??
          currentUser?.fullName,
      ),
      role: normalizeText(
        envelope.prepared_by?.role ??
          envelope.preparedBy?.role ??
          envelope.generated_by?.role ??
          getUserRoleLabel(currentUser?.role),
      ),
    },
    generatedAt,
    generatedDateLabel: formatTimestampForDisplay(generatedAt),
    summary: sectionsModel.summary,
    sections: sectionsModel.sections,
    observations: normalizeFormalReportText(
      envelope.observations ?? configuration.observations,
      'No observations were entered.',
    ),
    recommendations: normalizeFormalReportText(
      envelope.recommendations ?? configuration.recommendations,
      'No recommendations were entered.',
    ),
    isMockPreview: false,
    previewNotice: '',
    printOrientation: getFormalReportPrintOrientation(reportMeta.value),
    suggestedFilename: createSuggestedFormalReportFilename(
      reportMeta.value,
      office.code ?? '',
      period,
    ),
    raw: envelope,
  }
}

function buildSummaryReportQuery(filters = {}) {
  const range = resolveAnalyticsSummaryDateRange(filters)

  if (!range.valid) {
    throw createApiError(range.error, {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: {
        end: range.error,
      },
    })
  }

  if (!range.usesCustomRange) {
    return ''
  }

  return buildQueryString({
    end: range.end,
    start: range.start,
  })
}

async function getOfficeAnalyticsReport(
  capability,
  officeId,
  suffix,
  normalizeResponse,
  buildQuery = () => '',
  filters = {},
  options = {},
) {
  assertApiCapability(capability)

  const normalizedOfficeId = normalizeText(officeId)

  if (!normalizedOfficeId) {
    throw createApiError('A valid office ID is required.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }

  const response = await apiRequest(
    `reports/offices/${normalizedOfficeId}/${suffix}/${buildQuery(filters)}`,
    {
      method: 'GET',
      authenticated: true,
      signal: options.signal,
    },
  )

  return normalizeResponse(response ?? {})
}

export async function getOfficeReportWorkspace(currentUser) {
  assertApiCapability(API_CAPABILITIES.REPORT_FORMAL_OFFICE_PERFORMANCE_PREVIEW)
  const office = requireSupervisorContext(currentUser)

  return {
    office,
    officeName: getOfficeDisplayName(office),
    officeCode: office.code ?? '',
    defaultPeriod: 'This Month',
    stageOptions: [],
    contributorOptions: [],
    configuration: getDefaultFormalReportConfig(currentUser),
    metadata: getFormalReportConfigurationMetadata(),
    analyticsData: null,
  }
}

export async function getOfficeSummaryReport(officeId, filters = {}, options = {}) {
  return getOfficeAnalyticsReport(
    API_CAPABILITIES.REPORT_OFFICE_SUMMARY,
    officeId,
    'summary',
    normalizeOfficeAnalyticsSummaryResponse,
    buildSummaryReportQuery,
    filters,
    options,
  )
}

export async function getOfficeStaffContributionReport(officeId, options = {}) {
  return getOfficeAnalyticsReport(
    API_CAPABILITIES.REPORT_STAFF_CONTRIBUTION,
    officeId,
    'staff-contribution',
    normalizeOfficeStaffContributionResponse,
    undefined,
    {},
    options,
  )
}

export async function getOfficeBacklogReport(officeId, options = {}) {
  return getOfficeAnalyticsReport(
    API_CAPABILITIES.REPORT_BACKLOG,
    officeId,
    'backlog',
    normalizeOfficeBacklogResponse,
    undefined,
    {},
    options,
  )
}

export async function getOfficeTrendsReport(officeId, options = {}) {
  return getOfficeAnalyticsReport(
    API_CAPABILITIES.REPORT_TRENDS,
    officeId,
    'trends',
    normalizeOfficeTrendsResponse,
    undefined,
    {},
    options,
  )
}

export async function getOfficeWorkloadReport(officeId, filters = {}, options = {}) {
  void filters
  return getOfficeStaffContributionReport(officeId, options)
}

export async function generateFormalReportPreview(currentUser, configuration, options = {}) {
  const office = requireSupervisorContext(currentUser)
  const { previewPath } = resolveRequestedReportType(configuration)
  const capabilityByPath = {
    'reports/formal/office-performance/': API_CAPABILITIES.REPORT_FORMAL_OFFICE_PERFORMANCE_PREVIEW,
    'reports/formal/overdue/': API_CAPABILITIES.REPORT_FORMAL_OVERDUE_PREVIEW,
    'reports/formal/pending-ageing/': API_CAPABILITIES.REPORT_FORMAL_PENDING_AGEING_PREVIEW,
    'reports/formal/staff-contribution/': API_CAPABILITIES.REPORT_FORMAL_STAFF_CONTRIBUTION_PREVIEW,
  }

  assertApiCapability(capabilityByPath[previewPath])
  const query = buildQueryString(buildFormalReportPreviewQuery(configuration))
  const response = await apiRequest(`${previewPath}${query}`, {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  return normalizeFormalReportResponse(response, {
    configuration,
    currentUser: { ...currentUser, office },
    operation: 'generateFormalReportPreview',
  })
}

export async function generateFormalReport(currentUser, configuration, options = {}) {
  const office = requireSupervisorContext(currentUser)
  assertApiCapability(API_CAPABILITIES.REPORT_FORMAL_GENERATE)
  const response = await apiRequest('reports/formal/generate/', {
    method: 'POST',
    body: buildFormalReportGeneratePayload(configuration),
    authenticated: true,
    signal: options.signal,
  })

  return normalizeFormalReportResponse(response, {
    configuration,
    currentUser: { ...currentUser, office },
    operation: 'generateFormalReport',
  })
}

export function normalizeFormalReportHistoryEntry(rawEntry = {}) {
  return normalizeFormalReportHistoryEntryWithOptions(rawEntry)
}

export function normalizeFormalReportHistoryEntryWithOptions(rawEntry = {}, options = {}) {
  const entry = ensureObjectResponse(rawEntry, 'listFormalReportsHistory')
  const reportType =
    getFormalReportMetaByBackendType(
      normalizeText(entry.report_type ?? entry.reportType).toUpperCase(),
    ) ?? null
  const periodType =
    normalizeText(
      entry.period_type ??
        entry.periodType ??
        entry.period?.type ??
        entry.period?.period_type,
    ) || ''
  const periodStart =
    normalizeText(
      entry.period_start ??
        entry.periodStart ??
        entry.start_date ??
        entry.startDate ??
        entry.period?.period_start ??
        entry.period?.periodStart ??
        entry.period?.start_date ??
        entry.period?.startDate,
    ) || ''
  const periodEnd =
    normalizeText(
      entry.period_end ??
        entry.periodEnd ??
        entry.end_date ??
        entry.endDate ??
        entry.period?.period_end ??
        entry.period?.periodEnd ??
        entry.period?.end_date ??
        entry.period?.endDate,
    ) || ''
  const periodLabel = formatFormalReportPeriodLabel({
    periodType,
    startDate: periodStart,
    endDate: periodEnd,
    label:
      normalizeText(
        entry.period_label ??
          entry.periodLabel ??
          entry.period?.label,
      ) || '',
  })
  const effectiveOffice = mergeOffice(
    entry.office ?? null,
    options.currentUser?.office ?? null,
  )

  return {
    id: entry.id ?? entry.report_id ?? entry.reportId ?? null,
    reference:
      normalizeText(entry.report_reference ?? entry.reportReference ?? entry.reference) ||
      'Not available',
    reportType: reportType?.value ?? null,
    reportTitle: reportType?.label ?? 'Formal Report',
    office: effectiveOffice ?? {
      id: null,
      name: '',
      code: null,
      status: null,
    },
    period: normalizePeriod(entry.period, {
      type: periodType,
      startDate: periodStart,
      endDate: periodEnd,
      label: periodLabel,
    }),
    generatedAt: normalizeText(entry.generated_at ?? entry.generatedAt),
    generatedDateLabel: formatTimestampForDisplay(entry.generated_at ?? entry.generatedAt),
    generatedBy:
      normalizeText(
        entry.generated_by?.name ??
          entry.generatedBy?.name ??
          entry.prepared_by?.name ??
          entry.preparedBy?.name ??
          entry.generated_by_name ??
          entry.generatedByName,
      ) || '',
  }
}

export async function listFormalReportsHistory(options = {}) {
  assertApiCapability(API_CAPABILITIES.REPORT_FORMAL_HISTORY)
  const response = await apiRequest('reports/formal/history/', {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  const historySource = Array.isArray(response)
    ? response
    : response?.results ?? response?.reports ?? response?.items ?? []

  return Array.isArray(historySource)
    ? historySource.map((entry) => normalizeFormalReportHistoryEntryWithOptions(entry, options))
    : []
}

export async function getFormalReportById(reportId, options = {}) {
  assertApiCapability(API_CAPABILITIES.REPORT_FORMAL_DETAIL)
  const normalizedReportId = normalizeText(reportId)

  if (!normalizedReportId) {
    throw createApiError('A valid report ID is required.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }

  const response = await apiRequest(`reports/formal/${normalizedReportId}/`, {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  return normalizeFormalReportResponse(response, {
    configuration: {
      reportType:
        getFormalReportMetaByBackendType(
          normalizeText(response?.report_type ?? response?.reportType).toUpperCase(),
        )?.value ?? '',
      periodType:
        normalizeText(response?.period?.type ?? response?.period?.period_type).toLowerCase() ||
        'monthly',
      year: normalizeText(response?.period?.start_date ?? '').slice(0, 4),
      month: normalizeText(response?.period?.start_date ?? '').slice(5, 7),
      startDate: normalizeText(response?.period?.start_date),
      endDate: normalizeText(response?.period?.end_date),
      observations: response?.observations ?? '',
      recommendations: response?.recommendations ?? '',
    },
    currentUser: options.currentUser ?? null,
    operation: 'getFormalReportById',
  })
}

export const reportApiService = Object.freeze({
  getOfficeReportWorkspace,
  getOfficeSummaryReport,
  getOfficeStaffContributionReport,
  getOfficeWorkloadReport,
  getOfficeBacklogReport,
  getOfficeTrendsReport,
  generateFormalReportPreview,
  generateFormalReport,
  listFormalReportsHistory,
  getFormalReportById,
})
