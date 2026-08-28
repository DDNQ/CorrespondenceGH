import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRegistrationReviewSnapshot,
  clearRegistrationReviewSnapshot,
  getRegistrationReviewSteps,
  loadRegistrationReviewSnapshot,
  mergeRegistrationReviewSnapshot,
  saveRegistrationReviewSnapshot,
} from '../src/utils/correspondenceReview.js'
import { normalizeAttachment } from '../src/utils/attachments.js'

class MemoryStorage {
  constructor() {
    this.map = new Map()
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null
  }

  setItem(key, value) {
    this.map.set(key, String(value))
  }

  removeItem(key) {
    this.map.delete(key)
  }
}

class ThrowingStorage {
  getItem() {
    throw new Error('storage blocked')
  }

  setItem() {
    throw new Error('storage blocked')
  }

  removeItem() {
    throw new Error('storage blocked')
  }
}

function createBackendAttachment(overrides = {}) {
  return normalizeAttachment({
    id: 'att-review-001',
    correspondence_id: 'corr-review-001',
    original_filename: 'submission.pdf',
    mime_type: 'application/pdf',
    size_bytes: 4096,
    file_url: 'https://mrh-backend.onrender.com/files/submission.pdf',
    ...overrides,
  })
}

test('registration review steps include preview only when an attachment exists', () => {
  assert.deepEqual(
    getRegistrationReviewSteps(createBackendAttachment()).map((step) => step.title),
    ['Document Preview', 'Registration Summary', 'Notes & Instructions'],
  )

  assert.deepEqual(
    getRegistrationReviewSteps(null).map((step) => step.title),
    ['Registration Summary', 'Notes & Instructions'],
  )
})

test('registration review snapshot preserves submitted registration values and backend attachment metadata', () => {
  const snapshot = buildRegistrationReviewSnapshot({
    createdRecord: {
      id: 'corr-review-001',
      referenceNumber: 'CIT-2026-0201',
      currentOffice: {
        id: 'office-legal',
        name: 'Legal Directorate',
        code: 'LEG',
      },
    },
    formValues: {
      documentType: 'Contract',
      subject: 'Consultancy agreement',
      sender: 'Central Registry',
      direction: 'Incoming',
      priority: 'High',
      documentDate: '2026-08-22',
      dateReceived: '2026-08-22',
      overallCompletionDate: '2026-08-29',
      initialStage: 'Initial classification',
      stageDeadline: '2026-08-24',
      requiredAction: 'Review and record.',
    },
    currentUser: {
      office: {
        id: 'office-legal',
        name: 'Legal Directorate',
        code: 'LEG',
      },
    },
    uploadedAttachments: [createBackendAttachment()],
  })

  assert.equal(snapshot.referenceNumber, 'CIT-2026-0201')
  assert.equal(snapshot.subject, 'Consultancy agreement')
  assert.equal(snapshot.deadline, '2026-08-29')
  assert.equal(snapshot.initialStage, 'Initial classification')
  assert.equal(snapshot.instructions, 'Review and record.')
  assert.equal(snapshot.registeringOffice?.name, 'Legal Directorate')
  assert.equal(snapshot.initialOffice?.code, 'LEG')
  assert.equal(snapshot.attachments[0].fileName, 'submission.pdf')
  assert.equal(snapshot.attachments[0].url, 'https://mrh-backend.onrender.com/files/submission.pdf')
})

test('registration review snapshots persist in session storage and merge backend attachment urls on refresh', () => {
  globalThis.sessionStorage = new MemoryStorage()

  const savedSnapshot = saveRegistrationReviewSnapshot({
    id: 'corr-review-002',
    referenceNumber: 'CIT-2026-0202',
    subject: 'Attachment refresh recovery',
    attachments: [
      {
        id: 'att-review-002',
        fileName: 'refresh.docx',
        originalFilename: 'refresh.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: 8192,
        previewUrl: 'blob:temporary-preview',
      },
    ],
  })

  assert.equal(savedSnapshot.attachments[0].previewUrl, null)
  assert.equal(loadRegistrationReviewSnapshot('corr-review-002')?.referenceNumber, 'CIT-2026-0202')

  const mergedSnapshot = mergeRegistrationReviewSnapshot(savedSnapshot, [
    createBackendAttachment({
      id: 'att-review-002',
      original_filename: 'refresh.docx',
      mime_type:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_url: 'https://mrh-backend.onrender.com/files/refresh.docx',
    }),
  ])

  assert.equal(
    mergedSnapshot.attachments[0].url,
    'https://mrh-backend.onrender.com/files/refresh.docx',
  )

  clearRegistrationReviewSnapshot('corr-review-002')
  assert.equal(loadRegistrationReviewSnapshot('corr-review-002'), null)
})

test('registration review snapshot helpers fail safely when session storage is blocked', () => {
  globalThis.sessionStorage = new ThrowingStorage()

  const snapshot = {
    id: 'corr-review-003',
    referenceNumber: 'CIT-2026-0203',
    subject: 'Blocked storage review',
    attachments: [],
  }

  const savedSnapshot = saveRegistrationReviewSnapshot(snapshot)

  assert.equal(savedSnapshot.id, 'corr-review-003')
  assert.equal(savedSnapshot.referenceNumber, 'CIT-2026-0203')
  assert.equal(savedSnapshot.subject, 'Blocked storage review')
  assert.deepEqual(savedSnapshot.attachments, [])
  assert.equal(loadRegistrationReviewSnapshot('corr-review-003'), null)
  assert.doesNotThrow(() => clearRegistrationReviewSnapshot('corr-review-003'))
})
