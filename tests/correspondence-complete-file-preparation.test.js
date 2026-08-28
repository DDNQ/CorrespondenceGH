import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getApiApplicationReadiness } from '../src/config/apiApplicationReadiness.js'
import { toCorrespondenceActionNotePayload } from '../src/services/api/correspondenceApi.js'

const apiWorkspacePath = new URL(
  '../src/components/correspondence/ApiCorrespondenceDetailWorkspace.jsx',
  import.meta.url,
)
const detailPagePath = new URL('../src/pages/office/CorrespondenceDetailPage.jsx', import.meta.url)

test('phase 3B readiness reflects live completion and filing with the filed-movement limitation still tracked', () => {
  const readiness = getApiApplicationReadiness()

  assert.equal(readiness.correspondence.completionLiveVerified, true)
  assert.equal(readiness.correspondence.filingLiveVerified, true)
  assert.equal(readiness.correspondence.filedMovementAuditLiveVerified, false)
})

test('shared correspondence action note payload trims notes and uses empty objects when optional notes are absent', () => {
  assert.deepEqual(toCorrespondenceActionNotePayload({}), {})
  assert.deepEqual(toCorrespondenceActionNotePayload({ note: '' }), {})
  assert.deepEqual(toCorrespondenceActionNotePayload({ note: '   ' }), {})
  assert.deepEqual(toCorrespondenceActionNotePayload({ note: '  Filed by office.  ' }), {
    note: 'Filed by office.',
  })
})

test('api correspondence detail workspace prepares complete and file actions with authoritative read-back', () => {
  const source = readFileSync(apiWorkspacePath, 'utf8')

  assert.match(source, /Complete Correspondence/)
  assert.match(source, /File Correspondence/)
  assert.match(source, /Completing\.\.\./)
  assert.match(source, /Filing\.\.\./)
  assert.match(source, /correspondenceService\.completeCorrespondence/)
  assert.match(source, /correspondenceService\.fileCorrespondence/)
  assert.match(source, /refreshDetailAndMovements/)
  assert.match(source, /correspondenceService\.getCorrespondenceById/)
  assert.match(source, /correspondenceService\.listCorrespondenceMovements/)
  assert.doesNotMatch(source, /status:\s*'Completed'/)
  assert.doesNotMatch(source, /status:\s*'Filed'/)
})

test('correspondence detail page now delegates directly to the api workspace', () => {
  const source = readFileSync(detailPagePath, 'utf8')

  assert.match(source, /ApiCorrespondenceDetailWorkspace/)
  assert.equal(source.includes('useCorrespondence'), false)
  assert.equal(source.includes('Complete Correspondence'), false)
})
