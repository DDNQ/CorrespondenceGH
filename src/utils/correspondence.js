import { USER_ROLES } from '../constants/roles.js'
import { normalizeOffice } from './offices.js'

export const CORRESPONDENCE_TYPE_OPTIONS = ['Contract', 'Letter', 'Memo', 'Report']
export const CORRESPONDENCE_PRIORITY_OPTIONS = ['Normal', 'High', 'Urgent']
export const CORRESPONDENCE_DIRECTION_OPTIONS = ['Incoming', 'Internal']

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeIsoDate(value) {
  if (!value) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`
  }

  const parsed = new Date(trimmed.replace(',', ''))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function normalizeDateOnly(value) {
  if (!value) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const parsed = new Date(trimmed.replace(',', ''))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function normalizeUserSummary(user) {
  if (!user) {
    return null
  }

  if (typeof user === 'string') {
    const trimmedUser = user.trim()

    if (!trimmedUser) {
      return null
    }

    if (trimmedUser.includes('@')) {
      return {
        id: null,
        fullName: trimmedUser,
        email: trimmedUser,
        role: null,
        office: null,
      }
    }

    return {
      id: trimmedUser,
      fullName: '',
      email: null,
      role: null,
      office: null,
    }
  }

  const fullName =
    user.fullName ??
    user.full_name ??
    user.displayName ??
    user.display_name ??
    user.name ??
    user.userName ??
    user.user_name ??
    ''

  const id = user.id ?? user.userId ?? user.user_id ?? null
  const email =
    user.email ??
    user.userEmail ??
    user.user_email ??
    user.actor_email ??
    null

  if (!id && !isNonEmptyString(fullName) && !isNonEmptyString(email)) {
    return null
  }

  return {
    id: id ?? null,
    fullName: fullName?.trim?.() ?? (typeof email === 'string' ? email.trim() : ''),
    email: isNonEmptyString(email) ? email.trim() : null,
    role: user.role ?? null,
    office: normalizeOffice(
      user.office ??
      user.office_id ??
      user.officeId ??
      user.office_name ??
      user.officeName ??
      null,
    ),
  }
}

function pickFirstNonEmptyString(...values) {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value.trim()
    }
  }

  return null
}

function resolveCorrespondenceOffice(rawRecord) {
  if (!rawRecord || typeof rawRecord !== 'object') {
    return null
  }

  const directOffice =
    rawRecord.currentOffice ??
    rawRecord.current_office ??
    rawRecord.office ??
    rawRecord.destinationOffice ??
    rawRecord.routeToOffice ??
    null
  const directNormalizedOffice =
    directOffice !== null && directOffice !== undefined
      ? normalizeOffice(directOffice)
      : null
  const officeId = pickFirstNonEmptyString(
    rawRecord.currentOfficeId,
    rawRecord.current_office_id,
    directNormalizedOffice?.id,
  )
  const officeName = pickFirstNonEmptyString(
    rawRecord.currentOfficeName,
    rawRecord.current_office_name,
    rawRecord.officeName,
    rawRecord.office_name,
    rawRecord.destinationOfficeName,
    rawRecord.destination_office_name,
    directNormalizedOffice?.name,
  )
  const officeCode = pickFirstNonEmptyString(
    rawRecord.currentOfficeCode,
    rawRecord.current_office_code,
    rawRecord.officeCode,
    rawRecord.office_code,
    rawRecord.destinationOfficeCode,
    rawRecord.destination_office_code,
    directNormalizedOffice?.code,
  )
  const officeStatus = pickFirstNonEmptyString(
    rawRecord.currentOfficeStatus,
    rawRecord.current_office_status,
    rawRecord.officeStatus,
    rawRecord.office_status,
    rawRecord.destinationOfficeStatus,
    rawRecord.destination_office_status,
    directNormalizedOffice?.status,
  )

  if (directOffice && typeof directOffice === 'object') {
    return normalizeOffice(
      {
        ...directOffice,
        id: officeId,
        name: officeName ?? '',
        code: officeCode,
        status: officeStatus,
      },
    )
  }

  if (officeId || officeName || officeCode || officeStatus || directNormalizedOffice) {
    return normalizeOffice(
      {
        id: officeId,
        name: officeName ?? '',
        code: officeCode,
        status: officeStatus,
      },
    )
  }

  return directNormalizedOffice
}

function normalizeMovementEntry(movement, index = 0) {
  if (!movement) {
    return null
  }

  return {
    ...movement,
    id: movement.id ?? `movement-${index + 1}`,
    correspondenceId:
      movement.correspondenceId ??
      movement.correspondence_id ??
      movement.correspondence ??
      movement.recordId ??
      movement.record_id ??
      null,
    referenceNumber:
      movement.referenceNumber ??
      movement.reference_number ??
      movement.reference ??
      'Reference unavailable',
  }
}

export function createMockCorrespondenceId() {
  return `mock-correspondence-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export function getCorrespondenceDisplayReference(record) {
  const referenceNumber =
    record?.referenceNumber ??
    record?.reference_number ??
    record?.reference ??
    null

  if (isNonEmptyString(referenceNumber)) {
    return referenceNumber.trim()
  }

  return 'Reference unavailable'
}

export function getCorrespondenceApiId(record) {
  return isNonEmptyString(record?.id) ? record.id.trim() : null
}

export function normalizeCorrespondence(rawRecord, options = {}) {
  if (!rawRecord) {
    return null
  }

  const fallbackReference = options.referenceNumber ?? options.reference ?? null
  const fallbackId = options.id ?? null
  const referenceNumber = getCorrespondenceDisplayReference({
    ...rawRecord,
    referenceNumber:
      rawRecord.referenceNumber ??
      rawRecord.reference_number ??
      rawRecord.reference ??
      fallbackReference,
  })
  const id =
    rawRecord.id ??
    rawRecord.correspondenceId ??
    rawRecord.correspondence_id ??
    rawRecord.recordId ??
    rawRecord.record_id ??
    fallbackId ??
    null
  const currentOffice = resolveCorrespondenceOffice(rawRecord)
  const registeredBy = normalizeUserSummary(
    rawRecord.registeredBy ??
      rawRecord.registered_by ??
      rawRecord.createdBy ??
      rawRecord.created_by ??
      null,
  )

  return {
    ...rawRecord,
    id: isNonEmptyString(id) ? id.trim() : null,
    referenceNumber,
    type: rawRecord.type ?? rawRecord.documentType ?? rawRecord.document_type ?? '',
    subject: rawRecord.subject ?? '',
    sender: rawRecord.sender ?? '',
    priority: rawRecord.priority ?? '',
    direction: rawRecord.direction ?? '',
    status: rawRecord.status ?? '',
    currentStage: rawRecord.currentStage ?? rawRecord.current_stage ?? '',
    currentOffice,
    documentDate: normalizeDateOnly(rawRecord.documentDate ?? rawRecord.document_date ?? null),
    instructions:
      typeof (rawRecord.instructions ?? rawRecord.requiredAction ?? rawRecord.required_action) === 'string'
        ? String(rawRecord.instructions ?? rawRecord.requiredAction ?? rawRecord.required_action).trim()
        : '',
    registeredBy,
    receivedAt: normalizeIsoDate(rawRecord.receivedAt ?? rawRecord.received_at ?? null),
    registeredAt: normalizeIsoDate(
      rawRecord.registeredAt ??
        rawRecord.registered_at ??
        rawRecord.receivedAt ??
        rawRecord.received_at ??
        null,
    ),
    deadline: normalizeIsoDate(rawRecord.deadline ?? rawRecord.stageDeadline ?? rawRecord.stage_deadline ?? null),
    createdAt: normalizeIsoDate(rawRecord.createdAt ?? rawRecord.created_at ?? null),
    updatedAt: normalizeIsoDate(rawRecord.updatedAt ?? rawRecord.updated_at ?? null),
    resolvedAt: normalizeIsoDate(rawRecord.resolvedAt ?? rawRecord.resolved_at ?? null),
    receiptStatus: rawRecord.receiptStatus ?? rawRecord.receipt_status ?? null,
    isOverdue: Boolean(rawRecord.isOverdue ?? rawRecord.is_overdue ?? false),
    journey: Array.isArray(rawRecord.journey)
      ? rawRecord.journey.map((movement, index) => normalizeMovementEntry(movement, index))
      : [],
  }
}

export function getCorrespondenceById(records, id) {
  if (!Array.isArray(records) || !isNonEmptyString(id)) {
    return null
  }

  const normalizedId = id.trim().toLowerCase()
  return (
    records.find((record) => getCorrespondenceApiId(record)?.toLowerCase() === normalizedId) ?? null
  )
}

export function getCorrespondenceByReference(records, referenceNumber) {
  if (!Array.isArray(records) || !isNonEmptyString(referenceNumber)) {
    return null
  }

  const normalizedReference = decodeURIComponent(referenceNumber).trim().toLowerCase()
  return (
    records.find(
      (record) => getCorrespondenceDisplayReference(record).toLowerCase() === normalizedReference,
    ) ?? null
  )
}

export function resolveCorrespondence(records, identifierOrRecord) {
  if (!identifierOrRecord) {
    return null
  }

  if (typeof identifierOrRecord === 'object') {
    const recordId = getCorrespondenceApiId(identifierOrRecord)
    if (recordId) {
      return getCorrespondenceById(records, recordId) ?? identifierOrRecord
    }

    const referenceNumber = getCorrespondenceDisplayReference(identifierOrRecord)
    return getCorrespondenceByReference(records, referenceNumber) ?? identifierOrRecord
  }

  const byId = getCorrespondenceById(records, identifierOrRecord)
  if (byId) {
    return byId
  }

  return getCorrespondenceByReference(records, identifierOrRecord)
}

export function normalizeCorrespondenceListResponse(rawResponse) {
  if (Array.isArray(rawResponse)) {
    return {
      count: rawResponse.length,
      next: null,
      previous: null,
      results: rawResponse.map((record) => normalizeCorrespondence(record)),
    }
  }

  const results = Array.isArray(rawResponse?.results) ? rawResponse.results : []

  return {
    count: typeof rawResponse?.count === 'number' ? rawResponse.count : results.length,
    next: rawResponse?.next ?? null,
    previous: rawResponse?.previous ?? null,
    results: results.map((record) => normalizeCorrespondence(record)),
  }
}

export function normalizeCorrespondenceDetailResponse(rawResponse) {
  return normalizeCorrespondence(rawResponse)
}

export function toCreateCorrespondencePayload(frontendForm, currentUser) {
  if (currentUser?.role === USER_ROLES.ADMIN) {
    throw new Error('Administrators cannot register office correspondence.')
  }

  const currentOfficeId =
    normalizeOffice(
      currentUser?.office ??
      currentUser?.officeId ??
      currentUser?.office_id ??
      null,
    )?.id ?? null
  const type = frontendForm?.documentType ?? frontendForm?.type ?? ''
  const priority = frontendForm?.priority ?? ''
  const direction = frontendForm?.direction ?? ''
  const subject = frontendForm?.subject?.trim?.() ?? ''
  const sender = frontendForm?.sender?.trim?.() ?? ''
  const currentStage = frontendForm?.initialStage?.trim?.() ?? frontendForm?.currentStage?.trim?.() ?? ''
  const instructions =
    frontendForm?.requiredAction?.trim?.() ?? frontendForm?.instructions?.trim?.() ?? ''
  const documentDate = normalizeDateOnly(frontendForm?.documentDate ?? frontendForm?.document_date ?? null)
  const receivedAt = normalizeIsoDate(frontendForm?.dateReceived ?? frontendForm?.received_at ?? null)
  const deadline = normalizeIsoDate(frontendForm?.stageDeadline ?? frontendForm?.deadline ?? null)

  if (!CORRESPONDENCE_TYPE_OPTIONS.includes(type)) {
    throw new Error('Invalid correspondence type.')
  }

  if (!CORRESPONDENCE_PRIORITY_OPTIONS.includes(priority)) {
    throw new Error('Invalid correspondence priority.')
  }

  if (!CORRESPONDENCE_DIRECTION_OPTIONS.includes(direction)) {
    throw new Error('Invalid correspondence direction.')
  }

  if (!subject || !sender || !currentStage) {
    throw new Error('Missing required correspondence fields.')
  }

  if (!isNonEmptyString(currentOfficeId)) {
    throw new Error('An assigned office is required to register correspondence.')
  }

  return {
    type,
    subject,
    sender,
    priority,
    direction,
    current_office: currentOfficeId.trim(),
    current_stage: currentStage,
    ...(instructions ? { instructions } : {}),
    ...(documentDate ? { document_date: documentDate } : {}),
    ...(receivedAt ? { received_at: receivedAt } : {}),
    ...(deadline ? { deadline } : {}),
  }
}
