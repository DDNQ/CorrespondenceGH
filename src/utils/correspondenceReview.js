function getFileExtension(fileName = '') {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex + 1).toLowerCase() : ''
}

export function hasUsableAttachmentSource(attachment) {
  return Boolean(attachment?.fileObject || attachment?.fileUrl)
}

export function getAttachmentPreviewType(attachment) {
  if (!hasUsableAttachmentSource(attachment)) {
    return 'none'
  }

  const mimeType = attachment.mimeType?.toLowerCase() ?? ''
  const fileType = attachment.fileType?.toLowerCase() ?? attachment.type?.toLowerCase() ?? ''
  const extension = getFileExtension(attachment.fileName || attachment.name || '')

  if (
    mimeType === 'application/pdf' ||
    fileType === 'pdf' ||
    extension === 'pdf'
  ) {
    return 'pdf'
  }

  if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png' ||
    ['jpg', 'jpeg', 'png'].includes(fileType) ||
    ['jpg', 'jpeg', 'png'].includes(extension)
  ) {
    return 'image'
  }

  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ['doc', 'docx'].includes(fileType) ||
    ['doc', 'docx'].includes(extension)
  ) {
    return 'word'
  }

  return 'unsupported'
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

  if (category === 'previewable') {
    return [
      { id: 'overview', title: 'Document Preview', tabId: 'overview' },
      { id: 'record-details', title: 'Record Details', tabId: 'details' },
      { id: 'journey-audit', title: 'Registration & Routing', tabId: 'journey' },
    ]
  }

  if (category === 'word' || category === 'other') {
    return [
      { id: 'attachments', title: 'Attachment', tabId: 'attachments' },
      { id: 'record-details', title: 'Record Details', tabId: 'details' },
      { id: 'journey-audit', title: 'Registration & Routing', tabId: 'journey' },
    ]
  }

  return [
    { id: 'record-details', title: 'Record Details', tabId: 'details' },
    { id: 'journey-audit', title: 'Registration & Routing', tabId: 'journey' },
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
