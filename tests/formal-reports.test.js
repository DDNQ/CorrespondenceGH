import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getApiApplicationReadiness } from '../src/config/apiApplicationReadiness.js'
import { USER_ROLES, canAccessOfficeReports } from '../src/constants/roles.js'
import { getCorrespondenceRecords } from '../src/data/correspondence.js'
import { getUsers } from '../src/data/users.js'
import {
  generateFormalReportPreview,
  getOfficeReportWorkspace,
} from '../src/services/mock/mockReportService.js'
import {
  createSuggestedFormalReportFilename,
  formatFormalReportPeriodLabel,
  FORMAL_REPORT_PREVIEW_NOTICE,
  getCurrentFormalReportPeriodDefaults,
  getDefaultFormalReportConfig,
  mapStaffActionCategory,
  resolveFormalReportPeriod,
  validateFormalReportConfig,
} from '../src/utils/formalReports.js'

const stylesPath = new URL('../src/styles/app-pages.css', import.meta.url)
const previewComponentPath = new URL(
  '../src/components/reports/formal/FormalReportPreview.jsx',
  import.meta.url,
)
const workspaceComponentPath = new URL(
  '../src/components/reports/formal/FormalReportsWorkspace.jsx',
  import.meta.url,
)
const historyWorkspaceComponentPath = new URL(
  '../src/components/reports/formal/FormalReportHistoryWorkspace.jsx',
  import.meta.url,
)
const configurationComponentPath = new URL(
  '../src/components/reports/formal/FormalReportConfiguration.jsx',
  import.meta.url,
)
const printActionsComponentPath = new URL(
  '../src/components/reports/formal/FormalReportPrintActions.jsx',
  import.meta.url,
)
const emptyStateComponentPath = new URL(
  '../src/components/reports/formal/FormalReportEmptyState.jsx',
  import.meta.url,
)
const reportsPagePath = new URL(
  '../src/pages/supervisor/OfficeReportsPage.jsx',
  import.meta.url,
)

function getSupervisor() {
  return getUsers().find((user) => user.role === USER_ROLES.SUPERVISOR)
}

test('formal reports readiness reflects live report integration while preserving real backend limits elsewhere', () => {
  const readiness = getApiApplicationReadiness()

  assert.equal(readiness.formalReports.officePerformanceLiveVerified, true)
  assert.equal(readiness.formalReports.overdueLiveVerified, true)
  assert.equal(readiness.formalReports.pendingAgeingLiveVerified, true)
  assert.equal(readiness.formalReports.staffContributionLiveVerified, true)
  assert.equal(readiness.formalReports.previewLiveVerified, true)
  assert.equal(readiness.formalReports.generateLiveVerified, true)
  assert.equal(readiness.authenticatedApplicationReady, true)
})

test('office report access remains supervisor-only', () => {
  assert.equal(canAccessOfficeReports({ role: USER_ROLES.SUPERVISOR }), true)
  assert.equal(canAccessOfficeReports({ role: USER_ROLES.OFFICE_USER }), false)
  assert.equal(canAccessOfficeReports({ role: USER_ROLES.ADMIN }), false)
})

test('formal report period utilities validate monthly annual and custom ranges', () => {
  assert.deepEqual(
    resolveFormalReportPeriod({
      periodType: 'monthly',
      month: '07',
      year: '2026',
    }),
    {
      type: 'monthly',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      label: 'July 2026',
    },
  )

  assert.deepEqual(
    resolveFormalReportPeriod({
      periodType: 'monthly',
      month: '02',
      year: '2024',
    }),
    {
      type: 'monthly',
      startDate: '2024-02-01',
      endDate: '2024-02-29',
      label: 'February 2024',
    },
  )

  assert.deepEqual(
    resolveFormalReportPeriod({
      periodType: 'annual',
      year: '2026',
    }),
    {
      type: 'annual',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      label: '2026',
    },
  )

  assert.deepEqual(
    resolveFormalReportPeriod({
      periodType: 'custom',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    }),
    {
      type: 'custom',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      label: '1 July 2026 - 31 July 2026',
    },
  )
})

test('formal report configuration rejects invalid custom ranges', () => {
  const result = validateFormalReportConfig({
    reportType: 'office-performance',
    periodType: 'custom',
    startDate: '2026-07-31',
    endDate: '2026-07-01',
  })

  assert.equal(result.valid, false)
  assert.equal(result.errors.endDate, 'The end date cannot be earlier than the start date.')
})

test('formal report defaults use the current local month and year without hardcoded July 2026 values', () => {
  const supervisor = getSupervisor()
  const frozenDate = new Date('2026-08-22T10:15:00')

  assert.deepEqual(getCurrentFormalReportPeriodDefaults(frozenDate), {
    year: '2026',
    month: '08',
  })

  const config = getDefaultFormalReportConfig(supervisor, frozenDate)

  assert.equal(config.periodType, 'monthly')
  assert.equal(config.year, '2026')
  assert.equal(config.month, '08')
  assert.equal(config.officeName, 'Legal Directorate')
  assert.notEqual(config.month, '07')
})

test('formal report defaults remain overridable while annual and custom period behavior stays unchanged', () => {
  const manualAnnualSelection = {
    ...getDefaultFormalReportConfig(getSupervisor(), new Date('2026-08-22T10:15:00')),
    periodType: 'annual',
    year: '2025',
  }
  const manualCustomSelection = {
    ...getDefaultFormalReportConfig(getSupervisor(), new Date('2026-08-22T10:15:00')),
    periodType: 'custom',
    startDate: '2026-08-01',
    endDate: '2026-08-15',
  }

  assert.deepEqual(resolveFormalReportPeriod(manualAnnualSelection), {
    type: 'annual',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    label: '2025',
  })

  assert.deepEqual(resolveFormalReportPeriod(manualCustomSelection), {
    type: 'custom',
    startDate: '2026-08-01',
    endDate: '2026-08-15',
    label: '1 August 2026 - 15 August 2026',
  })
})

test('formal report period labels use live history fields safely', () => {
  assert.equal(
    formatFormalReportPeriodLabel({
      periodType: 'monthly',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    }),
    'August 2026',
  )

  assert.equal(
    formatFormalReportPeriodLabel({
      periodType: 'custom',
      startDate: '2026-08-05',
      endDate: '2026-08-20',
    }),
    '5 Aug 2026 – 20 Aug 2026',
  )

  assert.equal(
    formatFormalReportPeriodLabel({
      periodType: 'annual',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    }),
    '2026',
  )

  assert.equal(formatFormalReportPeriodLabel({ periodType: 'monthly' }), 'Unavailable')
})

test('formal report workspace derives office from the authenticated supervisor and exposes no office selector', async () => {
  const workspace = await getOfficeReportWorkspace(getSupervisor())

  assert.equal(workspace.office.id, 'office-legal')
  assert.equal(workspace.officeName, 'Legal Directorate')
  assert.equal(workspace.metadata.officeSelectorAllowed, false)
  assert.ok(workspace.analyticsData)
  assert.ok(Array.isArray(workspace.stageOptions))
  assert.equal(workspace.configuration.month, getCurrentFormalReportPeriodDefaults().month)
  assert.equal(workspace.configuration.year, getCurrentFormalReportPeriodDefaults().year)
})

test('office performance preview is generated from mock records without mutating source data or using storage', async () => {
  const supervisor = getSupervisor()
  const sourceBefore = getCorrespondenceRecords()
  const sourceSnapshot = JSON.parse(JSON.stringify(sourceBefore))
  const originalFetch = globalThis.fetch
  const originalLocalStorage = globalThis.localStorage
  let fetchCalls = 0
  let storageCalls = 0

  globalThis.fetch = async () => {
    fetchCalls += 1
    throw new Error('fetch should not be called in mock formal reports')
  }

  globalThis.localStorage = {
    getItem() {
      storageCalls += 1
      return null
    },
    setItem() {
      storageCalls += 1
    },
    removeItem() {
      storageCalls += 1
    },
  }

  const report = await generateFormalReportPreview(supervisor, {
    reportType: 'office-performance',
    periodType: 'monthly',
    month: '07',
    year: '2026',
    observations: '  ',
    recommendations: '',
    officeName: supervisor.office.name,
    officeCode: supervisor.office.code,
    preparedBy: supervisor.fullName,
    preparedByRole: 'Office Supervisor',
  })

  assert.equal(report.office.id, supervisor.office.id)
  assert.equal(report.isMockPreview, true)
  assert.equal(report.previewNotice, FORMAL_REPORT_PREVIEW_NOTICE)
  assert.equal(report.reference, 'MRH-LEG-PERFORMANCE-2026-07-PREVIEW')
  assert.equal(report.observations, 'No observations were entered.')
  assert.equal(report.recommendations, 'No recommendations were entered.')
  assert.equal(report.printOrientation, 'portrait')
  assert.ok(report.summary.totalRecords > 0)
  assert.ok(report.sections.some((section) => section.id === 'status-breakdown'))
  assert.ok(report.sections.some((section) => section.id === 'priority-breakdown'))
  assert.ok(report.sections.some((section) => section.id === 'type-breakdown'))
  assert.equal(report.sections.filter((section) => section.title === 'Recommendations').length, 1)
  assert.equal(fetchCalls, 0)
  assert.equal(storageCalls, 0)
  assert.deepEqual(getCorrespondenceRecords(), sourceSnapshot)

  globalThis.fetch = originalFetch
  globalThis.localStorage = originalLocalStorage
})

test('overdue preview preserves reference numbers and excludes machine identifiers from printed rows', async () => {
  const supervisor = getSupervisor()
  const report = await generateFormalReportPreview(supervisor, {
    reportType: 'overdue-documents',
    periodType: 'monthly',
    month: '07',
    year: '2026',
    observations: '',
    recommendations: '',
    officeName: supervisor.office.name,
    officeCode: supervisor.office.code,
    preparedBy: supervisor.fullName,
    preparedByRole: 'Office Supervisor',
  })

  const table = report.sections.find((section) => section.id === 'overdue-table')
  assert.ok(table)
  assert.ok(table.columns.includes('Reference Number'))
  assert.ok(table.rows.every((row) => !row.includes('mock-correspondence-001')))
  assert.ok(table.rows.every((row) => typeof row[0] === 'string' && row[0].startsWith('MRH/')))
})

test('pending-ageing preview filters by period and keeps the responsible office at office level', async () => {
  const supervisor = getSupervisor()
  const report = await generateFormalReportPreview(supervisor, {
    reportType: 'pending-ageing',
    periodType: 'custom',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    observations: 'Pending review remains concentrated in active legal files.',
    recommendations: 'Escalate overdue items at weekly office review.',
    officeName: supervisor.office.name,
    officeCode: supervisor.office.code,
    preparedBy: supervisor.fullName,
    preparedByRole: 'Office Supervisor',
  })

  const pendingTable = report.sections.find((section) => section.id === 'pending-table')
  assert.ok(pendingTable)
  assert.ok(pendingTable.rows.length >= 1)
  assert.ok(pendingTable.rows.every((row) => row[7] === 'Legal Directorate'))
})

test('staff contribution preview groups audit actions by user and preserves unmapped actions safely', async () => {
  const supervisor = getSupervisor()
  const report = await generateFormalReportPreview(supervisor, {
    reportType: 'staff-contribution',
    periodType: 'monthly',
    month: '07',
    year: '2026',
    observations: '',
    recommendations: '',
    officeName: supervisor.office.name,
    officeCode: supervisor.office.code,
    preparedBy: supervisor.fullName,
    preparedByRole: 'Office Supervisor',
  })

  const table = report.sections.find((section) => section.id === 'staff-table')
  assert.ok(table)
  assert.ok(table.rows.length >= 1)
  assert.ok(
    table.rows.every((row) => {
      const total = Number(row[9])
      const componentTotal =
        Number(row[1]) +
        Number(row[2]) +
        Number(row[3]) +
        Number(row[4]) +
        Number(row[5]) +
        Number(row[6]) +
        Number(row[7]) +
        Number(row[8]) +
        Number(row[11])
      return total === componentTotal
    }),
  )
  assert.equal(mapStaffActionCategory('Unknown Action Type'), 'other')
})

test('formal report preview component exposes a printable root and orientation class hooks', () => {
  const source = readFileSync(previewComponentPath, 'utf8')

  assert.ok(source.includes('formal-report-page'))
  assert.ok(source.includes('formal-report-print-root'))
  assert.ok(source.includes('formal-report-print-root--${report.printOrientation}'))
  assert.ok(source.includes('formal-report-page--${report.printOrientation}'))
  assert.ok(source.includes("section.id !== 'recommendations'"))
  assert.ok(source.includes('FormalReportHeader'))
})

test('formal report print styling isolates the print root and hides non-report UI', () => {
  const styles = readFileSync(stylesPath, 'utf8')

  assert.ok(styles.includes('@media print'))
  assert.ok(styles.includes('@page'))
  assert.ok(styles.includes('body *'))
  assert.ok(styles.includes('.formal-report-no-print'))
  assert.ok(styles.includes('.formal-report-print-root'))
  assert.ok(styles.includes('.formal-report-print-root--landscape'))
  assert.ok(styles.includes('visibility: hidden !important;'))
  assert.ok(styles.includes('visibility: visible !important;'))
  assert.ok(styles.includes('position: absolute !important;'))
  assert.ok(styles.includes('.formal-report-print-actions'))
  assert.ok(styles.includes('.formal-report-history-notice'))
})

test('formal report print-related components expose explicit no-print markers', () => {
  const workspaceSource = readFileSync(workspaceComponentPath, 'utf8')
  const configurationSource = readFileSync(configurationComponentPath, 'utf8')
  const printActionsSource = readFileSync(printActionsComponentPath, 'utf8')

  assert.ok(workspaceSource.includes('formal-report-configuration formal-report-no-print'))
  assert.ok(workspaceSource.includes('formal-report-preview-header formal-report-no-print'))
  assert.ok(configurationSource.includes('formal-report-config-form formal-report-no-print'))
  assert.ok(printActionsSource.includes('formal-report-print-actions formal-report-no-print'))
})

test('print root markup contains no form controls or buttons', () => {
  const previewSource = readFileSync(previewComponentPath, 'utf8')

  assert.equal(previewSource.includes('<button'), false)
  assert.equal(previewSource.includes('<select'), false)
  assert.equal(previewSource.includes('<textarea'), false)
  assert.equal(previewSource.includes('<input'), false)
})

test('formal reports workspace copy is cleaned of development and placeholder language', () => {
  const workspaceSource = readFileSync(workspaceComponentPath, 'utf8')
  const historyWorkspaceSource = readFileSync(historyWorkspaceComponentPath, 'utf8')
  const configurationSource = readFileSync(configurationComponentPath, 'utf8')
  const emptyStateSource = readFileSync(emptyStateComponentPath, 'utf8')
  const reportsPageSource = readFileSync(reportsPagePath, 'utf8')

  assert.equal(workspaceSource.includes('Report history will become available'), false)
  assert.equal(
    workspaceSource.includes('Configure the reporting period and generate a printable office report.'),
    false,
  )
  assert.equal(workspaceSource.includes('Preview and print the generated office report.'), false)
  assert.equal(workspaceSource.includes('Generated after validation'), false)
  assert.equal(workspaceSource.includes('backend'), false)
  assert.equal(workspaceSource.includes('mock'), false)

  assert.ok(configurationSource.includes('<dt>Report Reference</dt>'))
  assert.equal(configurationSource.includes('Expected Reference'), false)
  assert.equal(configurationSource.includes('Preview generated from mock system records'), false)
  assert.ok(configurationSource.includes('placeholder="Enter observations..."'))
  assert.ok(configurationSource.includes('placeholder="Enter recommendations..."'))

  assert.ok(emptyStateSource.includes('No report generated'))
  assert.equal(
    emptyStateSource.includes('Configure the report and select Generate Report to preview the formal office report.'),
    false,
  )

  assert.equal(reportsPageSource.includes('Review correspondence activity for your office.'), false)
  assert.equal(reportsPageSource.includes('Confidential office report - authorised supervisors only.'), false)
  assert.ok(reportsPageSource.includes('reports-page-header'))
  assert.ok(reportsPageSource.includes('reports-primary-tabs'))
  assert.ok(reportsPageSource.includes('ApiAnalyticsWorkspace'))
  assert.ok(reportsPageSource.includes('FormalReportsWorkspace'))
  assert.ok(reportsPageSource.includes('Report History'))
  assert.ok(reportsPageSource.includes('FormalReportHistoryWorkspace'))
  assert.ok(reportsPageSource.includes('resolveOfficeFromDirectory(currentUser?.office)'))
  assert.ok(reportsPageSource.includes("officeCode: effectiveOffice?.code ?? ''"))

  assert.ok(historyWorkspaceSource.includes('Open Report'))
  assert.ok(historyWorkspaceSource.includes('Historical Report Detail'))
  assert.ok(historyWorkspaceSource.includes('formal-report-history-list__header-cell'))
  assert.ok(historyWorkspaceSource.includes('formal-report-history-item__cell--reference'))
  assert.ok(historyWorkspaceSource.includes('This report is shown as originally generated.'))
  assert.equal(
    historyWorkspaceSource.includes('Select a previously generated report to view its details.'),
    false,
  )
  assert.equal(historyWorkspaceSource.includes('generateFormalReport('), false)
})

test('suggested formal report filenames are generated safely', () => {
  const filename = createSuggestedFormalReportFilename('overdue-documents', 'LEGAL', {
    label: 'July 2026',
  })

  assert.equal(filename, 'MRH_LEGAL_Overdue_Documents_Report_July_2026.pdf')
})

test('formal report history layout uses one shared grid definition for header and rows', () => {
  const styles = readFileSync(stylesPath, 'utf8')

  assert.ok(styles.includes('--formal-report-history-grid'))
  assert.ok(styles.includes('grid-template-columns: var(--formal-report-history-grid);'))
  assert.ok(styles.includes('.formal-report-history-list__header-cell'))
})
