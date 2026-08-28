import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { normalizeAttachment } from '../src/utils/attachments.js'
import {
  getAttachmentListItemPresentation,
  getAttachmentPreviewAvailabilityState,
  getCurrentOfficeArrivalTimestamp,
  getDetailDocumentPreviewState,
  getDetailDocumentPreviewStateWithOptions,
  getDetailTerminalTimestamp,
  getDetailTimeRemaining,
  getJourneyAuditPresentation,
  getRecordDetailSections,
  getTimeInCurrentOffice,
  getWorkflowProgressSteps,
} from '../src/utils/correspondenceDetailPresentation.js'

const apiWorkspacePath = new URL(
  '../src/components/correspondence/ApiCorrespondenceDetailWorkspace.jsx',
  import.meta.url,
)

test('normal detail workspace source restores the approved prototype shell and keeps guided review separate', () => {
  const source = readFileSync(apiWorkspacePath, 'utf8')

  assert.match(source, /Correspondence Detail & Tracking/)
  assert.match(source, /Reference & Subject/)
  assert.match(source, /Overall Deadline/)
  assert.match(source, /Current Office/)
  assert.match(source, /Arrived at Office/)
  assert.match(source, /timeUntilActionIsDue\.trackLabel/)
  assert.match(source, /Document Preview/)
  assert.match(source, /Current Position/)
  assert.match(source, /Workflow Progress/)
  assert.match(source, /Journey & Audit/)
  assert.match(source, /Record Details/)
  assert.match(source, /Attachments/)
  assert.match(source, /Notes/)
  assert.match(source, /Open Document/)
  assert.match(source, /Download/)
  assert.match(source, /getAttachmentPreviewBlob/)
  assert.match(source, /typeof globalThis\.File === 'function'/)
  assert.match(source, /instanceof globalThis\.File/)
  assert.match(source, /Forward to Office/)
  assert.match(source, /if \(isGuidedFlow\)/)
  assert.match(source, /Registration Review/)
  assert.match(source, /Registration Summary/)
  assert.match(source, /Notes & Instructions/)
  assert.doesNotMatch(source, /Attachment records returned by the backend/)
  assert.doesNotMatch(source, /Notes returned by the backend/)
  assert.doesNotMatch(source, /Additional attachments are not permitted/)
  assert.doesNotMatch(source, /instanceof File/)
  assert.doesNotMatch(source, /detail-actions-menu/)
  assert.doesNotMatch(source, /Forward Correspondence/)
  assert.doesNotMatch(source, /Registration & Routing/)
  assert.doesNotMatch(
    source,
    /View the complete record, current office position, workflow journey and supporting information\./,
  )
  assert.doesNotMatch(source, /Documents linked to this correspondence\./)
  assert.doesNotMatch(source, /Administrative notes recorded against this correspondence\./)
  assert.doesNotMatch(source, /Update the current stage for this correspondence\./)
  assert.doesNotMatch(source, /Upload an attachment for this correspondence\./)
})

test('detail preview state avoids a broken iframe for persisted backend pdf attachments', () => {
  const pdfAttachment = normalizeAttachment({
    id: 'attachment-pdf-001',
    original_filename: 'contract.pdf',
    mime_type: 'application/pdf',
    size_bytes: 4096,
    file_url: 'https://mrh-backend.onrender.com/files/contract.pdf',
  })

  const previewState = getDetailDocumentPreviewState(pdfAttachment)

  assert.equal(previewState.mode, 'preview-unavailable')
  assert.equal(previewState.fileName, 'contract.pdf')
  assert.equal(previewState.typeLabel, 'PDF document')
  assert.equal(previewState.viewUrl, 'https://mrh-backend.onrender.com/files/contract.pdf')
  assert.equal(previewState.downloadUrl, 'https://mrh-backend.onrender.com/files/contract.pdf')
})

test('detail preview state distinguishes missing, restricted, and temporary preview failures', () => {
  const pdfAttachment = normalizeAttachment({
    id: 'attachment-pdf-404',
    original_filename: 'missing.pdf',
    mime_type: 'application/pdf',
    size_bytes: 4096,
    file_url: 'https://mrh-backend.onrender.com/files/missing.pdf',
  })

  assert.equal(getAttachmentPreviewAvailabilityState({ status: 404 }), 'missing')
  assert.equal(getAttachmentPreviewAvailabilityState({ status: 403 }), 'restricted')
  assert.equal(getAttachmentPreviewAvailabilityState({ status: 500 }), 'preview-failed')
  assert.equal(getAttachmentPreviewAvailabilityState({ status: null }), 'preview-failed')

  const missingPreview = getDetailDocumentPreviewStateWithOptions(pdfAttachment, {
    availability: 'missing',
  })
  const restrictedPreview = getDetailDocumentPreviewStateWithOptions(pdfAttachment, {
    availability: 'restricted',
  })
  const failedPreview = getDetailDocumentPreviewStateWithOptions(pdfAttachment, {
    availability: 'preview-failed',
  })

  assert.equal(missingPreview.mode, 'missing-file')
  assert.equal(missingPreview.title, 'Document no longer available')
  assert.equal(missingPreview.viewUrl, null)
  assert.equal(missingPreview.downloadUrl, null)

  assert.equal(restrictedPreview.mode, 'access-restricted')
  assert.equal(restrictedPreview.viewUrl, null)
  assert.equal(restrictedPreview.downloadUrl, null)

  assert.equal(failedPreview.mode, 'preview-unavailable')
  assert.equal(failedPreview.viewUrl, 'https://mrh-backend.onrender.com/files/missing.pdf')
  assert.equal(failedPreview.downloadUrl, 'https://mrh-backend.onrender.com/files/missing.pdf')
})

test('detail preview state keeps inline previews for local image/pdf files and falls back safely for persisted images', () => {
  const persistedImageAttachment = normalizeAttachment({
    id: 'attachment-image-001',
    original_filename: 'scan.png',
    mime_type: 'image/png',
    size_bytes: 2048,
    file_url: 'https://mrh-backend.onrender.com/files/scan.png',
  })
  const localImageAttachment = normalizeAttachment({
    id: 'attachment-local-image-001',
    original_filename: 'draft.png',
    mime_type: 'image/png',
    size_bytes: 2048,
    file_url: 'blob:draft-image-preview',
    preview_url: 'blob:draft-image-preview',
  })
  const localPdfAttachment = normalizeAttachment({
    id: 'attachment-local-pdf-001',
    original_filename: 'draft.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024,
    file_url: 'blob:draft-preview',
    preview_url: 'blob:draft-preview',
  })

  assert.equal(getDetailDocumentPreviewState(persistedImageAttachment).mode, 'preview-unavailable')
  assert.equal(getDetailDocumentPreviewState(localImageAttachment).mode, 'image')
  assert.equal(getDetailDocumentPreviewState(localPdfAttachment).mode, 'embedded-pdf')
})

test('journey audit presentation renders event-specific copy without generic missing-office sentences', () => {
  assert.deepEqual(
    getJourneyAuditPresentation({
      action: 'registered',
      toOffice: { name: 'Central Registry' },
    }),
    {
      title: 'Correspondence registered',
      description: 'Registered at Central Registry.',
    },
  )

  assert.deepEqual(
    getJourneyAuditPresentation({
      action: 'stage_updated',
      previousStage: 'Initial classification',
      newStage: 'Director review',
    }),
    {
      title: 'Current stage updated',
      description: 'Stage changed from Initial classification to Director review.',
    },
  )

  assert.deepEqual(
    getJourneyAuditPresentation({
      action: 'forwarded',
      fromOffice: { name: 'Central Registry' },
      toOffice: { name: 'Legal Directorate' },
    }),
    {
      title: 'Forwarded to Legal Directorate',
      description: 'Forwarded from Central Registry to Legal Directorate.',
    },
  )

  assert.deepEqual(
    getJourneyAuditPresentation({
      action: 'note_added',
      performedBy: { fullName: 'Ama Mensah' },
      note: 'Review note.',
    }),
    {
      title: 'Note added',
      description: 'Note added.',
    },
  )

  assert.deepEqual(
    getJourneyAuditPresentation({
      action: 'attachment_uploaded',
      note: 'contract.pdf',
    }),
    {
      title: 'Attachment uploaded',
      description: 'Attachment uploaded: contract.pdf.',
    },
  )

  assert.deepEqual(
    getJourneyAuditPresentation({
      action: 'completed',
    }),
    {
      title: 'Correspondence completed',
      description: 'Correspondence marked completed.',
    },
  )

  assert.deepEqual(
    getJourneyAuditPresentation({
      action: 'unknown_action',
      note: 'Workflow activity recorded manually.',
    }),
    {
      title: 'unknown_action',
      description: 'Workflow activity recorded manually.',
    },
  )
})

test('workflow progress derives office steps from authoritative movements only', () => {
  const detail = {
    currentOffice: {
      id: 'office-legal',
      name: 'Legal Directorate',
    },
    currentStage: 'Director review',
  }

  const workflowSteps = getWorkflowProgressSteps(detail, [
    {
      id: 'move-1',
      action: 'registered',
      toOffice: { id: 'office-registry', name: 'Central Registry' },
      performedAt: '2026-08-21T08:00:00.000Z',
    },
    {
      id: 'move-2',
      action: 'forwarded',
      fromOffice: { id: 'office-registry', name: 'Central Registry' },
      toOffice: { id: 'office-legal', name: 'Legal Directorate' },
      performedAt: '2026-08-21T10:00:00.000Z',
    },
    {
      id: 'move-3',
      action: 'note_added',
      note: 'Internal review underway.',
      performedAt: '2026-08-21T12:00:00.000Z',
    },
  ])

  assert.deepEqual(
    workflowSteps.map((step) => [step.title, step.state]),
    [
      ['Central Registry', 'done'],
      ['Legal Directorate', 'current'],
    ],
  )
  assert.equal(workflowSteps[1].description, 'Director review')
})

test('current-office timing helpers use authoritative movement timestamps and fail safely otherwise', () => {
  const arrivedAt = getCurrentOfficeArrivalTimestamp(
    {
      currentOffice: {
        id: 'office-legal',
        name: 'Legal Directorate',
      },
    },
    [
      {
        action: 'forwarded',
        toOffice: { id: 'office-legal', name: 'Legal Directorate' },
        performedAt: '2026-08-21T10:00:00.000Z',
      },
    ],
  )

  assert.equal(arrivedAt, '2026-08-21T10:00:00.000Z')

  const timeInOffice = getTimeInCurrentOffice(arrivedAt, '2026-08-22T13:30:00.000Z')
  assert.equal(timeInOffice.label, '1 day 3 hrs')

  const timeRemaining = getDetailTimeRemaining('2026-08-23T12:00:00.000Z', 'In Progress', '2026-08-22T09:00:00.000Z')
  assert.equal(timeRemaining.label, '1 day 3 hrs')
  assert.equal(timeRemaining.trackLabel, 'Time Until Action Is Due')
  assert.equal(timeRemaining.overviewLabel, 'Time Remaining')

  const overdue = getDetailTimeRemaining('2026-08-21T08:00:00.000Z', 'In Progress', '2026-08-22T10:00:00.000Z')
  assert.equal(overdue.tone, 'overdue')
  assert.equal(overdue.label, '1 day 2 hrs overdue')

  const unavailableArrival = getTimeInCurrentOffice(null)
  assert.equal(unavailableArrival.label, 'Unavailable')
})

test('terminal timing uses authoritative completion and filing timestamps instead of status words', () => {
  const completedMovements = [
    {
      id: 'move-completed',
      action: 'completed',
      performedAt: '2026-08-22T15:00:00.000Z',
    },
  ]
  const filedMovements = [
    {
      id: 'move-filed',
      action: 'filed',
      performedAt: '2026-08-24T08:00:00.000Z',
    },
  ]

  const completedTimestamp = getDetailTerminalTimestamp(
    { status: 'Completed', resolvedAt: '2026-08-22T14:45:00.000Z' },
    completedMovements,
  )
  const completedTiming = getDetailTimeRemaining(
    '2026-08-23T12:00:00.000Z',
    'Completed',
    '2026-08-25T08:00:00.000Z',
    completedTimestamp,
  )

  assert.equal(completedTimestamp, '2026-08-22T15:00:00.000Z')
  assert.equal(completedTiming.label, '21 hrs')
  assert.equal(completedTiming.trackLabel, 'Time Remaining at Completion')
  assert.equal(completedTiming.overviewLabel, 'Time Remaining at Completion')
  assert.notEqual(completedTiming.label, 'Completed')

  const filedTimestamp = getDetailTerminalTimestamp({ status: 'Filed' }, filedMovements)
  const filedTiming = getDetailTimeRemaining(
    '2026-08-23T12:00:00.000Z',
    'Filed',
    '2026-08-25T08:00:00.000Z',
    filedTimestamp,
  )

  assert.equal(filedTimestamp, '2026-08-24T08:00:00.000Z')
  assert.equal(filedTiming.label, '20 hrs overdue')
  assert.equal(filedTiming.trackLabel, 'Time Remaining at Filing')
  assert.equal(filedTiming.overviewLabel, 'Time Remaining at Filing')
  assert.notEqual(filedTiming.label, 'Filed')
})

test('terminal timing falls back to unavailable when no trustworthy terminal timestamp exists', () => {
  const unavailableCompleted = getDetailTimeRemaining(
    '2026-08-23T12:00:00.000Z',
    'Completed',
    '2026-08-25T08:00:00.000Z',
    null,
  )

  assert.equal(unavailableCompleted.label, 'Unavailable')
  assert.equal(unavailableCompleted.trackLabel, 'Time Remaining at Completion')

  const unavailableFiled = getDetailTimeRemaining(
    '2026-08-23T12:00:00.000Z',
    'Filed',
    '2026-08-25T08:00:00.000Z',
    null,
  )

  assert.equal(unavailableFiled.label, 'Unavailable')
  assert.equal(unavailableFiled.trackLabel, 'Time Remaining at Filing')
})

test('record detail sections prioritize business fields and omit nonessential metadata noise', () => {
  const detailSections = getRecordDetailSections({
    referenceNumber: 'MRH/CON/2026/0012',
    type: 'Contract',
    direction: 'Incoming',
    subject: 'Periodic Maintenance Contract for N1 Highway',
    sender: 'Central Registry',
    currentOffice: { id: 'office-legal', name: 'Legal Directorate' },
    priority: 'High',
    status: 'In Progress',
    currentStage: 'Director review',
    instructions: 'Prepare the legal review note.',
    createdAt: null,
    updatedAt: null,
    registeredBy: { fullName: 'Should be omitted' },
  })

  const labels = detailSections.flatMap((section) => section.fields.map((field) => field.label))

  assert.ok(labels.includes('Reference'))
  assert.ok(labels.includes('Document Type'))
  assert.ok(labels.includes('Subject'))
  assert.ok(labels.includes('Current Office'))
  assert.ok(labels.includes('Current Stage'))
  assert.ok(labels.includes('Instructions'))
  assert.equal(labels.includes('Created At'), false)
  assert.equal(labels.includes('Updated At'), false)
  assert.equal(labels.includes('Registered By'), false)
})

test('attachment list presentation exposes filename, type, uploader, size, and safe urls', () => {
  const attachmentPresentation = getAttachmentListItemPresentation(
    normalizeAttachment({
      id: 'attachment-doc-001',
      original_filename: 'brief.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size_bytes: 524288,
      uploaded_at: '2026-08-22T10:00:00.000Z',
      uploaded_by: {
        full_name: 'Kwesi Boateng',
      },
      file_url: 'https://mrh-backend.onrender.com/files/brief.docx',
    }),
  )

  assert.equal(attachmentPresentation.fileName, 'brief.docx')
  assert.equal(attachmentPresentation.typeLabel, 'Word document')
  assert.equal(attachmentPresentation.uploadedBy, 'Kwesi Boateng')
  assert.equal(attachmentPresentation.sizeLabel, '512 KB')
  assert.equal(attachmentPresentation.canOpen, true)
  assert.equal(
    attachmentPresentation.viewUrl,
    'https://mrh-backend.onrender.com/files/brief.docx',
  )
})
