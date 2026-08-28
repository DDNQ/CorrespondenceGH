import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const adminDashboardPath = path.resolve('src/components/admin/AdminDashboardWorkspace.jsx')
const correspondenceListPath = path.resolve(
  'src/components/correspondence/ApiCorrespondenceListWorkspace.jsx',
)
const correspondenceDetailPath = path.resolve(
  'src/components/correspondence/ApiCorrespondenceDetailWorkspace.jsx',
)
const correspondenceListViewPath = path.resolve('src/utils/correspondenceListView.js')
const registerPagePath = path.resolve('src/pages/office/RegisterCorrespondencePage.jsx')
const registrationPresentationPath = path.resolve('src/utils/registrationPresentation.js')
const analyticsWorkspacePath = path.resolve('src/components/reports/ApiAnalyticsWorkspace.jsx')
const reportHistoryPath = path.resolve(
  'src/components/reports/formal/FormalReportHistoryWorkspace.jsx',
)
const correspondenceReadStatesPath = path.resolve(
  'src/components/correspondence/CorrespondenceApiReadStates.jsx',
)
const emptyStatePath = path.resolve('src/components/common/EmptyState.jsx')

test('production copy cleanup removes redundant subtitles and helper sentences from key workspaces', () => {
  const correspondenceListSource = readFileSync(correspondenceListPath, 'utf8')
  const correspondenceListViewSource = readFileSync(correspondenceListViewPath, 'utf8')
  const registerPageSource = readFileSync(registerPagePath, 'utf8')
  const registrationPresentationSource = readFileSync(registrationPresentationPath, 'utf8')
  const correspondenceDetailSource = readFileSync(correspondenceDetailPath, 'utf8')
  const adminDashboardSource = readFileSync(adminDashboardPath, 'utf8')
  const analyticsWorkspaceSource = readFileSync(analyticsWorkspacePath, 'utf8')
  const reportHistorySource = readFileSync(reportHistoryPath, 'utf8')
  const correspondenceReadStatesSource = readFileSync(correspondenceReadStatesPath, 'utf8')
  const emptyStateSource = readFileSync(emptyStatePath, 'utf8')

  assert.equal(
    correspondenceListSource.includes('Review correspondence records available for system oversight.'),
    false,
  )
  assert.equal(
    correspondenceListSource.includes('Review correspondence records available to your office.'),
    false,
  )
  assert.equal(
    correspondenceListViewSource.includes('All correspondence records available under your current access.'),
    false,
  )
  assert.equal(registerPageSource.includes('Basic identifying information for the correspondence record.'), false)
  assert.equal(registerPageSource.includes('Record the required action and relevant administrative context.'), false)
  assert.equal(registerPageSource.includes('Summary of the record to be created.'), false)
  assert.equal(registrationPresentationSource.includes('Create a correspondence record for your office.'), false)
  assert.equal(
    registrationPresentationSource.includes('Set the receiving details and initial handling information.'),
    false,
  )
  assert.equal(
    correspondenceDetailSource.includes(
      'View the complete record, current office position, workflow journey and supporting information.',
    ),
    false,
  )
  assert.equal(
    correspondenceDetailSource.includes('Update the current stage for this correspondence.'),
    false,
  )
  assert.equal(
    correspondenceDetailSource.includes('Upload an attachment for this correspondence.'),
    false,
  )
  assert.equal(adminDashboardSource.includes('Create accounts, assign roles and offices, and control access.'), false)
  assert.equal(adminDashboardSource.includes('Inspect system-wide activity and security actions.'), false)
  assert.equal(adminDashboardSource.includes('Open overdue correspondence.'), false)
  assert.equal(analyticsWorkspaceSource.includes('Summary metrics for the selected office.'), false)
  assert.equal(analyticsWorkspaceSource.includes('Totals by correspondence status.'), false)
  assert.equal(analyticsWorkspaceSource.includes('Recorded staff activity for the selected office.'), false)
  assert.equal(reportHistorySource.includes('Select a previously generated report to view its details.'), false)
  assert.equal(
    correspondenceReadStatesSource.includes('No correspondence records were returned for this view.'),
    false,
  )
  assert.ok(correspondenceReadStatesSource.includes('title="No correspondence found"'))
  assert.ok(emptyStateSource.includes('{description ? <p>{description}</p> : null}'))
})
