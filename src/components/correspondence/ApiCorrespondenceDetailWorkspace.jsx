import { Download, Eye, File as FileIcon, FileText, Image as ImageIcon, Upload } from 'lucide-react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import Modal from '../common/Modal'
import SectionCard from '../common/SectionCard'
import StatusBadge from '../common/StatusBadge'
import FileUploadField from '../forms/FileUploadField'
import {
  CorrespondenceContractMismatch,
  CorrespondenceListLoading,
  CorrespondenceLoadError,
  CorrespondenceNotFound,
} from './CorrespondenceApiReadStates.jsx'
import {
  API_CORRESPONDENCE_READ_ACTIONS,
  API_CORRESPONDENCE_READ_STATUSES,
  apiCorrespondenceReadStateReducer,
  createInitialApiCorrespondenceReadState,
  mapApiCorrespondenceReadErrorToAction,
} from '../../context/apiCorrespondenceReadState.js'
import { getServiceBundle } from '../../services/serviceProvider.js'
import { getApiCorrespondenceIdForReference, registerApiCorrespondenceRouteRecord } from '../../utils/apiCorrespondenceRouteCache.js'
import {
  ATTACHMENT_INPUT_ACCEPT,
  createAttachmentDraftFromFile,
  getAttachmentDownloadUrl,
  isImageAttachment,
  isPdfAttachment,
  revokeAttachmentUrls,
} from '../../utils/attachments.js'
import {
  clearRegistrationReviewSnapshot,
  getRegistrationReviewSteps,
  loadRegistrationReviewSnapshot,
  mergeRegistrationReviewSnapshot,
  saveRegistrationReviewSnapshot,
} from '../../utils/correspondenceReview.js'
import {
  clearTransientRegistrationReviewAttachment,
  loadTransientRegistrationReviewAttachment,
} from '../../utils/registrationReviewSession.js'
import { getCorrespondenceActionPermissions } from '../../utils/correspondencePermissions.js'
import {
  getAttachmentListItemPresentation,
  getAttachmentPreviewAvailabilityState,
  getCurrentOfficeArrivalTimestamp,
  getDetailDocumentPreviewStateWithOptions,
  getDetailTerminalTimestamp,
  getDetailTimeRemaining,
  formatDetailDateOnly,
  formatDetailDateTime,
  getJourneyAuditPresentation,
  getRecordDetailSections,
  getTimeInCurrentOffice,
  getWorkflowProgressSteps,
} from '../../utils/correspondenceDetailPresentation.js'
import { getOfficeDisplayLabel, getSelectableForwardingOffices } from '../../utils/offices.js'
import { WORKFLOW_STAGE_OPTIONS } from '../../utils/registrationForm.js'
import { useAuth } from '../../context/useAuth.js'
import { useToast } from '../../context/useToast.js'
import { ApiError } from '../../services/apiClient.js'

const TAB_CONFIG = Object.freeze([
  { id: 'overview', label: 'Overview' },
  { id: 'journey', label: 'Journey & Audit' },
  { id: 'details', label: 'Record Details' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'notes', label: 'Notes' },
])

const TAB_QUERY_TO_ID = Object.freeze({
  overview: 'overview',
  'journey-audit': 'journey',
  'record-details': 'details',
  attachments: 'attachments',
  notes: 'notes',
})

const TAB_ID_TO_QUERY = Object.freeze({
  overview: 'overview',
  journey: 'journey-audit',
  details: 'record-details',
  attachments: 'attachments',
  notes: 'notes',
})

const RESTRICTED_HISTORY_MESSAGE =
  'This correspondence is no longer held by your office. Detailed record access is restricted while it is with another office.'
const VALID_GUIDED_FLOWS = new Set(['registration'])
const API_MUTATION_STAGE_OPTIONS = Object.freeze(
  ['Under Review', ...WORKFLOW_STAGE_OPTIONS].filter(
    (value, index, collection) => collection.indexOf(value) === index,
  ),
)

function getFieldDisplayValue(value, fallback = 'Not available') {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value !== null && value !== undefined && value !== '') {
    return String(value)
  }

  return fallback
}

function getApiOfficeDisplayName(office) {
  if (office?.name) {
    return office.name
  }

  return 'Office details unavailable'
}

function getReviewSnapshotOfficeDisplayName(office) {
  if (office?.name) {
    return office.name
  }

  return 'Not available'
}

function getAttachmentIcon(attachment) {
  if (isImageAttachment(attachment)) {
    return ImageIcon
  }

  if (isPdfAttachment(attachment)) {
    return FileText
  }

  return FileIcon
}

function isNativeFileObject(value) {
  return typeof globalThis.File === 'function' && value instanceof globalThis.File
}

function getDetailMessage(details, key) {
  const value = details?.[key]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }

  return ''
}

function getMutationErrorDetails(error) {
  if (error instanceof ApiError && error.details && typeof error.details === 'object') {
    return error.details
  }

  return {}
}

function getMutationFallbackMessage(error, fallbackMessage) {
  const details = getMutationErrorDetails(error)

  return (
    getDetailMessage(details, 'detail') ||
    getDetailMessage(details, 'non_field_errors') ||
    (error?.status === 401
      ? 'Your session has expired. Please sign in again.'
      : error?.status === 403
        ? 'You do not have permission to perform this action.'
        : error?.status === 413
          ? 'The selected file is larger than the allowed limit.'
          : error?.status === 422
            ? 'The submitted information could not be validated.'
            : error?.code === 'REQUEST_TIMEOUT' || error?.isTimeout
              ? 'The server took too long to respond. Please try again.'
              : error?.code === 'NETWORK_ERROR' || error?.isNetworkError
                ? 'Unable to reach the server. Please check your connection and try again.'
                : error?.status && error.status >= 500
                  ? 'The service is currently unavailable. Please try again later.'
                  : fallbackMessage)
  )
}

function RestrictedHistoryState() {
  return (
    <div className="correspondence-api-restricted">
      <EmptyState
        title="Record access unavailable"
        description={RESTRICTED_HISTORY_MESSAGE}
      />
      <div className="correspondence-api-restricted__actions">
        <Link to="/correspondence" className="button button--secondary">
          Back to Correspondence
        </Link>
      </div>
    </div>
  )
}

function ApiSubresourceState({ resource, children, onRetry }) {
  if (resource.status === 'loading') {
    return <EmptyState title="Loading correspondence" description="Please wait while this record section is loading." compact />
  }

  if (resource.status === 'access-denied') {
    return <EmptyState title="Record access unavailable" description={RESTRICTED_HISTORY_MESSAGE} compact />
  }

  if (resource.status === 'contract-mismatch') {
    return <CorrespondenceContractMismatch onRetry={onRetry} />
  }

  if (resource.status === 'error') {
    return <CorrespondenceLoadError onRetry={onRetry} />
  }

  return children
}

function getSubresourceFailureState(error) {
  const action = mapApiCorrespondenceReadErrorToAction(error)

  return {
    status:
      action === API_CORRESPONDENCE_READ_ACTIONS.FAIL_ACCESS_DENIED
        ? 'access-denied'
        : action === API_CORRESPONDENCE_READ_ACTIONS.FAIL_CONTRACT
          ? 'contract-mismatch'
          : 'error',
    items: [],
    error,
  }
}

function createRestrictedSubresourceState(error) {
  return {
    status: 'access-denied',
    items: [],
    error,
  }
}

function ApiCorrespondenceDetailWorkspace() {
  const navigate = useNavigate()
  const { reference } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef(null)
  const guidedReviewRef = useRef(null)
  const guidedReviewHeadingRef = useRef(null)
  const pendingAttachmentRef = useRef(null)
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const officeService = useMemo(() => getServiceBundle().offices, [])
  const correspondenceService = useMemo(() => getServiceBundle().correspondence, [])
  const attachmentService = useMemo(() => getServiceBundle().attachments, [])
  const noteService = useMemo(() => getServiceBundle().notes, [])
  const [detailState, dispatch] = useReducer(
    apiCorrespondenceReadStateReducer,
    undefined,
    createInitialApiCorrespondenceReadState,
  )
  const [movementsState, setMovementsState] = useState({ status: 'idle', items: [], error: null })
  const [attachmentsState, setAttachmentsState] = useState({ status: 'idle', items: [], error: null })
  const [notesState, setNotesState] = useState({ status: 'idle', items: [], error: null })
  const [selectedAttachmentId, setSelectedAttachmentId] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteError, setNoteError] = useState('')
  const [pendingAttachment, setPendingAttachment] = useState(null)
  const [attachmentError, setAttachmentError] = useState('')
  const [documentPreviewState, setDocumentPreviewState] = useState({
    status: 'idle',
    attachmentId: null,
    objectUrl: null,
    availability: 'available',
    error: null,
  })
  const [attachmentAvailabilityById, setAttachmentAvailabilityById] = useState({})
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false)
  const [isStageModalOpen, setIsStageModalOpen] = useState(false)
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [stageValues, setStageValues] = useState({
    stage: '',
    note: '',
  })
  const [forwardValues, setForwardValues] = useState({
    destinationOfficeId: '',
    note: '',
  })
  const [completionNote, setCompletionNote] = useState('')
  const [filingNote, setFilingNote] = useState('')
  const [stageError, setStageError] = useState('')
  const [forwardDestinationError, setForwardDestinationError] = useState('')
  const [stageFormError, setStageFormError] = useState('')
  const [forwardFormError, setForwardFormError] = useState('')
  const [completeFormError, setCompleteFormError] = useState('')
  const [fileFormError, setFileFormError] = useState('')
  const [isSubmittingStage, setIsSubmittingStage] = useState(false)
  const [isSubmittingForward, setIsSubmittingForward] = useState(false)
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false)
  const [isSubmittingFile, setIsSubmittingFile] = useState(false)
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [forwardingOfficesState, setForwardingOfficesState] = useState({
    status: 'idle',
    items: [],
    error: null,
  })
  const [isExitReviewDialogOpen, setIsExitReviewDialogOpen] = useState(false)
  const [isCompletingReview, setIsCompletingReview] = useState(false)
  const requestedTab = searchParams.get('tab')?.toLowerCase() ?? 'overview'
  const requestedFlow = searchParams.get('flow')?.toLowerCase() ?? ''
  const requestedStep = searchParams.get('step')?.toLowerCase() ?? ''
  const guidedFlow = VALID_GUIDED_FLOWS.has(requestedFlow) ? requestedFlow : ''
  const isGuidedFlow = Boolean(guidedFlow)
  const resolvedCorrespondenceId =
    (typeof location.state?.correspondenceId === 'string' && location.state.correspondenceId.trim()) ||
    getApiCorrespondenceIdForReference(reference ?? '') ||
    (typeof reference === 'string' && reference.trim() && !reference.includes('/')
      ? reference.trim()
      : null)
  const locationReviewSnapshot =
    location.state?.registrationReviewSnapshot &&
    typeof location.state.registrationReviewSnapshot === 'object' &&
    location.state.registrationReviewSnapshot.id === resolvedCorrespondenceId
      ? location.state.registrationReviewSnapshot
      : null
  const storedReviewSnapshot = useMemo(
    () => (resolvedCorrespondenceId ? loadRegistrationReviewSnapshot(resolvedCorrespondenceId) : null),
    [resolvedCorrespondenceId],
  )
  const transientReviewAttachment = useMemo(
    () =>
      resolvedCorrespondenceId
        ? loadTransientRegistrationReviewAttachment(resolvedCorrespondenceId)
        : null,
    [resolvedCorrespondenceId],
  )
  const reviewSnapshotBase = locationReviewSnapshot ?? storedReviewSnapshot
  const reviewSnapshot = useMemo(() => {
    if (isGuidedFlow && reviewSnapshotBase && transientReviewAttachment) {
      return {
        ...reviewSnapshotBase,
        attachments: [transientReviewAttachment],
      }
    }

    if (
      !isGuidedFlow ||
      !reviewSnapshotBase ||
      attachmentsState.status !== 'success' ||
      !attachmentsState.items.length
    ) {
      return reviewSnapshotBase
    }

    return mergeRegistrationReviewSnapshot(reviewSnapshotBase, attachmentsState.items)
  }, [
    attachmentsState.items,
    attachmentsState.status,
    isGuidedFlow,
    reviewSnapshotBase,
    transientReviewAttachment,
  ])
  const guidedSteps = useMemo(() => {
    if (!isGuidedFlow) {
      return []
    }

    return getRegistrationReviewSteps(reviewSnapshot?.attachments?.[0] ?? null)
  }, [isGuidedFlow, reviewSnapshot])
  const activeGuidedStep =
    guidedSteps.find((step) => step.id === requestedStep) ?? guidedSteps[0] ?? null
  const activeGuidedStepIndex = activeGuidedStep
    ? guidedSteps.findIndex((step) => step.id === activeGuidedStep.id)
    : -1
  const isFinalGuidedStep =
    activeGuidedStepIndex >= 0 && activeGuidedStepIndex === guidedSteps.length - 1
  const activeTabId = TAB_QUERY_TO_ID[requestedTab] ?? 'overview'
  const activeReviewAttachment = reviewSnapshot?.attachments?.[0] ?? attachmentsState.items[0] ?? null
  const detailId = detailState.detail?.id ?? null
  const permissions = useMemo(
    () =>
      getCorrespondenceActionPermissions({
        record: detailState.detail,
        user: currentUser,
        isGuidedReview: isGuidedFlow,
      }),
    [currentUser, detailState.detail, isGuidedFlow],
  )
  const forwardingDestinationOffices = useMemo(() => {
    return getSelectableForwardingOffices(
      forwardingOfficesState.items,
      detailState.detail?.currentOffice ?? currentUser?.office ?? null,
    )
  }, [currentUser?.office, detailState.detail?.currentOffice, forwardingOfficesState.items])

  useEffect(() => {
    pendingAttachmentRef.current = pendingAttachment
  }, [pendingAttachment])

  useEffect(
    () => () => {
      revokeAttachmentUrls(pendingAttachmentRef.current)
    },
    [],
  )

  useEffect(() => {
    if (isGuidedFlow) {
      return
    }

    if (requestedTab === TAB_ID_TO_QUERY[activeTabId]) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', TAB_ID_TO_QUERY[activeTabId])
    setSearchParams(nextSearchParams, { replace: true })
  }, [activeTabId, isGuidedFlow, requestedTab, searchParams, setSearchParams])

  useEffect(() => {
    if (!isGuidedFlow || !reviewSnapshot?.id) {
      return
    }

    saveRegistrationReviewSnapshot(reviewSnapshot)
  }, [isGuidedFlow, reviewSnapshot])

  useEffect(
    () => () => {
      if (isGuidedFlow) {
        clearTransientRegistrationReviewAttachment(resolvedCorrespondenceId)
      }
    },
    [isGuidedFlow, resolvedCorrespondenceId],
  )

  useEffect(() => {
    if (!resolvedCorrespondenceId) {
      dispatch({
        type: API_CORRESPONDENCE_READ_ACTIONS.FAIL_NOT_FOUND,
        error: { status: 404 },
      })
      return
    }

    let cancelled = false

    async function loadDetail() {
      dispatch({ type: API_CORRESPONDENCE_READ_ACTIONS.LOAD_DETAIL })

      try {
        const detail = await correspondenceService.getCorrespondenceById(resolvedCorrespondenceId)

        if (cancelled) {
          return
        }

        registerApiCorrespondenceRouteRecord(detail)
        dispatch({
          type: API_CORRESPONDENCE_READ_ACTIONS.DETAIL_SUCCESS,
          detail,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        dispatch({
          type: mapApiCorrespondenceReadErrorToAction(error),
          error,
        })
      }
    }

    void loadDetail()

    return () => {
      cancelled = true
    }
  }, [correspondenceService, detailState.retryCount, resolvedCorrespondenceId])

  useEffect(() => {
    if (!detailId) {
      return
    }

    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setAttachmentAvailabilityById({})
      }
    })

    async function loadSubresource(loader, setState) {
      setState((current) => ({ ...current, status: 'loading', error: null }))

      try {
        const items = await loader(detailId)

        if (cancelled) {
          return
        }

        setState({
          status: 'success',
          items,
          error: null,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setState(getSubresourceFailureState(error))
      }
    }

    void loadSubresource(attachmentService.listAttachments, setAttachmentsState)

    if (!isGuidedFlow) {
      void loadSubresource(
        correspondenceService.listCorrespondenceMovements,
        setMovementsState,
      )
      void loadSubresource(noteService.listNotes, setNotesState)
    }

    return () => {
      cancelled = true
    }
  }, [attachmentService, correspondenceService, detailId, isGuidedFlow, noteService])

  const selectedAttachment = useMemo(
    () =>
      attachmentsState.items.find((attachment) => attachment.id === selectedAttachmentId) ??
      attachmentsState.items[0] ??
      null,
    [attachmentsState.items, selectedAttachmentId],
  )
  const previewAttachment = isGuidedFlow ? activeReviewAttachment : selectedAttachment
  const resolvedPreviewAttachment = useMemo(() => {
    if (
      !previewAttachment ||
      !documentPreviewState.objectUrl ||
      documentPreviewState.attachmentId !== previewAttachment.id
    ) {
      return previewAttachment
    }

    return {
      ...previewAttachment,
      previewUrl: documentPreviewState.objectUrl,
    }
  }, [documentPreviewState.attachmentId, documentPreviewState.objectUrl, previewAttachment])

  useEffect(() => {
    let cancelled = false
    let generatedObjectUrl = null
    const targetAttachment = previewAttachment
    const canAttemptInlinePreview =
      Boolean(targetAttachment) &&
      (isPdfAttachment(targetAttachment) || isImageAttachment(targetAttachment))
    const publishPreviewState = (nextState) => {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setDocumentPreviewState(nextState)
        }
      })
    }
    const publishAttachmentAvailability = (attachmentId, availability) => {
      if (!attachmentId) {
        return
      }

      void Promise.resolve().then(() => {
        if (!cancelled) {
          setAttachmentAvailabilityById((current) => ({
            ...current,
            [attachmentId]: availability,
          }))
        }
      })
    }

    if (!canAttemptInlinePreview) {
      publishPreviewState({
        status: 'idle',
        attachmentId: targetAttachment?.id ?? null,
        objectUrl: null,
        availability: 'available',
        error: null,
      })

      return () => {
        cancelled = true
      }
    }

    const fileObject = targetAttachment?.fileObject ?? null

    if (isNativeFileObject(fileObject)) {
      generatedObjectUrl = URL.createObjectURL(fileObject)

      publishPreviewState({
        status: 'success',
        attachmentId: targetAttachment.id ?? null,
        objectUrl: generatedObjectUrl,
        availability: 'available',
        error: null,
      })
      publishAttachmentAvailability(targetAttachment.id, 'available')

      return () => {
        cancelled = true

        if (generatedObjectUrl) {
          URL.revokeObjectURL(generatedObjectUrl)
        }
      }
    }

    if (!getAttachmentDownloadUrl(targetAttachment)) {
      publishPreviewState({
        status: 'error',
        attachmentId: targetAttachment?.id ?? null,
        objectUrl: null,
        availability: 'preview-failed',
        error: null,
      })

      return () => {
        cancelled = true
      }
    }

    const abortController = new AbortController()
    publishPreviewState({
      status: 'loading',
      attachmentId: targetAttachment.id ?? null,
      objectUrl: null,
      availability: 'available',
      error: null,
    })

    void attachmentService
      .getAttachmentPreviewBlob(targetAttachment, { signal: abortController.signal })
      .then((blob) => {
        generatedObjectUrl = URL.createObjectURL(blob)

        if (cancelled) {
          URL.revokeObjectURL(generatedObjectUrl)
          return
        }

        setDocumentPreviewState({
          status: 'success',
          attachmentId: targetAttachment.id ?? null,
          objectUrl: generatedObjectUrl,
          availability: 'available',
          error: null,
        })
        publishAttachmentAvailability(targetAttachment.id, 'available')
      })
      .catch((error) => {
        if (cancelled || error?.name === 'AbortError') {
          return
        }

        const availability = getAttachmentPreviewAvailabilityState(error)

        setDocumentPreviewState({
          status: 'error',
          attachmentId: targetAttachment.id ?? null,
          objectUrl: null,
          availability,
          error,
        })
        publishAttachmentAvailability(targetAttachment.id, availability)
      })

    return () => {
      cancelled = true
      abortController.abort()

      if (generatedObjectUrl) {
        URL.revokeObjectURL(generatedObjectUrl)
      }
    }
  }, [attachmentService, previewAttachment])

  const handleRetryDetail = () => {
    dispatch({ type: API_CORRESPONDENCE_READ_ACTIONS.RETRY })
  }

  const setRestrictedHistoryState = (error) => {
    dispatch({
      type: API_CORRESPONDENCE_READ_ACTIONS.FAIL_ACCESS_DENIED,
      error,
    })
    setMovementsState(createRestrictedSubresourceState(error))
    setAttachmentsState(createRestrictedSubresourceState(error))
    setNotesState(createRestrictedSubresourceState(error))
  }

  const refreshDetailAndMovements = async (correspondenceId, options = {}) => {
    const allowRestrictedDetail = options.allowRestrictedDetail === true
    let nextDetail

    try {
      nextDetail = await correspondenceService.getCorrespondenceById(correspondenceId)
    } catch (error) {
      if (allowRestrictedDetail && error?.status === 403) {
        setRestrictedHistoryState(error)
        return {
          detail: null,
          restricted: true,
        }
      }

      throw error
    }

    registerApiCorrespondenceRouteRecord(nextDetail)
    dispatch({
      type: API_CORRESPONDENCE_READ_ACTIONS.DETAIL_SUCCESS,
      detail: nextDetail,
    })

    try {
      const nextMovements = await correspondenceService.listCorrespondenceMovements(correspondenceId)
      setMovementsState({
        status: 'success',
        items: nextMovements,
        error: null,
      })
    } catch (error) {
      if (allowRestrictedDetail && error?.status === 403) {
        setMovementsState(createRestrictedSubresourceState(error))
        return {
          detail: nextDetail,
          restricted: false,
          movementsRestricted: true,
        }
      }

      throw error
    }

    return {
      detail: nextDetail,
      restricted: false,
      movementsRestricted: false,
    }
  }

  useEffect(() => {
    if (!isGuidedFlow || !guidedSteps.length || !activeGuidedStep) {
      return
    }

    if (requestedStep === activeGuidedStep.id) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('flow', guidedFlow)
    nextSearchParams.set('step', activeGuidedStep.id)
    nextSearchParams.delete('tab')
    setSearchParams(nextSearchParams, { replace: true })
  }, [activeGuidedStep, guidedFlow, guidedSteps, isGuidedFlow, requestedStep, searchParams, setSearchParams])

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
    clearRegistrationReviewSnapshot(resolvedCorrespondenceId)
    clearTransientRegistrationReviewAttachment(resolvedCorrespondenceId)
    setIsExitReviewDialogOpen(false)
    navigate('/correspondence', {
      state: {
        correspondenceAction: 'review-exited',
        correspondenceReference: reviewSnapshot?.referenceNumber ?? detailState.detail?.referenceNumber ?? '',
        correspondenceSubject: reviewSnapshot?.subject ?? detailState.detail?.subject ?? '',
      },
    })
  }

  const loadForwardingOffices = async () => {
    setForwardingOfficesState((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }))

    try {
      const items = await officeService.listOffices()
      setForwardingOfficesState({
        status: 'success',
        items,
        error: null,
      })
    } catch (error) {
      setForwardingOfficesState({
        status: 'error',
        items: [],
        error,
      })
    }
  }

  const handleOpenStageModal = () => {
    setStageValues({
      stage: '',
      note: '',
    })
    setStageError('')
    setStageFormError('')
    setIsStageModalOpen(true)
  }

  const handleOpenForwardModal = () => {
    setForwardValues({
      destinationOfficeId: '',
      note: '',
    })
    setForwardDestinationError('')
    setForwardFormError('')
    setIsForwardModalOpen(true)
    void loadForwardingOffices()
  }

  const handleCloseForwardModal = () => {
    setIsForwardModalOpen(false)
  }

  const handleOpenCompleteModal = () => {
    setCompletionNote('')
    setCompleteFormError('')
    setIsCompleteModalOpen(true)
  }

  const handleOpenFileModal = () => {
    setFilingNote('')
    setFileFormError('')
    setIsFileModalOpen(true)
  }

  const handleAttachmentDraft = (event) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      revokeAttachmentUrls(pendingAttachment)
      setPendingAttachment(null)
      setAttachmentError('')
      return
    }

    try {
      const nextAttachment = createAttachmentDraftFromFile(selectedFile, {
        correspondenceId: detailState.detail?.id ?? null,
      })
      revokeAttachmentUrls(pendingAttachment)
      setPendingAttachment(nextAttachment)
      setAttachmentError('')
    } catch (error) {
      revokeAttachmentUrls(pendingAttachment)
      setPendingAttachment(null)
      setAttachmentError(
        error.validation?.errors?.[0]?.message ?? 'The selected file type is not supported.',
      )
      event.target.value = ''
    }
  }

  const handleOpenAttachmentModal = () => {
    revokeAttachmentUrls(pendingAttachment)
    setPendingAttachment(null)
    setAttachmentError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    setIsAttachmentModalOpen(true)
  }

  const handleCloseAttachmentModal = () => {
    revokeAttachmentUrls(pendingAttachment)
    setPendingAttachment(null)
    setAttachmentError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    setIsAttachmentModalOpen(false)
  }

  const handleStageUpdate = async () => {
    if (isSubmittingStage || !detailState.detail?.id) {
      return
    }

    const nextStage = String(stageValues.stage ?? '').trim()

    if (!nextStage) {
      setStageError('Select a new stage.')
      return
    }

    if (nextStage === detailState.detail.currentStage) {
      setStageError('Choose a stage different from the current stage.')
      return
    }

    setIsSubmittingStage(true)
    setStageError('')
    setStageFormError('')

    try {
      await correspondenceService.updateCorrespondenceStage(detailState.detail.id, {
        currentStage: nextStage,
        note: stageValues.note,
      })
      await refreshDetailAndMovements(detailState.detail.id)
      setIsStageModalOpen(false)
      showToast({
        title: 'Current stage updated successfully.',
      })
    } catch (error) {
      const details = getMutationErrorDetails(error)
      setStageError(
        getDetailMessage(details, 'current_stage') ||
          getDetailMessage(details, 'currentStage') ||
          getDetailMessage(details, 'stage'),
      )
      setStageFormError(
        getMutationFallbackMessage(error, 'Unable to update the current stage. Please try again.'),
      )
    } finally {
      setIsSubmittingStage(false)
    }
  }

  const handleForwardCorrespondence = async () => {
    if (isSubmittingForward || !detailState.detail?.id) {
      return
    }

    const destinationOfficeId = String(forwardValues.destinationOfficeId ?? '').trim()

    if (!destinationOfficeId) {
      setForwardDestinationError('Select a destination office.')
      return
    }

    setIsSubmittingForward(true)
    setForwardDestinationError('')
    setForwardFormError('')

    let forwardAccepted = false

    try {
      await correspondenceService.forwardCorrespondence(detailState.detail.id, {
        destinationOfficeId,
        note: forwardValues.note,
      })
      forwardAccepted = true

      const syncResult = await refreshDetailAndMovements(detailState.detail.id, {
        allowRestrictedDetail: true,
      })

      setForwardValues({
        destinationOfficeId: '',
        note: '',
      })
      setIsForwardModalOpen(false)
      showToast({
        title: 'Correspondence forwarded successfully.',
        description: syncResult.restricted
          ? 'Detailed access is now restricted because this correspondence is with another office.'
          : undefined,
      })
    } catch (error) {
      if (forwardAccepted) {
        setForwardValues({
          destinationOfficeId: '',
          note: '',
        })
        setIsForwardModalOpen(false)
        showToast({
          title: 'Correspondence forwarded successfully.',
          description:
            'The updated record access could not be refreshed automatically. Return to the correspondence list to continue.',
        })
        return
      }

      const details = getMutationErrorDetails(error)
      setForwardDestinationError(
        getDetailMessage(details, 'to_office') ||
          getDetailMessage(details, 'toOffice') ||
          getDetailMessage(details, 'destinationOfficeId'),
      )
      setForwardFormError(
        getMutationFallbackMessage(error, 'Unable to forward this correspondence. Please try again.'),
      )
    } finally {
      setIsSubmittingForward(false)
    }
  }

  const handleCompleteCorrespondence = async () => {
    if (isSubmittingComplete || !detailState.detail?.id) {
      return
    }

    setIsSubmittingComplete(true)
    setCompleteFormError('')

    try {
      await correspondenceService.completeCorrespondence(detailState.detail.id, {
        note: completionNote,
      })
      await refreshDetailAndMovements(detailState.detail.id)
      setCompletionNote('')
      setIsCompleteModalOpen(false)
      showToast({
        title: 'Correspondence completed successfully.',
      })
    } catch (error) {
      setCompleteFormError(
        getMutationFallbackMessage(error, 'Unable to complete this correspondence. Please try again.'),
      )
    } finally {
      setIsSubmittingComplete(false)
    }
  }

  const handleFileCorrespondence = async () => {
    if (isSubmittingFile || !detailState.detail?.id) {
      return
    }

    setIsSubmittingFile(true)
    setFileFormError('')

    try {
      await correspondenceService.fileCorrespondence(detailState.detail.id, {
        note: filingNote,
      })
      await refreshDetailAndMovements(detailState.detail.id)
      setFilingNote('')
      setIsFileModalOpen(false)
      showToast({
        title: 'Correspondence filed successfully.',
      })
    } catch (error) {
      setFileFormError(
        getMutationFallbackMessage(error, 'Unable to file this correspondence. Please try again.'),
      )
    } finally {
      setIsSubmittingFile(false)
    }
  }

  const handleAddNote = async (event) => {
    event.preventDefault()

    if (isSubmittingNote || !detailState.detail?.id) {
      return
    }

    const normalizedText = String(noteBody ?? '').trim()

    if (!normalizedText) {
      setNoteError('Enter a note before saving.')
      return
    }

    setIsSubmittingNote(true)
    setNoteError('')

    try {
      await noteService.createNote(detailState.detail.id, normalizedText)
      const [nextNotes, nextMovements] = await Promise.all([
        noteService.listNotes(detailState.detail.id),
        correspondenceService.listCorrespondenceMovements(detailState.detail.id),
      ])
      setNotesState({
        status: 'success',
        items: nextNotes,
        error: null,
      })
      setMovementsState({
        status: 'success',
        items: nextMovements,
        error: null,
      })
      setNoteBody('')
      showToast({
        title: 'Note added successfully.',
      })
    } catch (error) {
      const details = getMutationErrorDetails(error)
      setNoteError(
        getDetailMessage(details, 'text') ||
          getMutationFallbackMessage(error, 'Unable to add the note. Please try again.'),
      )
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleAddAttachment = async () => {
    if (isUploadingAttachment || !detailState.detail?.id) {
      return
    }

    const file = pendingAttachment?.fileObject ?? null

    if (!file) {
      setAttachmentError('Choose an attachment before uploading it.')
      return
    }

    setIsUploadingAttachment(true)
    setAttachmentError('')

    try {
      const uploadedAttachment = await attachmentService.uploadAttachment(detailState.detail.id, file)
      setSelectedAttachmentId(uploadedAttachment?.id ?? '')
      const [nextAttachments, nextMovements] = await Promise.all([
        attachmentService.listAttachments(detailState.detail.id),
        correspondenceService.listCorrespondenceMovements(detailState.detail.id),
      ])
      setAttachmentsState({
        status: 'success',
        items: nextAttachments,
        error: null,
      })
      setMovementsState({
        status: 'success',
        items: nextMovements,
        error: null,
      })
      handleCloseAttachmentModal()
      showToast({
        title: 'Attachment uploaded successfully.',
      })
    } catch (error) {
      const details = getMutationErrorDetails(error)
      setAttachmentError(
        getDetailMessage(details, 'file') ||
          getMutationFallbackMessage(error, 'Unable to upload the attachment. Please try again.'),
      )
    } finally {
      setIsUploadingAttachment(false)
    }
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
    clearRegistrationReviewSnapshot(resolvedCorrespondenceId)
    clearTransientRegistrationReviewAttachment(resolvedCorrespondenceId)
    navigate('/correspondence', {
      state: {
        correspondenceAction: 'registered',
        correspondenceReference: reviewSnapshot?.referenceNumber ?? detailState.detail?.referenceNumber ?? '',
        correspondenceSubject: reviewSnapshot?.subject ?? detailState.detail?.subject ?? '',
      },
    })
  }

  const renderDocumentPreview = () => {
    const isPreviewablePersistedAttachment =
      Boolean(resolvedPreviewAttachment) &&
      (isPdfAttachment(resolvedPreviewAttachment) || isImageAttachment(resolvedPreviewAttachment)) &&
      !isNativeFileObject(resolvedPreviewAttachment?.fileObject)

    if (
      !resolvedPreviewAttachment &&
      (attachmentsState.status === 'loading' || attachmentsState.status === 'idle')
    ) {
      return (
        <div className="document-preview-fallback">
          <EmptyState
            title="Loading document"
            description="Please wait while the linked document is prepared."
            compact
          />
        </div>
      )
    }

    if (!resolvedPreviewAttachment) {
      return (
        <div className="document-preview-fallback">
          <EmptyState
            title="No document available"
            description="No document has been linked to this correspondence."
            compact
          />
        </div>
      )
    }

    if (
      documentPreviewState.status === 'loading' ||
      (documentPreviewState.status === 'idle' && isPreviewablePersistedAttachment)
    ) {
      return (
        <div className="document-preview-fallback">
          <EmptyState
            title="Loading document"
            description="Please wait while the linked document is prepared."
            compact
          />
        </div>
      )
    }

    const previewState = getDetailDocumentPreviewStateWithOptions(resolvedPreviewAttachment, {
      availability: documentPreviewState.availability,
    })

    if (previewState.mode === 'image') {
      return (
        <div className="document-preview-image-container">
          <img
            className="document-preview-image"
            src={previewState.viewUrl}
            alt={`${previewState.fileName} preview`}
          />
        </div>
      )
    }

    if (previewState.mode === 'embedded-pdf') {
      return (
        <iframe
          className="document-preview-frame"
          title={`${previewState.fileName} preview`}
          src={previewState.viewUrl}
        />
      )
    }

    if (
      previewState.mode === 'document' ||
      previewState.mode === 'preview-unavailable' ||
      previewState.mode === 'missing-file' ||
      previewState.mode === 'access-restricted'
    ) {
      return (
        <div className="document-preview-fallback">
          <span className="detail-attachment-item__icon detail-document-preview__icon">
            {previewState.mode === 'preview-unavailable' ? (
              <FileText size={22} aria-hidden="true" />
            ) : (
              <FileIcon size={22} aria-hidden="true" />
            )}
          </span>
          <div className="detail-document-preview__copy">
            <strong>{previewState.title}</strong>
            <p>{previewState.description}</p>
            <p>{previewState.fileName}</p>
            {previewState.typeLabel || previewState.sizeLabel ? (
              <p>
                {[previewState.typeLabel, previewState.sizeLabel].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
          <div className="detail-document-preview__actions">
            {previewState.viewUrl ? (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  window.open(previewState.viewUrl, '_blank', 'noopener,noreferrer')
                }}
              >
                Open Document
              </button>
            ) : null}
            {previewState.downloadUrl ? (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  window.open(previewState.downloadUrl, '_blank', 'noopener,noreferrer')
                }}
              >
                Download
              </button>
            ) : null}
          </div>
        </div>
      )
    }

    return null
  }

  const renderRegistrationSummary = () => {
    const summaryFields = [
      ['Backend Reference', reviewSnapshot?.referenceNumber],
      ['Document Type', reviewSnapshot?.documentType],
      ['Subject', reviewSnapshot?.subject],
      ['Sender / Origin', reviewSnapshot?.sender],
      ['Direction', reviewSnapshot?.direction],
      ['Priority', reviewSnapshot?.priority],
      ['Document Date', formatDetailDateOnly(reviewSnapshot?.documentDate, 'Not available')],
      ['Date Received', formatDetailDateOnly(reviewSnapshot?.receivedAt, 'Not available')],
      ['Overall Completion Date / Deadline', formatDetailDateOnly(reviewSnapshot?.deadline, 'Not available')],
      ['Registering Office', getReviewSnapshotOfficeDisplayName(reviewSnapshot?.registeringOffice)],
      ['Initial Office', getReviewSnapshotOfficeDisplayName(reviewSnapshot?.initialOffice)],
      ['Initial Stage', reviewSnapshot?.initialStage],
      ['Stage Deadline', formatDetailDateOnly(reviewSnapshot?.stageDeadline, 'Not available')],
      ['Required Action / Instructions', reviewSnapshot?.instructions],
    ]

    return (
      <SectionCard
        title="Registration Summary"
        className="detail-review-card"
      >
        <dl className="detail-review-summary">
          {summaryFields.map(([label, value]) => (
            <div key={label} className="detail-review-summary__item">
              <dt>{label}</dt>
              <dd>{getFieldDisplayValue(value, 'Not available')}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    )
  }

  const renderRegistrationNotes = () => (
    <SectionCard
      title="Notes & Instructions"
      className="detail-review-card"
    >
      <div className="detail-review-notes">
        <p>{getFieldDisplayValue(reviewSnapshot?.instructions, 'No instructions were provided.')}</p>
      </div>
    </SectionCard>
  )

  const renderGuidedReviewContent = () => {
    if (activeGuidedStep?.id === 'document-preview') {
      return (
        <SectionCard
          title="Document Preview"
          className="detail-review-card detail-overview-card"
        >
          <div className="detail-document-preview detail-review-preview">
            {renderDocumentPreview()}
          </div>
        </SectionCard>
      )
    }

    if (activeGuidedStep?.id === 'notes-instructions') {
      return renderRegistrationNotes()
    }

    return renderRegistrationSummary()
  }

  const renderGuidedReview = () => (
    <>
      <section className="detail-review-flow" ref={guidedReviewRef}>
        <div className="detail-review-flow__banner">
          <div className="detail-review-flow__copy">
            <p className="detail-review-flow__eyebrow">
              Step {activeGuidedStepIndex + 1} of {guidedSteps.length}
            </p>
            <h1 ref={guidedReviewHeadingRef} tabIndex={-1}>
              Registration Review
            </h1>
            <p>
              {reviewSnapshot?.referenceNumber
                ? `${reviewSnapshot.referenceNumber} · ${getFieldDisplayValue(
                    reviewSnapshot.subject,
                    'Newly registered correspondence',
                  )}`
                : 'Review the newly registered correspondence before completing the process.'}
            </p>
          </div>
          <div className="detail-review-flow__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsExitReviewDialogOpen(true)}
            >
              Exit Review
            </button>
          </div>
        </div>

        <div className="detail-review-steps" aria-label="Registration Review steps">
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
                disabled={!isClickable}
                onClick={() => {
                  if (isClickable) {
                    handleGuidedStepChange(step.id)
                  }
                }}
              >
                <span className="detail-review-step__marker">{index + 1}</span>
                <span className="detail-review-step__copy">
                  <strong className="detail-review-step__title">{step.title}</strong>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {renderGuidedReviewContent()}

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
            {isCompletingReview ? 'Finishing...' : 'Finish Review'}
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

      <ConfirmDialog
        isOpen={isExitReviewDialogOpen}
        title="Exit Review"
        description="The correspondence has already been created. Exit the review and return to All Correspondence?"
        confirmLabel="Exit Review"
        cancelLabel="Continue Reviewing"
        onConfirm={exitGuidedReview}
        onClose={() => setIsExitReviewDialogOpen(false)}
      />
    </>
  )

  const renderOverview = () => {
    const detail = detailState.detail
    const arrivedAtOffice = getCurrentOfficeArrivalTimestamp(detail, movementsState.items)
    const terminalTimestamp = getDetailTerminalTimestamp(detail, movementsState.items)
    const timeRemaining = getDetailTimeRemaining(
      detail.deadline,
      detail.status,
      new Date(),
      terminalTimestamp,
    )
    const timeInCurrentOffice = getTimeInCurrentOffice(
      arrivedAtOffice,
      terminalTimestamp ?? undefined,
    )
    const workflowSteps = getWorkflowProgressSteps(detail, movementsState.items)
    const timeRemainingClassName =
      timeRemaining.tone === 'due-soon'
        ? 'detail-overview-list__time--due-soon'
        : timeRemaining.tone === 'overdue'
          ? 'detail-overview-list__time--overdue'
          : timeRemaining.tone === 'completed'
            ? 'detail-overview-list__time--completed'
            : timeRemaining.tone === 'filed'
              ? 'detail-overview-list__time--filed'
              : ''

    return (
      <>
        <div className="detail-overview-grid">
          <SectionCard
            title="Document Preview"
            className="detail-overview-card"
          >
            <div className="detail-document-preview">
              {renderDocumentPreview()}
            </div>
          </SectionCard>

          <div className="detail-overview-sidebar">
            <SectionCard
              title="Current Position"
              className="detail-overview-card"
            >
              <div className="detail-position-card__highlight">
                <span>Current Office</span>
                <strong>{getApiOfficeDisplayName(detail.currentOffice)}</strong>
              </div>
              <dl className="detail-overview-list">
                <div className="detail-inline-row">
                  <dt>Current Stage</dt>
                  <dd>{getFieldDisplayValue(detail.currentStage, 'Unavailable')}</dd>
                </div>
                <div className="detail-inline-row">
                  <dt>Time in Current Office</dt>
                  <dd>{timeInCurrentOffice.label}</dd>
                </div>
                <div className="detail-inline-row">
                  <dt>{timeRemaining.overviewLabel}</dt>
                  <dd className={timeRemainingClassName}>{timeRemaining.label}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard
              title="Workflow Progress"
              className="detail-overview-card"
            >
              {movementsState.status === 'success' && workflowSteps.length ? (
                <div className="detail-workflow-progress">
                  {workflowSteps.map((step, index) => (
                    <div key={step.id ?? `${step.title}-${index + 1}`} className="detail-workflow-progress__step">
                      <span
                        className={`detail-workflow-progress__marker ${
                          step.state === 'current'
                            ? 'detail-workflow-progress__marker--current'
                            : 'detail-workflow-progress__marker--done'
                        }`.trim()}
                        aria-hidden="true"
                      >
                        {step.state === 'current' ? index + 1 : '✓'}
                      </span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : movementsState.status === 'loading' || movementsState.status === 'idle' ? (
                <div className="detail-workflow-progress">
                  <EmptyState
                    title="Loading workflow"
                    description="Please wait while the movement history is prepared."
                    compact
                  />
                </div>
              ) : (
                <div className="detail-workflow-progress">
                  <EmptyState
                    title="Workflow progress unavailable"
                    description="The office-to-office journey is not available for this correspondence."
                    compact
                  />
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        {permissions.canUpdateStage || permissions.canForward || permissions.canMarkCompleted || permissions.canFile ? (
          <div className="detail-overview-actions">
            {permissions.canUpdateStage ? (
              <button type="button" className="button button--secondary" onClick={handleOpenStageModal}>
                Update Stage
              </button>
            ) : null}
            {permissions.canForward ? (
              <button type="button" className="button button--secondary" onClick={handleOpenForwardModal}>
                Forward to Office
              </button>
            ) : null}
            {permissions.canMarkCompleted ? (
              <button type="button" className="button button--primary" onClick={handleOpenCompleteModal}>
                Complete
              </button>
            ) : null}
            {permissions.canFile ? (
              <button type="button" className="button button--secondary" onClick={handleOpenFileModal}>
                File
              </button>
            ) : null}
          </div>
        ) : null}
      </>
    )
  }

  const renderJourney = () => (
    <SectionCard
      title="Journey & Audit"
    >
      <ApiSubresourceState resource={movementsState} onRetry={handleRetryDetail}>
        {movementsState.items.length ? (
          <div className="detail-audit-summary">
            {movementsState.items.map((movement) => (
              <article
                key={movement.id ?? `${movement.action}-${movement.performedAt}`}
                className="detail-audit-summary__row"
              >
                <span className="detail-audit-summary__marker" aria-hidden="true" />
                <div className="detail-audit-summary__content">
                  <strong>{getJourneyAuditPresentation(movement).title}</strong>
                  <p>{getJourneyAuditPresentation(movement).description}</p>
                </div>
                <span className="detail-audit-summary__time">
                  {formatDetailDateTime(movement.performedAt)}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No journey records available"
            description="No workflow movement has been recorded for this correspondence."
            compact
          />
        )}
      </ApiSubresourceState>
    </SectionCard>
  )

  const renderDetails = () => {
    const detail = detailState.detail
    const recordSections = getRecordDetailSections(detail)

    return (
      <SectionCard
        title="Record Details"
      >
        <div className="detail-record-layout">
          <div className="detail-record-grid">
            {recordSections.map((section) => (
              <section
                key={section.id}
                className={`detail-record-section${section.fullWidth ? ' detail-record-section--full' : ''}`}
              >
                <div className="detail-record-section__header">
                  <h3>{section.title}</h3>
                </div>
                <dl className="detail-record-section__body">
                  {section.fields.map((field, index) => (
                    <div
                      key={`${section.id}-${field.label}`}
                      className={`detail-field-row${index === section.fields.length - 1 ? ' detail-field-row--last' : ''}`}
                    >
                      <dt>{field.label}</dt>
                      <dd>
                        {field.tone === 'status' ? (
                          <StatusBadge status={getFieldDisplayValue(field.value, 'Unavailable')} />
                        ) : field.tone === 'priority' ? (
                          <span
                            className={`detail-priority-badge ${
                              String(field.value).toLowerCase() === 'urgent'
                                ? 'detail-priority-badge--urgent'
                                : String(field.value).toLowerCase() === 'high'
                                  ? 'detail-priority-badge--high'
                                  : ''
                            }`.trim()}
                          >
                            {field.value}
                          </span>
                        ) : (
                          field.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </SectionCard>
    )
  }

  const renderAttachments = () => (
    <SectionCard
      title="Attachments"
      action={
        permissions.canAddAttachment ? (
          <button
            type="button"
            className="button button--primary detail-attachments__add-button"
            onClick={handleOpenAttachmentModal}
          >
            <Upload size={16} aria-hidden="true" />
            <span>Add Attachment</span>
          </button>
        ) : null
      }
    >
      <ApiSubresourceState resource={attachmentsState} onRetry={handleRetryDetail}>
        {attachmentsState.items.length ? (
          <div className="detail-attachment-list">
            <div className="detail-attachment-list__header">
              <span className="detail-attachment-col detail-attachment-col--filename">Filename</span>
              <span className="detail-attachment-col detail-attachment-col--type">Type</span>
              <span className="detail-attachment-col detail-attachment-col--uploaded-by">Uploaded By</span>
              <span className="detail-attachment-col detail-attachment-col--size">Size</span>
              <span className="detail-attachment-col detail-attachment-col--uploaded-at">Uploaded At</span>
              <span className="detail-attachment-col detail-attachment-col--actions">Actions</span>
            </div>
            <div className="detail-attachment-list__body">
              {attachmentsState.items.map((attachment) => {
                const AttachmentIcon = getAttachmentIcon(attachment)
                const attachmentItem = getAttachmentListItemPresentation(attachment)
                const attachmentAvailability =
                  attachmentAvailabilityById[attachment.id] ?? 'unknown'
                const canUseStoredFileActions =
                  attachmentAvailability !== 'missing' &&
                  attachmentAvailability !== 'restricted'

                return (
                  <article key={attachment.id} className="detail-attachment-item">
                    <div className="detail-attachment-item__file detail-attachment-col detail-attachment-col--filename">
                      <span className="detail-attachment-item__icon">
                        <AttachmentIcon size={18} aria-hidden="true" />
                      </span>
                      <div className="detail-attachment-item__file-copy">
                        <strong>{attachmentItem.fileName}</strong>
                        <p>{attachmentItem.typeLabel}</p>
                      </div>
                    </div>

                    <div className="detail-attachment-item__meta detail-attachment-col detail-attachment-col--type" data-label="Type">
                      <span>{attachmentItem.typeLabel}</span>
                    </div>

                    <div
                      className="detail-attachment-item__meta detail-attachment-item__meta--uploader detail-attachment-col detail-attachment-col--uploaded-by"
                      data-label="Uploaded By"
                    >
                      <span>{attachmentItem.uploadedBy}</span>
                    </div>

                    <div className="detail-attachment-item__meta detail-attachment-col detail-attachment-col--size" data-label="Size">
                      <span>{attachmentItem.sizeLabel}</span>
                    </div>

                    <div className="detail-attachment-item__meta detail-attachment-col detail-attachment-col--uploaded-at" data-label="Uploaded At">
                      <span>{attachmentItem.uploadedAt}</span>
                    </div>

                    <div className="detail-attachment-item__actions detail-attachment-col detail-attachment-col--actions">
                      {canUseStoredFileActions ? (
                        <>
                          <button
                            type="button"
                            className="detail-attachment-action detail-attachment-action--view"
                            disabled={!attachmentItem.canOpen}
                            onClick={() => {
                              setSelectedAttachmentId(attachment.id)
                              if (attachmentItem.viewUrl) {
                                window.open(attachmentItem.viewUrl, '_blank', 'noopener,noreferrer')
                              }
                            }}
                          >
                            <Eye size={15} aria-hidden="true" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="detail-attachment-action"
                            disabled={!attachmentItem.canOpen}
                            onClick={() => {
                              if (attachmentItem.downloadUrl) {
                                window.open(
                                  attachmentItem.downloadUrl,
                                  '_blank',
                                  'noopener,noreferrer',
                                )
                              }
                            }}
                          >
                            <Download size={15} aria-hidden="true" />
                            <span>Download</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No attachments available"
            description="No documents have been linked to this correspondence yet."
            compact
          />
        )}
      </ApiSubresourceState>
    </SectionCard>
  )

  const renderNotes = () => (
    <SectionCard
      title="Notes"
    >
      <ApiSubresourceState resource={notesState} onRetry={handleRetryDetail}>
        {notesState.items.length ? (
          <div className="detail-note-list">
            {notesState.items.map((note) => (
              <article key={note.id} className="detail-note-item">
                <div className="detail-note-item__main">
                  <p>{getFieldDisplayValue(note.text)}</p>
                  <span>
                    {note.createdBy?.fullName
                      ? `Added by ${note.createdBy.fullName}.`
                      : 'Author details unavailable.'}
                  </span>
                </div>
                <span className="detail-note-item__time">{formatDetailDateTime(note.createdAt)}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No notes recorded"
            description="No administrative notes have been recorded for this correspondence."
            compact
          />
        )}

        {permissions.canAddNote ? (
          <form className="detail-note-form app-form" onSubmit={handleAddNote}>
            <div className="detail-note-form__heading">
              <h3>Add Note</h3>
            </div>
            <div className="form-field">
              <label htmlFor="api-detail-new-note" className="form-field__label">
                Note
              </label>
              <textarea
                id="api-detail-new-note"
                value={noteBody}
                placeholder="Enter an administrative note..."
                onChange={(event) => {
                  setNoteBody(event.target.value)
                  setNoteError('')
                }}
                aria-invalid={Boolean(noteError)}
                aria-describedby={noteError ? 'api-detail-new-note-error' : undefined}
              />
              {noteError ? (
                <p id="api-detail-new-note-error" className="form-field__error" role="alert">
                  {noteError}
                </p>
              ) : null}
            </div>
            <div className="detail-note-form__actions">
              <button type="submit" className="button button--primary" disabled={isSubmittingNote}>
                {isSubmittingNote ? 'Saving...' : 'Add Note'}
              </button>
            </div>
          </form>
        ) : null}
      </ApiSubresourceState>
    </SectionCard>
  )

  if (detailState.status === API_CORRESPONDENCE_READ_STATUSES.LOADING_DETAIL) {
    return (
      <section className="detail-page detail-page--api">
        <CorrespondenceListLoading />
      </section>
    )
  }

  if (detailState.status === API_CORRESPONDENCE_READ_STATUSES.ACCESS_DENIED) {
    return (
      <section className="detail-page detail-page--api">
        <RestrictedHistoryState />
      </section>
    )
  }

  if (detailState.status === API_CORRESPONDENCE_READ_STATUSES.NOT_FOUND) {
    return (
      <section className="detail-page detail-page--api">
        <CorrespondenceNotFound />
      </section>
    )
  }

  if (detailState.status === API_CORRESPONDENCE_READ_STATUSES.CONTRACT_MISMATCH) {
    return (
      <section className="detail-page detail-page--api">
        <CorrespondenceContractMismatch onRetry={handleRetryDetail} />
      </section>
    )
  }

  if (
    [
      API_CORRESPONDENCE_READ_STATUSES.NETWORK_ERROR,
      API_CORRESPONDENCE_READ_STATUSES.TIMEOUT,
      API_CORRESPONDENCE_READ_STATUSES.SERVER_ERROR,
      API_CORRESPONDENCE_READ_STATUSES.SESSION_EXPIRED,
    ].includes(detailState.status)
  ) {
    return (
      <section className="detail-page detail-page--api">
        <CorrespondenceLoadError onRetry={handleRetryDetail} />
      </section>
    )
  }

  const detail = detailState.detail
  if (!detail) {
    return (
      <section className="detail-page detail-page--api">
        <CorrespondenceNotFound />
      </section>
    )
  }

  const arrivedAtOffice = getCurrentOfficeArrivalTimestamp(detail, movementsState.items)
  const terminalTimestamp = getDetailTerminalTimestamp(detail, movementsState.items)
  const timeUntilActionIsDue = getDetailTimeRemaining(
    detail.deadline,
    detail.status,
    new Date(),
    terminalTimestamp,
  )
  const trackTimeClassName =
    timeUntilActionIsDue.tone === 'due-soon'
      ? 'detail-track-strip__time--due-soon'
      : timeUntilActionIsDue.tone === 'overdue'
        ? 'detail-track-strip__time--overdue'
        : timeUntilActionIsDue.tone === 'completed'
          ? 'detail-track-strip__time--completed'
          : timeUntilActionIsDue.tone === 'filed'
            ? 'detail-track-strip__time--filed'
            : ''

  if (isGuidedFlow) {
    return (
      <section className="detail-page detail-page--api">
        {renderGuidedReview()}
      </section>
    )
  }

  return (
    <section className="detail-page detail-page--api">
      <div className="detail-page__header">
        <div className="detail-page__header-copy">
          <h1>Correspondence Detail & Tracking</h1>
        </div>
        <div className="detail-page__header-actions">
          <Link to="/correspondence" className="button button--secondary">
            Back to Correspondence
          </Link>
        </div>
      </div>

      <section className="detail-summary-strip">
        <div className="detail-summary-strip__cell">
          <span className="detail-summary-strip__label">Reference & Subject</span>
          <strong>{detail.referenceNumber}</strong>
          <p>{getFieldDisplayValue(detail.subject, 'Unavailable')}</p>
        </div>
        <div className="detail-summary-strip__cell">
          <span className="detail-summary-strip__label">Type</span>
          <strong>{getFieldDisplayValue(detail.type, 'Unavailable')}</strong>
        </div>
        <div className="detail-summary-strip__cell">
          <span className="detail-summary-strip__label">Priority</span>
          <strong>{getFieldDisplayValue(detail.priority, 'Unavailable')}</strong>
        </div>
        <div className="detail-summary-strip__cell">
          <span className="detail-summary-strip__label">Status</span>
          <StatusBadge status={getFieldDisplayValue(detail.status, 'Unavailable')} />
        </div>
        <div className="detail-summary-strip__cell">
          <span className="detail-summary-strip__label">Overall Deadline</span>
          <strong>{formatDetailDateTime(detail.deadline)}</strong>
        </div>
      </section>

      <section className="detail-track-strip">
        <div className="detail-track-strip__cell">
          <span className="detail-track-strip__label">Current Office</span>
          <strong>{getApiOfficeDisplayName(detail.currentOffice)}</strong>
        </div>
        <div className="detail-track-strip__cell">
          <span className="detail-track-strip__label">Current Stage</span>
          <strong>{getFieldDisplayValue(detail.currentStage, 'Unavailable')}</strong>
        </div>
        <div className="detail-track-strip__cell">
          <span className="detail-track-strip__label">Arrived at Office</span>
          <strong>{formatDetailDateTime(arrivedAtOffice)}</strong>
        </div>
        <div className="detail-track-strip__cell">
          <span className="detail-track-strip__label">{timeUntilActionIsDue.trackLabel}</span>
          <strong className={trackTimeClassName}>{timeUntilActionIsDue.label}</strong>
        </div>
      </section>

      <div className="detail-tabs-shell">
        <div className="detail-tabs" role="tablist" aria-label="Correspondence detail tabs">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
            aria-selected={activeTabId === tab.id}
            className={
              activeTabId === tab.id
                  ? 'tab-button tab-button--active'
                  : 'tab-button'
            }
              onClick={() => {
                const nextSearchParams = new URLSearchParams(searchParams)
                nextSearchParams.set('tab', TAB_ID_TO_QUERY[tab.id])
                setSearchParams(nextSearchParams, { replace: true })
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTabId === 'overview' ? renderOverview() : null}
      {activeTabId === 'journey' ? renderJourney() : null}
      {activeTabId === 'details' ? renderDetails() : null}
      {activeTabId === 'attachments' ? renderAttachments() : null}
      {activeTabId === 'notes' ? renderNotes() : null}

      <Modal
        isOpen={isStageModalOpen}
        title="Update Current Stage"
        onClose={() => {
          if (!isSubmittingStage) {
            setIsStageModalOpen(false)
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsStageModalOpen(false)}
              disabled={isSubmittingStage}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleStageUpdate}
              disabled={isSubmittingStage}
            >
              {isSubmittingStage ? 'Updating...' : 'Update Stage'}
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          {stageFormError ? (
            <p className="form-field__error" role="alert">
              {stageFormError}
            </p>
          ) : null}
          <div className="form-field">
            <label className="form-field__label">Current Stage</label>
            <input value={getFieldDisplayValue(detail.currentStage)} readOnly className="readonly-field" />
          </div>
          <div className="form-field">
            <label htmlFor="api-detail-stage-select" className="form-field__label">
              New Stage
            </label>
            <select
              id="api-detail-stage-select"
              value={stageValues.stage}
              onChange={(event) => {
                setStageValues((current) => ({ ...current, stage: event.target.value }))
                setStageError('')
                setStageFormError('')
              }}
              aria-invalid={Boolean(stageError)}
              aria-describedby={stageError ? 'api-detail-stage-error' : undefined}
            >
              <option value="">Select stage</option>
              {API_MUTATION_STAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {stageError ? (
              <p id="api-detail-stage-error" className="form-field__error" role="alert">
                {stageError}
              </p>
            ) : null}
          </div>
          <div className="form-field">
            <label htmlFor="api-detail-stage-note" className="form-field__label">
              Update Note
            </label>
            <textarea
              id="api-detail-stage-note"
              value={stageValues.note}
              onChange={(event) => {
                setStageValues((current) => ({ ...current, note: event.target.value }))
                setStageFormError('')
              }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isForwardModalOpen}
        title="Forward to Office"
        onClose={() => {
          if (!isSubmittingForward) {
            handleCloseForwardModal()
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={handleCloseForwardModal}
              disabled={isSubmittingForward}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleForwardCorrespondence}
              disabled={
                isSubmittingForward ||
                forwardingOfficesState.status !== 'success' ||
                !forwardingDestinationOffices.length
              }
            >
              {isSubmittingForward ? 'Forwarding...' : 'Confirm Forward'}
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          {forwardFormError ? (
            <p className="form-field__error" role="alert">
              {forwardFormError}
            </p>
          ) : null}

          {forwardingOfficesState.status === 'loading' || forwardingOfficesState.status === 'idle' ? (
            <EmptyState
              title="Loading offices"
              description="Please wait while available forwarding destinations are prepared."
              compact
            />
          ) : null}

          {forwardingOfficesState.status === 'error' ? (
            <EmptyState
              title="Unable to load offices"
              description="The office directory could not be loaded right now."
              action={
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => {
                    void loadForwardingOffices()
                  }}
                >
                  Retry
                </button>
              }
              compact
            />
          ) : null}

          {forwardingOfficesState.status === 'success' && !forwardingDestinationOffices.length ? (
            <EmptyState
              title="No forwarding destinations available"
              description="No forwarding destinations are currently available."
              compact
            />
          ) : null}

          {forwardingOfficesState.status === 'success' && forwardingDestinationOffices.length ? (
            <>
              <div className="form-field">
                <label htmlFor="api-detail-forward-office" className="form-field__label">
                  Destination Office
                </label>
                <select
                  id="api-detail-forward-office"
                  value={forwardValues.destinationOfficeId}
                  onChange={(event) => {
                    setForwardValues((current) => ({
                      ...current,
                      destinationOfficeId: event.target.value,
                    }))
                    setForwardDestinationError('')
                    setForwardFormError('')
                  }}
                  aria-invalid={Boolean(forwardDestinationError)}
                  aria-describedby={forwardDestinationError ? 'api-detail-forward-office-error' : undefined}
                >
                  <option value="">Select office</option>
                  {forwardingDestinationOffices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {getOfficeDisplayLabel(office)}
                    </option>
                  ))}
                </select>
                {forwardDestinationError ? (
                  <p id="api-detail-forward-office-error" className="form-field__error" role="alert">
                    {forwardDestinationError}
                  </p>
                ) : null}
              </div>

              <div className="form-field">
                <label htmlFor="api-detail-forward-note" className="form-field__label">
                  Forwarding Note
                </label>
                <textarea
                  id="api-detail-forward-note"
                  value={forwardValues.note}
                  onChange={(event) => {
                    setForwardValues((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                    setForwardFormError('')
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={isCompleteModalOpen}
        title="Complete Correspondence"
        onClose={() => {
          if (!isSubmittingComplete) {
            setIsCompleteModalOpen(false)
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsCompleteModalOpen(false)}
              disabled={isSubmittingComplete}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleCompleteCorrespondence}
              disabled={isSubmittingComplete}
            >
              {isSubmittingComplete ? 'Completing...' : 'Complete Correspondence'}
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          {completeFormError ? (
            <p className="form-field__error" role="alert">
              {completeFormError}
            </p>
          ) : null}
          <div className="form-field">
            <label htmlFor="api-detail-complete-note" className="form-field__label">
              Completion Note
            </label>
            <textarea
              id="api-detail-complete-note"
              value={completionNote}
              onChange={(event) => {
                setCompletionNote(event.target.value)
                setCompleteFormError('')
              }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isFileModalOpen}
        title="File Correspondence"
        onClose={() => {
          if (!isSubmittingFile) {
            setIsFileModalOpen(false)
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsFileModalOpen(false)}
              disabled={isSubmittingFile}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleFileCorrespondence}
              disabled={isSubmittingFile}
            >
              {isSubmittingFile ? 'Filing...' : 'File Correspondence'}
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          {fileFormError ? (
            <p className="form-field__error" role="alert">
              {fileFormError}
            </p>
          ) : null}
          <div className="form-field">
            <label htmlFor="api-detail-file-note" className="form-field__label">
              Filing Note
            </label>
            <textarea
              id="api-detail-file-note"
              value={filingNote}
              onChange={(event) => {
                setFilingNote(event.target.value)
                setFileFormError('')
              }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAttachmentModalOpen}
        title="Add Attachment"
        onClose={() => {
          if (!isUploadingAttachment) {
            handleCloseAttachmentModal()
          }
        }}
        actions={
          <>
            <button
              type="button"
              className="button button--secondary"
              onClick={handleCloseAttachmentModal}
              disabled={isUploadingAttachment}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleAddAttachment}
              disabled={isUploadingAttachment}
            >
              {isUploadingAttachment ? 'Uploading...' : 'Upload Attachment'}
            </button>
          </>
        }
      >
        <div className="form-grid app-form">
          <div className="form-field">
            <label className="form-field__label" htmlFor="api-detail-attachment-upload">
              Attachment
            </label>
            <FileUploadField
              id="api-detail-attachment-upload"
              file={pendingAttachment}
              error={attachmentError}
              accept={ATTACHMENT_INPUT_ACCEPT}
              inputRef={(node) => {
                fileInputRef.current = node
              }}
              onChange={handleAttachmentDraft}
              onRemove={() => {
                revokeAttachmentUrls(pendingAttachment)
                setPendingAttachment(null)
                setAttachmentError('')

                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
            />
          </div>
        </div>
      </Modal>
    </section>
  )
}

export default ApiCorrespondenceDetailWorkspace

