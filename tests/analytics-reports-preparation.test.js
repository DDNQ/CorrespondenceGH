import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getApiApplicationReadiness } from '../src/config/apiApplicationReadiness.js'
import {
  formatAnalyticsAverageTurnaroundHours,
  normalizeOfficeAnalyticsSummaryResponse,
  normalizeOfficeBacklogResponse,
  normalizeOfficeStaffContributionResponse,
  normalizeOfficeTrendsResponse,
  resolveAnalyticsOfficeContext,
  resolveAnalyticsSummaryDateRange,
} from '../src/utils/analyticsReports.js'

const reportsPagePath = new URL('../src/pages/supervisor/OfficeReportsPage.jsx', import.meta.url)
const filtersPath = new URL('../src/components/reports/ReportFilters.jsx', import.meta.url)

test('analytics readiness flags reflect the live supervisor reporting integration', () => {
  const readiness = getApiApplicationReadiness()

  assert.equal(readiness.analyticsReports.summaryLiveVerified, true)
  assert.equal(readiness.analyticsReports.staffContributionLiveVerified, true)
  assert.equal(readiness.analyticsReports.backlogLiveVerified, true)
  assert.equal(readiness.analyticsReports.trendsLiveVerified, true)
})

test('analytics summary date range validation only allows complete valid custom ranges', () => {
  assert.deepEqual(resolveAnalyticsSummaryDateRange({ period: 'This Month' }), {
    valid: true,
    usesCustomRange: false,
    start: '',
    end: '',
    error: '',
  })

  assert.deepEqual(
    resolveAnalyticsSummaryDateRange({
      period: 'Custom Range',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    }),
    {
      valid: true,
      usesCustomRange: true,
      start: '2026-08-01',
      end: '2026-08-31',
      error: '',
    },
  )

  assert.equal(
    resolveAnalyticsSummaryDateRange({
      period: 'Custom Range',
      startDate: '2026-08-01',
      endDate: '',
    }).error,
    'Select both a start date and an end date.',
  )

  assert.equal(
    resolveAnalyticsSummaryDateRange({
      period: 'Custom Range',
      startDate: '2026-08-31',
      endDate: '2026-08-01',
    }).error,
    'The end date cannot be earlier than the start date.',
  )
})

test('summary normalization preserves zero values and backend-provided status/type breakdowns', () => {
  const normalized = normalizeOfficeAnalyticsSummaryResponse({
    summary: {
      received: 0,
      completed: 0,
      pending: 2,
      average_turnaround_days: 0,
    },
    by_status: {
      'In Progress': 2,
      Completed: 0,
    },
    by_type: {
      Letter: 1,
      Memo: 1,
    },
  })

  assert.equal(normalized.highlightMetrics.find((item) => item.key === 'received')?.value, 0)
  assert.equal(
    normalized.highlightMetrics.find((item) => item.key === 'averageTurnaround')?.value,
    0,
  )
  assert.deepEqual(normalized.statusBreakdown, [
    { label: 'In Progress', count: 2 },
    { label: 'Completed', count: 0 },
  ])
  assert.deepEqual(normalized.typeBreakdown, [
    { label: 'Letter', count: 1 },
    { label: 'Memo', count: 1 },
  ])
})

test('summary normalization supports live avg_turnaround_hours responses', () => {
  const normalized = normalizeOfficeAnalyticsSummaryResponse({
    total: 6,
    by_status: {
      Completed: 4,
    },
    by_type: {
      Letter: 6,
    },
    avg_turnaround_hours: 18.5,
  })

  assert.equal(normalized.highlightMetrics.find((item) => item.key === 'received')?.value, 6)
  assert.equal(
    normalized.highlightMetrics.find((item) => item.key === 'averageTurnaround')?.value,
    18.5,
  )
  assert.equal(
    normalized.highlightMetrics.find((item) => item.key === 'averageTurnaround')?.displayValue,
    '18 hrs',
  )
  assert.equal(normalized.averageTurnaround, 18.5)
})

test('average turnaround formatter handles unavailable, zero, positive, and large values cleanly', () => {
  assert.equal(formatAnalyticsAverageTurnaroundHours(null), 'Unavailable')
  assert.equal(formatAnalyticsAverageTurnaroundHours(undefined), 'Unavailable')
  assert.equal(formatAnalyticsAverageTurnaroundHours('not-a-number'), 'Unavailable')
  assert.equal(formatAnalyticsAverageTurnaroundHours(-2), 'Unavailable')
  assert.equal(formatAnalyticsAverageTurnaroundHours(0), '0 mins')
  assert.equal(formatAnalyticsAverageTurnaroundHours(1), '1 hr')
  assert.equal(formatAnalyticsAverageTurnaroundHours(12), '12 hrs')
  assert.equal(formatAnalyticsAverageTurnaroundHours(12.5), '12 hrs')
  assert.equal(formatAnalyticsAverageTurnaroundHours(4654.200087), '27 weeks 4 days 22 hrs')
})

test('summary normalization keeps the average turnaround metric visible when the backend value is unavailable', () => {
  const nullValue = normalizeOfficeAnalyticsSummaryResponse({
    total: 4,
    avg_turnaround_hours: null,
  })
  const missingValue = normalizeOfficeAnalyticsSummaryResponse({
    total: 4,
  })
  const negativeValue = normalizeOfficeAnalyticsSummaryResponse({
    total: 4,
    avg_turnaround_hours: -8,
  })

  assert.equal(
    nullValue.highlightMetrics.find((item) => item.key === 'averageTurnaround')?.displayValue,
    'Unavailable',
  )
  assert.equal(
    missingValue.highlightMetrics.find((item) => item.key === 'averageTurnaround')?.displayValue,
    'Unavailable',
  )
  assert.equal(
    negativeValue.highlightMetrics.find((item) => item.key === 'averageTurnaround')?.displayValue,
    'Unavailable',
  )
})

test('staff contribution normalization tolerates missing identity fields and derives totals safely', () => {
  const normalized = normalizeOfficeStaffContributionResponse({
    items: [
      {
        user_name: 'Kwesi Boateng',
        registered: 1,
        stage_updates: 2,
        forwarded: 1,
        completed: 0,
        filed: 0,
        notes_added: 3,
        attachments_uploaded: 1,
      },
      {
        email: 'staff.two@legal.mrh.gov.gh',
        total_actions: 4,
      },
    ],
  })

  assert.equal(normalized.contributors[0].userName, 'Kwesi Boateng')
  assert.equal(normalized.contributors[0].totalActions, 8)
  assert.equal(normalized.contributors[1].userEmail, 'staff.two@legal.mrh.gov.gh')
  assert.equal(normalized.contributors[1].userName, 'Not available')
  assert.equal(normalized.contributors[1].totalActions, 4)
})

test('backlog normalization preserves documented bands and open-ended ranges', () => {
  const normalized = normalizeOfficeBacklogResponse({
    bands: [
      {
        key: '0-2_days',
        label: '0-2 days',
        min_days: 0,
        max_days: 2,
        count: 3,
      },
      {
        key: '8-plus',
        label: '8+ days',
        min_days: 8,
        max_days: null,
        count: 1,
      },
    ],
    total_open: 4,
  })

  assert.equal(normalized.totalOpen, 4)
  assert.deepEqual(normalized.bands[0], {
    key: '0-2_days',
    label: '0-2 days',
    minDays: 0,
    maxDays: 2,
    count: 3,
  })
  assert.equal(normalized.bands[1].maxDays, null)
})

test('trends normalization supports flat and nested backend-friendly shapes without guessing compare data', () => {
  const flat = normalizeOfficeTrendsResponse([
    { month: '2026-06', type: 'Letter', count: 4 },
    { month: '2026-06', type: 'Memo', count: 2 },
    { month: '2026-07', type: 'Letter', count: 5 },
  ])

  assert.equal(flat.periods.length, 2)
  assert.equal(flat.periods[0].label, '2026-06')
  assert.equal(flat.periods[0].values[0].type, 'Letter')

  const nested = normalizeOfficeTrendsResponse({
    results: [
      {
        period_label: 'July 2026',
        by_type: {
          Letter: 3,
          Contract: 1,
        },
      },
    ],
  })

  assert.equal(nested.periods.length, 1)
  assert.equal(nested.periods[0].label, 'July 2026')
  assert.deepEqual(nested.periods[0].values[1], { type: 'Contract', count: 1 })

  const liveFlat = normalizeOfficeTrendsResponse([
    { year: 2026, month: 7, type: 'Letter', count: 3 },
    { year: 2026, month: 7, type: 'Memo', count: 1 },
    { year: 2026, month: 8, type: 'Letter', count: 2 },
  ])

  assert.equal(liveFlat.periods.length, 2)
  assert.equal(liveFlat.periods[0].label, '2026-07')
  assert.deepEqual(liveFlat.periods[0].values[1], { type: 'Memo', count: 1 })
})

test('analytics office context uses only the canonical authenticated office id and never guesses from office name', () => {
  const resolved = resolveAnalyticsOfficeContext(
    { office: { id: 'office-legal', name: 'Legal Directorate' } },
    null,
  )
  const unresolved = resolveAnalyticsOfficeContext(
    { office: { name: 'Legal Directorate' } },
    null,
  )

  assert.equal(resolved.officeId, 'office-legal')
  assert.equal(unresolved.officeId, null)
  assert.equal(unresolved.officeName, 'Legal Directorate')
})

test('reports analytics source contains no office selector override and stays on the api workspaces', () => {
  const reportsPageSource = readFileSync(reportsPagePath, 'utf8')
  const filtersSource = readFileSync(filtersPath, 'utf8')

  assert.equal(reportsPageSource.includes("searchParams.get('office')"), false)
  assert.equal(reportsPageSource.includes('Compare Offices'), false)
  assert.equal(reportsPageSource.includes('/reports/compare/'), false)
  assert.ok(reportsPageSource.includes('ApiAnalyticsWorkspace'))
  assert.ok(reportsPageSource.includes('FormalReportsWorkspace'))
  assert.ok(filtersSource.includes('<input id="report-office" value={officeName} readOnly'))
  assert.equal(filtersSource.includes('<select id="report-office"'), false)
})
