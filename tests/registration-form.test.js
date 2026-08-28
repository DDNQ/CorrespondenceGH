import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRegistrationFormValues,
  getApiRegistrationDateDefaults,
  getRegistrationDirectionFieldOptions,
  shouldShowExternalReferenceField,
} from '../src/utils/registrationForm.js'

test('registration defaults use the current runtime date instead of stale fixture dates', () => {
  const frozenDate = new Date('2026-08-22T10:15:00')
  const apiDates = getApiRegistrationDateDefaults(frozenDate)
  const formValues = buildRegistrationFormValues(frozenDate)

  assert.equal(apiDates.documentDate, '2026-08-22')
  assert.equal(apiDates.dateReceived, '2026-08-22')
  assert.equal(apiDates.stageDeadline, '')
  assert.equal(apiDates.overallCompletionDate, '')
  assert.equal(formValues.documentDate, '2026-08-22')
  assert.equal(formValues.dateReceived, '2026-08-22')
  assert.equal(formValues.stageDeadline, '')
  assert.equal(formValues.overallCompletionDate, '')
})

test('registration options expose only supported production fields and directions', () => {
  assert.deepEqual(getRegistrationDirectionFieldOptions(), ['Incoming', 'Internal'])
  assert.equal(shouldShowExternalReferenceField(), false)
})
