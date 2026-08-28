import { formatTimestampForDisplay } from './formalReports.js'

const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ADMIN_ACTIVITY_TITLE_MAP = Object.freeze({
  'attachment added': 'Attachment Uploaded',
  'attachment uploaded': 'Attachment Uploaded',
  completed: 'Correspondence Completed',
  'correspondence registered': 'Correspondence Registered',
  'correspondence updated': 'Correspondence Updated',
  filed: 'Correspondence Filed',
  forwarded: 'Forwarded',
  'current stage updated': 'Stage Updated',
  'note added': 'Note Added',
  'office stage completed': 'Office Stage Completed',
  'receipt acknowledged': 'Receipt Acknowledged',
  registered: 'Correspondence Registered',
  'stage updated': 'Stage Updated',
  updated: 'Correspondence Updated',
})

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeText(value) {
  return isNonEmptyString(value) ? value.trim() : ''
}

function normalizeActionKey(value) {
  return normalizeText(value).toLowerCase()
}

function isMeaningfulNote(value) {
  const normalized = normalizeText(value)
  return normalized && normalized.toLowerCase() !== 'not available'
}

export function normalizeAdminDashboardMetricValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function formatAdminDashboardMetricValue(value) {
  const normalizedValue = normalizeAdminDashboardMetricValue(value)
  return normalizedValue === null ? 'Not available' : normalizedValue
}

export function createEmptyAdminDashboardSummary(overrides = {}) {
  return {
    summary: {
      activeCorrespondence: null,
      dueSoon: null,
      overdue: null,
      activeUsers: null,
      activeOffices: null,
      ...overrides.summary,
    },
    officeBreakdown: Array.isArray(overrides.officeBreakdown) ? overrides.officeBreakdown : [],
    recentActivity: Array.isArray(overrides.recentActivity) ? overrides.recentActivity : [],
    availability: {
      officeBreakdown: false,
      recentActivity: false,
      ...overrides.availability,
    },
    contractDiagnostics: {
      sourceOperation: 'dashboard.adminSummary',
      safeTopLevelKeys: [],
      ...overrides.contractDiagnostics,
    },
    raw: overrides.raw ?? null,
  }
}

export function hasAdminDashboardData(value) {
  return formatAdminDashboardMetricValue(value) !== 'Not available'
}

export function getAdminDashboardActivityRoute(activity) {
  const routeTarget = isNonEmptyString(activity?.routeTarget) ? activity.routeTarget.trim() : ''

  if (!routeTarget) {
    return null
  }

  return `/correspondence/${encodeURIComponent(routeTarget)}`
}

export function getAdminDashboardActivityReference(activity) {
  const reference = isNonEmptyString(activity?.correspondenceReference)
    ? activity.correspondenceReference.trim()
    : ''

  if (!reference || UUID_LIKE_PATTERN.test(reference)) {
    return ''
  }

  return reference
}

export function getAdminDashboardActivityDescription(activity) {
  if (isNonEmptyString(activity?.displayDescription)) {
    return activity.displayDescription.trim()
  }

  if (isMeaningfulNote(activity?.note)) {
    return activity.note.trim()
  }

  const previousStage = normalizeText(activity?.previousStage)
  const newStage = normalizeText(activity?.newStage)
  const destinationOffice = normalizeText(activity?.toOfficeName)
  const actionType = normalizeActionKey(activity?.actionType ?? activity?.title)

  if (actionType === 'current stage updated' || actionType === 'stage updated') {
    if (previousStage && newStage) {
      return `Stage updated from ${previousStage} to ${newStage}.`
    }

    if (newStage) {
      return `Stage updated to ${newStage}.`
    }
  }

  if (actionType === 'forwarded' && destinationOffice) {
    return `Forwarded to ${destinationOffice}.`
  }

  if (actionType === 'receipt acknowledged' && destinationOffice) {
    return `Receipt acknowledged by ${destinationOffice}.`
  }

  if (actionType === 'attachment added') {
    return 'Document attachment added to the correspondence record.'
  }

  if (actionType === 'correspondence registered' || actionType === 'registered') {
    return 'New correspondence record registered.'
  }

  if (actionType === 'correspondence updated' || actionType === 'updated') {
    return 'Correspondence details were updated.'
  }

  if (actionType === 'office stage completed' || actionType === 'completed') {
    return 'Correspondence marked as completed.'
  }

  if (actionType === 'filed') {
    return 'Correspondence filed in the records archive.'
  }

  if (isNonEmptyString(activity?.description)) {
    return activity.description.trim()
  }

  return 'Activity details are not available.'
}

export function getAdminDashboardActivityTitle(activity) {
  if (isNonEmptyString(activity?.title) && !isNonEmptyString(activity?.actionType)) {
    return activity.title.trim()
  }

  const normalizedActionType = normalizeActionKey(activity?.actionType ?? activity?.title)

  if (normalizedActionType && ADMIN_ACTIVITY_TITLE_MAP[normalizedActionType]) {
    return ADMIN_ACTIVITY_TITLE_MAP[normalizedActionType]
  }

  if (isNonEmptyString(activity?.title)) {
    return activity.title.trim()
  }

  return 'Recent activity'
}

export function getAdminDashboardActivityRecordedBy(activity) {
  if (isNonEmptyString(activity?.actorEmail)) {
    return activity.actorEmail.trim()
  }

  if (isNonEmptyString(activity?.actorName)) {
    return activity.actorName.trim()
  }

  return 'Not available'
}

export function getAdminDashboardActivityOffice(activity) {
  if (isNonEmptyString(activity?.toOfficeName)) {
    return activity.toOfficeName.trim()
  }

  if (isNonEmptyString(activity?.officeName)) {
    return activity.officeName.trim()
  }

  return ''
}

export function getAdminDashboardActivityTimeLabel(activity) {
  if (isNonEmptyString(activity?.timeLabel)) {
    return activity.timeLabel.trim()
  }

  if (activity?.timestamp) {
    return formatTimestampForDisplay(activity.timestamp)
  }

  return 'Not available'
}

export function getAdminDashboardRecentActivityItems(activityList) {
  return (Array.isArray(activityList) ? activityList : []).slice(0, 5)
}
