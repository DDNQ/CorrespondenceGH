import { getUserRoleLabel } from '../constants/roles.js'
import { getOfficeDisplayName } from './offices.js'

export const FORMAL_REPORT_TYPES = Object.freeze([
  {
    value: 'office-performance',
    backendType: 'OFFICE_PERFORMANCE',
    previewPath: 'reports/formal/office-performance/',
    printOrientation: 'portrait',
    label: 'Office Performance Report',
    code: 'PERFORMANCE',
  },
  {
    value: 'overdue-documents',
    backendType: 'OVERDUE',
    previewPath: 'reports/formal/overdue/',
    printOrientation: 'landscape',
    label: 'Overdue Documents Report',
    code: 'OVERDUE',
  },
  {
    value: 'pending-ageing',
    backendType: 'PENDING_AGEING',
    previewPath: 'reports/formal/pending-ageing/',
    printOrientation: 'portrait',
    label: 'Pending and Ageing Report',
    code: 'PENDING',
  },
  {
    value: 'staff-contribution',
    backendType: 'STAFF_CONTRIBUTION',
    previewPath: 'reports/formal/staff-contribution/',
    printOrientation: 'landscape',
    label: 'Staff Contribution Report',
    code: 'STAFF',
  },
])

export const FORMAL_REPORT_PERIOD_TYPES = Object.freeze([
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom' },
])

export const FORMAL_REPORT_YEAR_OPTIONS = Object.freeze(
  Array.from({ length: 7 }, (_, index) => {
    const year = String(2023 + index)
    return { value: year, label: year }
  }),
)

export const FORMAL_REPORT_MONTH_OPTIONS = Object.freeze([
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
])

export const FORMAL_REPORT_PREVIEW_NOTICE =
  'Preview generated from current correspondence records. A final report reference is assigned when the report is generated.'

export const FORMAL_REPORT_EMPTY_OBSERVATIONS = 'No observations were entered.'
export const FORMAL_REPORT_EMPTY_RECOMMENDATIONS = 'No recommendations were entered.'
export const FORMAL_REPORT_PREPARED_AT = '2026-08-04T09:00:00.000Z'

const STAFF_ACTION_CATEGORY_MAP = Object.freeze({
  Registered: 'registered',
  Forwarded: 'forwarded',
  'Stage Updated': 'stageUpdated',
  Completed: 'completed',
  Filed: 'filed',
  'Note Added': 'notesAdded',
  'Workflow note added': 'notesAdded',
  'Attachment Added': 'attachmentsAdded',
  'Receipt Acknowledged': 'acknowledgements',
})

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalText(value) {
  const trimmed = normalizeText(value)
  return trimmed || ''
}

function normalizeCurrentDate(value = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function getReportTypeMeta(reportType) {
  return FORMAL_REPORT_TYPES.find((item) => item.value === reportType) ?? null
}

export function getFormalReportTypeMeta(reportType) {
  return getReportTypeMeta(reportType)
}

export function getFormalReportMetaByBackendType(reportType) {
  const normalizedReportType = normalizeText(reportType).toUpperCase()
  return (
    FORMAL_REPORT_TYPES.find((item) => item.backendType === normalizedReportType) ?? null
  )
}

export function getFormalReportConfigurationMetadata() {
  return {
    reportTypes: FORMAL_REPORT_TYPES,
    periodTypes: FORMAL_REPORT_PERIOD_TYPES,
    monthOptions: FORMAL_REPORT_MONTH_OPTIONS,
    readonlyFields: ['officeName', 'officeCode', 'preparedBy', 'preparedByRole'],
    officeSelectorAllowed: false,
  }
}

export function getCurrentFormalReportPeriodDefaults(currentDate = new Date()) {
  const normalizedDate = normalizeCurrentDate(currentDate)

  return {
    year: String(normalizedDate.getFullYear()),
    month: padNumber(normalizedDate.getMonth() + 1),
  }
}

export function getDefaultFormalReportConfig(currentUser, currentDate = new Date()) {
  const { year, month } = getCurrentFormalReportPeriodDefaults(currentDate)

  return {
    reportType: '',
    periodType: 'monthly',
    month,
    year,
    startDate: '',
    endDate: '',
    observations: '',
    recommendations: '',
    officeName: getOfficeDisplayName(currentUser?.office),
    officeCode: currentUser?.office?.code ?? '',
    preparedBy: currentUser?.fullName ?? '',
    preparedByRole: getUserRoleLabel(currentUser?.role),
  }
}

export function parseReportDate(value) {
  if (!value) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
    const parsed = new Date(`${String(value).trim()}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(String(value).replace(',', '').trim())
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDateForDisplay(dateValue) {
  const parsed = dateValue instanceof Date ? dateValue : parseReportDate(dateValue)

  if (!parsed) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

export function formatCompactDate(dateValue) {
  const parsed = dateValue instanceof Date ? dateValue : parseReportDate(dateValue)

  if (!parsed) {
    return ''
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

export function formatFormalReportPeriodLabel({
  periodType,
  startDate,
  endDate,
  label,
} = {}) {
  const explicitLabel = normalizeText(label)

  if (explicitLabel && explicitLabel.toLowerCase() !== 'not available') {
    return explicitLabel
  }

  const normalizedPeriodType = normalizeText(periodType).toLowerCase()
  const start = parseReportDate(startDate)
  const end = parseReportDate(endDate)

  if (
    normalizedPeriodType === 'monthly' &&
    start &&
    end &&
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(start)
  }

  if (normalizedPeriodType === 'annual' && start) {
    return String(start.getUTCFullYear())
  }

  if (start && end) {
    return `${new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(start)} – ${new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(end)}`
  }

  return 'Unavailable'
}

export function formatTimestampForDisplay(dateValue) {
  const parsed = dateValue instanceof Date ? dateValue : parseReportDate(dateValue)

  if (!parsed) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(parsed)
}

export function resolveFormalReportPeriod(config) {
  const periodType = normalizeText(config?.periodType).toLowerCase()
  const year = normalizeText(config?.year)
  const month = normalizeText(config?.month)

  if (periodType === 'monthly') {
    if (!month || !year) {
      throw new Error('Select a month and year for the monthly report.')
    }

    const startDate = `${year}-${month}-01`
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    const endDate = `${year}-${month}-${padNumber(lastDay)}`
    const monthLabel =
      FORMAL_REPORT_MONTH_OPTIONS.find((option) => option.value === month)?.label ?? month

    return {
      type: 'monthly',
      startDate,
      endDate,
      label: `${monthLabel} ${year}`,
    }
  }

  if (periodType === 'annual') {
    if (!year) {
      throw new Error('Select a year for the annual report.')
    }

    return {
      type: 'annual',
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      label: year,
    }
  }

  if (periodType === 'custom') {
    const startDate = normalizeText(config?.startDate)
    const endDate = normalizeText(config?.endDate)

    if (!startDate || !endDate) {
      throw new Error('Select both start and end dates for the custom report.')
    }

    if (endDate < startDate) {
      throw new Error('The custom end date cannot be earlier than the start date.')
    }

    return {
      type: 'custom',
      startDate,
      endDate,
      label: `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`,
    }
  }

  throw new Error('Select a valid report period type.')
}

export function validateFormalReportConfig(config) {
  const errors = {}

  if (!normalizeText(config?.reportType)) {
    errors.reportType = 'Select a report type.'
  }

  if (!normalizeText(config?.periodType)) {
    errors.periodType = 'Select a reporting period type.'
  }

  try {
    resolveFormalReportPeriod(config)
  } catch {
    if (config?.periodType === 'monthly') {
      if (!normalizeText(config?.month)) {
        errors.month = 'Select a month.'
      }
      if (!normalizeText(config?.year)) {
        errors.year = 'Select a year.'
      }
    } else if (config?.periodType === 'annual') {
      errors.year = 'Select a year.'
    } else if (config?.periodType === 'custom') {
      if (!normalizeText(config?.startDate)) {
        errors.startDate = 'Select a start date.'
      }
      if (!normalizeText(config?.endDate)) {
        errors.endDate = 'Select an end date.'
      }
      if (
        normalizeText(config?.startDate) &&
        normalizeText(config?.endDate) &&
        normalizeText(config.endDate) < normalizeText(config.startDate)
      ) {
        errors.endDate = 'The end date cannot be earlier than the start date.'
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function createFormalReportReference(reportType, officeCode, period) {
  const typeMeta = getReportTypeMeta(reportType)
  const safeOfficeCode = normalizeText(officeCode).toUpperCase() || 'OFFICE'
  const periodToken = normalizeText(period?.type) === 'annual'
    ? normalizeText(period?.label)
    : normalizeText(period?.startDate).slice(0, 7)

  return `MRH-${safeOfficeCode}-${typeMeta?.code ?? 'REPORT'}-${periodToken}-PREVIEW`
}

export function createSuggestedFormalReportFilename(reportType, officeCode, period) {
  const typeMeta = getReportTypeMeta(reportType)
  const safeOfficeCode = normalizeText(officeCode).toUpperCase() || 'OFFICE'
  const label = normalizeText(period?.label).replace(/\s+/g, '_').replace(/[^\w-]/g, '')
  return `MRH_${safeOfficeCode}_${(typeMeta?.label ?? 'Formal Report').replace(/\s+/g, '_')}_${label || 'Report'}.pdf`
}

export function getFormalReportTitle(reportType) {
  return getReportTypeMeta(reportType)?.label ?? 'Formal Report'
}

export function getFormalReportCode(reportType) {
  return getReportTypeMeta(reportType)?.code ?? 'REPORT'
}

export function getFormalReportBackendType(reportType) {
  return getFormalReportTypeMeta(reportType)?.backendType ?? null
}

export function getFormalReportPreviewPath(reportType) {
  return getFormalReportTypeMeta(reportType)?.previewPath ?? null
}

export function getFormalReportPrintOrientation(reportType) {
  return getFormalReportTypeMeta(reportType)?.printOrientation ?? 'portrait'
}

export function normalizeFormalReportText(value, fallback) {
  const normalized = normalizeOptionalText(value)
  return normalized || fallback
}

export function mapStaffActionCategory(actionType) {
  const normalized = normalizeText(actionType)
  return STAFF_ACTION_CATEGORY_MAP[normalized] ?? 'other'
}

export function createFormalExecutiveSummary(summary) {
  return `During the reporting period, the office handled ${summary.totalRecords} correspondence records. ${summary.completed} were completed, while ${summary.pending} remained pending and ${summary.overdue} were overdue at the end of the period.`
}

export function createNotAvailableMetric() {
  return 'Not available'
}
