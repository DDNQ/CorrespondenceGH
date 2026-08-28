import { useEffect, useMemo, useState } from 'react'

import EmptyState from '../../common/EmptyState'
import SectionCard from '../../common/SectionCard'
import FormalReportPreview from './FormalReportPreview'
import FormalReportPrintActions from './FormalReportPrintActions'

function normalizeHistoryErrorMessage(error, fallbackMessage) {
  if (error?.status === 403) {
    return 'Historical formal reports are not available for the authenticated office.'
  }

  if (error?.status === 404) {
    return 'The requested historical report could not be found.'
  }

  if (error?.status >= 500) {
    return 'The reports service is temporarily unavailable. Please try again.'
  }

  return error?.message ?? fallbackMessage
}

function getHistoryFieldDisplayValue(value, fallback = 'Not available') {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value !== null && value !== undefined && value !== '') {
    return String(value)
  }

  return fallback
}

function FormalReportHistoryWorkspace({
  currentUser,
  effectiveOffice = null,
  reportsService,
  showToast,
}) {
  const [historyState, setHistoryState] = useState({
    status: 'idle',
    items: [],
    error: '',
  })
  const [selectedReportId, setSelectedReportId] = useState('')
  const [selectedReportState, setSelectedReportState] = useState({
    status: 'idle',
    report: null,
    error: '',
  })

  useEffect(() => {
    let isActive = true

    async function loadHistory() {
      setHistoryState({
        status: 'loading',
        items: [],
        error: '',
      })

      try {
        const items = await reportsService.listFormalReportsHistory({
          currentUser: {
            ...currentUser,
            office: effectiveOffice ?? currentUser?.office ?? null,
          },
        })

        if (!isActive) {
          return
        }

        setHistoryState({
          status: 'success',
          items,
          error: '',
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setHistoryState({
          status: 'error',
          items: [],
          error: normalizeHistoryErrorMessage(
            error,
            'Unable to load report history right now.',
          ),
        })
      }
    }

    void loadHistory()

    return () => {
      isActive = false
    }
  }, [currentUser, effectiveOffice, reportsService])

  const shouldShowGeneratedByColumn = useMemo(
    () => historyState.items.some((entry) => entry.generatedBy),
    [historyState.items],
  )
  const effectiveOfficeName =
    (typeof effectiveOffice?.name === 'string' && effectiveOffice.name.trim()) ||
    (typeof currentUser?.office?.name === 'string' && currentUser.office.name.trim()) ||
    'Not available'

  const runPrintFlow = () => {
    if (!selectedReportState.report) {
      return
    }

    document.body.classList.add('formal-report-print-mode')

    const handleAfterPrint = () => {
      document.body.classList.remove('formal-report-print-mode')
      window.removeEventListener('afterprint', handleAfterPrint)
    }

    window.addEventListener('afterprint', handleAfterPrint)
    window.requestAnimationFrame(() => {
      window.print()
    })
  }

  const handleOpenReport = async (reportId) => {
    if (!reportId || selectedReportState.status === 'loading') {
      return
    }

    setSelectedReportId(reportId)
    setSelectedReportState({
      status: 'loading',
      report: null,
      error: '',
    })

    try {
      const report = await reportsService.getFormalReportById(reportId, {
        currentUser: {
          ...currentUser,
          office: effectiveOffice ?? currentUser?.office ?? null,
        },
      })
      setSelectedReportState({
        status: 'success',
        report,
        error: '',
      })
    } catch (error) {
      setSelectedReportState({
        status: 'error',
        report: null,
        error: normalizeHistoryErrorMessage(
          error,
          'Unable to open the selected historical report.',
        ),
      })
    }
  }

  const handleSavePdf = () => {
    if (!selectedReportState.report) {
      return
    }

    showToast({
      title: 'Use the browser print dialog to save the report as PDF.',
      message:
        selectedReportState.report.suggestedFilename ??
        'Suggested filename available for the selected report.',
    })
    runPrintFlow()
  }

  return (
    <div className="formal-report-history-workspace">
      <SectionCard
        title="Report History"
        className="report-section-card"
      >
        {historyState.status === 'loading' || historyState.status === 'idle' ? (
          <EmptyState
            title="Loading report history"
            description="Please wait."
            compact
          />
        ) : null}

        {historyState.status === 'error' ? (
          <EmptyState
            title="Report history unavailable"
            description={historyState.error}
            compact
          />
        ) : null}

        {historyState.status === 'success' && !historyState.items.length ? (
          <EmptyState
            title="No report history available"
            description="No previously generated formal reports were returned for this office."
            compact
          />
        ) : null}

        {historyState.status === 'success' && historyState.items.length ? (
          <div
            className={`formal-report-history-list${
              shouldShowGeneratedByColumn
                ? ' formal-report-history-list--with-generated-by'
                : ''
            }`}
          >
            <div className="formal-report-history-list__header">
              <span className="formal-report-history-list__header-cell">Report Reference</span>
              <span className="formal-report-history-list__header-cell">Report Type</span>
              <span className="formal-report-history-list__header-cell">Reporting Period</span>
              <span className="formal-report-history-list__header-cell">Generated At</span>
              {shouldShowGeneratedByColumn ? (
                <span className="formal-report-history-list__header-cell">Generated By</span>
              ) : null}
              <span className="formal-report-history-list__header-cell">Office</span>
              <span className="formal-report-history-list__header-cell">Action</span>
            </div>

            <div className="formal-report-history-list__body">
              {historyState.items.map((entry) => (
                <article
                  key={entry.id ?? entry.reference}
                  className={`formal-report-history-item${
                    selectedReportId && selectedReportId === entry.id
                      ? ' formal-report-history-item--selected'
                      : ''
                  }`}
                >
                  <div
                    className="formal-report-history-item__cell formal-report-history-item__cell--reference"
                    data-label="Report Reference"
                  >
                    <strong>{getHistoryFieldDisplayValue(entry.reference)}</strong>
                  </div>
                  <div className="formal-report-history-item__cell" data-label="Report Type">
                    <span>{getHistoryFieldDisplayValue(entry.reportTitle)}</span>
                  </div>
                  <div className="formal-report-history-item__cell" data-label="Reporting Period">
                    <span>{getHistoryFieldDisplayValue(entry.period?.label)}</span>
                  </div>
                  <div className="formal-report-history-item__cell" data-label="Generated At">
                    <span>{getHistoryFieldDisplayValue(entry.generatedDateLabel)}</span>
                  </div>
                  {shouldShowGeneratedByColumn ? (
                    <div className="formal-report-history-item__cell" data-label="Generated By">
                      <span>{getHistoryFieldDisplayValue(entry.generatedBy)}</span>
                    </div>
                  ) : null}
                  <div className="formal-report-history-item__cell" data-label="Office">
                    <span>{getHistoryFieldDisplayValue(entry.office?.name, effectiveOfficeName)}</span>
                  </div>
                  <div className="formal-report-history-item__actions">
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => {
                        void handleOpenReport(entry.id)
                      }}
                      disabled={!entry.id || selectedReportState.status === 'loading'}
                    >
                      {selectedReportId === entry.id && selectedReportState.status === 'loading'
                        ? 'Opening...'
                        : 'Open Report'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Historical Report Detail"
        action={
          selectedReportState.report ? (
            <FormalReportPrintActions
              suggestedFilename={selectedReportState.report.suggestedFilename}
              isOfficial
              onPrint={runPrintFlow}
              onSavePdf={handleSavePdf}
              disabled={selectedReportState.status === 'loading'}
            />
          ) : null
        }
        className="report-section-card formal-report-preview-card"
        headerClassName="formal-report-preview-header formal-report-no-print"
        actionClassName="formal-report-no-print"
      >
        {selectedReportState.status === 'loading' ? (
          <div className="formal-report-empty-canvas">
            <EmptyState
              title="Opening historical report"
              description="Please wait while the selected report is prepared."
              compact
            />
          </div>
        ) : null}

        {selectedReportState.status === 'error' ? (
          <div className="formal-report-empty-canvas formal-report-empty-canvas--error">
            <EmptyState
              title="Historical report unavailable"
              description={selectedReportState.error}
              compact
            />
          </div>
        ) : null}

        {selectedReportState.status !== 'loading' &&
        selectedReportState.status !== 'error' &&
        !selectedReportState.report ? (
          <div className="formal-report-empty-canvas">
            <EmptyState
              title="No report selected"
              compact
            />
          </div>
        ) : null}

        {selectedReportState.report ? (
          <div className="formal-report-preview-shell">
            <p className="formal-report-history-notice formal-report-no-print">
              This report is shown as originally generated.
            </p>
            <FormalReportPreview report={selectedReportState.report} />
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

export default FormalReportHistoryWorkspace
