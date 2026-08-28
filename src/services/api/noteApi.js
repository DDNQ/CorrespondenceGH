import { ApiError, apiRequest } from '../apiClient.js'
import { assertApiCapability, API_CAPABILITIES } from './capabilities.js'
import {
  normalizeNoteItem,
  normalizeNoteListReadResponse,
} from './validators/correspondenceReadValidators.js'

function requireCorrespondenceId(correspondenceId) {
  const normalizedId = String(correspondenceId ?? '').trim()

  if (!normalizedId) {
    throw new ApiError('A valid correspondence ID is required.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }

  return normalizedId
}

export function normalizeNote(rawNote) {
  if (!rawNote) {
    return null
  }

  return normalizeNoteItem(rawNote)
}

export async function createNote(correspondenceId, text, options = {}) {
  assertApiCapability(API_CAPABILITIES.NOTE_CREATE)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const normalizedText = String(text ?? '').trim()

  if (!normalizedText) {
    throw new ApiError('Enter a note before saving.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }

  const response = await apiRequest(`correspondence/${normalizedId}/notes/`, {
    method: 'POST',
    body: { text: normalizedText },
    authenticated: true,
    signal: options.signal,
  })

  return normalizeNote(response?.note ?? response)
}

export async function listNotes(correspondenceId, options = {}) {
  assertApiCapability(API_CAPABILITIES.NOTE_LIST)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/notes/`, {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  return normalizeNoteListReadResponse(response)
}

export const noteApiService = Object.freeze({
  createNote,
  listNotes,
})
