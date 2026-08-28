import { ApiError, apiRequest } from '../apiClient.js'
import {
  getCorrespondenceApiId,
  normalizeCorrespondence,
  toCreateCorrespondencePayload,
} from '../../utils/correspondence.js'
import { assertApiCapability, API_CAPABILITIES } from './capabilities.js'
import { createUnsupportedApiOperationError } from './unsupported.js'
import {
  buildCorrespondenceListQuery,
  normalizeCorrespondenceDetailReadResponse,
  normalizeCorrespondenceListReadResponse,
  normalizeCorrespondenceMovementsReadResponse,
  normalizeMovementItem,
} from './validators/correspondenceReadValidators.js'
import { resolveOfficeFromDirectory } from './officeApi.js'

function requireCorrespondenceId(correspondenceId) {
  const normalizedId =
    typeof correspondenceId === 'string'
      ? correspondenceId.trim()
      : getCorrespondenceApiId(correspondenceId)

  if (!normalizedId) {
    throw new ApiError('A valid correspondence ID is required.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }

  return normalizedId
}

export function toForwardCorrespondencePayload(input = {}) {
  const toOffice = String(input.toOffice ?? input.to_office ?? input.destinationOfficeId ?? input.officeId ?? '').trim()
  const note = String(input.note ?? input.instructions ?? '').trim()

  if (!toOffice) {
    throw new ApiError('Select a destination office.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { toOffice: 'Select a destination office.' },
    })
  }

  return {
    to_office: toOffice,
    note,
  }
}

export function toUpdateStagePayload(input = {}) {
  const currentStage = String(input.currentStage ?? input.current_stage ?? input.stage ?? '').trim()
  const note = String(input.note ?? '').trim()

  if (!currentStage) {
    throw new ApiError('The current stage is required.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { currentStage: 'The current stage is required.' },
    })
  }

  return {
    current_stage: currentStage,
    ...(note ? { note } : {}),
  }
}

export function toCorrespondenceActionNotePayload(input = {}) {
  const note = String(input?.note ?? '').trim()
  return note ? { note } : {}
}

function normalizeOptionalMutationCorrespondence(response) {
  const candidate = response?.correspondence ?? response ?? null
  const normalizedRecord = normalizeCorrespondence(candidate)

  return normalizedRecord?.id ? normalizedRecord : null
}

async function enrichCorrespondenceOffice(record, options = {}) {
  if (!record?.currentOffice?.id || record.currentOffice.name) {
    return record
  }

  const office = await resolveOfficeFromDirectory(record.currentOffice, {
    signal: options.signal,
  })

  if (!office?.id || !office.name) {
    return record
  }

  return {
    ...record,
    currentOffice: office,
  }
}

export function normalizeCorrespondenceMovement(rawMovement) {
  return normalizeMovementItem(rawMovement)
}

export async function createCorrespondence(input, currentUser, options = {}) {
  assertApiCapability(API_CAPABILITIES.CORRESPONDENCE_CREATE)
  const payload = toCreateCorrespondencePayload(input, currentUser)

  const response = await apiRequest('correspondence/', {
    method: 'POST',
    body: payload,
    authenticated: true,
    signal: options.signal,
  })
  const createdRecord = normalizeCorrespondence(response)

  if (createdRecord?.id) {
    return createdRecord
  }

  throw new ApiError('The correspondence was created, but the backend did not return an identifiable record.', {
    code: 'CREATE_RESPONSE_MISSING_ID',
    status: 502,
  })
}

export async function listCorrespondence(params = {}, options = {}) {
  assertApiCapability(API_CAPABILITIES.CORRESPONDENCE_LIST)
  const query = buildCorrespondenceListQuery(params)
  const path = query ? `correspondence/?${query}` : 'correspondence/'
  const response = await apiRequest(path, {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  const normalizedResponse = normalizeCorrespondenceListReadResponse(response)
  const records = await Promise.all(
    normalizedResponse.records.map((record) => enrichCorrespondenceOffice(record, options)),
  )

  return {
    ...normalizedResponse,
    records,
  }
}

export async function getCorrespondenceById(correspondenceId, options = {}) {
  assertApiCapability(API_CAPABILITIES.CORRESPONDENCE_DETAIL)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/`, {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  return enrichCorrespondenceOffice(
    normalizeCorrespondenceDetailReadResponse(response),
    options,
  )
}

export async function getCorrespondenceByReference() {
  throw createUnsupportedApiOperationError('correspondence.getByReference')
}

export async function forwardCorrespondence(correspondenceId, input, options = {}) {
  assertApiCapability(API_CAPABILITIES.CORRESPONDENCE_FORWARD)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/forward/`, {
    method: 'POST',
    body: toForwardCorrespondencePayload(input),
    authenticated: true,
    signal: options.signal,
  })

  return normalizeCorrespondence(response?.correspondence ?? response ?? null)
}

export async function updateCorrespondenceStage(correspondenceId, input, options = {}) {
  assertApiCapability(API_CAPABILITIES.CORRESPONDENCE_UPDATE_STAGE)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/update-stage/`, {
    method: 'POST',
    body: toUpdateStagePayload(input),
    authenticated: true,
    signal: options.signal,
  })

  return normalizeCorrespondence(response?.correspondence ?? response ?? null)
}

export async function completeCorrespondence(correspondenceId, input = {}, options = {}) {
  assertApiCapability(API_CAPABILITIES.CORRESPONDENCE_COMPLETE)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/complete/`, {
    method: 'POST',
    body: toCorrespondenceActionNotePayload(input),
    authenticated: true,
    signal: options.signal,
  })

  return normalizeOptionalMutationCorrespondence(response)
}

export async function fileCorrespondence(correspondenceId, input = {}, options = {}) {
  assertApiCapability(API_CAPABILITIES.CORRESPONDENCE_FILE)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/file/`, {
    method: 'POST',
    body: toCorrespondenceActionNotePayload(input),
    authenticated: true,
    signal: options.signal,
  })

  return normalizeOptionalMutationCorrespondence(response)
}

export async function listCorrespondenceMovements(correspondenceId, options = {}) {
  assertApiCapability(API_CAPABILITIES.CORRESPONDENCE_MOVEMENTS)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/movements/`, {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  return normalizeCorrespondenceMovementsReadResponse(response)
}

export const correspondenceApiService = Object.freeze({
  createCorrespondence,
  listCorrespondence,
  getCorrespondenceById,
  getCorrespondenceByReference,
  forwardCorrespondence,
  updateCorrespondenceStage,
  completeCorrespondence,
  fileCorrespondence,
  listCorrespondenceMovements,
})
