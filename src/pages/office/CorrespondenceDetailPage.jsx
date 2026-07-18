import { Check, ChevronDown, Download, Eye, File, FileText, Image as ImageIcon, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import ConfirmDialog from '../../components/common/ConfirmDialog'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'
import SectionCard from '../../components/common/SectionCard'
import StatusBadge from '../../components/common/StatusBadge'
import FileUploadField from '../../components/forms/FileUploadField'
import { useAuth } from '../../context/useAuth'
import { useCorrespondence } from '../../context/useCorrespondence'
import { useToast } from '../../context/useToast'
import { workflowStageOptions } from '../../data/correspondence'
import { offices } from '../../data/offices'
import { getCorrespondenceActionPermissions } from '../../utils/correspondencePermissions'
import {
  getAttachmentPreviewType,
  getEditReviewSteps,
  getRegistrationReviewSteps,
  hasUsableAttachmentSource,
} from '../../utils/correspondenceReview'

const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', panelId: 'detail-panel-overview' },
  { id: 'journey', label: 'Journey & Audit', panelId: 'detail-panel-journey-audit' },
  { id: 'details', label: 'Record Details', panelId: 'detail-panel-record-details' },
  { id: 'attachments', label: 'Attachments', panelId: 'detail-panel-attachments' },
  { id: 'notes', label: 'Notes', panelId: 'detail-panel-notes' },
]
const DETAIL_TAB_QUERY_MAP = {
  overview: 'overview',
  'journey-audit': 'journey',
  'record-details': 'details',
  attachments: 'attachments',
  notes: 'notes',
}
const DETAIL_TAB_QUERY_MAP_REVERSE = {
  overview: 'overview',
  journey: 'journey-audit',
  details: 'record-details',
  attachments: 'attachments',
  notes: 'notes',
}
const VALID_GUIDED_FLOWS = new Set(['registration', 'edit'])
const FILE_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
const TODAY_ISO = '2026-07-17'

function getTabSlug(tab) {
  return tab.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function parseTimestamp(value) {
  const parsed = new Date(value?.replace(',', '') ?? '')
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

function getSortedActions(actions) {
  return [...actions].sort((left, right) => parseTimestamp(right.timestamp) - parseTimestamp(left.timestamp))
}

function getSortedNotes(notes) {
  return [...notes].sort((left, right) => parseTimestamp(left.date) - parseTimestamp(right.date))
}

function getFileExtension(fileName) {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : ''
}

function getDisplayValue(value) {
  if (value === null || value === undefined) {
    return 'Not recorded'
  }

  if (typeof value === 'string' && !value.trim()) {
    return 'Not recorded'
  }

  return value
}

function formatAttachmentSize(sizeInBytes) {
  if (!sizeInBytes) {
    return '0 KB'
  }

  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`
}

function getAttachmentType(attachment) {
  if (attachment.fileType) {
    return String(attachment.fileType).toUpperCase()
  }

  if (attachment.type) {
    return String(attachment.type).toUpperCase()
  }

  const extension = getFileExtension(attachment.fileName || '')
  return extension ? extension.replace('.', '').toUpperCase() : 'FILE'
}

function getAttachmentIcon(type) {
  if (['JPG', 'JPEG', 'PNG'].includes(type)) {
    return ImageIcon
  }

  if (['PDF', 'DOC', 'DOCX'].includes(type)) {
    return FileText
  }

  return File
}

function DetailFieldRow({ label, children, isLast = false, valueClassName = '' }) {
  return (
    <div className={`detail-field-row ${isLast ? 'detail-field-row--last' : ''}`.trim()}>
      <dt>{label}</dt>
      <dd className={valueClassName}>{children}</dd>
    </div>
  )
}

function DetailInlineRow({ label, value, valueClassName = '' }) {
  return (
    <div className="detail-inline-row">
      <dt>{label}</dt>
      <dd className={valueClassName}>{value || 'Not provided'}</dd>
    </div>
  )
}

function SummaryCell({ label, children, className = '' }) {
  return (
    <div className={`detail-summary-strip__cell ${className}`.trim()}>
      <span className="detail-summary-strip__label">{label}</span>
      {children}
    </div>
  )
}

function buildNoteEntry(id, body, author, office, date) {
  return {
    id,
    body,
    author,
    office,
    date,
  }
}

function CorrespondenceDetailPage() {
  const { reference } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef(null)
  const actionsMenuRef = useRef(null)
  const guidedReviewRef = useRef(null)
  const guidedReviewHeadingRef = useRef(null)
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const {
    addAttachment,
    acknowledgeReceipt,
    addNote,
    completeCorrespondence,
    forwardCorrespondence,
    getCorrespondenceByReference,
    updateCorrespondenceStage,
  } = useCorrespondence()
  const [noticeMessage, setNoticeMessage] = useState(location.state?.successMessage ?? '')
  const [noteBody, setNoteBody] = useState('')
  const [noteError, setNoteError] = useState('')
  const [pendingAttachment, setPendingAttachment] = useState(null)
  const [attachmentError, setAttachmentError] = useState('')
  const [attachmentDescription, setAttachmentDescription] = useState('')
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false)
  const [isStageModalOpen, setIsStageModalOpen] = useState(false)
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [isExitReviewDialogOpen, setIsExitReviewDialogOpen] = useState(false)
  const [isLeaveReviewDialogOpen, setIsLeaveReviewDialogOpen] = useState(false)
  const [isCompletingReview, setIsCompletingReview] = useState(false)
  const [isAcknowledgingReceipt, setIsAcknowledgingReceipt] = useState(false)
  const [receiptNote, setReceiptNote] = useState('')
  const [stageValues, setStageValues] = useState({
    stage: '',
    stageDeadline: TODAY_ISO,
    note: '',
  })
  const [forwardValues, setForwardValues] = useState({
    destinationOffice: '',
    nextStage: '',
    stageDeadline: TODAY_ISO,
    instructions: '',
  })
  const [completionNote, setCompletionNote] = useState('')
  const [modalErrors, setModalErrors] = useState({})
  const requestedFlow = searchParams.get('flow')?.toLowerCase() ?? ''
  const requestedTab = searchParams.get('tab')?.toLowerCase() ?? ''
  const requestedStep = searchParams.get('step')?.toLowerCase() ?? ''
  const guidedFlow = VALID_GUIDED_FLOWS.has(requestedFlow) ? requestedFlow : ''
  const isGuidedFlow = Boolean(guidedFlow)
  const activeTabId = DETAIL_TAB_QUERY_MAP[requestedTab] ?? 'overview'
  const activeTab = TAB_CONFIG.find((tab) => tab.id === activeTabId) ?? TAB_CONFIG[0]

  const decodedReference = decodeURIComponent(reference ?? '')
  const record = getCorrespondenceByReference(decodedReference)
  const sortedActions = useMemo(() => (record ? getSortedActions(record.actions) : []), [record])
  const sortedNotes = useMemo(() => (record ? getSortedNotes(record.notes) : []), [record])
  const auditSummaryEntries = useMemo(() => {
    if (!record) {
      return []
    }

    if (record.reference === 'MRH/CON/2026/0012') {
      return [
        {
          id: 'journey-audit-1',
          title: 'Current stage updated',
          description:
            'Legal review and contract compliance assessment. Recorded by Legal Directorate Admin on behalf of Legal Directorate.',
          timestamp: '15 Jul 2026, 9:18 AM',
        },
        {
          id: 'journey-audit-2',
          title: 'Forwarded to Legal Directorate',
          description: 'Moved from Office of the Chief Director for office action.',
          timestamp: '14 Jul 2026, 9:14 AM',
        },
        {
          id: 'journey-audit-3',
          title: 'Reviewed by Office of the Chief Director',
          description: 'Routing decision recorded for legal assessment.',
          timestamp: '13 Jul 2026, 3:42 PM',
        },
        {
          id: 'journey-audit-4',
          title: 'Correspondence registered',
          description: `Reference ${record.reference} created and initial details captured.`,
          timestamp: '12 Jul 2026, 10:05 AM',
        },
      ]
    }

    return sortedActions.map((action) => ({
      id: action.id,
      title: action.title,
      description: action.description,
      timestamp: action.timestamp,
    }))
  }, [record, sortedActions])
  const primaryAttachment = record?.attachments?.[0] ?? null
  const guidedSteps = useMemo(() => {
    if (!record || !isGuidedFlow) {
      return []
    }

    if (guidedFlow === 'registration') {
      return getRegistrationReviewSteps(primaryAttachment)
    }

    return getEditReviewSteps(record, location.state?.editResult ?? null)
  }, [guidedFlow, isGuidedFlow, location.state?.editResult, primaryAttachment, record])
  const activeGuidedStep =
    guidedSteps.find((step) => step.id === requestedStep) ?? guidedSteps[0] ?? null
  const currentDetailTabId = isGuidedFlow ? activeGuidedStep?.tabId ?? 'overview' : activeTab.id
  const activeGuidedStepIndex = activeGuidedStep
    ? guidedSteps.findIndex((step) => step.id === activeGuidedStep.id)
    : -1
  const isFinalGuidedStep =
    activeGuidedStepIndex >= 0 && activeGuidedStepIndex === guidedSteps.length - 1
  const guidedHeading =
    guidedFlow === 'edit' ? 'Changes Review' : 'Registration Review'
  const guidedDescription =
    guidedFlow === 'edit'
      ? 'Review the updated correspondence before completing the process.'
      : 'Review the newly registered correspondence before completing the process.'
  const permissions = useMemo(
    () =>
      getCorrespondenceActionPermissions({
        record,
        user: currentUser,
        isGuidedReview: isGuidedFlow,
      }),
    [currentUser, isGuidedFlow, record],
  )
  const normalizedRecord = permissions.record ?? record
  const isSystemAdmin = permissions.isSystemAdmin
  const isOfficeActor = permissions.isOfficeActor
  const isCurrentOffice = permissions.isAtUserOffice
  const isPendingReceipt = permissions.isPendingReceipt
  const canShowWorkflowActions = permissions.showActionsMenu
  const canAcknowledgeReceipt = permissions.canAcknowledgeReceipt
  const canAddNote = permissions.canAddNote
  const canShowAddNote = permissions.canAddNote
  const canShowAddAttachment = permissions.canAddAttachment
  const currentStageDisplay = isPendingReceipt
    ? 'Awaiting receipt acknowledgement'
    : normalizedRecord?.currentStage
  const officeOptions = offices
    .filter((office) => office.name !== normalizedRecord?.currentOfficeName)
    .map((office) => office.name)
  const workflowProgress = [
    {
      id: 'workflow-office-1',
      office: 'Central Registry',
      description: 'Registered and classified.',
      state: 'done',
      marker: <Check size={12} aria-hidden="true" />,
    },
    {
      id: 'workflow-office-2',
      office: 'Office of the Chief Director',
      description: 'Reviewed and routed for legal action.',
      state: 'done',
      marker: <Check size={12} aria-hidden="true" />,
    },
    {
      id: 'workflow-office-3',
      office: normalizedRecord?.currentOfficeName,
      description: currentStageDisplay,
      state: 'current',
      marker: '3',
    },
  ]
  const registrationAction = useMemo(
    () => normalizedRecord?.actions.find((action) => action.actionType === 'Registered') ?? null,
    [normalizedRecord?.actions],
  )
  const recordDetailsSections = [
    {
      id: 'identification',
      title: 'Identification',
      className: '',
      rows: [
        { label: 'Reference', value: getDisplayValue(record.reference) },
        { label: 'Subject', value: getDisplayValue(record.subject) },
        { label: 'Document Type', value: getDisplayValue(record.documentType) },
        { label: 'Direction', value: getDisplayValue(record.direction) },
        { label: 'Priority', value: getDisplayValue(record.priority), isPriority: true },
        { label: 'Status', value: getDisplayValue(record.status), isStatus: true },
        { label: 'External Reference', value: getDisplayValue(record.externalReference) },
      ],
    },
    {
      id: 'source-information',
      title: 'Source Information',
      className: '',
      rows: [
        {
          label: 'Sender / Originating Organisation',
          value: getDisplayValue(record.sender),
        },
        { label: 'Document Date', value: getDisplayValue(record.documentDate) },
        { label: 'Date Received', value: getDisplayValue(record.dateReceived) },
        { label: 'Registering Office', value: getDisplayValue(record.registeringOffice) },
        { label: 'Registered By', value: getDisplayValue(registrationAction?.userName) },
        { label: 'Registered On', value: getDisplayValue(registrationAction?.timestamp) },
      ],
    },
    {
      id: 'office-routing',
      title: 'Office Routing',
      className: 'detail-record-section--full',
      rows: [
        { label: 'Current Office', value: getDisplayValue(record.currentOffice) },
        { label: 'Current Stage', value: getDisplayValue(record.currentStage) },
        { label: 'Arrived at Current Office', value: getDisplayValue(record.arrivedAtCurrentOffice) },
        { label: 'Time in Current Office', value: getDisplayValue(record.timeSpentInOffice) },
        { label: 'Stage Deadline', value: getDisplayValue(record.stageDeadline || record.deadline) },
        { label: 'Overall Completion Date', value: getDisplayValue(record.overallCompletionDate) },
        { label: 'Receipt Status', value: getDisplayValue(record.receiptStatus) },
        { label: 'Forwarded From', value: getDisplayValue(record.forwardedFromOfficeName) },
        { label: 'Received By', value: getDisplayValue(record.receivedByUserName) },
        { label: 'Receiving Office', value: getDisplayValue(record.receivedByOfficeName) },
        { label: 'Received At', value: getDisplayValue(record.receivedAt) },
        { label: 'Acknowledgement Time', value: getDisplayValue(record.acknowledgementTime) },
        {
          label: 'Time Remaining',
          value: getDisplayValue(record.timeRemaining),
          valueClassName: `detail-record-time detail-record-time--${record.deadlineState}`,
        },
        { label: 'Currently Handled By', value: getDisplayValue(record.currentHandler) },
        { label: 'Receipt Note', value: getDisplayValue(record.receiptNote) },
      ],
    },
  ]
  const attachmentItems = useMemo(
    () =>
      record.attachments.map((attachment) => {
        const fileType = getAttachmentType(attachment)

        return {
          ...attachment,
          fileType,
          fileUrl: attachment.fileUrl || attachment.objectUrl || '',
          sizeLabel:
            attachment.size ||
            formatAttachmentSize(attachment.sizeInBytes || attachment.sizeBytes || 0),
          uploadedByLabel: getDisplayValue(attachment.uploadedByUserName || attachment.uploadedBy),
          officeLabel: getDisplayValue(attachment.uploadedByOfficeName || attachment.office),
          uploadedAtLabel: getDisplayValue(attachment.uploadedAt || attachment.date),
          descriptionLabel: getDisplayValue(attachment.description),
        }
      }),
    [record.attachments],
  )
  const previewAttachment = attachmentItems[0] ?? null
  const previewType = getAttachmentPreviewType(previewAttachment)
  const hasUsablePreviewAttachment = hasUsableAttachmentSource(previewAttachment)
  const noteItems = useMemo(() => {
    if (record.reference === 'MRH/CON/2026/0012' && record.notes.length <= 1) {
      return [
        buildNoteEntry(
          'note-0012-1',
          'Initial legal review commenced. Key compliance clauses have been flagged for further assessment.',
          'Ama Mensah',
          'Legal Directorate',
          '15 Jul 2026, 9:18 AM',
        ),
        buildNoteEntry(
          'note-0012-2',
          'Kindly review the contract terms and confirm statutory compliance before the stage deadline.',
          'Grace Boateng',
          'Central Registry',
          '14 Jul 2026, 9:14 AM',
        ),
        buildNoteEntry(
          'note-0012-3',
          'Priority handling requested due to the scheduled commencement of maintenance works.',
          'Grace Boateng',
          'Central Registry',
          '12 Jul 2026, 11:05 AM',
        ),
      ]
    }

    return sortedNotes.map((note) => ({
      id: note.id,
      body: note.body,
      author: note.author,
      office: note.office,
      date: note.date,
    }))
  }, [record.notes.length, record.reference, sortedNotes])

  useEffect(() => {
    if (!isActionsMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setIsActionsMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsActionsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isActionsMenuOpen])

  useEffect(() => {
    if (!isGuidedFlow || !guidedSteps.length || !activeGuidedStep) {
      return
    }

    if (requestedStep === activeGuidedStep.id) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('step', activeGuidedStep.id)
    nextSearchParams.delete('tab')
    setSearchParams(nextSearchParams, { replace: true })
  }, [activeGuidedStep, guidedSteps, isGuidedFlow, requestedStep, searchParams, setSearchParams])

  useEffect(() => {
    if (!isGuidedFlow || !activeGuidedStep) {
      return
    }

    guidedReviewRef.current?.scrollIntoView({ block: 'start' })
    window.requestAnimationFrame(() => {
      guidedReviewHeadingRef.current?.focus()
    })
  }, [activeGuidedStep, isGuidedFlow])

  const exitGuidedReview = () => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('flow')
    nextSearchParams.delete('step')
    nextSearchParams.delete('tab')
    setSearchParams(nextSearchParams)
    setIsExitReviewDialogOpen(false)
    setIsLeaveReviewDialogOpen(false)
    setIsActionsMenuOpen(false)
  }

  const handleTabChange = (tabId) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', DETAIL_TAB_QUERY_MAP_REVERSE[tabId] ?? 'overview')
    setSearchParams(nextSearchParams)
  }

  const handleGuidedStepChange = (stepId) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('flow', guidedFlow)
    nextSearchParams.set('step', stepId)
    nextSearchParams.delete('tab')
    setSearchParams(nextSearchParams)
  }

  const handlePreviousStep = () => {
    const previousStep = guidedSteps[activeGuidedStepIndex - 1]

    if (previousStep) {
      handleGuidedStepChange(previousStep.id)
    }
  }

  const handleNextStep = () => {
    const nextStep = guidedSteps[activeGuidedStepIndex + 1]

    if (nextStep) {
      handleGuidedStepChange(nextStep.id)
    }
  }

  const handleFinishReview = () => {
    if (isCompletingReview) {
      return
    }

    setIsCompletingReview(true)
    showToast({
      title:
        guidedFlow === 'edit'
          ? 'Correspondence updated successfully.'
          : 'Correspondence registered successfully.',
    })
    navigate('/correspondence?status=all', {
      state: {
        correspondenceAction: guidedFlow === 'edit' ? 'updated' : 'registered',
        correspondenceReference: record.reference,
        correspondenceSubject: record.subject,
        destinationOffice: normalizedRecord.currentOfficeName,
      },
    })
  }

  const handleExitReview = () => {
    if (!isGuidedFlow) {
      return
    }

    if (!isFinalGuidedStep) {
      setIsExitReviewDialogOpen(true)
      return
    }

    exitGuidedReview()
  }

  const handleBackToCorrespondence = () => {
    if (isGuidedFlow && !isFinalGuidedStep) {
      setIsLeaveReviewDialogOpen(true)
      return
    }

    navigate('/correspondence?status=all')
  }

  if (!record) {
    return (
      <section className="detail-page">
        <div className="detail-not-found">
          <div className="detail-not-found__copy">
            <h1>Correspondence not found</h1>
            <p>The requested correspondence record could not be located.</p>
          </div>
          <div className="split-actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => navigate('/correspondence?status=all')}
            >
              Return to All Correspondence
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </section>
    )
  }

  const handleAttachmentDraft = (event) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      if (pendingAttachment?.isTemporary && pendingAttachment.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingAttachment.fileUrl)
      }
      setPendingAttachment(null)
      setAttachmentError('')
      return
    }

    const extension = getFileExtension(selectedFile.name)

    if (!FILE_ACCEPT.split(',').includes(extension)) {
      if (pendingAttachment?.isTemporary && pendingAttachment.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingAttachment.fileUrl)
      }
      setPendingAttachment(null)
      setAttachmentError('Choose a PDF, Word, or image file.')
      event.target.value = ''
      return
    }

    if (selectedFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
      if (pendingAttachment?.isTemporary && pendingAttachment.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingAttachment.fileUrl)
      }
      setPendingAttachment(null)
      setAttachmentError('The selected file must be 10 MB or smaller.')
      event.target.value = ''
      return
    }

    if (pendingAttachment?.isTemporary && pendingAttachment.fileUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingAttachment.fileUrl)
    }

    setPendingAttachment({
      name: selectedFile.name,
      size: selectedFile.size,
      sizeInBytes: selectedFile.size,
      extension,
      fileType: extension.replace('.', '').toUpperCase(),
      mimeType: selectedFile.type,
      fileName: selectedFile.name,
      fileUrl: URL.createObjectURL(selectedFile),
      fileObject: selectedFile,
      isTemporary: true,
    })
    setAttachmentError('')
  }

  const handleOpenAttachmentModal = () => {
    if (pendingAttachment?.isTemporary && pendingAttachment.fileUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingAttachment.fileUrl)
    }
    setPendingAttachment(null)
    setAttachmentDescription('')
    setAttachmentError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setIsAttachmentModalOpen(true)
  }

  const handleCloseAttachmentModal = ({ preservePending = false } = {}) => {
    if (!preservePending && pendingAttachment?.isTemporary && pendingAttachment.fileUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingAttachment.fileUrl)
    }

    setPendingAttachment(null)
    setAttachmentDescription('')
    setAttachmentError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setIsAttachmentModalOpen(false)
  }

  const handleAddAttachment = () => {
    if (!pendingAttachment) {
      setAttachmentError('Choose an attachment before adding it.')
      return
    }

    addAttachment(
      record.reference,
      {
        ...pendingAttachment,
        description: attachmentDescription.trim(),
        sizeLabel: formatAttachmentSize(pendingAttachment.sizeInBytes || pendingAttachment.size),
        // TODO: Replace temporary object URLs with protected backend file URLs once backend file storage is available.
      },
      currentUser,
    )
    setNoticeMessage('Attachment added successfully.')
    handleCloseAttachmentModal({ preservePending: true })
  }

  const handleAddNote = (event) => {
    event.preventDefault()

    if (!noteBody.trim()) {
      setNoteError('Enter a note before submitting.')
      return
    }

    addNote(record.reference, noteBody.trim(), currentUser)
    setNoteBody('')
    setNoteError('')
    setNoticeMessage('Workflow note added successfully.')
  }

  const handleOpenStageModal = () => {
    setStageValues({
      stage: '',
      stageDeadline: TODAY_ISO,
      note: '',
    })
    setModalErrors({})
    setIsStageModalOpen(true)
  }

  const handleOpenForwardModal = () => {
    setForwardValues({
      destinationOffice: '',
      nextStage: '',
      stageDeadline: TODAY_ISO,
      instructions: '',
    })
    setModalErrors({})
    setIsForwardModalOpen(true)
  }

  const handleOpenReceiptModal = () => {
    setReceiptNote('')
    setIsReceiptModalOpen(true)
  }

  const validateStageModal = () => {
    const nextErrors = {}

    if (!stageValues.stage) {
      nextErrors.stage = 'Select a new stage.'
    } else if (stageValues.stage === record.currentStage) {
      nextErrors.stage = 'Choose a stage different from the current stage.'
    }

    if (!stageValues.stageDeadline) {
      nextErrors.stageDeadline = 'Enter a new stage deadline.'
    } else if (stageValues.stageDeadline < TODAY_ISO) {
      nextErrors.stageDeadline = 'The stage deadline cannot be in the past.'
    }

    setModalErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateForwardModal = () => {
    const nextErrors = {}

    if (!forwardValues.destinationOffice) {
      nextErrors.destinationOffice = 'Select a destination office.'
    }

    if (!forwardValues.nextStage) {
      nextErrors.nextStage = 'Select the next stage.'
    }

    if (!forwardValues.stageDeadline) {
      nextErrors.forwardDeadline = 'Enter a stage deadline.'
    } else if (forwardValues.stageDeadline < TODAY_ISO) {
      nextErrors.forwardDeadline = 'The stage deadline cannot be in the past.'
    }

    if (!forwardValues.instructions.trim()) {
      nextErrors.instructions = 'Enter forwarding instructions.'
    }

    setModalErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleStageUpdate = () => {
    if (!validateStageModal()) {
      return
    }

    updateCorrespondenceStage(record.reference, stageValues, currentUser)
    setIsStageModalOpen(false)
    setNoticeMessage('Current stage updated successfully.')
  }

  const handleForward = () => {
    if (!validateForwardModal()) {
      return
    }

    forwardCorrespondence(record.reference, forwardValues, currentUser)
    setIsForwardModalOpen(false)
    setNoticeMessage('Correspondence forwarded successfully.')
  }

  const handleAcknowledgeReceipt = () => {
    if (isAcknowledgingReceipt) {
      return
    }

    setIsAcknowledgingReceipt(true)
    const result = acknowledgeReceipt(record.reference, receiptNote, currentUser)

    if (!result) {
      setNoticeMessage('Unable to acknowledge receipt. Please try again.')
      setIsAcknowledgingReceipt(false)
      return
    }

    if (result.error === 'already-acknowledged') {
      setNoticeMessage('This correspondence has already been acknowledged.')
      setIsReceiptModalOpen(false)
      setIsAcknowledgingReceipt(false)
      return
    }

    setReceiptNote('')
    setIsReceiptModalOpen(false)
    setNoticeMessage('Correspondence receipt acknowledged.')
    setIsAcknowledgingReceipt(false)
  }

  const handleComplete = () => {
    completeCorrespondence(record.reference, currentUser, completionNote)
    setCompletionNote('')
    setIsCompleteModalOpen(false)
    setNoticeMessage('Correspondence marked as completed.')
  }

  const handleSelectAction = (action) => {
    setIsActionsMenuOpen(false)

    if (action === 'stage') {
      handleOpenStageModal()
    }

    if (action === 'forward') {
      handleOpenForwardModal()
    }

    if (action === 'complete') {
      setIsCompleteModalOpen(true)
    }
  }

  const resolveAttachmentUrl = async (attachment) => {
    if (!attachment.fileUrl) {
      return null
    }

    if (attachment.isTemporary || attachment.fileUrl.startsWith('blob:')) {
      return attachment.fileUrl
    }

    if (!attachment.fileUrl.startsWith('/')) {
      return attachment.fileUrl
    }

    try {
      const response = await fetch(attachment.fileUrl, { method: 'HEAD' })
      return response.ok ? attachment.fileUrl : null
    } catch {
      return null
    }
  }

  const handleViewAttachment = async (attachment) => {
    const fileUrl = await resolveAttachmentUrl(attachment)

    if (!fileUrl) {
      setNoticeMessage('Unable to open this attachment.')
      return
    }

    const openedWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer')

    if (!openedWindow) {
      setNoticeMessage('Unable to open this attachment.')
    }
  }

  const handleDownloadAttachment = async (attachment) => {
    const fileUrl = await resolveAttachmentUrl(attachment)

    if (!fileUrl) {
      setNoticeMessage('Unable to download this attachment.')
      return
    }

    const link = document.createElement('a')
    link.href = fileUrl
    link.download = attachment.fileName
    link.rel = 'noopener noreferrer'
    document.body.append(link)
    link.click()
    link.remove()
  }

  return (
    <section className="detail-page">
      <div className="detail-page__header detail-page__heading">
        <div className="detail-page__heading-copy">
          <h1>Correspondence Detail & Tracking</h1>
          <p>
            View the complete record, current office position, workflow journey and supporting information.
          </p>
        </div>

        <div className="detail-page__heading-actions">
          {canAcknowledgeReceipt ? (
            <button
              type="button"
              className="button button--primary"
              onClick={handleOpenReceiptModal}
            >
              Acknowledge Receipt
            </button>
          ) : null}
          {canShowWorkflowActions ? (
            <div className="detail-actions-menu" ref={actionsMenuRef}>
              <button
                type="button"
                className="button button--secondary detail-actions-menu__trigger"
                onClick={() => setIsActionsMenuOpen((current) => !current)}
                aria-expanded={isActionsMenuOpen}
                aria-haspopup="menu"
              >
                <span>Actions</span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {isActionsMenuOpen ? (
                <div className="detail-actions-menu__panel" role="menu">
                  {permissions.canUpdateStage ? (
                    <button type="button" role="menuitem" onClick={() => handleSelectAction('stage')}>
                      Update Stage
                    </button>
                  ) : null}
                  {permissions.canForward ? (
                    <button type="button" role="menuitem" onClick={() => handleSelectAction('forward')}>
                      Forward to Office
                    </button>
                  ) : null}
                  {permissions.canMarkCompleted ? (
                    <button type="button" role="menuitem" onClick={() => handleSelectAction('complete')}>
                      Mark Completed
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className="button button--secondary"
            onClick={handleBackToCorrespondence}
          >
            Back to Correspondence
          </button>
        </div>
      </div>

      {noticeMessage ? <div className="notice-strip">{noticeMessage}</div> : null}
      {isSystemAdmin ? <div className="notice-strip">System oversight - read-only</div> : null}
      {isCurrentOffice && isPendingReceipt ? (
        <div className="detail-receipt-notice" role="status">
          <div className="detail-receipt-notice__copy">
            <strong>New correspondence received</strong>
            <p>
              This correspondence was forwarded by {normalizedRecord.forwardedFromOfficeName || 'another office'} and is awaiting acknowledgement by {normalizedRecord.currentOfficeName}.
            </p>
          </div>
          <div className="detail-receipt-notice__meta">
            <span>
              <strong>Forwarded:</strong> {normalizedRecord.forwardedAt || normalizedRecord.arrivedAtCurrentOffice}
            </span>
            <span>
              <strong>Destination Office:</strong> {normalizedRecord.currentOfficeName}
            </span>
          </div>
        </div>
      ) : null}
      {isOfficeActor && !isCurrentOffice ? (
        <div className="notice-strip">This correspondence is currently with another office.</div>
      ) : null}

      <section className="detail-summary-strip" aria-label="Correspondence record summary">
        <SummaryCell label="Reference & Subject" className="detail-summary-strip__cell--subject">
          <strong>{record.reference}</strong>
          <p>{record.subject}</p>
        </SummaryCell>
        <SummaryCell label="Type">
          <strong>{record.documentType}</strong>
        </SummaryCell>
        <SummaryCell label="Priority">
          <strong>{record.priority}</strong>
        </SummaryCell>
        <SummaryCell label="Status">
          <StatusBadge status={record.status} />
        </SummaryCell>
        <SummaryCell label="Overall Deadline">
          <strong>{record.overallCompletionDate || record.deadline}</strong>
        </SummaryCell>
      </section>

      <section className="detail-track-strip" aria-label="Current correspondence tracking summary">
        <div className="detail-track-strip__cell">
          <span className="detail-track-strip__label">Current Office</span>
          <strong>{record.currentOffice}</strong>
        </div>
        <div className="detail-track-strip__cell">
          <span className="detail-track-strip__label">Current Stage</span>
          <strong>{currentStageDisplay}</strong>
        </div>
        <div className="detail-track-strip__cell">
          <span className="detail-track-strip__label">Arrived at Office</span>
          <strong>{record.arrivedAtCurrentOffice}</strong>
        </div>
        <div className="detail-track-strip__cell">
          <span className="detail-track-strip__label">Time Until Action Is Due</span>
          <strong className={`detail-track-strip__time detail-track-strip__time--${record.deadlineState}`}>
            {record.timeRemaining}
          </strong>
        </div>
      </section>

      {isGuidedFlow ? (
        <section className="detail-review-flow" ref={guidedReviewRef}>
          <div className="detail-review-flow__banner">
            <div className="detail-review-flow__copy">
              <p className="detail-review-flow__eyebrow">
                Step {activeGuidedStepIndex + 1} of {guidedSteps.length}
              </p>
              <h2 ref={guidedReviewHeadingRef} tabIndex={-1}>
                {guidedHeading}
              </h2>
              <p>{guidedDescription}</p>
            </div>
            <div className="detail-review-flow__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={handleExitReview}
              >
                Exit Review
              </button>
            </div>
          </div>

          <div className="detail-review-steps" aria-label={`${guidedHeading} steps`}>
            {guidedSteps.map((step, index) => {
              const isCompleted = index < activeGuidedStepIndex
              const isCurrent = step.id === activeGuidedStep?.id
              const isClickable = isCompleted || isCurrent

              return (
                <button
                  key={step.id}
                  type="button"
                  className={`detail-review-step ${
                    isCompleted
                      ? 'detail-review-step--completed'
                      : isCurrent
                        ? 'detail-review-step--current'
                        : 'detail-review-step--upcoming'
                  }`.trim()}
                  onClick={() => isClickable && handleGuidedStepChange(step.id)}
                  disabled={!isClickable}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="detail-review-step__marker" aria-hidden="true">
                    {isCompleted ? <Check size={14} /> : index + 1}
                  </span>
                  <span className="detail-review-step__copy">
                    <span className="detail-review-step__title">{step.title}</span>
                    <span className="sr-only">
                      {isCurrent ? 'Current step' : isCompleted ? 'Completed step' : 'Upcoming step'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="detail-tabs-shell">
          <div className="detail-tabs" role="tablist" aria-label="Correspondence detail sections">
            {TAB_CONFIG.map((tab) => {
              const tabSlug = getTabSlug(tab.label)
              const tabId = `detail-tab-${tabSlug}`

              return (
                <button
                  key={tab.id}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={activeTab.id === tab.id}
                  aria-controls={tab.panelId}
                  className={activeTab.id === tab.id ? 'tab-button tab-button--active' : 'tab-button'}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {currentDetailTabId === 'overview' ? (
        <div
          id="detail-panel-overview"
          role="tabpanel"
          aria-labelledby="detail-tab-overview"
          className="detail-overview-grid"
        >
          <SectionCard
            title="Document Preview"
            description="Attached correspondence document."
            className="detail-overview-card detail-overview-card--preview"
          >
            {previewAttachment ? (
              <div className="detail-document-preview">
                {previewType === 'pdf' && previewAttachment.fileUrl ? (
                  <object
                    data={previewAttachment.fileUrl}
                    type="application/pdf"
                    className="document-preview-frame"
                  >
                    <div className="document-preview-fallback">
                      <p>This browser could not display the PDF preview.</p>
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => handleViewAttachment(previewAttachment)}
                      >
                        Open Document
                      </button>
                    </div>
                  </object>
                ) : null}

                {previewType === 'image' && previewAttachment.fileUrl ? (
                  <div className="document-preview-image-container">
                    <img
                      src={previewAttachment.fileUrl}
                      alt={`Preview of ${previewAttachment.fileName}`}
                      className="document-preview-image"
                    />
                  </div>
                ) : null}

                {(previewType === 'word' || previewType === 'unsupported') && hasUsablePreviewAttachment ? (
                  <div className="document-preview-fallback">
                    <p>
                      {previewType === 'word'
                        ? 'Preview is not available for this file type.'
                        : 'Preview is not available for this file type.'}
                    </p>
                    <p className="muted-copy">{previewAttachment.fileName}</p>
                    <div className="detail-attachment-item__actions">
                      <button
                        type="button"
                        className="detail-attachment-action detail-attachment-action--view"
                        onClick={() => handleViewAttachment(previewAttachment)}
                      >
                        <Eye size={15} aria-hidden="true" />
                        <span>Open Document</span>
                      </button>
                      <button
                        type="button"
                        className="detail-attachment-action"
                        onClick={() => handleDownloadAttachment(previewAttachment)}
                      >
                        <Download size={15} aria-hidden="true" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {!hasUsablePreviewAttachment ? (
                  <div className="document-preview-fallback">
                    <p>Document preview is no longer available in this session.</p>
                    <p className="muted-copy">{previewAttachment.fileName}</p>
                    {previewAttachment.fileUrl ? (
                      <div className="detail-attachment-item__actions">
                        <button
                          type="button"
                          className="detail-attachment-action"
                          onClick={() => handleDownloadAttachment(previewAttachment)}
                        >
                          <Download size={15} aria-hidden="true" />
                          <span>Download</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No document attached"
                description="No correspondence document is currently available for this record."
              />
            )}
          </SectionCard>

          <div className="detail-overview-sidebar">
            <SectionCard
              title="Current Position"
              description="Where the correspondence is now."
              className="detail-overview-card detail-overview-card--position"
            >
              <div className="detail-position-card">
                <div className="detail-position-card__highlight">
                  <span>Current Office</span>
                  <strong>{record.currentOffice}</strong>
                </div>
                <dl className="detail-overview-list">
                  <DetailInlineRow label="Current Stage" value={currentStageDisplay} />
                  <DetailInlineRow label="Time in Current Office" value={record.timeSpentInOffice} />
                  <DetailInlineRow
                    label="Time Remaining"
                    value={record.timeRemaining}
                    valueClassName={`detail-overview-list__time detail-overview-list__time--${record.deadlineState}`}
                  />
                </dl>
              </div>
            </SectionCard>

            <SectionCard
              title="Workflow Progress"
              description="Office-to-office journey."
              className="detail-overview-card detail-overview-card--workflow"
            >
              <div className="detail-workflow-progress">
                {workflowProgress.map((step) => (
                  <div key={step.id} className="detail-workflow-progress__step">
                    <span
                      className={`detail-workflow-progress__marker detail-workflow-progress__marker--${step.state}`}
                      aria-hidden="true"
                    >
                      {step.marker}
                    </span>
                    <div>
                      <strong>{step.office}</strong>
                      <p>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {currentDetailTabId === 'journey' ? (
        <SectionCard
          title="Journey & Audit"
          description="Complete office-to-office movement and accountable actions for this correspondence."
        >
          <div
            id="detail-panel-journey-audit"
            role="tabpanel"
            aria-labelledby="detail-tab-journey-audit"
            className="detail-audit-summary"
          >
            {auditSummaryEntries.length ? (
              auditSummaryEntries.map((entry) => (
                <article key={entry.id} className="detail-audit-summary__row">
                  <span className="detail-audit-summary__marker" aria-hidden="true"></span>
                  <div className="detail-audit-summary__content">
                    <strong>{entry.title}</strong>
                    <p>{entry.description}</p>
                  </div>
                  <span className="detail-audit-summary__time">{entry.timestamp}</span>
                </article>
              ))
            ) : (
              <EmptyState
                title="No journey activity recorded"
                description="No office movement or accountable actions have been recorded for this correspondence."
              />
            )}
          </div>
        </SectionCard>
      ) : null}

      {currentDetailTabId === 'details' ? (
        <SectionCard
          title="Record Details"
          description="Complete correspondence identification, source and routing information."
        >
          <div
            id="detail-panel-record-details"
            role="tabpanel"
            aria-labelledby="detail-tab-record-details"
            className="detail-record-layout"
          >
            <div className="detail-record-grid">
              {recordDetailsSections.map((section) => (
                <section
                  key={section.id}
                  className={`detail-record-section ${section.className}`.trim()}
                >
                  <div className="detail-record-section__header">
                    <h3>{section.title}</h3>
                  </div>
                  <dl className="detail-record-section__body">
                    {section.rows.map((row, index) => (
                      <DetailFieldRow
                        key={row.label}
                        label={row.label}
                        isLast={index === section.rows.length - 1}
                        valueClassName={row.valueClassName}
                      >
                        {row.isStatus ? (
                          <StatusBadge status={row.value} />
                        ) : row.isPriority ? (
                          <span className={`detail-priority-badge detail-priority-badge--${String(row.value).toLowerCase()}`}>
                            {row.value}
                          </span>
                        ) : (
                          row.value
                        )}
                      </DetailFieldRow>
                    ))}
                  </dl>
                </section>
              ))}

              <section className="detail-record-section detail-record-section--full">
                <div className="detail-record-section__header">
                  <h3>Instructions & Notes</h3>
                </div>
                <div className="detail-record-notes">
                  <div className="detail-record-note">
                    <span className="detail-record-note__label">Required Action / Instructions</span>
                    <p>{getDisplayValue(record.requiredAction)}</p>
                  </div>
                  <div className="detail-record-note">
                    <span className="detail-record-note__label">Administrative Notes</span>
                    <p>{getDisplayValue(record.administrativeNotes)}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {currentDetailTabId === 'attachments' ? (
        <SectionCard
          title="Attachments"
          description="Documents and supporting files associated with this correspondence."
          action={
            canShowAddAttachment ? (
              <button type="button" className="button button--primary detail-attachments__add-button" onClick={handleOpenAttachmentModal}>
                <Upload size={16} aria-hidden="true" />
                <span>Add Attachment</span>
              </button>
            ) : null
          }
        >
          <div
            id="detail-panel-attachments"
            role="tabpanel"
            aria-labelledby="detail-tab-attachments"
            className="detail-attachments"
          >
            {attachmentItems.length ? (
              <div className="detail-attachment-list">
                <div className="detail-attachment-list__header" aria-hidden="true">
                  <span>File</span>
                  <span>Type</span>
                  <span>Uploaded By</span>
                  <span>Office</span>
                  <span>Uploaded</span>
                  <span>Actions</span>
                </div>
                <div className="detail-attachment-list__body">
                  {attachmentItems.map((attachment) => {
                    const AttachmentIcon = getAttachmentIcon(attachment.fileType)

                    return (
                      <article key={attachment.id} className="detail-attachment-item">
                        <div className="detail-attachment-item__file">
                          <span className="detail-attachment-item__icon" aria-hidden="true">
                            <AttachmentIcon size={16} />
                          </span>
                          <div className="detail-attachment-item__file-copy">
                            <strong>{attachment.fileName}</strong>
                            <p>{attachment.sizeLabel}</p>
                          </div>
                        </div>
                        <div className="detail-attachment-item__meta" data-label="Type">
                          <span>{attachment.fileType}</span>
                        </div>
                        <div className="detail-attachment-item__meta" data-label="Uploaded By">
                          <span>{attachment.uploadedByLabel}</span>
                        </div>
                        <div className="detail-attachment-item__meta" data-label="Office">
                          <span>{attachment.officeLabel}</span>
                        </div>
                        <div className="detail-attachment-item__meta" data-label="Uploaded">
                          <span>{attachment.uploadedAtLabel}</span>
                        </div>
                        <div className="detail-attachment-item__actions">
                          <button
                            type="button"
                            className="detail-attachment-action detail-attachment-action--view"
                            aria-label={`View ${attachment.fileName}`}
                            title={`View ${attachment.fileName}`}
                            disabled={!attachment.fileUrl}
                            onClick={() => handleViewAttachment(attachment)}
                          >
                            <Eye size={15} aria-hidden="true" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="detail-attachment-action"
                            aria-label={`Download ${attachment.fileName}`}
                            title={`Download ${attachment.fileName}`}
                            disabled={!attachment.fileUrl}
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            <Download size={15} aria-hidden="true" />
                            <span>Download</span>
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                title="No attachments available"
                description="No documents or supporting files have been added to this correspondence."
                compact
              />
            )}
          </div>
        </SectionCard>
      ) : null}

      {currentDetailTabId === 'notes' ? (
        <SectionCard
          title="Notes"
          description="Administrative and workflow notes recorded for this correspondence."
        >
          <div
            id="detail-panel-notes"
            role="tabpanel"
            aria-labelledby="detail-tab-notes"
            className="detail-notes"
          >
            {canAddNote ? (
              canShowAddNote ? (
              <form className="detail-note-form app-form" onSubmit={handleAddNote}>
                <div className="detail-note-form__heading">
                  <h3>Add Note</h3>
                </div>
                <div className="form-field">
                  <label htmlFor="detail-new-note" className="form-field__label">
                    Note
                  </label>
                  <textarea
                    id="detail-new-note"
                    value={noteBody}
                    placeholder="Enter a note for this correspondence..."
                    onChange={(event) => {
                      setNoteBody(event.target.value)
                      setNoteError('')
                    }}
                    aria-invalid={Boolean(noteError)}
                    aria-describedby={noteError ? 'detail-new-note-error' : undefined}
                  />
                  {noteError ? (
                    <p id="detail-new-note-error" className="form-field__error" role="alert">
                      {noteError}
                    </p>
                  ) : null}
                </div>
                <div className="detail-note-form__actions">
                  <button type="submit" className="button button--primary">
                    Add Note
                  </button>
                </div>
              </form>
              ) : null
            ) : null}

            {noteItems.length ? (
              <div className="detail-note-list">
                {noteItems.map((note) => (
                  <article key={note.id} className="detail-note-item">
                    <div className="detail-note-item__main">
                      <p>{note.body}</p>
                      <span>Added by {note.author} on behalf of {note.office}.</span>
                    </div>
                    <span className="detail-note-item__time">{note.date}</span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No notes recorded"
                description="No administrative or workflow notes have been added to this correspondence."
                compact
              />
            )}
          </div>
        </SectionCard>
      ) : null}

      {isGuidedFlow ? (
        <div className="detail-review-nav">
          <button
            type="button"
            className="button button--secondary"
            onClick={handlePreviousStep}
            disabled={activeGuidedStepIndex <= 0}
          >
            Previous
          </button>

          {isFinalGuidedStep ? (
            <button
              type="button"
              className="button button--primary"
              onClick={handleFinishReview}
              disabled={isCompletingReview}
            >
              {guidedFlow === 'edit'
                ? isCompletingReview
                  ? 'Finishing...'
                  : 'Finish Changes Review'
                : isCompletingReview
                  ? 'Finishing...'
                  : 'Finish Review'}
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary"
              onClick={handleNextStep}
            >
              Next
            </button>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={isExitReviewDialogOpen}
        title="Exit Review"
        description="You can return to this correspondence later. Exit the guided review now?"
        confirmLabel="Exit Review"
        cancelLabel="Continue Reviewing"
        onConfirm={exitGuidedReview}
        onClose={() => setIsExitReviewDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={isLeaveReviewDialogOpen}
        title="Back to Correspondence"
        description="You can return to this correspondence later. Exit the guided review and return to the correspondence list now?"
        confirmLabel="Return to List"
        cancelLabel="Continue Reviewing"
        onConfirm={() => navigate('/correspondence?status=all')}
        onClose={() => setIsLeaveReviewDialogOpen(false)}
      />

      <Modal
        isOpen={isAttachmentModalOpen}
        title="Add Attachment"
        onClose={handleCloseAttachmentModal}
        actions={
          <>
            <button type="button" className="button button--secondary" onClick={handleCloseAttachmentModal}>
              Cancel
            </button>
            <button type="button" className="button button--primary" onClick={handleAddAttachment}>
              Add Attachment
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          <p className="modal-card__description">
            Add a supporting document to this correspondence record.
          </p>
          <div className="form-field">
            <label className="form-field__label" htmlFor="detail-attachment-upload">
              Attachment
            </label>
            <FileUploadField
              id="detail-attachment-upload"
              file={pendingAttachment}
              error={attachmentError}
              accept={FILE_ACCEPT}
              inputRef={fileInputRef}
              onChange={handleAttachmentDraft}
              onRemove={() => {
                if (pendingAttachment?.isTemporary && pendingAttachment.fileUrl?.startsWith('blob:')) {
                  URL.revokeObjectURL(pendingAttachment.fileUrl)
                }
                setPendingAttachment(null)
                setAttachmentError('')
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="detail-attachment-description" className="form-field__label">
              Description
            </label>
            <textarea
              id="detail-attachment-description"
              value={attachmentDescription}
              onChange={(event) => setAttachmentDescription(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReceiptModalOpen}
        title="Acknowledge Receipt"
        onClose={() => {
          if (!isAcknowledgingReceipt) {
            setIsReceiptModalOpen(false)
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsReceiptModalOpen(false)}
              disabled={isAcknowledgingReceipt}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleAcknowledgeReceipt}
              disabled={isAcknowledgingReceipt}
            >
              {isAcknowledgingReceipt ? 'Confirming...' : 'Confirm Receipt'}
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          <p className="modal-card__description">
            Confirm that this correspondence has been received by your office.
          </p>
          <div className="form-field">
            <label className="form-field__label">Reference</label>
            <input value={record.reference} readOnly className="readonly-field" />
          </div>
          <div className="form-field">
            <label className="form-field__label">Forwarded From</label>
            <input value={record.forwardedFromOfficeName || 'Not recorded'} readOnly className="readonly-field" />
          </div>
          <div className="form-field">
            <label className="form-field__label">Receiving Office</label>
            <input value={currentUser?.officeName ?? ''} readOnly className="readonly-field" />
          </div>
          <div className="form-field">
            <label className="form-field__label">Received By</label>
            <input value={currentUser?.fullName ?? ''} readOnly className="readonly-field" />
          </div>
          <div className="form-field">
            <label className="form-field__label">Receipt Date and Time</label>
            <input value="17 Jul 2026, 11:22 AM" readOnly className="readonly-field" />
          </div>
          <div className="form-field form-field--full">
            <label htmlFor="detail-receipt-note" className="form-field__label">
              Receipt Note
            </label>
            <textarea
              id="detail-receipt-note"
              value={receiptNote}
              placeholder="Add an optional receipt note..."
              onChange={(event) => setReceiptNote(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isStageModalOpen}
        title="Update Current Stage"
        onClose={() => setIsStageModalOpen(false)}
        actions={
          <>
            <button type="button" className="button button--secondary" onClick={() => setIsStageModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="button button--primary" onClick={handleStageUpdate}>
              Update Stage
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          <div className="form-field">
            <label className="form-field__label">Current Stage</label>
            <input value={record.currentStage} readOnly className="readonly-field" />
          </div>
          <div className="form-field">
            <label htmlFor="detail-stage-select" className="form-field__label">
              New Stage
            </label>
            <select
              id="detail-stage-select"
              value={stageValues.stage}
              onChange={(event) => setStageValues((current) => ({ ...current, stage: event.target.value }))}
              aria-invalid={Boolean(modalErrors.stage)}
            >
              <option value="">Select stage</option>
              {workflowStageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {modalErrors.stage ? <p className="form-field__error">{modalErrors.stage}</p> : null}
          </div>
          <div className="form-field">
            <label htmlFor="detail-stage-deadline" className="form-field__label">
              New Stage Deadline
            </label>
            <input
              id="detail-stage-deadline"
              type="date"
              value={stageValues.stageDeadline}
              onChange={(event) =>
                setStageValues((current) => ({ ...current, stageDeadline: event.target.value }))
              }
              aria-invalid={Boolean(modalErrors.stageDeadline)}
            />
            {modalErrors.stageDeadline ? (
              <p className="form-field__error">{modalErrors.stageDeadline}</p>
            ) : null}
          </div>
          <div className="form-field">
            <label htmlFor="detail-stage-note" className="form-field__label">
              Update Note
            </label>
            <textarea
              id="detail-stage-note"
              value={stageValues.note}
              onChange={(event) => setStageValues((current) => ({ ...current, note: event.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isForwardModalOpen}
        title="Forward to Office"
        onClose={() => setIsForwardModalOpen(false)}
        actions={
          <>
            <button type="button" className="button button--secondary" onClick={() => setIsForwardModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="button button--primary" onClick={handleForward}>
              Forward to Office
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          <div className="form-field">
            <label className="form-field__label">From Office</label>
            <input value={record.currentOffice} readOnly className="readonly-field" />
          </div>
          <div className="form-field">
            <label htmlFor="detail-forward-office" className="form-field__label">
              Destination Office
            </label>
            <select
              id="detail-forward-office"
              value={forwardValues.destinationOffice}
              onChange={(event) =>
                setForwardValues((current) => ({ ...current, destinationOffice: event.target.value }))
              }
              aria-invalid={Boolean(modalErrors.destinationOffice)}
            >
              <option value="">Select destination office</option>
              {officeOptions.map((officeName) => (
                <option key={officeName} value={officeName}>
                  {officeName}
                </option>
              ))}
            </select>
            {modalErrors.destinationOffice ? (
              <p className="form-field__error">{modalErrors.destinationOffice}</p>
            ) : null}
          </div>
          <div className="form-field">
            <label htmlFor="detail-forward-stage" className="form-field__label">
              Next Stage
            </label>
            <select
              id="detail-forward-stage"
              value={forwardValues.nextStage}
              onChange={(event) =>
                setForwardValues((current) => ({ ...current, nextStage: event.target.value }))
              }
              aria-invalid={Boolean(modalErrors.nextStage)}
            >
              <option value="">Select next stage</option>
              {workflowStageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {modalErrors.nextStage ? <p className="form-field__error">{modalErrors.nextStage}</p> : null}
          </div>
          <div className="form-field">
            <label htmlFor="detail-forward-deadline" className="form-field__label">
              Stage Deadline
            </label>
            <input
              id="detail-forward-deadline"
              type="date"
              value={forwardValues.stageDeadline}
              onChange={(event) =>
                setForwardValues((current) => ({ ...current, stageDeadline: event.target.value }))
              }
              aria-invalid={Boolean(modalErrors.forwardDeadline)}
            />
            {modalErrors.forwardDeadline ? (
              <p className="form-field__error">{modalErrors.forwardDeadline}</p>
            ) : null}
          </div>
          <div className="form-field">
            <label htmlFor="detail-forward-instructions" className="form-field__label">
              Forwarding Instructions
            </label>
            <textarea
              id="detail-forward-instructions"
              value={forwardValues.instructions}
              onChange={(event) =>
                setForwardValues((current) => ({ ...current, instructions: event.target.value }))
              }
              aria-invalid={Boolean(modalErrors.instructions)}
            />
            {modalErrors.instructions ? (
              <p className="form-field__error">{modalErrors.instructions}</p>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCompleteModalOpen}
        title="Mark Correspondence Completed"
        onClose={() => setIsCompleteModalOpen(false)}
        actions={
          <>
            <button type="button" className="button button--secondary" onClick={() => setIsCompleteModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="button detail-complete-button" onClick={handleComplete}>
              Mark Completed
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          <p className="modal-card__description">
            Confirm that this office has completed the required correspondence action.
          </p>
          <div className="form-field">
            <label htmlFor="detail-complete-note" className="form-field__label">
              Completion Note
            </label>
            <textarea
              id="detail-complete-note"
              value={completionNote}
              onChange={(event) => setCompletionNote(event.target.value)}
            />
          </div>
        </div>
      </Modal>
    </section>
  )
}

export default CorrespondenceDetailPage
