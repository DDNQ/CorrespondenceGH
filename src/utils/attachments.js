import { resolveApiResourceUrl } from '../services/apiClient.js'
import { normalizeOffice } from './offices.js'

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024

export const ALLOWED_ATTACHMENT_EXTENSIONS = Object.freeze([
  'pdf',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
])

export const ALLOWED_ATTACHMENT_MIME_TYPES = Object.freeze([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
])

export const ATTACHMENT_INPUT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png'

const MIME_TYPES_BY_EXTENSION = Object.freeze({
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
})

function normalizeAttachmentUrl(value) {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  if (!normalizedValue) {
    return null
  }

  return resolveApiResourceUrl(normalizedValue)
}

function createAttachmentId() {
  return `attachment-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function normalizeUserSummary(user) {
  if (!user) {
    return null
  }

  const fullName =
    user.fullName ??
    user.full_name ??
    user.displayName ??
    user.display_name ??
    user.userName ??
    user.user_name ??
    user.name ??
    user.uploadedBy ??
    ''

  const id = user.id ?? user.userId ?? user.user_id ?? user.uploadedByUserId ?? null

  if (!id && !String(fullName).trim()) {
    return null
  }

  return {
    id: id ?? null,
    fullName: String(fullName).trim(),
    role: user.role ?? null,
    office: normalizeOffice(
      user.office ??
        user.officeId ??
        user.office_id ??
        user.officeName ??
        user.office_name ??
        null,
    ),
  }
}

export function getFileExtension(filename) {
  if (typeof filename !== 'string') {
    return null
  }

  const trimmed = filename.trim()

  if (!trimmed) {
    return null
  }

  const lastDotIndex = trimmed.lastIndexOf('.')

  if (lastDotIndex <= 0 || lastDotIndex === trimmed.length - 1) {
    return null
  }

  return trimmed.slice(lastDotIndex + 1).toLowerCase()
}

export function formatFileSize(sizeBytes) {
  const numericSize = Number(sizeBytes)

  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    return '0 B'
  }

  if (numericSize < 1024) {
    return `${Math.round(numericSize)} B`
  }

  if (numericSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(numericSize / 1024))} KB`
  }

  const megabytes = numericSize / (1024 * 1024)
  const rounded = megabytes >= 10 ? Math.round(megabytes) : Math.round(megabytes * 10) / 10
  return `${rounded} MB`
}

export function validateAttachmentFile(file) {
  const errors = []

  if (!file) {
    errors.push({
      code: 'FILE_REQUIRED',
      message: 'Select a file to continue.',
    })

    return {
      valid: false,
      errors,
      extension: null,
      mimeType: null,
      size: 0,
    }
  }

  const size = Number(file.size ?? 0)
  const extension = getFileExtension(file.name)
  const mimeType =
    typeof file.type === 'string' && file.type.trim() ? file.type.trim().toLowerCase() : null

  if (size <= 0) {
    errors.push({
      code: 'EMPTY_FILE',
      message: 'The selected file is empty.',
    })
  }

  if (size > MAX_ATTACHMENT_SIZE_BYTES) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: 'The selected file is larger than the 10 MB limit.',
    })
  }

  if (!extension || !ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
    errors.push({
      code: 'UNSUPPORTED_EXTENSION',
      message: 'Only PDF, DOC, DOCX, JPG, JPEG and PNG files are allowed.',
    })
  }

  if (mimeType && !ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType)) {
    errors.push({
      code: 'UNSUPPORTED_MIME_TYPE',
      message: 'The selected file type is not supported.',
    })
  }

  if (extension && mimeType) {
    const allowedMimeTypes = MIME_TYPES_BY_EXTENSION[extension] ?? []

    if (
      allowedMimeTypes.length &&
      ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType) &&
      !allowedMimeTypes.includes(mimeType)
    ) {
      errors.push({
        code: 'FILE_TYPE_MISMATCH',
        message: 'The file extension does not match the file type.',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    extension,
    mimeType,
    size,
  }
}

export function isPdfAttachment(attachmentOrFile) {
  const extension =
    attachmentOrFile?.extension ??
    getFileExtension(
      attachmentOrFile?.originalFilename ??
        attachmentOrFile?.filename ??
        attachmentOrFile?.fileName ??
        attachmentOrFile?.name ??
        '',
    )
  const mimeType =
    attachmentOrFile?.mimeType?.toLowerCase?.() ??
    attachmentOrFile?.type?.toLowerCase?.() ??
    ''

  return extension === 'pdf' || mimeType === 'application/pdf'
}

export function isImageAttachment(attachmentOrFile) {
  const extension =
    attachmentOrFile?.extension ??
    getFileExtension(
      attachmentOrFile?.originalFilename ??
        attachmentOrFile?.filename ??
        attachmentOrFile?.fileName ??
        attachmentOrFile?.name ??
        '',
    )
  const mimeType =
    attachmentOrFile?.mimeType?.toLowerCase?.() ??
    attachmentOrFile?.type?.toLowerCase?.() ??
    ''

  return ['jpg', 'jpeg', 'png'].includes(extension) || ['image/jpeg', 'image/png'].includes(mimeType)
}

export function isWordAttachment(attachmentOrFile) {
  const extension =
    attachmentOrFile?.extension ??
    getFileExtension(
      attachmentOrFile?.originalFilename ??
        attachmentOrFile?.filename ??
        attachmentOrFile?.fileName ??
        attachmentOrFile?.name ??
        '',
    )
  const mimeType =
    attachmentOrFile?.mimeType?.toLowerCase?.() ??
    attachmentOrFile?.type?.toLowerCase?.() ??
    ''

  return ['doc', 'docx'].includes(extension) ||
    ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType)
}

export function canPreviewAttachment(attachmentOrFile) {
  return (
    Boolean(getAttachmentViewUrl(attachmentOrFile)) &&
    (isPdfAttachment(attachmentOrFile) || isImageAttachment(attachmentOrFile))
  )
}

export function canDownloadAttachment(attachmentOrFile) {
  return Boolean(getAttachmentDownloadUrl(attachmentOrFile))
}

export function getAttachmentViewUrl(attachment) {
  return attachment?.previewUrl ?? attachment?.fileUrl ?? attachment?.url ?? null
}

export function getAttachmentDownloadUrl(attachment) {
  return attachment?.url ?? attachment?.fileUrl ?? attachment?.previewUrl ?? null
}

export function normalizeAttachment(rawAttachment, options = {}) {
  if (!rawAttachment) {
    return null
  }

  const correspondenceId =
    rawAttachment.correspondenceId ??
    rawAttachment.correspondence_id ??
    rawAttachment.correspondence ??
    options.correspondenceId ??
    null
  const originalFilename =
    rawAttachment.originalFilename ??
    rawAttachment.original_filename ??
    rawAttachment.fileName ??
    rawAttachment.filename ??
    rawAttachment.name ??
    'Attachment'
  const filename = rawAttachment.filename ?? rawAttachment.fileName ?? originalFilename
  const extension =
    rawAttachment.extension ??
    getFileExtension(originalFilename) ??
    getFileExtension(filename)
  const mimeType =
    rawAttachment.mimeType ??
    rawAttachment.mime_type ??
    (typeof rawAttachment.type === 'string' &&
    rawAttachment.type.includes('/')
      ? rawAttachment.type
      : null) ??
    rawAttachment.fileObject?.type ??
    null
  const sizeBytes =
    rawAttachment.sizeBytes ??
    rawAttachment.size_bytes ??
    (typeof rawAttachment.size === 'number' ? rawAttachment.size : null) ??
    rawAttachment.fileObject?.size ??
    null
  const uploadedBy = normalizeUserSummary(
    rawAttachment.uploadedBy ??
      rawAttachment.uploaded_by ??
      {
        id: rawAttachment.uploadedByUserId ?? rawAttachment.uploaded_by_user_id ?? null,
        fullName:
          rawAttachment.uploadedByUserName ??
          rawAttachment.uploaded_by_user_name ??
          rawAttachment.uploadedBy ??
          '',
        office:
          rawAttachment.uploadedByOffice ??
          rawAttachment.uploadedByOfficeId ??
          rawAttachment.uploadedByOfficeName ??
          rawAttachment.office ??
          rawAttachment.officeId ??
          null,
      },
  )
  const uploadedForOffice = normalizeOffice(
    rawAttachment.uploadedForOffice ??
      rawAttachment.uploaded_for_office ??
      rawAttachment.uploadedByOffice ??
      rawAttachment.uploadedByOfficeId ??
      rawAttachment.uploadedByOfficeName ??
      rawAttachment.office ??
      rawAttachment.officeId ??
      null,
  )
  const resolvedFileUrl = normalizeAttachmentUrl(
    rawAttachment.fileUrl ??
      rawAttachment.file_url ??
      rawAttachment.file ??
      rawAttachment.url ??
      rawAttachment.previewUrl ??
      rawAttachment.preview_url ??
      rawAttachment.objectUrl ??
      null,
  )
  const resolvedPreviewUrl = normalizeAttachmentUrl(
    rawAttachment.previewUrl ??
      rawAttachment.preview_url ??
      rawAttachment.fileUrl ??
      rawAttachment.file_url ??
      rawAttachment.file ??
      rawAttachment.url ??
      rawAttachment.objectUrl ??
      null,
  )
  const url = resolvedFileUrl ?? resolvedPreviewUrl ?? null
  const previewUrl = resolvedPreviewUrl ?? url
  const fileUrl = url
  const source =
    rawAttachment.source ??
    options.source ??
    (rawAttachment.fileObject ? 'local' : url ? 'remote' : 'mock')

  return {
    id:
      rawAttachment.id ??
      rawAttachment.attachmentId ??
      rawAttachment.attachment_id ??
      createAttachmentId(),
    correspondenceId: typeof correspondenceId === 'string' && correspondenceId.trim()
      ? correspondenceId.trim()
      : null,
    name: originalFilename,
    fileName: filename,
    filename,
    originalFilename,
    extension: extension ?? null,
    contentType: mimeType ? String(mimeType).toLowerCase() : null,
    mimeType: mimeType ? String(mimeType).toLowerCase() : null,
    size: Number.isFinite(Number(sizeBytes)) ? Number(sizeBytes) : null,
    sizeBytes: Number.isFinite(Number(sizeBytes)) ? Number(sizeBytes) : null,
    sizeLabel: formatFileSize(sizeBytes),
    url,
    fileUrl,
    previewUrl,
    uploadedAt:
      rawAttachment.uploadedAt ??
      rawAttachment.uploaded_at ??
      rawAttachment.date ??
      null,
    uploadedBy,
    uploadedForOffice,
    source,
    fileObject: rawAttachment.fileObject ?? rawAttachment.originalFile ?? null,
    description: rawAttachment.description ?? '',
    isTemporary: rawAttachment.isTemporary ?? source === 'local',
  }
}

export function createAttachmentDraftFromFile(file, options = {}) {
  const validation = validateAttachmentFile(file)

  if (!validation.valid) {
    const error = new Error(validation.errors[0]?.message ?? 'Invalid attachment.')
    error.code = validation.errors[0]?.code ?? 'INVALID_ATTACHMENT'
    error.validation = validation
    throw error
  }

  const objectUrl = URL.createObjectURL(file)

  return normalizeAttachment(
    {
      fileName: file.name,
      originalFilename: file.name,
      extension: validation.extension,
      mimeType: validation.mimeType,
      sizeBytes: validation.size,
      size: validation.size,
      fileUrl: objectUrl,
      previewUrl: objectUrl,
      fileObject: file,
      isTemporary: true,
      source: 'local',
    },
    options,
  )
}

export function replaceAttachmentDraft(currentAttachment, file, options = {}) {
  const nextAttachment = createAttachmentDraftFromFile(file, options)
  revokeAttachmentUrls(currentAttachment)
  return nextAttachment
}

export function removeAttachmentDraft(attachment) {
  revokeAttachmentUrls(attachment)
  return null
}

export function revokeAttachmentUrls(attachment) {
  if (!attachment) {
    return
  }

  const urls = new Set([attachment.previewUrl, attachment.fileUrl].filter(Boolean))

  urls.forEach((url) => {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
}

export function toAttachmentFormData(file) {
  const validation = validateAttachmentFile(file)

  if (!validation.valid) {
    const error = new Error(validation.errors[0]?.message ?? 'Invalid attachment.')
    error.code = validation.errors[0]?.code ?? 'INVALID_ATTACHMENT'
    error.validation = validation
    throw error
  }

  const formData = new FormData()
  formData.append('file', file)
  return formData
}
