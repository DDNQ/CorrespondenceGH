function normalizeStagedAttachments(stagedAttachments) {
  if (!stagedAttachments) {
    return []
  }

  return (Array.isArray(stagedAttachments) ? stagedAttachments : [stagedAttachments]).filter(Boolean)
}

function getAttachmentFile(attachment) {
  return attachment?.fileObject ?? attachment?.file ?? null
}

function createMissingAttachmentFileError() {
  const error = new Error('The selected document is no longer available for upload.')
  error.code = 'ATTACHMENT_FILE_MISSING'
  return error
}

function getAttachmentFailureMessage(failedAttachments) {
  if (!failedAttachments.length) {
    return 'One or more documents could not be uploaded.'
  }

  if (failedAttachments.length === 1) {
    return 'The correspondence was registered, but the document could not be uploaded.'
  }

  return 'The correspondence was registered, but some documents could not be uploaded.'
}

async function uploadRegistrationAttachments({
  attachmentService,
  correspondenceId,
  stagedAttachments,
  onProgress,
}) {
  const uploadedAttachments = []
  const failedAttachments = []

  for (const [index, attachment] of stagedAttachments.entries()) {
    const attachmentFile = getAttachmentFile(attachment)

    onProgress?.({
      phase: 'uploading-attachments',
      current: index + 1,
      total: stagedAttachments.length,
      message: `Uploading document ${index + 1} of ${stagedAttachments.length}...`,
    })

    if (!attachmentFile) {
      failedAttachments.push({
        attachment,
        file: null,
        index,
        error: createMissingAttachmentFileError(),
      })
      continue
    }

    try {
      const uploadedAttachment = await attachmentService.uploadAttachment(
        correspondenceId,
        attachmentFile,
      )

      uploadedAttachments.push(uploadedAttachment)
    } catch (error) {
      failedAttachments.push({
        attachment,
        file: attachmentFile,
        index,
        error,
      })
    }
  }

  return {
    uploadedAttachments,
    failedAttachments,
  }
}

export class RegistrationAttachmentUploadError extends Error {
  constructor({ createdRecord, uploadedAttachments, failedAttachments }) {
    super(getAttachmentFailureMessage(failedAttachments))
    this.name = 'RegistrationAttachmentUploadError'
    this.code = 'REGISTRATION_ATTACHMENT_UPLOAD_FAILED'
    this.createdRecord = createdRecord
    this.uploadedAttachments = uploadedAttachments
    this.failedAttachments = failedAttachments
  }
}

export async function submitRegistrationWithAttachments({
  correspondenceService,
  attachmentService,
  formValues,
  currentUser,
  stagedAttachments = [],
  onProgress,
}) {
  const normalizedAttachments = normalizeStagedAttachments(stagedAttachments)

  onProgress?.({
    phase: 'creating-correspondence',
    message: 'Creating correspondence...',
  })

  const createdRecord = await correspondenceService.createCorrespondence(formValues, currentUser)

  if (!normalizedAttachments.length) {
    onProgress?.({
      phase: 'finalizing',
      message: 'Finalizing registration...',
    })

    return {
      createdRecord,
      uploadedAttachments: [],
      failedAttachments: [],
    }
  }

  const { uploadedAttachments, failedAttachments } = await uploadRegistrationAttachments({
    attachmentService,
    correspondenceId: createdRecord.id,
    stagedAttachments: normalizedAttachments,
    onProgress,
  })

  if (failedAttachments.length) {
    throw new RegistrationAttachmentUploadError({
      createdRecord,
      uploadedAttachments,
      failedAttachments,
    })
  }

  onProgress?.({
    phase: 'finalizing',
    message: 'Finalizing registration...',
  })

  return {
    createdRecord,
    uploadedAttachments,
    failedAttachments: [],
  }
}

export async function retryRegistrationAttachmentUploads({
  attachmentService,
  correspondenceId,
  failedAttachments = [],
  onProgress,
}) {
  return uploadRegistrationAttachments({
    attachmentService,
    correspondenceId,
    stagedAttachments: failedAttachments.map((item) => item.attachment),
    onProgress,
  })
}
