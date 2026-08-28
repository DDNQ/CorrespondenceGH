import { ApiError, apiRequest, resolveApiResourceUrl } from '../apiClient.js'
import { assertApiCapability, API_CAPABILITIES } from './capabilities.js'
import {
  getAttachmentDownloadUrl,
  normalizeAttachment,
  toAttachmentFormData,
} from '../../utils/attachments.js'
import { normalizeAttachmentListReadResponse } from './validators/correspondenceReadValidators.js'
import { getAccessToken } from './tokenStore.js'

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

function requireAttachmentPreviewUrl(attachment) {
  const resourceUrl = getAttachmentDownloadUrl(attachment)

  if (!resourceUrl) {
    throw new ApiError('A valid attachment preview source is required.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }

  return resolveApiResourceUrl(resourceUrl)
}

async function parsePreviewErrorDetails(response) {
  const contentType = response.headers.get('content-type') ?? ''

  try {
    if (contentType.toLowerCase().includes('application/json')) {
      return await response.json()
    }

    const text = await response.text()
    return text.trim() ? { detail: text.trim() } : null
  } catch {
    return null
  }
}

export async function uploadAttachment(correspondenceId, file, options = {}) {
  assertApiCapability(API_CAPABILITIES.ATTACHMENT_UPLOAD)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/attachments/`, {
    method: 'POST',
    body: toAttachmentFormData(file),
    authenticated: true,
    signal: options.signal,
  })

  return normalizeAttachment(response?.attachment ?? response, { correspondenceId: normalizedId })
}

export async function listAttachments(correspondenceId, options = {}) {
  assertApiCapability(API_CAPABILITIES.ATTACHMENT_LIST)
  const normalizedId = requireCorrespondenceId(correspondenceId)
  const response = await apiRequest(`correspondence/${normalizedId}/attachments/`, {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  return normalizeAttachmentListReadResponse(response, { correspondenceId: normalizedId })
}

export async function getAttachmentPreviewBlob(attachment, options = {}) {
  assertApiCapability(API_CAPABILITIES.ATTACHMENT_LIST)

  const resourceUrl = requireAttachmentPreviewUrl(attachment)
  const headers = new Headers({
    Accept: 'application/pdf,image/*,*/*',
  })
  const accessToken = getAccessToken()

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let response

  try {
    response = await fetch(resourceUrl, {
      method: 'GET',
      headers,
      signal: options.signal,
    })
  } catch (error) {
    throw new ApiError('Unable to load the attachment preview.', {
      code: 'NETWORK_ERROR',
      status: null,
      details: error,
    })
  }

  if (!response.ok) {
    const details = await parsePreviewErrorDetails(response)

    throw new ApiError('Unable to load the attachment preview.', {
      code: `HTTP_${response.status}`,
      status: response.status,
      details,
    })
  }

  return response.blob()
}

export const attachmentApiService = Object.freeze({
  uploadAttachment,
  listAttachments,
  getAttachmentPreviewBlob,
})
