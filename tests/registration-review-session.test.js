import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearTransientRegistrationReviewAttachment,
  loadTransientRegistrationReviewAttachment,
  saveTransientRegistrationReviewAttachment,
} from '../src/utils/registrationReviewSession.js'

test('transient registration review attachments keep the local file object in memory for immediate review', () => {
  const localFile = new File(['preview'], 'review.pdf', { type: 'application/pdf' })
  const attachment = {
    id: 'att-transient-001',
    fileObject: localFile,
    previewUrl: 'blob:stale-preview',
    fileUrl: 'blob:stale-preview',
  }

  saveTransientRegistrationReviewAttachment('corr-transient-001', attachment)

  const restored = loadTransientRegistrationReviewAttachment('corr-transient-001')

  assert.equal(restored?.fileObject, localFile)
  assert.equal(restored?.id, 'att-transient-001')

  clearTransientRegistrationReviewAttachment('corr-transient-001')
  assert.equal(loadTransientRegistrationReviewAttachment('corr-transient-001'), null)
})

test('transient registration review attachment cleanup revokes replaced and cleared blob urls', () => {
  const revoked = []
  const originalRevokeObjectUrl = URL.revokeObjectURL
  URL.revokeObjectURL = (url) => revoked.push(url)

  try {
    saveTransientRegistrationReviewAttachment('corr-transient-002', {
      id: 'att-transient-old',
      previewUrl: 'blob:old-preview',
      fileUrl: 'blob:old-preview',
    })

    saveTransientRegistrationReviewAttachment('corr-transient-002', {
      id: 'att-transient-new',
      previewUrl: 'blob:new-preview',
      fileUrl: 'blob:new-preview',
    })

    clearTransientRegistrationReviewAttachment('corr-transient-002')

    assert.deepEqual(revoked, ['blob:old-preview', 'blob:new-preview'])
  } finally {
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
})
