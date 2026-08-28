import { useMemo, useState } from 'react'

import SectionCard from '../../common/SectionCard'
import {
  formatTimestampForDisplay,
  getDefaultFormalReportConfig,
} from '../../../utils/formalReports.js'
import FormalReportConfiguration from './FormalReportConfiguration'
import FormalReportEmptyState from './FormalReportEmptyState'
import FormalReportPreview from './FormalReportPreview'
import FormalReportPrintActions from './FormalReportPrintActions'

function FormalReportsWorkspace({ currentUser, workspace, reportsService, showToast }) {
  const [configuration, setConfiguration] = useState(() =>
    workspace?.configuration ?? getDefaultFormalReportConfig(currentUser),
  )
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isGenerateLoading, setIsGenerateLoading] = useState(false)
  const [generationError, setGenerationError] = useState('')

  const runPrintFlow = () => {
    if (!preview) {
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

  const handlePreview = async () => {
    setIsPreviewLoading(true)
    setGenerationError('')

    try {
      const report = await reportsService.generateFormalReportPreview(currentUser, configuration)
      setErrors({})
      setPreview({
        ...report,
        generatedDateLabel: formatTimestampForDisplay(report.generatedAt),
      })
    } catch (error) {
      if (error?.details && typeof error.details === 'object') {
        setErrors(error.details)
      }
      setGenerationError(error?.message ?? 'Unable to generate the formal report preview.')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleGenerate = async () => {
    setIsGenerateLoading(true)
    setGenerationError('')

    try {
      const report = await reportsService.generateFormalReport(currentUser, configuration)
      setErrors({})
      setPreview({
        ...report,
        generatedDateLabel: formatTimestampForDisplay(report.generatedAt),
      })
    } catch (error) {
      if (error?.details && typeof error.details === 'object') {
        setErrors(error.details)
      }
      setGenerationError(error?.message ?? 'Unable to generate the formal report.')
    } finally {
      setIsGenerateLoading(false)
    }
  }

  const handleReset = () => {
    setErrors({})
    setGenerationError('')
    setPreview(null)
    setConfiguration(workspace?.configuration ?? getDefaultFormalReportConfig(currentUser))
  }

  const handlePrint = () => {
    runPrintFlow()
  }

  const handleSavePdf = () => {
    if (!preview) {
      return
    }

    showToast({
      title: 'Use the browser print dialog to save the report as PDF.',
      message: preview?.suggestedFilename ?? 'Suggested filename available after preview generation.',
    })
    runPrintFlow()
  }

  const previewReference = useMemo(() => {
    if (preview) {
      return preview.reference
    }
    return 'Generated with report'
  }, [preview])

  const isBusy = isPreviewLoading || isGenerateLoading
  const isOfficialReport = Boolean(preview && !String(preview.reference ?? '').endsWith('-PREVIEW'))

  return (
    <div className="formal-reports-workspace">
      <SectionCard
        title="Formal Report Configuration"
        className="report-section-card formal-report-configuration formal-report-no-print"
        headerClassName="formal-report-no-print"
        bodyClassName="formal-report-no-print"
      >
        <FormalReportConfiguration
          metadata={workspace.metadata}
          value={configuration}
          previewReference={previewReference}
          errors={errors}
          disabled={isBusy}
          hasPreview={Boolean(preview)}
          onChange={(field, value) =>
            setConfiguration((current) => ({ ...current, [field]: value }))
          }
          onGenerate={handleGenerate}
          onRegenerate={handlePreview}
          onReset={handleReset}
        />
      </SectionCard>

      {preview ? (
        <SectionCard
          title="Formal Report Preview"
          action={
            <FormalReportPrintActions
              suggestedFilename={preview.suggestedFilename}
              isOfficial={isOfficialReport}
              onPrint={handlePrint}
              onSavePdf={handleSavePdf}
              disabled={isBusy}
            />
          }
          className="report-section-card formal-report-preview-card"
          headerClassName="formal-report-preview-header formal-report-no-print"
          actionClassName="formal-report-no-print"
        >
          <div className="formal-report-preview-shell">
            <FormalReportPreview report={preview} />
          </div>
        </SectionCard>
      ) : generationError ? (
        <SectionCard
          title="Formal Report Preview"
          className="report-section-card"
          headerClassName="formal-report-no-print"
        >
          <div className="formal-report-empty-canvas formal-report-empty-canvas--error">
            <div className="formal-report-empty-state">
              <p>{generationError}</p>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Formal Report Preview"
          className="report-section-card"
          headerClassName="formal-report-no-print"
        >
          <div className="formal-report-empty-canvas">
            <FormalReportEmptyState />
          </div>
        </SectionCard>
      )}
    </div>
  )
}

export default FormalReportsWorkspace
