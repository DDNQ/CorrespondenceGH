import {
  canPreviewAttachment,
  getAttachmentViewUrl,
  isImageAttachment,
  isPdfAttachment,
  isWordAttachment,
  normalizeAttachment,
} from './attachments.js'

const REGISTRATION_REVIEW_STORAGE_PREFIX = 'mrh.registrationReview'

export function hasUsableAttachmentSource(attachment) {
  return Boolean(getAttachmentViewUrl(attachment) || attachment?.fileObject)
}

export function getAttachmentPreviewType(attachment) {
  if (!hasUsableAttachmentSource(attachment)) {
    return 'none'
  }

  if (isPdfAttachment(attachment)) {
    return 'pdf'
  }

  if (isImageAttachment(attachment)) {
    return 'image'
  }

  if (isWordAttachment(attachment)) {
    return 'word'
  }

  return canPreviewAttachment(attachment) ? 'pdf' : 'unsupported'
}

export function getAttachmentReviewCategory(attachment) {
  const previewType = getAttachmentPreviewType(attachment)

  if (previewType === 'pdf' || previewType === 'image') {
    return 'previewable'
  }

  if (previewType === 'word') {
    return 'word'
  }

  if (previewType === 'unsupported') {
    return 'other'
  }

  return 'none'
}

export function getRegistrationReviewSteps(attachment) {
  const category = getAttachmentReviewCategory(attachment)

  if (category !== 'none') {
    return [
      { id: 'document-preview', title: 'Document Preview' },
      { id: 'registration-summary', title: 'Registration Summary' },
      { id: 'notes-instructions', title: 'Notes & Instructions' },
    ]
  }

  return [
    { id: 'registration-summary', title: 'Registration Summary' },
    { id: 'notes-instructions', title: 'Notes & Instructions' },
  ]
}

export function getEditReviewSteps(record, editResult = null) {
  const attachmentCategory =
    editResult?.attachmentCategory ??
    (editResult?.attachmentChanged
      ? getAttachmentReviewCategory(editResult.attachment ?? record?.attachments?.[0] ?? null)
      : 'none')

  if (attachmentCategory === 'previewable') {
    return [
      { id: 'record-details', title: 'Updated Record', tabId: 'details' },
      { id: 'overview', title: 'Document Preview', tabId: 'overview' },
      { id: 'journey-audit', title: 'Change Audit', tabId: 'journey' },
    ]
  }

  if (attachmentCategory === 'word' || attachmentCategory === 'other') {
    return [
      { id: 'record-details', title: 'Updated Record', tabId: 'details' },
      { id: 'attachments', title: 'Updated Attachment', tabId: 'attachments' },
      { id: 'journey-audit', title: 'Change Audit', tabId: 'journey' },
    ]
  }

  return [
    { id: 'record-details', title: 'Updated Record', tabId: 'details' },
    { id: 'journey-audit', title: 'Change Audit', tabId: 'journey' },
  ]
}

function getRegistrationReviewStorageKey(correspondenceId) {
  const normalizedId = String(correspondenceId ?? '').trim()

  return normalizedId ? `${REGISTRATION_REVIEW_STORAGE_PREFIX}:${normalizedId}` : ''
}

function getSessionStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage
    }

    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage
    }
  } catch {
    return null
  }

  return null
}

function sanitizeReviewOffice(office) {
  if (!office || typeof office !== 'object') {
    return null
  }

  const officeName = typeof office.name === 'string' ? office.name.trim() : ''

  return {
    id: typeof office.id === 'string' && office.id.trim() ? office.id.trim() : null,
    name: officeName,
    code: typeof office.code === 'string' && office.code.trim() ? office.code.trim() : null,
    status:
      typeof office.status === 'string' && office.status.trim() ? office.status.trim() : null,
  }
}

function sanitizeReviewAttachmentUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return null
  }

  return url.startsWith('blob:') ? null : url
}

export function sanitizeReviewAttachment(attachment) {
  if (!attachment) {
    return null
  }

  const normalizedAttachment = normalizeAttachment(attachment)

  if (!normalizedAttachment) {
    return null
  }

  return {
    id: normalizedAttachment.id ?? null,
    correspondenceId: normalizedAttachment.correspondenceId ?? null,
    fileName:
      normalizedAttachment.fileName ??
      normalizedAttachment.originalFilename ??
      normalizedAttachment.name ??
      'Attached document',
    originalFilename:
      normalizedAttachment.originalFilename ??
      normalizedAttachment.fileName ??
      normalizedAttachment.name ??
      'Attached document',
    name:
      normalizedAttachment.name ??
      normalizedAttachment.fileName ??
      normalizedAttachment.originalFilename ??
      'Attached document',
    contentType: normalizedAttachment.contentType ?? normalizedAttachment.mimeType ?? '',
    mimeType: normalizedAttachment.mimeType ?? normalizedAttachment.contentType ?? '',
    size: normalizedAttachment.size ?? normalizedAttachment.sizeBytes ?? null,
    sizeBytes: normalizedAttachment.sizeBytes ?? normalizedAttachment.size ?? null,
    sizeLabel: normalizedAttachment.sizeLabel ?? '',
    typeLabel: normalizedAttachment.typeLabel ?? normalizedAttachment.type ?? '',
    url: sanitizeReviewAttachmentUrl(
      normalizedAttachment.url ??
        normalizedAttachment.fileUrl ??
        normalizedAttachment.previewUrl ??
        null,
    ),
    fileUrl: sanitizeReviewAttachmentUrl(
      normalizedAttachment.fileUrl ??
        normalizedAttachment.url ??
        normalizedAttachment.previewUrl ??
        null,
    ),
    previewUrl: sanitizeReviewAttachmentUrl(
      normalizedAttachment.previewUrl ??
        normalizedAttachment.fileUrl ??
        normalizedAttachment.url ??
        null,
    ),
    uploadedAt: normalizedAttachment.uploadedAt ?? null,
  }
}

export function buildRegistrationReviewSnapshot({
  createdRecord,
  formValues,
  currentUser,
  uploadedAttachments = [],
  fallbackAttachment = null,
}) {
  const attachments = (Array.isArray(uploadedAttachments) ? uploadedAttachments : [uploadedAttachments])
    .filter(Boolean)
    .map((attachment) => sanitizeReviewAttachment(attachment))
    .filter(Boolean)

  if (!attachments.length) {
    const fallbackReviewAttachment = sanitizeReviewAttachment(fallbackAttachment)

    if (fallbackReviewAttachment) {
      attachments.push(fallbackReviewAttachment)
    }
  }

  return {
    id: createdRecord?.id ?? null,
    referenceNumber: createdRecord?.referenceNumber ?? '',
    documentType: formValues?.documentType ?? '',
    subject: formValues?.subject ?? '',
    sender: formValues?.sender ?? '',
    direction: formValues?.direction ?? '',
    priority: formValues?.priority ?? '',
    documentDate: formValues?.documentDate ?? '',
    receivedAt: formValues?.dateReceived ?? '',
    deadline: formValues?.overallCompletionDate ?? '',
    registeringOffice: sanitizeReviewOffice(currentUser?.office ?? createdRecord?.currentOffice ?? null),
    initialOffice: sanitizeReviewOffice(createdRecord?.currentOffice ?? currentUser?.office ?? null),
    initialStage: formValues?.initialStage ?? '',
    stageDeadline: formValues?.stageDeadline ?? '',
    instructions: formValues?.requiredAction ?? '',
    attachments,
  }
}

function parseRegistrationReviewSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') {
    return null
  }

  const correspondenceId = typeof rawSnapshot.id === 'string' && rawSnapshot.id.trim()
    ? rawSnapshot.id.trim()
    : null

  if (!correspondenceId) {
    return null
  }

  return {
    id: correspondenceId,
    referenceNumber:
      typeof rawSnapshot.referenceNumber === 'string' ? rawSnapshot.referenceNumber : '',
    documentType: typeof rawSnapshot.documentType === 'string' ? rawSnapshot.documentType : '',
    subject: typeof rawSnapshot.subject === 'string' ? rawSnapshot.subject : '',
    sender: typeof rawSnapshot.sender === 'string' ? rawSnapshot.sender : '',
    direction: typeof rawSnapshot.direction === 'string' ? rawSnapshot.direction : '',
    priority: typeof rawSnapshot.priority === 'string' ? rawSnapshot.priority : '',
    documentDate: typeof rawSnapshot.documentDate === 'string' ? rawSnapshot.documentDate : '',
    receivedAt: typeof rawSnapshot.receivedAt === 'string' ? rawSnapshot.receivedAt : '',
    deadline: typeof rawSnapshot.deadline === 'string' ? rawSnapshot.deadline : '',
    registeringOffice: sanitizeReviewOffice(rawSnapshot.registeringOffice),
    initialOffice: sanitizeReviewOffice(rawSnapshot.initialOffice),
    initialStage: typeof rawSnapshot.initialStage === 'string' ? rawSnapshot.initialStage : '',
    stageDeadline: typeof rawSnapshot.stageDeadline === 'string' ? rawSnapshot.stageDeadline : '',
    instructions: typeof rawSnapshot.instructions === 'string' ? rawSnapshot.instructions : '',
    attachments: Array.isArray(rawSnapshot.attachments)
      ? rawSnapshot.attachments.map((attachment) => sanitizeReviewAttachment(attachment)).filter(Boolean)
      : [],
  }
}

export function saveRegistrationReviewSnapshot(snapshot) {
  const parsedSnapshot = parseRegistrationReviewSnapshot(snapshot)
  const storage = getSessionStorage()
  const storageKey = getRegistrationReviewStorageKey(parsedSnapshot?.id)

  if (!parsedSnapshot || !storage || !storageKey) {
    return null
  }

  try {
    storage.setItem(storageKey, JSON.stringify(parsedSnapshot))
  } catch {
    return parsedSnapshot
  }

  return parsedSnapshot
}

export function loadRegistrationReviewSnapshot(correspondenceId) {
  const storage = getSessionStorage()
  const storageKey = getRegistrationReviewStorageKey(correspondenceId)

  if (!storage || !storageKey) {
    return null
  }

  let rawValue

  try {
    rawValue = storage.getItem(storageKey)
  } catch {
    return null
  }

  if (!rawValue) {
    return null
  }

  try {
    return parseRegistrationReviewSnapshot(JSON.parse(rawValue))
  } catch {
    return null
  }
}

export function clearRegistrationReviewSnapshot(correspondenceId) {
  const storage = getSessionStorage()
  const storageKey = getRegistrationReviewStorageKey(correspondenceId)

  if (!storage || !storageKey) {
    return
  }

  try {
    storage.removeItem(storageKey)
  } catch {
    // Ignore storage cleanup failures so review exit never crashes the route.
  }
}

export function mergeRegistrationReviewSnapshot(snapshot, backendAttachments = []) {
  const parsedSnapshot = parseRegistrationReviewSnapshot(snapshot)

  if (!parsedSnapshot) {
    return null
  }

  if (!Array.isArray(backendAttachments) || !backendAttachments.length) {
    return parsedSnapshot
  }

  const normalizedBackendAttachments = backendAttachments
    .map((attachment) => sanitizeReviewAttachment(attachment))
    .filter(Boolean)

  if (!normalizedBackendAttachments.length) {
    return parsedSnapshot
  }

  const mergedAttachments = parsedSnapshot.attachments.map((reviewAttachment) => {
    const matchingAttachment =
      normalizedBackendAttachments.find((attachment) => attachment.id === reviewAttachment.id) ??
      normalizedBackendAttachments.find(
        (attachment) =>
          attachment.fileName?.trim().toLowerCase() ===
          reviewAttachment.fileName?.trim().toLowerCase(),
      ) ??
      null

    return matchingAttachment
      ? {
          ...reviewAttachment,
          ...matchingAttachment,
        }
      : reviewAttachment
  })

  return {
    ...parsedSnapshot,
    attachments: mergedAttachments,
  }
}
