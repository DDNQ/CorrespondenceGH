import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getRegistrationPresentation } from '../src/utils/registrationPresentation.js'

const registerPagePath = new URL(
  '../src/pages/office/RegisterCorrespondencePage.jsx',
  import.meta.url,
)
const fileUploadFieldPath = new URL(
  '../src/components/forms/FileUploadField.jsx',
  import.meta.url,
)

test('registration presentation restores guided attachment selection during registration', () => {
  const presentation = getRegistrationPresentation({
    currentOfficeName: 'Correspondence Integration Test Office',
  })

  assert.equal(presentation.pageDescription, '')
  assert.equal(presentation.routingSectionTitle, 'Dates & Initial Handling')
  assert.equal(presentation.routingSectionDescription, '')
  assert.equal(presentation.referencePreview, 'Assigned after registration')
  assert.equal(presentation.allowsDestinationSelection, false)
  assert.equal(presentation.destinationOfficeName, 'Correspondence Integration Test Office')
  assert.equal(presentation.showsAttachmentInput, true)
  assert.equal(
    presentation.attachmentDescription,
    'Attach a document if applicable.',
  )
})

test('register correspondence keeps attachment selection optional and hides inline form previews', () => {
  const registerPageSource = readFileSync(registerPagePath, 'utf8')
  const fileUploadFieldSource = readFileSync(fileUploadFieldPath, 'utf8')

  assert.equal(registerPageSource.includes("attachment: 'Choose a document to attach.'"), false)
  assert.ok(registerPageSource.includes('showInlinePreview={false}'))
  assert.ok(registerPageSource.includes('emptyLabel="Choose Document"'))
  assert.ok(fileUploadFieldSource.includes('showInlinePreview = true'))
  assert.ok(fileUploadFieldSource.includes('showInlinePreview && canPreviewSelectedAttachment'))
})
