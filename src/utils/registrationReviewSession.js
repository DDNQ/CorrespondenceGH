import { revokeAttachmentUrls } from './attachments.js'

const transientReviewAttachmentStore = new Map()

function normalizeCorrespondenceId(correspondenceId) {
  return typeof correspondenceId === 'string' && correspondenceId.trim()
    ? correspondenceId.trim()
    : ''
}

export function saveTransientRegistrationReviewAttachment(correspondenceId, attachment) {
  const normalizedId = normalizeCorrespondenceId(correspondenceId)

  if (!normalizedId) {
    return null
  }

  const existingAttachment = transientReviewAttachmentStore.get(normalizedId) ?? null

  if (!attachment) {
    revokeAttachmentUrls(existingAttachment)
    transientReviewAttachmentStore.delete(normalizedId)
    return null
  }

  if (existingAttachment && existingAttachment !== attachment) {
    revokeAttachmentUrls(existingAttachment)
  }

  transientReviewAttachmentStore.set(normalizedId, attachment)
  return attachment
}

export function loadTransientRegistrationReviewAttachment(correspondenceId) {
  const normalizedId = normalizeCorrespondenceId(correspondenceId)

  if (!normalizedId) {
    return null
  }

  return transientReviewAttachmentStore.get(normalizedId) ?? null
}

export function clearTransientRegistrationReviewAttachment(correspondenceId) {
  const normalizedId = normalizeCorrespondenceId(correspondenceId)

  if (!normalizedId) {
    return
  }

  const existingAttachment = transientReviewAttachmentStore.get(normalizedId) ?? null
  revokeAttachmentUrls(existingAttachment)
  transientReviewAttachmentStore.delete(normalizedId)
}
