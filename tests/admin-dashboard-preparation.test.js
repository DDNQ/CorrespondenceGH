import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { normalizeAdminDashboardResponse } from '../src/services/api/dashboardApi.js'
import { buildMockAdminDashboardSummary } from '../src/services/mock/mockDashboardService.js'
import {
  getAdminDashboardActivityDescription,
  getAdminDashboardActivityOffice,
  getAdminDashboardActivityRecordedBy,
  getAdminDashboardActivityReference,
  getAdminDashboardActivityRoute,
  getAdminDashboardActivityTimeLabel,
  getAdminDashboardActivityTitle,
} from '../src/utils/adminDashboard.js'
import { buildSystemAccessSummary } from '../src/utils/adminUsersOffices.js'

const workspaceComponentPath = path.resolve(
  'src/components/admin/ApiAdminDashboardWorkspace.jsx',
)
const pagePath = path.resolve('src/pages/admin/AdminDashboardPage.jsx')
const dashboardWorkspacePath = path.resolve(
  'src/components/admin/AdminDashboardWorkspace.jsx',
)

test('admin dashboard api normalizer preserves a conservative contract when live keys are limited', () => {
  const normalized = normalizeAdminDashboardResponse({
    counts_bucket: { total_records: 10 },
    office_rollup: [{ office_uuid: 'office-legal', total: 4 }],
    activity_feed: [{ action: 'registered' }],
  })

  assert.equal(normalized.summary.activeCorrespondence, null)
  assert.equal(normalized.summary.activeUsers, null)
  assert.deepEqual(normalized.officeBreakdown, [])
  assert.deepEqual(normalized.recentActivity, [])
  assert.equal(normalized.availability.officeBreakdown, false)
  assert.equal(normalized.availability.recentActivity, false)
  assert.deepEqual(normalized.contractDiagnostics.safeTopLevelKeys, [
    'activity_feed',
    'counts_bucket',
    'office_rollup',
  ])
})

test('admin dashboard api normalizer preserves supported live admin summary fields without blanking unrelated sections', () => {
  const normalized = normalizeAdminDashboardResponse({
    active_count: 18,
    overdue_count: 4,
    user_count: 12,
    by_office: [
      {
        office_id: 'office-legal',
        office_name: 'Legal Directorate',
        office_code: 'LEG',
        active_count: 8,
        overdue_count: 2,
        user_count: 5,
      },
    ],
    recent_activity: [
      {
        id: 'activity-1',
        title: 'Correspondence Registered',
        actor_name: 'Kwesi Boateng',
        actor_role: 'Office Supervisor',
        office_name: 'Legal Directorate',
        reference_number: 'CIT-2026-0001',
        description: 'Registered correspondence for review.',
        time_label: '23 Aug 2026, 10:00 AM',
        correspondence_id: 'corr-001',
      },
    ],
  })

  assert.equal(normalized.summary.activeCorrespondence, 18)
  assert.equal(normalized.summary.overdue, 4)
  assert.equal(normalized.summary.activeUsers, 12)
  assert.equal(normalized.summary.dueSoon, null)
  assert.equal(normalized.summary.activeOffices, 1)
  assert.equal(normalized.officeBreakdown.length, 1)
  assert.equal(normalized.officeBreakdown[0].officeName, 'Legal Directorate')
  assert.equal(normalized.officeBreakdown[0].activeCorrespondence, 8)
  assert.equal(normalized.recentActivity.length, 1)
  assert.equal(normalized.recentActivity[0].correspondenceReference, 'CIT-2026-0001')
  assert.equal(normalized.recentActivity[0].routeTarget, 'corr-001')
  assert.equal(normalized.availability.officeBreakdown, true)
  assert.equal(normalized.availability.recentActivity, true)
})

test('admin dashboard api normalizer maps verified live office and activity fields for presentation', () => {
  const normalized = normalizeAdminDashboardResponse({
    active_count: 17,
    overdue_count: 8,
    user_count: 4,
    by_office: [
      {
        current_office__name: 'Correspondence Integration Test Office',
        total: 17,
        active: 15,
        overdue: 8,
      },
      {
        current_office__name: 'testFINACIAL OFFICE',
        total: 2,
        active: 2,
        overdue: 0,
      },
    ],
    recent_activity: [
      {
        id: 'activity-1',
        action_type: 'attachment added',
        actor_email: 'admin@mrh.gov.gh',
        note: 'Supporting document uploaded for review.',
        timestamp: '2026-08-23T11:45:00.000Z',
      },
      {
        id: 'activity-2',
        action_type: 'current stage updated',
        actor_email: 'supervisor@mrh.gov.gh',
        previous_stage: 'Initial classification',
        new_stage: 'Director review',
        timestamp: '2026-08-23T10:00:00.000Z',
      },
      {
        id: 'activity-3',
        action_type: 'forwarded',
        actor_email: 'records@mrh.gov.gh',
        to_office_name: 'Legal Directorate',
        timestamp: '2026-08-23T09:30:00.000Z',
      },
      {
        id: 'activity-4',
        action_type: 'completed',
        actor_email: 'office.user@mrh.gov.gh',
        timestamp: '2026-08-23T09:00:00.000Z',
      },
      {
        id: 'activity-5',
        action_type: 'receipt acknowledged',
        actor_email: 'registry@mrh.gov.gh',
        to_office_name: 'Central Registry',
        timestamp: '2026-08-23T08:45:00.000Z',
      },
      {
        id: 'activity-6',
        action_type: 'correspondence updated',
        actor_email: 'admin2@mrh.gov.gh',
        timestamp: '2026-08-23T08:30:00.000Z',
      },
    ],
  })

  assert.equal(normalized.summary.activeCorrespondence, 17)
  assert.equal(normalized.summary.overdue, 8)
  assert.equal(normalized.summary.activeUsers, 4)
  assert.equal(normalized.summary.activeOffices, 2)
  assert.equal(normalized.officeBreakdown[0].officeName, 'Correspondence Integration Test Office')
  assert.equal(normalized.officeBreakdown[0].activeCorrespondence, 15)
  assert.equal(normalized.officeBreakdown[0].overdue, 8)
  assert.equal(normalized.officeBreakdown[0].totalCorrespondence, 17)
  assert.equal(normalized.recentActivity.length, 5)
  assert.equal(normalized.recentActivity[0].actorEmail, 'admin@mrh.gov.gh')
  assert.equal(
    getAdminDashboardActivityTitle(normalized.recentActivity[0]),
    'Attachment Uploaded',
  )
  assert.equal(
    getAdminDashboardActivityDescription(normalized.recentActivity[0]),
    'Supporting document uploaded for review.',
  )
  assert.equal(
    getAdminDashboardActivityRecordedBy(normalized.recentActivity[0]),
    'admin@mrh.gov.gh',
  )
  assert.equal(
    getAdminDashboardActivityTimeLabel(normalized.recentActivity[0]),
    '23 Aug 2026, 11:45',
  )
  assert.equal(
    getAdminDashboardActivityDescription(normalized.recentActivity[1]),
    'Stage updated from Initial classification to Director review.',
  )
  assert.equal(
    getAdminDashboardActivityOffice(normalized.recentActivity[2]),
    'Legal Directorate',
  )
  assert.equal(
    getAdminDashboardActivityDescription(normalized.recentActivity[2]),
    'Forwarded to Legal Directorate.',
  )
  assert.equal(normalized.recentActivity.some((activity) => activity.actorRole), false)
  assert.equal(normalized.recentActivity.some((activity) => activity.timeLabel.includes('T')), false)
})

test('admin dashboard api normalizer rejects non-object responses safely', () => {
  assert.throws(
    () => normalizeAdminDashboardResponse(['unexpected']),
    (error) =>
      error?.code === 'API_CONTRACT_MISMATCH' &&
      error?.operation === 'dashboard.adminSummary' &&
      error?.receivedTopLevelType === 'array',
  )
})

test('mock admin dashboard summary exposes recent activity and routes correspondence items without UUID leakage', () => {
  const summary = buildMockAdminDashboardSummary()

  assert.equal(summary.summary.activeCorrespondence > 0, true)
  assert.equal(summary.officeBreakdown.length > 0, true)
  assert.equal(summary.recentActivity.length > 0, true)

  const correspondenceActivity = summary.recentActivity.find(
    (activity) => activity.correspondenceReference,
  )
  const securityActivity = summary.recentActivity.find(
    (activity) => !activity.correspondenceReference,
  )

  assert.ok(correspondenceActivity)
  assert.equal(
    getAdminDashboardActivityReference(correspondenceActivity).startsWith('MRH/'),
    true,
  )
  assert.equal(
    getAdminDashboardActivityRoute(correspondenceActivity)?.startsWith('/correspondence/MRH%2F'),
    true,
  )
  assert.equal(
    getAdminDashboardActivityReference(correspondenceActivity).includes('mock-correspondence'),
    false,
  )
  assert.equal(getAdminDashboardActivityRoute(securityActivity), null)
})

test('api admin dashboard workspace remains service-driven and avoids mock fallbacks', () => {
  const source = readFileSync(workspaceComponentPath, 'utf8')

  assert.ok(source.includes('getServiceBundle()'))
  assert.ok(source.includes('serviceBundle.dashboards'))
  assert.ok(source.includes('getAdminDashboardSummary'))
  assert.ok(source.includes('listUsers'))
  assert.ok(source.includes('listOffices'))
  assert.ok(source.includes('Navigate to="/access-denied"'))
  assert.equal(source.includes('getAuditLogs'), false)
  assert.equal(source.includes('useCorrespondence'), false)
  assert.equal(source.includes("from '../../data/offices"), false)
  assert.equal(source.includes('buildMockAdminDashboardSummary'), false)
})

test('admin dashboard page now delegates directly to the api workspace', () => {
  const source = readFileSync(pagePath, 'utf8')

  assert.ok(source.includes('ApiAdminDashboardWorkspace'))
  assert.equal(source.includes("if (activeSource === 'api')"), false)
  assert.equal(source.includes('buildMockAdminDashboardSummary'), false)
  assert.equal(source.includes('getAuditLogs'), false)
})

test('admin dashboard system access summary keeps directory active-office count distinct from by-office coverage', () => {
  const rows = buildSystemAccessSummary({
    users: [],
    offices: [
      { id: 'office-legal', name: 'Legal Directorate', status: 'Active' },
      { id: 'office-finance', name: 'Finance Directorate', status: 'Inactive' },
      { id: 'office-ict', name: 'ICT Directorate', status: 'Active' },
      { id: 'office-registry', name: 'Central Registry', status: 'Active' },
    ],
    adminSummary: {
      summary: {
        activeOffices: 2,
      },
    },
  })

  assert.equal(rows.find((row) => row.label === 'Active Offices')?.value, 3)
})

test('admin dashboard activity titles cover supported production action types with a safe fallback', () => {
  assert.equal(getAdminDashboardActivityTitle({ actionType: 'registered' }), 'Correspondence Registered')
  assert.equal(getAdminDashboardActivityTitle({ actionType: 'attachment uploaded' }), 'Attachment Uploaded')
  assert.equal(getAdminDashboardActivityTitle({ actionType: 'stage updated' }), 'Stage Updated')
  assert.equal(getAdminDashboardActivityTitle({ actionType: 'forwarded' }), 'Forwarded')
  assert.equal(getAdminDashboardActivityTitle({ actionType: 'note added' }), 'Note Added')
  assert.equal(getAdminDashboardActivityTitle({ actionType: 'completed' }), 'Correspondence Completed')
  assert.equal(getAdminDashboardActivityTitle({ actionType: 'filed' }), 'Correspondence Filed')
  assert.equal(getAdminDashboardActivityTitle({ actionType: 'something-else' }), 'Recent activity')
})

test('admin dashboard workspace keeps recent activity in the main column and omits unsupported role placeholders', () => {
  const source = readFileSync(dashboardWorkspacePath, 'utf8')

  assert.ok(source.includes('className="admin-dashboard-main"'))
  assert.ok(source.includes('title="Recent System Activity"'))
  assert.ok(source.includes('<span className="data-label">Office</span>'))
  assert.equal(source.includes('<span className="data-label">Role</span>'), false)
  assert.equal(source.includes("Office: Not available"), false)
  assert.ok(source.includes('<span className="data-label">Total</span>'))
  assert.equal(source.includes('System-wide oversight of users, offices, correspondence activity, and security records.'), false)
  assert.equal(source.includes('Latest accountable actions across the system.'), false)
  assert.equal(source.includes('Current account status overview.'), false)
  assert.equal(source.includes('Across authorised offices'), false)
  assert.equal(source.includes('From the office directory'), false)
  assert.equal(source.includes("label: 'Due Soon'"), false)
  assert.equal(source.includes('Review Audit Log'), false)
  assert.equal(source.includes('View All'), false)
  assert.ok(source.includes("label: 'Active Correspondence'"))
  assert.ok(source.includes("label: 'Overdue'"))
  assert.ok(source.includes("label: 'Active Users'"))
  assert.ok(source.includes("label: 'Active Offices'"))
  assert.ok(source.includes('Manage Users &amp; Offices'))
  assert.ok(source.includes('Review Overdue Correspondence'))
})
