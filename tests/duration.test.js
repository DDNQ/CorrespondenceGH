import test from 'node:test'
import assert from 'node:assert/strict'

import { formatDuration, formatOverdueDuration } from '../src/utils/duration.js'

test('duration formatter applies the centralized boundary rules for minutes, hours, days, and weeks', () => {
  assert.equal(formatDuration(0), '0 mins')
  assert.equal(formatDuration(59), '59 mins')
  assert.equal(formatDuration(60), '1 hr')
  assert.equal(formatDuration(119), '1 hr')
  assert.equal(formatDuration(24, { inputUnit: 'hours' }), '1 day')
  assert.equal(formatDuration((3 * 24 * 60) + (22 * 60) + 31), '3 days 22 hrs')
  assert.equal(formatDuration(7, { inputUnit: 'days' }), '1 week')
  assert.equal(
    formatDuration((2 * 7 * 24 * 60) + (3 * 24 * 60) + (7 * 60) + 49),
    '2 weeks 3 days 7 hrs',
  )
})

test('duration formatter truncates fractional spillover instead of rounding hours upward', () => {
  assert.equal(formatDuration(220, { inputUnit: 'hours' }), '1 week 2 days 4 hrs')
  assert.equal(
    formatDuration('2 weeks', { inputUnit: 'hours' }),
    '2 weeks',
  )
  assert.equal(
    formatDuration((1 * 24 * 60) + (5 * 60) + 16),
    '1 day 5 hrs',
  )
  assert.equal(
    formatDuration((5 * 60) + 48),
    '5 hrs',
  )
  assert.equal(
    formatDuration(60.9),
    '1 hr',
  )
  assert.equal(
    formatDuration('90 mins'),
    '1 hr',
  )
})

test('duration formatter handles overdue and invalid values safely', () => {
  assert.equal(formatOverdueDuration(-28, { inputUnit: 'hours' }), '1 day 4 hrs overdue')
  assert.equal(formatOverdueDuration('-90 mins'), '1 hr overdue')
  assert.equal(formatDuration(null), null)
  assert.equal(formatDuration(undefined), null)
  assert.equal(formatDuration('invalid'), null)
  assert.equal(formatDuration(-5), null)
  assert.equal(formatOverdueDuration(null), null)
})
