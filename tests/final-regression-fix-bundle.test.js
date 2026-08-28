import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { USER_ROLES, canAccessOfficeReports } from '../src/constants/roles.js'
import { getJourneyAuditPresentation } from '../src/utils/correspondenceDetailPresentation.js'
import { getCorrespondenceActionPermissions } from '../src/utils/correspondencePermissions.js'

const detailWorkspacePath = path.resolve(
  'src/components/correspondence/ApiCorrespondenceDetailWorkspace.jsx',
)
const analyticsWorkspacePath = path.resolve('src/components/reports/ApiAnalyticsWorkspace.jsx')
const dashboardWorkspacePath = path.resolve(
  'src/components/dashboard/ApiOfficeDashboardWorkspace.jsx',
)
const statCardPath = path.resolve('src/components/common/StatCard.jsx')
const appPagesCssPath = path.resolve('src/styles/app-pages.css')

test('admin settings access does not restore office workflow actions or reports access', () => {
  const adminPermissions = getCorrespondenceActionPermissions({
    record: {
      id: 'corr-admin-readonly-001',
      referenceNumber: 'MRH/CON/2026/0099',
      currentOffice: { id: 'office-legal', name: 'Legal Directorate' },
      status: 'In Progress',
      currentStage: 'Director review',
      deadline: '2026-08-28T12:00:00.000Z',
    },
    user: {
      role: USER_ROLES.ADMIN,
      office: null,
    },
  })

  assert.equal(canAccessOfficeReports({ role: USER_ROLES.ADMIN }), false)
  assert.equal(adminPermissions.canUpdateStage, false)
  assert.equal(adminPermissions.canForward, false)
  assert.equal(adminPermissions.canMarkCompleted, false)
  assert.equal(adminPermissions.canFile, false)
  assert.equal(adminPermissions.canAddNote, false)
  assert.equal(adminPermissions.canAddAttachment, false)
  assert.match(adminPermissions.reason, /read-only correspondence oversight/i)
})

test('attachment movement presentation removes duplicated uploaded prefixes safely', () => {
  assert.deepEqual(
    getJourneyAuditPresentation({
      action: 'attachment_uploaded',
      note: 'Uploaded: filename.pdf',
    }),
    {
      title: 'Attachment uploaded',
      description: 'Attachment uploaded: filename.pdf.',
    },
  )
})

test('attachment detail workspace applies stable attachment column classes for alignment', () => {
  const source = readFileSync(detailWorkspacePath, 'utf8')

  assert.ok(source.includes('detail-attachment-col detail-attachment-col--filename'))
  assert.ok(source.includes('detail-attachment-col detail-attachment-col--type'))
  assert.ok(source.includes('detail-attachment-col detail-attachment-col--uploaded-by'))
  assert.ok(source.includes('detail-attachment-col detail-attachment-col--size'))
  assert.ok(source.includes('detail-attachment-col detail-attachment-col--uploaded-at'))
  assert.ok(source.includes('detail-attachment-col detail-attachment-col--actions'))
})

test('staff contribution workspace applies content-aware identity and numeric column classes', () => {
  const source = readFileSync(analyticsWorkspacePath, 'utf8')
  const cssSource = readFileSync(appPagesCssPath, 'utf8')

  assert.ok(source.includes('<colgroup>'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--member'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--email'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--registered'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--stage-updates'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--forwarded'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--completed'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--filed'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--notes'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--attachments'))
  assert.ok(source.includes('staff-contribution-col staff-contribution-col--total-actions'))
  assert.ok(source.includes('className="staff-contribution-col staff-contribution-col--attachments" data-label="Attachments"'))
  assert.ok(source.includes('className="staff-contribution-col staff-contribution-col--total-actions" data-label="Total Actions"'))
  assert.equal(cssSource.includes('.report-table--staff td:nth-child(n + 2)'), false)
  assert.ok(cssSource.includes('.staff-contribution-table col.staff-contribution-col--email {'))
  assert.ok(cssSource.includes('.staff-contribution-table thead .staff-contribution-col--email,'))
  assert.ok(cssSource.includes('.staff-contribution-table tbody .staff-contribution-col--email {'))
  assert.ok(cssSource.includes('.staff-contribution-table thead .staff-contribution-col--total-actions,'))
  assert.ok(cssSource.includes('.staff-contribution-table tbody .staff-contribution-col--total-actions {'))
  assert.equal(cssSource.includes('.report-table--staff td:last-child'), false)
})

test('office dashboard uses presentation-only duration classes for oversized average-time values', () => {
  const dashboardWorkspaceSource = readFileSync(dashboardWorkspacePath, 'utf8')
  const statCardSource = readFileSync(statCardPath, 'utf8')

  assert.ok(dashboardWorkspaceSource.includes("className={\n              stat.title === 'Average Time in Office'"))
  assert.ok(dashboardWorkspaceSource.includes("valueClassName={\n              stat.title === 'Average Time in Office'"))
  assert.ok(dashboardWorkspaceSource.includes('office-position-summary__value--duration'))
  assert.ok(statCardSource.includes("function StatCard({ title, value, description, tone = 'default', className = '', valueClassName = '' })"))
})
