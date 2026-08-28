import {
  createApiContractMismatchError,
  createUnsupportedApiQueryError,
} from '../../apiClient.js'
import { normalizeAuthenticatedUser } from '../../../utils/auth.js'
import {
  normalizeAttachment,
} from '../../../utils/attachments.js'
import {
  CORRESPONDENCE_DIRECTION_OPTIONS,
  CORRESPONDENCE_PRIORITY_OPTIONS,
  CORRESPONDENCE_TYPE_OPTIONS,
  normalizeCorrespondence,
} from '../../../utils/correspondence.js'
import { normalizeOffice } from '../../../utils/offices.js'

const SAFE_LIST_ENVELOPE_KEYS = Object.freeze([
  'count',
  'next',
  'page',
  'page_size',
  'pageSize',
  'previous',
  'results',
])
const CONFIRMED_CORRESPONDENCE_LIST_QUERY_PARAMS = Object.freeze(['scope'])
const PENDING_CORRESPONDENCE_LIST_QUERY_PARAMS = Object.freeze([
  'search',
  'status',
  'type',
  'priority',
  'start',
  'end',
  'ordering',
  'page',
  'pageSize',
  'page_size',
  'current',
  'received',
  'forwarded',
  'handled',
])
const CONFIRMED_SCOPE_VALUES = Object.freeze(['current', 'received', 'forwarded', 'handled'])

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

function sanitizeKeyList(keys = []) {
  return [...new Set(keys.filter((key) => typeof key === 'string' && key.trim()))].sort()
}

function createContractMismatch(operation, response, options = {}) {
  return createApiContractMismatchError(
    options.message ?? `${operation} returned an unsupported response shape.`,
    {
      operation,
      receivedTopLevelType: getTopLevelType(response),
      safeTopLevelKeys: getSafeTopLevelKeys(response),
      missingExpectedKeys: sanitizeKeyList(options.missingExpectedKeys),
    },
  )
}

function requireObjectResponse(response, operation) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw createContractMismatch(operation, response, {
      message: `${operation} must return a single object response.`,
    })
  }

  return response
}

function normalizePagination(rawResponse, sourceEnvelope) {
  if (sourceEnvelope === 'array') {
    return {
      count: null,
      next: null,
      previous: null,
      page: null,
      pageSize: null,
    }
  }

  return {
    count: typeof rawResponse.count === 'number' ? rawResponse.count : null,
    next: typeof rawResponse.next === 'string' ? rawResponse.next : null,
    previous: typeof rawResponse.previous === 'string' ? rawResponse.previous : null,
    page: Number.isFinite(rawResponse.page) ? rawResponse.page : null,
    pageSize: Number.isFinite(rawResponse.page_size)
      ? rawResponse.page_size
      : Number.isFinite(rawResponse.pageSize)
        ? rawResponse.pageSize
        : null,
  }
}

function getOfficeShapeCategory(rawOffice) {
  if (rawOffice === null || rawOffice === undefined) {
    return 'null'
  }

  if (typeof rawOffice === 'string') {
    const trimmed = rawOffice.trim()
    if (!trimmed) {
      return 'empty-string'
    }

    const looksLikeIdentifier =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed) ||
      /^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(trimmed)

    return looksLikeIdentifier ? 'identifier-string' : 'name-string'
  }

  if (typeof rawOffice === 'object') {
    return 'object'
  }

  return typeof rawOffice
}

function createUnknownEnumList(enumFields) {
  return sanitizeKeyList(enumFields)
}

function normalizeReadOffice(rawOffice) {
  const office = normalizeOffice(rawOffice)

  return {
    office,
    officeShapeCategory: getOfficeShapeCategory(rawOffice),
  }
}

function normalizeReadUser(user) {
  if (typeof user === 'string') {
    const trimmedUser = user.trim()

    if (!trimmedUser) {
      return null
    }

    return {
      id: trimmedUser.includes('@') ? null : trimmedUser,
      fullName: trimmedUser,
      email: trimmedUser.includes('@') ? trimmedUser : null,
      role: null,
      office: null,
    }
  }

  const normalizedUser = normalizeAuthenticatedUser(user)

  if (normalizedUser) {
    return normalizedUser
  }

  if (!user || typeof user !== 'object') {
    return null
  }

  const fullName =
    user.fullName ??
    user.full_name ??
    user.displayName ??
      user.display_name ??
      user.name ??
      user.user_name ??
      ''
  const id = user.id ?? user.userId ?? user.user_id ?? null
  const email =
    typeof (
      user.email ??
      user.user_email ??
      user.userEmail ??
      user.actor_email ??
      user.author_email ??
      user.uploaded_by_email
    ) === 'string'
      ? String(
          user.email ??
            user.user_email ??
            user.userEmail ??
            user.actor_email ??
            user.author_email ??
            user.uploaded_by_email,
        ).trim()
      : ''

  if (!String(fullName ?? '').trim() && !String(id ?? '').trim() && !email) {
    return null
  }

  return {
    id: String(id ?? '').trim() || null,
    fullName: String(fullName ?? '').trim() || email,
    email: email || null,
    role: typeof user.role === 'string' && user.role.trim() ? user.role.trim() : null,
    office: normalizeOffice(user.office ?? user.office_id ?? user.officeId ?? null),
  }
}

function normalizeReadCorrespondenceRecord(rawRecord, operation, options = {}) {
  const normalizedRecord = normalizeCorrespondence(rawRecord)
  const id = typeof normalizedRecord?.id === 'string' ? normalizedRecord.id.trim() : ''

  if (!id) {
    throw createContractMismatch(operation, rawRecord, {
      message: `${operation} returned a correspondence record without a usable machine ID.`,
      missingExpectedKeys: ['id'],
    })
  }

  const { officeShapeCategory } = normalizeReadOffice(
    rawRecord?.currentOffice ?? rawRecord?.current_office ?? rawRecord?.office ?? null,
  )
  const unknownEnumFields = []

  if (
    typeof normalizedRecord.type === 'string' &&
    normalizedRecord.type.trim() &&
    !CORRESPONDENCE_TYPE_OPTIONS.includes(normalizedRecord.type)
  ) {
    unknownEnumFields.push('type')
  }

  if (
    typeof normalizedRecord.priority === 'string' &&
    normalizedRecord.priority.trim() &&
    !CORRESPONDENCE_PRIORITY_OPTIONS.includes(normalizedRecord.priority)
  ) {
    unknownEnumFields.push('priority')
  }

  if (
    typeof normalizedRecord.direction === 'string' &&
    normalizedRecord.direction.trim() &&
    !CORRESPONDENCE_DIRECTION_OPTIONS.includes(normalizedRecord.direction)
  ) {
    unknownEnumFields.push('direction')
  }

  return {
    ...normalizedRecord,
    contractDiagnostics: {
      sourceOperation: operation,
      officeShapeCategory,
      unknownEnumFields: createUnknownEnumList(unknownEnumFields),
      identityVerified: true,
      listItemIndex: Number.isFinite(options.listItemIndex) ? options.listItemIndex : null,
    },
  }
}

export function buildCorrespondenceListQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => {
    if (value === undefined || value === null) {
      return false
    }

    return String(value).trim().length > 0
  })

  if (!entries.length) {
    return ''
  }

  const unsupportedParams = entries
    .map(([key]) => key)
    .filter((key) => !CONFIRMED_CORRESPONDENCE_LIST_QUERY_PARAMS.includes(key))
  const pendingParams = unsupportedParams.filter((key) =>
    PENDING_CORRESPONDENCE_LIST_QUERY_PARAMS.includes(key),
  )

  if (unsupportedParams.length > 0) {
    throw createUnsupportedApiQueryError(
      pendingParams.length
        ? 'Correspondence list filters remain disabled until the backend contract is confirmed.'
        : 'This correspondence list query is not supported by the current service.',
      {
        operation: 'correspondence.list',
        unsupportedParams,
        safeAllowedParams: CONFIRMED_CORRESPONDENCE_LIST_QUERY_PARAMS,
        details: {
          pendingConfirmation: pendingParams,
        },
      },
    )
  }

  const normalizedScope = String(params.scope ?? '').trim().toLowerCase()

  if (!normalizedScope) {
    return ''
  }

  if (!CONFIRMED_SCOPE_VALUES.includes(normalizedScope)) {
    throw createUnsupportedApiQueryError(
      'This correspondence list scope is not supported by the current service.',
      {
        operation: 'correspondence.list',
        unsupportedParams: ['scope'],
        safeAllowedParams: CONFIRMED_CORRESPONDENCE_LIST_QUERY_PARAMS,
        details: {
          allowedScopes: CONFIRMED_SCOPE_VALUES,
        },
      },
    )
  }

  return `scope=${encodeURIComponent(normalizedScope)}`
}

export function getCorrespondenceListQuerySupport() {
  return {
    confirmed: [...CONFIRMED_CORRESPONDENCE_LIST_QUERY_PARAMS],
    pending: [...PENDING_CORRESPONDENCE_LIST_QUERY_PARAMS],
  }
}

export function normalizeCorrespondenceListReadResponse(response) {
  if (Array.isArray(response)) {
    return {
      records: response.map((item, index) =>
        normalizeReadCorrespondenceRecord(item, 'correspondence.list', { listItemIndex: index }),
      ),
      pagination: normalizePagination(response, 'array'),
      sourceEnvelope: 'array',
    }
  }

  const rawObject = requireObjectResponse(response, 'correspondence.list')
  const safeKeys = getSafeTopLevelKeys(rawObject)
  const unsupportedKeys = safeKeys.filter((key) => !SAFE_LIST_ENVELOPE_KEYS.includes(key))

  if (unsupportedKeys.length > 0 || !Array.isArray(rawObject.results)) {
    throw createContractMismatch('correspondence.list', response, {
      missingExpectedKeys: Array.isArray(rawObject.results) ? [] : ['results'],
    })
  }

  return {
    records: rawObject.results.map((item, index) =>
      normalizeReadCorrespondenceRecord(item, 'correspondence.list', { listItemIndex: index }),
    ),
    pagination: normalizePagination(rawObject, 'paginated'),
    sourceEnvelope: 'paginated',
  }
}

export function normalizeCorrespondenceDetailReadResponse(response) {
  const rawObject = requireObjectResponse(response, 'correspondence.detail')
  return normalizeReadCorrespondenceRecord(rawObject, 'correspondence.detail')
}

function normalizeCollectionResponse(response, operation) {
  if (Array.isArray(response)) {
    return response
  }

  const rawObject = requireObjectResponse(response, operation)

  if (Array.isArray(rawObject.results)) {
    return rawObject.results
  }

  if (typeof rawObject === 'object' && rawObject !== null && !Array.isArray(rawObject)) {
    const safeKeys = getSafeTopLevelKeys(rawObject)
    const unsupportedKeys = safeKeys.filter((key) => !SAFE_LIST_ENVELOPE_KEYS.includes(key))

    if (!unsupportedKeys.length) {
      throw createContractMismatch(operation, response, {
        missingExpectedKeys: ['results'],
      })
    }

    return [rawObject]
  }

  if (!Array.isArray(rawObject.results)) {
    throw createContractMismatch(operation, response, {
      missingExpectedKeys: ['results'],
    })
  }
}

export function normalizeMovementItem(rawMovement) {
  if (!rawMovement || typeof rawMovement !== 'object' || Array.isArray(rawMovement)) {
    throw createContractMismatch('correspondence.movements', rawMovement, {
      message: 'correspondence.movements returned an invalid movement item.',
    })
  }

  const fromOffice = normalizeReadOffice(
    rawMovement.from_office_name || rawMovement.fromOfficeName
      ? {
          ...(typeof (rawMovement.fromOffice ?? rawMovement.from_office) === 'object' &&
          !Array.isArray(rawMovement.fromOffice ?? rawMovement.from_office)
            ? (rawMovement.fromOffice ?? rawMovement.from_office)
            : {}),
          id:
            rawMovement.from_office ??
            rawMovement.fromOffice ??
            null,
          name: rawMovement.from_office_name ?? rawMovement.fromOfficeName ?? '',
        }
      : rawMovement.fromOffice ?? rawMovement.from_office ?? null,
  )
  const toOffice = normalizeReadOffice(
    rawMovement.to_office_name || rawMovement.toOfficeName
      ? {
          ...(typeof (rawMovement.toOffice ?? rawMovement.to_office) === 'object' &&
          !Array.isArray(rawMovement.toOffice ?? rawMovement.to_office)
            ? (rawMovement.toOffice ?? rawMovement.to_office)
            : {}),
          id:
            rawMovement.to_office ??
            rawMovement.toOffice ??
            null,
          name: rawMovement.to_office_name ?? rawMovement.toOfficeName ?? '',
        }
      : rawMovement.toOffice ?? rawMovement.to_office ?? null,
  )
  const performedBy = normalizeReadUser(
    rawMovement.performedBy ??
      rawMovement.performed_by ??
      rawMovement.user ??
      (typeof rawMovement.actor_email === 'string' && rawMovement.actor_email.trim()
        ? { actor_email: rawMovement.actor_email }
        : null),
  )
  const action =
    typeof (
      rawMovement.action ??
      rawMovement.action_type ??
      rawMovement.type ??
      rawMovement.event
    ) === 'string'
      ? String(
          rawMovement.action ??
            rawMovement.action_type ??
            rawMovement.type ??
            rawMovement.event,
        ).trim()
      : ''
  const previousStage =
    rawMovement.previousStage ?? rawMovement.previous_stage ?? null
  const newStage =
    rawMovement.newStage ?? rawMovement.new_stage ?? null

  return {
    id: rawMovement.id ?? null,
    correspondenceId:
      rawMovement.correspondenceId ??
      rawMovement.correspondence_id ??
      rawMovement.correspondence ??
      null,
    referenceNumber:
      rawMovement.referenceNumber ??
      rawMovement.reference_number ??
      rawMovement.reference ??
      null,
    action,
    note: typeof rawMovement.note === 'string' ? rawMovement.note.trim() : '',
    performedAt:
      rawMovement.performedAt ??
      rawMovement.performed_at ??
      rawMovement.timestamp ??
      rawMovement.created_at ??
      null,
    performedBy,
    actorEmail:
      typeof rawMovement.actor_email === 'string' && rawMovement.actor_email.trim()
        ? rawMovement.actor_email.trim()
        : performedBy?.email ?? null,
    fromOffice: fromOffice.office,
    toOffice: toOffice.office,
    previousStage,
    newStage,
    currentStage:
      rawMovement.currentStage ??
      rawMovement.current_stage ??
      newStage ??
      previousStage ??
      null,
    status: rawMovement.status ?? null,
    contractDiagnostics: {
      sourceOperation: 'correspondence.movements',
      fromOfficeShapeCategory: fromOffice.officeShapeCategory,
      toOfficeShapeCategory: toOffice.officeShapeCategory,
    },
  }
}

export function normalizeCorrespondenceMovementsReadResponse(response) {
  return normalizeCollectionResponse(response, 'correspondence.movements').map((item) =>
    normalizeMovementItem(item),
  )
}

export function normalizeAttachmentListReadResponse(response, options = {}) {
  return normalizeCollectionResponse(response, 'correspondence.attachments').map((item) => {
    const normalizedAttachment = normalizeAttachment(item, {
      correspondenceId: options.correspondenceId ?? null,
      source: 'remote',
    })
    const uploadedBy = normalizeReadUser(
      item?.uploadedBy ??
        item?.uploaded_by ??
        (typeof item?.uploaded_by_email === 'string' && item.uploaded_by_email.trim()
          ? { uploaded_by_email: item.uploaded_by_email }
          : null),
    )

    return {
      ...normalizedAttachment,
      uploadedBy,
      contractDiagnostics: {
        sourceOperation: 'correspondence.attachments',
      },
    }
  })
}

export function normalizeNoteItem(rawNote) {
  if (!rawNote || typeof rawNote !== 'object' || Array.isArray(rawNote)) {
    throw createContractMismatch('correspondence.notes', rawNote, {
      message: 'correspondence.notes returned an invalid note item.',
    })
  }

  const office = normalizeReadOffice(rawNote.office ?? rawNote.office_id ?? rawNote.officeId ?? null)
  const author = normalizeReadUser(
    rawNote.createdBy ??
      rawNote.created_by ??
      rawNote.author ??
      rawNote.user ??
      (typeof rawNote.author_email === 'string' && rawNote.author_email.trim()
        ? { author_email: rawNote.author_email }
        : null),
  )

  const id = String(rawNote.id ?? rawNote.noteId ?? rawNote.note_id ?? '').trim()

  return {
    id,
    correspondenceId:
      rawNote.correspondenceId ??
      rawNote.correspondence_id ??
      rawNote.correspondence ??
      null,
    text: typeof (rawNote.text ?? rawNote.body) === 'string'
      ? String(rawNote.text ?? rawNote.body).trim()
      : '',
    createdAt: rawNote.createdAt ?? rawNote.created_at ?? null,
    createdBy: author,
    office: office.office,
    contractDiagnostics: {
      sourceOperation: 'correspondence.notes',
      officeShapeCategory: office.officeShapeCategory,
    },
  }
}

export function normalizeNoteListReadResponse(response) {
  return normalizeCollectionResponse(response, 'correspondence.notes').map((item) =>
    normalizeNoteItem(item),
  )
}
