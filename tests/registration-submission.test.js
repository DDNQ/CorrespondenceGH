import test from 'node:test'
import assert from 'node:assert/strict'

import {
  RegistrationAttachmentUploadError,
  retryRegistrationAttachmentUploads,
  submitRegistrationWithAttachments,
} from '../src/utils/registrationSubmission.js'
import { normalizeAttachment } from '../src/utils/attachments.js'

function createStagedAttachment(name = 'registration.pdf', type = 'application/pdf') {
  return normalizeAttachment({
    id: `draft-${name}`,
    fileName: name,
    originalFilename: name,
    mimeType: type,
    sizeBytes: 1024,
    fileObject: new File(['document'], name, { type }),
    fileUrl: `blob:${name}`,
    previewUrl: `blob:${name}`,
    source: 'local',
    isTemporary: true,
  })
}

function createFormValues() {
  return {
    documentType: 'Contract',
    subject: 'Phase 6C registration workflow',
    sender: 'Central Registry',
    priority: 'Normal',
    direction: 'Incoming',
    initialStage: 'Initial classification',
    requiredAction: 'Register and route.',
    documentDate: '2026-08-22',
    dateReceived: '2026-08-22',
    stageDeadline: '2026-08-22',
    overallCompletionDate: '2026-08-22',
  }
}

test('registration submission creates correspondence once, then uploads the staged attachment, then finalizes', async () => {
  const callOrder = []
  const progressMessages = []
  const stagedAttachment = createStagedAttachment()
  const createdRecord = {
    id: 'corr-phase-6c-001',
    referenceNumber: 'CIT-2026-0101',
  }
  const uploadedAttachment = {
    id: 'att-phase-6c-001',
    originalFilename: 'registration.pdf',
    url: 'https://mrh-backend.onrender.com/files/registration.pdf',
  }

  const result = await submitRegistrationWithAttachments({
    correspondenceService: {
      async createCorrespondence(formValues, currentUser) {
        callOrder.push(['create', formValues.subject, currentUser.role])
        return createdRecord
      },
    },
    attachmentService: {
      async uploadAttachment(correspondenceId, file) {
        callOrder.push(['upload', correspondenceId, file.name])
        return uploadedAttachment
      },
    },
    formValues: createFormValues(),
    currentUser: {
      role: 'OFFICE_USER',
      office: { id: 'office-legal' },
    },
    stagedAttachments: [stagedAttachment],
    onProgress: ({ message }) => {
      progressMessages.push(message)
    },
  })

  assert.deepEqual(callOrder, [
    ['create', 'Phase 6C registration workflow', 'OFFICE_USER'],
    ['upload', 'corr-phase-6c-001', 'registration.pdf'],
  ])
  assert.deepEqual(progressMessages, [
    'Creating correspondence...',
    'Uploading document 1 of 1...',
    'Finalizing registration...',
  ])
  assert.equal(result.createdRecord.id, 'corr-phase-6c-001')
  assert.equal(result.uploadedAttachments[0].id, 'att-phase-6c-001')
  assert.deepEqual(result.failedAttachments, [])
})

test('registration submission allows correspondence creation without any attachment and skips upload requests', async () => {
  const callOrder = []
  const progressMessages = []

  const result = await submitRegistrationWithAttachments({
    correspondenceService: {
      async createCorrespondence(formValues, currentUser) {
        callOrder.push(['create', formValues.subject, currentUser.role])
        return {
          id: 'corr-phase-8a-001',
          referenceNumber: 'CIT-2026-0201',
        }
      },
    },
    attachmentService: {
      async uploadAttachment() {
        callOrder.push(['upload'])
        return null
      },
    },
    formValues: createFormValues(),
    currentUser: {
      role: 'OFFICE_USER',
      office: { id: 'office-legal' },
    },
    stagedAttachments: [],
    onProgress: ({ message }) => {
      progressMessages.push(message)
    },
  })

  assert.deepEqual(callOrder, [['create', 'Phase 6C registration workflow', 'OFFICE_USER']])
  assert.deepEqual(progressMessages, ['Creating correspondence...', 'Finalizing registration...'])
  assert.equal(result.createdRecord.id, 'corr-phase-8a-001')
  assert.deepEqual(result.uploadedAttachments, [])
  assert.deepEqual(result.failedAttachments, [])
})

test('registration submission does not upload attachments when create fails and leaves staged files available', async () => {
  const stagedAttachment = createStagedAttachment()
  let uploadCalls = 0

  await assert.rejects(
    () =>
      submitRegistrationWithAttachments({
        correspondenceService: {
          async createCorrespondence() {
            throw new Error('Create failed.')
          },
        },
        attachmentService: {
          async uploadAttachment() {
            uploadCalls += 1
            return null
          },
        },
        formValues: createFormValues(),
        currentUser: {
          role: 'OFFICE_USER',
          office: { id: 'office-legal' },
        },
        stagedAttachments: [stagedAttachment],
      }),
    /Create failed\./,
  )

  assert.equal(uploadCalls, 0)
  assert.equal(stagedAttachment.originalFilename, 'registration.pdf')
  assert.equal(stagedAttachment.fileObject?.name, 'registration.pdf')
})

test('registration submission preserves created correspondence and exposes retryable failed attachments without recreating the record', async () => {
  let createCalls = 0
  let uploadCalls = 0
  const stagedAttachment = createStagedAttachment('retry.pdf')

  try {
    await submitRegistrationWithAttachments({
      correspondenceService: {
        async createCorrespondence() {
          createCalls += 1
          return {
            id: 'corr-phase-6c-002',
            referenceNumber: 'CIT-2026-0102',
          }
        },
      },
      attachmentService: {
        async uploadAttachment() {
          uploadCalls += 1
          throw new Error('Upload failed.')
        },
      },
      formValues: createFormValues(),
      currentUser: {
        role: 'OFFICE_USER',
        office: { id: 'office-legal' },
      },
      stagedAttachments: [stagedAttachment],
    })

    assert.fail('Expected a partial-success attachment upload error.')
  } catch (error) {
    assert.equal(error instanceof RegistrationAttachmentUploadError, true)
    assert.equal(createCalls, 1)
    assert.equal(uploadCalls, 1)
    assert.equal(error.createdRecord.id, 'corr-phase-6c-002')
    assert.equal(error.createdRecord.referenceNumber, 'CIT-2026-0102')
    assert.equal(error.failedAttachments.length, 1)
    assert.equal(error.failedAttachments[0].attachment.id, stagedAttachment.id)
    assert.equal(error.failedAttachments[0].file.name, 'retry.pdf')
  }
})

test('retryRegistrationAttachmentUploads uploads only failed attachments and never recreates the correspondence', async () => {
  const callOrder = []
  const failedAttachment = createStagedAttachment('retry-only.pdf')

  const retryResult = await retryRegistrationAttachmentUploads({
    attachmentService: {
      async uploadAttachment(correspondenceId, file) {
        callOrder.push(['upload', correspondenceId, file.name])
        return {
          id: 'att-phase-6c-002',
          originalFilename: file.name,
          url: 'https://mrh-backend.onrender.com/files/retry-only.pdf',
        }
      },
    },
    correspondenceId: 'corr-phase-6c-003',
    failedAttachments: [
      {
        attachment: failedAttachment,
        file: failedAttachment.fileObject,
        index: 0,
        error: new Error('Initial upload failed.'),
      },
    ],
  })

  assert.deepEqual(callOrder, [['upload', 'corr-phase-6c-003', 'retry-only.pdf']])
  assert.equal(retryResult.uploadedAttachments.length, 1)
  assert.deepEqual(retryResult.failedAttachments, [])
})
