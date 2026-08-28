import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ALLOWED_ATTACHMENT_MIME_TYPES,
  ATTACHMENT_INPUT_ACCEPT,
  MAX_ATTACHMENT_SIZE_BYTES,
  createAttachmentDraftFromFile,
  formatFileSize,
  getAttachmentDownloadUrl,
  getAttachmentViewUrl,
  getFileExtension,
  normalizeAttachment,
  removeAttachmentDraft,
  replaceAttachmentDraft,
  revokeAttachmentUrls,
  toAttachmentFormData,
  validateAttachmentFile,
} from '../src/utils/attachments.js'

test('getFileExtension handles casing, multiple dots, hidden files, and null safely', () => {
  assert.equal(getFileExtension('report.PDF'), 'pdf')
  assert.equal(getFileExtension('document.final.docx'), 'docx')
  assert.equal(getFileExtension('photo.JPEG'), 'jpeg')
  assert.equal(getFileExtension('filename'), null)
  assert.equal(getFileExtension('.hiddenfile'), null)
  assert.equal(getFileExtension(null), null)
})

test('validateAttachmentFile accepts approved files and rejects invalid cases', () => {
  const validPdf = new File(['contract'], 'contract.PDF', { type: 'application/pdf' })
  const validDoc = new File(['memo'], 'memo.doc', { type: 'application/msword' })
  const validDocx = new File(['memo'], 'memo.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const validJpg = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })
  const validJpeg = new File(['image'], 'photo.JPEG', { type: 'image/jpeg' })
  const validPng = new File(['image'], 'diagram.png', { type: 'image/png' })
  const validEmptyMime = new File(['scan'], 'scan.pdf', { type: '' })
  const zeroByte = new File([''], 'empty.pdf', { type: 'application/pdf' })
  const tooLarge = new File(['large'], 'large.pdf', { type: 'application/pdf' })
  Object.defineProperty(tooLarge, 'size', { value: MAX_ATTACHMENT_SIZE_BYTES + 1 })
  const invalidXls = new File(['sheet'], 'sheet.xls', { type: 'application/vnd.ms-excel' })
  const invalidXlsx = new File(['sheet'], 'sheet.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const invalidZip = new File(['zip'], 'archive.zip', { type: 'application/zip' })
  const invalidExe = new File(['exe'], 'installer.exe', { type: 'application/octet-stream' })
  const mismatch = new File(['bad'], 'contract.pdf', { type: 'image/png' })

  assert.equal(validateAttachmentFile(validPdf).valid, true)
  assert.equal(validateAttachmentFile(validDoc).valid, true)
  assert.equal(validateAttachmentFile(validDocx).valid, true)
  assert.equal(validateAttachmentFile(validJpg).valid, true)
  assert.equal(validateAttachmentFile(validJpeg).valid, true)
  assert.equal(validateAttachmentFile(validPng).valid, true)
  assert.equal(validateAttachmentFile(validEmptyMime).valid, true)
  assert.equal(validateAttachmentFile(zeroByte).errors[0].code, 'EMPTY_FILE')
  assert.equal(validateAttachmentFile(tooLarge).errors[0].code, 'FILE_TOO_LARGE')
  assert.equal(validateAttachmentFile(invalidXls).errors[0].code, 'UNSUPPORTED_EXTENSION')
  assert.equal(validateAttachmentFile(invalidXlsx).errors[0].code, 'UNSUPPORTED_EXTENSION')
  assert.equal(validateAttachmentFile(invalidZip).errors[0].code, 'UNSUPPORTED_EXTENSION')
  assert.equal(validateAttachmentFile(invalidExe).errors[0].code, 'UNSUPPORTED_EXTENSION')
  assert.ok(
    validateAttachmentFile(mismatch).errors.some((error) => error.code === 'FILE_TYPE_MISMATCH'),
  )
  assert.equal(validateAttachmentFile(null).errors[0].code, 'FILE_REQUIRED')
})

test('formatFileSize returns consistent byte, KB, MB, and null-safe labels', () => {
  assert.equal(formatFileSize(512), '512 B')
  assert.equal(formatFileSize(245 * 1024), '245 KB')
  assert.equal(formatFileSize(Math.round(1.4 * 1024 * 1024)), '1.4 MB')
  assert.equal(formatFileSize(null), '0 B')
  assert.equal(formatFileSize(0), '0 B')
})

test('normalizeAttachment supports backend, mock, and local draft shapes', () => {
  const backendAttachment = normalizeAttachment({
    id: 'attachment-001',
    correspondence_id: 'mock-correspondence-001',
    original_filename: 'contract.pdf',
    mime_type: 'application/pdf',
    size_bytes: 2048,
    file_url: '/files/contract.pdf',
    uploaded_at: '2026-07-27T10:00:00Z',
    uploaded_by: {
      id: 'user-legal-1',
      full_name: 'Ama Mensah',
      office_id: 'office-legal',
    },
    office: 'office-legal',
  })
  const absoluteAttachment = normalizeAttachment({
    id: 'attachment-absolute-001',
    original_filename: 'minute.pdf',
    mime_type: 'application/pdf',
    size_bytes: 5120,
    file_url: 'https://cdn.example.test/minute.pdf',
  })
  const mockAttachment = normalizeAttachment({
    attachmentId: 'attachment-002',
    correspondenceId: 'mock-correspondence-002',
    fileName: 'petition.docx',
    type: 'DOCX',
    size: 4096,
    fileUrl: '/files/petition.docx',
    uploadedBy: 'Grace Boateng',
    office: 'Central Registry',
  })
  const localAttachment = normalizeAttachment({
    fileName: 'photo.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    fileUrl: 'blob:photo-preview',
    previewUrl: 'blob:photo-preview',
    fileObject: new File(['image'], 'photo.png', { type: 'image/png' }),
  })

  assert.equal(backendAttachment.correspondenceId, 'mock-correspondence-001')
  assert.equal(backendAttachment.originalFilename, 'contract.pdf')
  assert.equal(backendAttachment.name, 'contract.pdf')
  assert.equal(backendAttachment.fileName, 'contract.pdf')
  assert.equal(backendAttachment.contentType, 'application/pdf')
  assert.equal(backendAttachment.size, 2048)
  assert.equal(backendAttachment.url, 'https://mrh-backend.onrender.com/files/contract.pdf')
  assert.equal(backendAttachment.fileUrl, 'https://mrh-backend.onrender.com/files/contract.pdf')
  assert.equal(backendAttachment.previewUrl, 'https://mrh-backend.onrender.com/files/contract.pdf')
  assert.equal(backendAttachment.uploadedBy?.fullName, 'Ama Mensah')
  assert.equal(backendAttachment.uploadedForOffice?.id, 'office-legal')
  assert.equal(backendAttachment.sizeLabel, '2 KB')
  assert.equal(absoluteAttachment.url, 'https://cdn.example.test/minute.pdf')
  assert.equal(mockAttachment.originalFilename, 'petition.docx')
  assert.equal(mockAttachment.uploadedForOffice?.name, 'Central Registry')
  assert.ok(localAttachment.id)
  assert.equal(localAttachment.source, 'local')
  assert.equal(localAttachment.previewUrl, 'blob:photo-preview')
  assert.equal(localAttachment.url, 'blob:photo-preview')
})

test('createAttachmentDraftFromFile gives same-name files unique stable attachment ids', () => {
  const originalCreateObjectUrl = URL.createObjectURL
  URL.createObjectURL = (file) => `blob:${file.name}-${Math.random().toString(16).slice(2, 8)}`

  try {
    const first = createAttachmentDraftFromFile(
      new File(['one'], 'report.pdf', { type: 'application/pdf' }),
    )
    const second = createAttachmentDraftFromFile(
      new File(['two'], 'report.pdf', { type: 'application/pdf' }),
    )

    assert.notEqual(first.id, second.id)
    assert.notEqual(first.previewUrl, second.previewUrl)
    assert.equal(first.originalFilename, 'report.pdf')
    assert.equal(second.originalFilename, 'report.pdf')
  } finally {
    URL.createObjectURL = originalCreateObjectUrl
  }
})

test('createAttachmentDraftFromFile supports valid PDF, image, and Word registration selections', () => {
  const originalCreateObjectUrl = URL.createObjectURL
  URL.createObjectURL = (file) => `blob:${file.name}`

  try {
    const pdfDraft = createAttachmentDraftFromFile(
      new File(['contract'], 'contract.pdf', { type: 'application/pdf' }),
    )
    const imageDraft = createAttachmentDraftFromFile(
      new File(['diagram'], 'diagram.png', { type: 'image/png' }),
    )
    const docxDraft = createAttachmentDraftFromFile(
      new File(['brief'], 'brief.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    )

    assert.equal(pdfDraft.previewUrl, 'blob:contract.pdf')
    assert.equal(imageDraft.previewUrl, 'blob:diagram.png')
    assert.equal(docxDraft.previewUrl, 'blob:brief.docx')
    assert.equal(pdfDraft.source, 'local')
    assert.equal(imageDraft.source, 'local')
    assert.equal(docxDraft.source, 'local')
  } finally {
    URL.createObjectURL = originalCreateObjectUrl
  }
})

test('replaceAttachmentDraft revokes the previous preview only after a valid replacement succeeds', () => {
  const revoked = []
  const originalCreateObjectUrl = URL.createObjectURL
  const originalRevokeObjectUrl = URL.revokeObjectURL
  URL.createObjectURL = (file) => `blob:${file.name}`
  URL.revokeObjectURL = (url) => revoked.push(url)

  try {
    const currentDraft = createAttachmentDraftFromFile(
      new File(['first'], 'current.pdf', { type: 'application/pdf' }),
    )

    assert.throws(
      () =>
        replaceAttachmentDraft(
          currentDraft,
          new File(['bad'], 'blocked.exe', { type: 'application/octet-stream' }),
        ),
      /Only PDF, DOC, DOCX, JPG, JPEG and PNG files are allowed\./,
    )
    assert.deepEqual(revoked, [])

    const nextDraft = replaceAttachmentDraft(
      currentDraft,
      new File(['second'], 'replacement.pdf', { type: 'application/pdf' }),
    )

    assert.equal(nextDraft.previewUrl, 'blob:replacement.pdf')
    assert.deepEqual(revoked, ['blob:current.pdf'])
  } finally {
    URL.createObjectURL = originalCreateObjectUrl
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
})

test('removeAttachmentDraft revokes blob previews during staged registration cleanup', () => {
  const revoked = []
  const originalRevokeObjectUrl = URL.revokeObjectURL
  URL.revokeObjectURL = (url) => revoked.push(url)

  try {
    const attachment = normalizeAttachment({
      fileName: 'cleanup.pdf',
      mimeType: 'application/pdf',
      fileUrl: 'blob:cleanup.pdf',
      previewUrl: 'blob:cleanup.pdf',
      source: 'local',
    })

    assert.equal(removeAttachmentDraft(attachment), null)
    assert.deepEqual(revoked, ['blob:cleanup.pdf'])
  } finally {
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
})

test('toAttachmentFormData uses the exact file field and rejects invalid files', () => {
  const validFile = new File(['contract'], 'contract.pdf', { type: 'application/pdf' })
  const formData = toAttachmentFormData(validFile)

  assert.equal(formData.get('file'), validFile)
  assert.throws(
    () =>
      toAttachmentFormData(
        new File(['sheet'], 'sheet.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      ),
    /Only PDF, DOC, DOCX, JPG, JPEG and PNG files are allowed\./,
  )
})

test('attachment URL helpers use canonical backend urls and cleanup still works for local attachments', () => {
  const revoked = []
  const originalRevokeObjectUrl = URL.revokeObjectURL
  URL.revokeObjectURL = (url) => revoked.push(url)

  try {
    const remoteAttachment = normalizeAttachment({
      fileName: 'contract.pdf',
      mimeType: 'application/pdf',
      file_url: '/files/contract.pdf',
      preview_url: '/files/legacy-preview.pdf',
      source: 'remote',
    })
    const attachment = normalizeAttachment({
      fileName: 'contract.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      fileUrl: 'blob:contract-preview',
      previewUrl: 'blob:contract-preview',
      source: 'local',
    })

    assert.equal(
      getAttachmentViewUrl(remoteAttachment),
      'https://mrh-backend.onrender.com/files/legacy-preview.pdf',
    )
    assert.equal(
      getAttachmentDownloadUrl(remoteAttachment),
      'https://mrh-backend.onrender.com/files/contract.pdf',
    )
    assert.equal(getAttachmentViewUrl(attachment), 'blob:contract-preview')
    assert.equal(getAttachmentDownloadUrl(attachment), 'blob:contract-preview')

    revokeAttachmentUrls(attachment)

    assert.deepEqual(revoked, ['blob:contract-preview'])
  } finally {
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
})

test('attachment policy exports remain centralized and explicit', () => {
  assert.deepEqual(ALLOWED_ATTACHMENT_EXTENSIONS, ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])
  assert.ok(ALLOWED_ATTACHMENT_MIME_TYPES.includes('application/pdf'))
  assert.equal(ATTACHMENT_INPUT_ACCEPT, '.pdf,.doc,.docx,.jpg,.jpeg,.png')
  assert.equal(MAX_ATTACHMENT_SIZE_BYTES, 10 * 1024 * 1024)
})
