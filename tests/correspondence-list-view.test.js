import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSearchParamsForScope,
  buildSearchParamsForSidebarFilter,
  getCorrespondenceSidebarFilter,
  getCorrespondenceSidebarFilters,
  resolveCorrespondenceListView,
} from '../src/utils/correspondenceListView.js'

test('sidebar filter definitions map user-facing categories to canonical scope and status query state', () => {
  const filters = getCorrespondenceSidebarFilters()

  assert.equal(filters.length, 9)
  assert.deepEqual(getCorrespondenceSidebarFilter('received'), {
    id: 'received',
    label: 'Received',
    scope: 'received',
    statusParam: 'received',
    title: 'Received Correspondence',
    localStatusLabel: null,
  })
  assert.deepEqual(getCorrespondenceSidebarFilter('completed'), {
    id: 'completed',
    label: 'Completed',
    scope: 'handled',
    statusParam: 'completed',
    title: 'Completed Correspondence',
    localStatusLabel: 'Completed',
  })
})

test('sidebar filter URLs preserve status-scope distinction for API and mock list behavior', () => {
  assert.equal(
    buildSearchParamsForSidebarFilter('all').toString(),
    'scope=current&status=all',
  )
  assert.equal(
    buildSearchParamsForSidebarFilter('received').toString(),
    'scope=received&status=received',
  )
  assert.equal(
    buildSearchParamsForSidebarFilter('forwarded').toString(),
    'scope=forwarded&status=forwarded',
  )
  assert.equal(
    buildSearchParamsForSidebarFilter('completed').toString(),
    'scope=handled&status=completed',
  )
  assert.equal(
    buildSearchParamsForSidebarFilter('filed').toString(),
    'scope=handled&status=filed',
  )
})

test('scope switching keeps correspondence list queries coherent across top tabs and sidebar states', () => {
  assert.equal(
    buildSearchParamsForScope('received', 'scope=current&status=registered').toString(),
    'scope=received&status=received',
  )
  assert.equal(
    buildSearchParamsForScope('forwarded', 'scope=current&status=awaiting-action').toString(),
    'scope=forwarded&status=forwarded',
  )
  assert.equal(
    buildSearchParamsForScope('current', 'scope=received&status=received').toString(),
    'scope=current&status=all',
  )
  assert.equal(
    buildSearchParamsForScope('handled', 'scope=current&status=completed').toString(),
    'scope=handled&status=completed',
  )
  assert.equal(
    buildSearchParamsForScope('handled', 'scope=current&status=registered').toString(),
    'scope=handled',
  )
})

test('resolved correspondence list view canonicalizes direct URLs and preserves deep-linkable sidebar state', () => {
  const receivedView = resolveCorrespondenceListView('scope=received')
  const completedView = resolveCorrespondenceListView('scope=handled&status=completed')
  const mismatchedView = resolveCorrespondenceListView('scope=handled&status=registered')
  const currentView = resolveCorrespondenceListView('')

  assert.equal(receivedView.activeScope, 'received')
  assert.equal(receivedView.activeFilterId, 'received')
  assert.equal(receivedView.pageTitle, 'Received Correspondence')
  assert.equal(receivedView.localStatusLabel, null)
  assert.equal(receivedView.canonicalSearchParams.toString(), 'scope=received&status=received')

  assert.equal(completedView.activeScope, 'handled')
  assert.equal(completedView.activeFilterId, 'completed')
  assert.equal(completedView.localStatusLabel, 'Completed')

  assert.equal(mismatchedView.activeScope, 'handled')
  assert.equal(mismatchedView.activeFilterId, null)
  assert.equal(mismatchedView.pageTitle, 'Handled Correspondence')
  assert.equal(mismatchedView.canonicalSearchParams.toString(), 'scope=handled')

  assert.equal(currentView.activeScope, 'current')
  assert.equal(currentView.activeFilterId, 'all')
  assert.equal(currentView.pageTitle, 'All Correspondence')
  assert.equal(currentView.canonicalSearchParams.toString(), 'scope=current&status=all')
})
