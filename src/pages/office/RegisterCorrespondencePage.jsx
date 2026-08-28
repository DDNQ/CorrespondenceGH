import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ConfirmDialog from '../../components/common/ConfirmDialog'
import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import RegistrationOverview from '../../components/correspondence/RegistrationOverview'
import DateField from '../../components/forms/DateField'
import FileUploadField from '../../components/forms/FileUploadField'
import FormField from '../../components/forms/FormField'
import SelectField from '../../components/forms/SelectField'
import TextAreaField from '../../components/forms/TextAreaField'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast.js'
import {
  buildRegistrationFormValues,
  getRegistrationDirectionFieldOptions,
  REGISTRATION_DOCUMENT_TYPE_OPTIONS,
  REGISTRATION_PRIORITY_OPTIONS,
  REGISTRATION_STAGE_OPTIONS,
  shouldShowExternalReferenceField,
} from '../../utils/registrationForm.js'
import { getRegistrationPresentation } from '../../utils/registrationPresentation.js'
import { ApiError } from '../../services/apiClient.js'
import { getServiceBundle } from '../../services/serviceProvider.js'
import {
  ATTACHMENT_INPUT_ACCEPT,
  normalizeAttachment,
  removeAttachmentDraft,
  replaceAttachmentDraft,
  revokeAttachmentUrls,
} from '../../utils/attachments.js'
import { registerApiCorrespondenceRouteRecord } from '../../utils/apiCorrespondenceRouteCache.js'
import {
  buildRegistrationReviewSnapshot,
  getRegistrationReviewSteps,
  saveRegistrationReviewSnapshot,
} from '../../utils/correspondenceReview'
import { getOfficeDisplayName } from '../../utils/offices.js'
import { saveTransientRegistrationReviewAttachment } from '../../utils/registrationReviewSession.js'
import {
  RegistrationAttachmentUploadError,
  retryRegistrationAttachmentUploads,
  submitRegistrationWithAttachments,
} from '../../utils/registrationSubmission.js'

function formatDateSummary(dateValue) {
  if (!dateValue) {
    return ''
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
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

function mapRegistrationApiErrors(error) {
  const details =
    error instanceof ApiError && error.details && typeof error.details === 'object'
      ? error.details
      : {}
  const normalizedMessage = typeof error?.message === 'string' ? error.message.trim() : ''
  const fieldMappings = [
    ['documentType', ['documentType', 'type']],
    ['subject', ['subject']],
    ['sender', ['sender']],
    ['priority', ['priority']],
    ['direction', ['direction']],
    ['documentDate', ['documentDate', 'document_date']],
    ['dateReceived', ['dateReceived', 'received_at']],
    ['initialStage', ['initialStage', 'currentStage', 'current_stage']],
    ['stageDeadline', ['stageDeadline', 'deadline']],
    ['requiredAction', ['requiredAction', 'instructions']],
  ]
  const fieldErrors = {}

  fieldMappings.forEach(([field, keys]) => {
    const message = keys.map((key) => getDetailMessage(details, key)).find(Boolean)

    if (message) {
      fieldErrors[field] = message
      }
  })

  if (!Object.keys(fieldErrors).length && normalizedMessage) {
    if (normalizedMessage === 'Invalid correspondence direction.') {
      fieldErrors.direction = 'Select a supported direction for live registration.'
    }

    if (normalizedMessage === 'Invalid correspondence type.') {
      fieldErrors.documentType = 'Select a valid document type.'
    }

    if (normalizedMessage === 'Invalid correspondence priority.') {
      fieldErrors.priority = 'Select a valid priority.'
    }
  }

  const fallbackFormMessage =
    error?.status === 400 || error?.status === 422
      ? 'Please review the information and try again.'
      : error?.status === 401
        ? 'Your session has expired. Please sign in again.'
        : error?.status === 403
          ? 'You do not have permission to register correspondence.'
          : error?.code === 'REQUEST_TIMEOUT' || error?.isTimeout
            ? 'The server took too long to respond. Please try again.'
            : error?.code === 'NETWORK_ERROR' || error?.isNetworkError
              ? 'Unable to reach the server. Please check your connection and try again.'
              : error?.status && error.status >= 500
                ? 'The server could not complete the registration. Please try again later.'
                : 'Unable to register the correspondence. Please try again.'
  const formMessage =
    getDetailMessage(details, 'detail') ||
    getDetailMessage(details, 'non_field_errors') ||
    Object.values(fieldErrors).find(Boolean) ||
    normalizedMessage ||
    fallbackFormMessage

  return {
    fieldErrors,
    formMessage,
  }
}

function getRegistrationAttachmentErrorMessage(error) {
  const details =
    error instanceof ApiError && error.details && typeof error.details === 'object'
      ? error.details
      : {}
  const normalizedMessage = typeof error?.message === 'string' ? error.message.trim() : ''

  return (
    getDetailMessage(details, 'detail') ||
    getDetailMessage(details, 'file') ||
    getDetailMessage(details, 'non_field_errors') ||
    (error?.status === 401
      ? 'Your session has expired. Please sign in again.'
      : error?.status === 403
        ? 'You do not have permission to upload this document.'
        : error?.status === 413
          ? 'Files must be 10 MB or smaller.'
          : error?.status === 422
            ? 'The selected document could not be validated.'
            : error?.code === 'REQUEST_TIMEOUT' || error?.isTimeout
              ? 'The server took too long to respond while uploading the document.'
              : error?.code === 'NETWORK_ERROR' || error?.isNetworkError
                ? 'Unable to reach the server while uploading the document.'
                : error?.status && error.status >= 500
                  ? 'The server could not complete the document upload. Please try again.'
                  : normalizedMessage ||
                    'The selected document could not be uploaded. Please try again.')
  )
}

function RegisterCorrespondencePage() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const fieldRefs = useRef({})
  const pendingAttachmentRef = useRef(null)
  const preserveAttachmentOnUnmountRef = useRef(false)
  const correspondenceService = useMemo(() => getServiceBundle().correspondence, [])
  const attachmentService = useMemo(() => getServiceBundle().attachments, [])
  const availableDirectionOptions = useMemo(() => getRegistrationDirectionFieldOptions(), [])
  const showExternalReferenceField = useMemo(() => shouldShowExternalReferenceField(), [])
  const currentOfficeName = getOfficeDisplayName(currentUser?.office)
  const [formValues, setFormValues] = useState(() => buildRegistrationFormValues())
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submissionStatusMessage, setSubmissionStatusMessage] = useState('')
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRetryingAttachment, setIsRetryingAttachment] = useState(false)
  const [attachmentRecoveryState, setAttachmentRecoveryState] = useState(null)

  const registrationPresentation = useMemo(
    () =>
      getRegistrationPresentation({
        currentOfficeName,
      }),
    [currentOfficeName],
  )
  const isBusy = isSubmitting || isRetryingAttachment
  const isRecoveryMode = Boolean(attachmentRecoveryState)
  const isFormLocked = isBusy || isRecoveryMode

  const isDirty = useMemo(() => {
    const initialValues = buildRegistrationFormValues()

    return Object.keys(initialValues).some((key) => {
      if (key === 'attachment') {
        return Boolean(formValues.attachment)
      }

      return formValues[key] !== initialValues[key]
    })
  }, [formValues])

  useEffect(() => {
    pendingAttachmentRef.current = formValues.attachment
  }, [formValues.attachment])

  useEffect(() => {
    if (
      availableDirectionOptions.length &&
      !availableDirectionOptions.includes(formValues.direction)
    ) {
      setFormValues((current) => ({
        ...current,
        direction: availableDirectionOptions[0],
      }))
    }
  }, [availableDirectionOptions, formValues.direction])

  useEffect(
    () => () => {
      if (!preserveAttachmentOnUnmountRef.current) {
        revokeAttachmentUrls(pendingAttachmentRef.current)
      }
    },
    [],
  )

  const setFieldValue = (field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  const openRegistrationReview = (createdRecord, reviewSnapshot, transientAttachment = null) => {
    const persistedSnapshot = saveRegistrationReviewSnapshot(reviewSnapshot)
    const reviewSteps = getRegistrationReviewSteps(
      transientAttachment ?? persistedSnapshot?.attachments?.[0] ?? null,
    )
    const initialStep = reviewSteps[0]?.id ?? 'registration-summary'
    const locationReviewSnapshot =
      transientAttachment && persistedSnapshot
        ? {
            ...persistedSnapshot,
            attachments: [transientAttachment],
          }
        : persistedSnapshot

    if (transientAttachment) {
      saveTransientRegistrationReviewAttachment(createdRecord.id, transientAttachment)
    }

    navigate(
      `/correspondence/${encodeURIComponent(createdRecord.id)}?flow=registration&step=${encodeURIComponent(initialStep)}`,
      {
        state: {
          correspondenceId: createdRecord.id,
          correspondenceReference: createdRecord.referenceNumber,
          registrationReviewSnapshot: locationReviewSnapshot,
        },
      },
    )
  }

  const validateForm = () => {
    const nextErrors = {}
    const requiredMessages = {
      documentType: 'Select a document type.',
      direction: 'Select a direction.',
      subject: 'Enter a subject or title.',
      sender: 'Enter the sender or originating organisation.',
      priority: 'Select a priority.',
      documentDate: 'Enter the document date.',
      dateReceived: 'Enter the date received.',
      overallCompletionDate: 'Enter the overall completion date.',
      initialStage: 'Select the initial stage.',
      stageDeadline: 'Enter the stage deadline.',
      requiredAction: 'Enter the required action or instructions.',
    }

    Object.entries(requiredMessages).forEach(([field, message]) => {
      const value = formValues[field]
      if (typeof value === 'string' ? !value.trim() : !value) {
        nextErrors[field] = message
      }
    })

    if (
      formValues.documentDate &&
      formValues.dateReceived &&
      formValues.dateReceived < formValues.documentDate
    ) {
      nextErrors.dateReceived = 'Date received cannot be before the document date.'
    }

    if (
      formValues.dateReceived &&
      formValues.stageDeadline &&
      formValues.stageDeadline < formValues.dateReceived
    ) {
      nextErrors.stageDeadline = 'Stage deadline cannot be before the date received.'
    }

    if (
      formValues.stageDeadline &&
      formValues.overallCompletionDate &&
      formValues.overallCompletionDate < formValues.stageDeadline
    ) {
      nextErrors.overallCompletionDate =
        'Overall completion date cannot be before the stage deadline.'
    }

    setErrors(nextErrors)
    return nextErrors
  }

  const focusFirstInvalidField = (validationErrors) => {
    const fieldOrder = [
      'documentType',
      'subject',
      'direction',
      'priority',
      'sender',
      'documentDate',
      'dateReceived',
      'overallCompletionDate',
      'destinationOffice',
      'initialStage',
      'stageDeadline',
      'requiredAction',
      'attachment',
    ]
    const firstInvalidField = fieldOrder.find((field) => validationErrors[field])

    if (firstInvalidField) {
      fieldRefs.current[firstInvalidField]?.focus()
    }
  }

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      setFieldValue('attachment', removeAttachmentDraft(formValues.attachment))
      return
    }

    try {
      const nextAttachment = replaceAttachmentDraft(formValues.attachment, selectedFile)
      setErrors((current) => ({ ...current, attachment: undefined }))
      setFormError('')
      setSubmissionStatusMessage('')
      setFormValues((current) => ({
        ...current,
        attachment: nextAttachment,
      }))
    } catch (error) {
      event.target.value = ''
      setErrors((current) => ({
        ...current,
        attachment:
          error.validation?.errors?.[0]?.message ?? 'The selected file type is not supported.',
      }))
    }
  }

  const handleCancel = () => {
    if (!isDirty) {
      navigate('/correspondence?status=all')
      return
    }

    setIsDiscardDialogOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isBusy || isRecoveryMode) {
      return
    }

    setIsSubmitting(true)
    setFormError('')
    setSubmissionStatusMessage('')
    setAttachmentRecoveryState(null)
    const validationErrors = validateForm()

    if (Object.keys(validationErrors).length) {
      setIsSubmitting(false)
      focusFirstInvalidField(validationErrors)
      return
    }

    try {
      preserveAttachmentOnUnmountRef.current = false

      const { createdRecord, uploadedAttachments } = await submitRegistrationWithAttachments({
        correspondenceService,
        attachmentService,
        formValues,
        currentUser,
        stagedAttachments: formValues.attachment ? [formValues.attachment] : [],
        onProgress: ({ message }) => {
          setSubmissionStatusMessage(message)
        },
      })
      registerApiCorrespondenceRouteRecord(createdRecord)
      setSubmissionStatusMessage('Finalizing registration...')
      showToast({
        title: 'Correspondence registered successfully.',
        message: createdRecord.referenceNumber,
      })
      const immediateReviewAttachment = formValues.attachment
        ? normalizeAttachment({
            ...(uploadedAttachments[0] ?? createdRecord.attachments?.[0] ?? {}),
            ...formValues.attachment,
            id: uploadedAttachments[0]?.id ?? createdRecord.attachments?.[0]?.id ?? formValues.attachment.id,
            correspondenceId:
              uploadedAttachments[0]?.correspondenceId ??
              createdRecord.attachments?.[0]?.correspondenceId ??
              createdRecord.id,
            fileObject: formValues.attachment.fileObject ?? null,
            previewUrl: formValues.attachment.previewUrl ?? formValues.attachment.fileUrl ?? null,
            fileUrl: formValues.attachment.fileUrl ?? formValues.attachment.previewUrl ?? null,
            source: 'local',
            isTemporary: true,
          })
        : null
      const reviewSnapshot = buildRegistrationReviewSnapshot({
        createdRecord,
        formValues,
        currentUser,
        uploadedAttachments,
        fallbackAttachment: uploadedAttachments[0] ?? createdRecord.attachments?.[0] ?? null,
      })
      preserveAttachmentOnUnmountRef.current = true
      openRegistrationReview(
        createdRecord,
        reviewSnapshot,
        immediateReviewAttachment,
      )
    } catch (error) {
      preserveAttachmentOnUnmountRef.current = false

      if (error instanceof RegistrationAttachmentUploadError) {
        registerApiCorrespondenceRouteRecord(error.createdRecord)
        setAttachmentRecoveryState({
          createdRecord: error.createdRecord,
          failedAttachments: error.failedAttachments,
          lastErrorMessage: getRegistrationAttachmentErrorMessage(
            error.failedAttachments[0]?.error,
          ),
        })
        setFormError('')
        setSubmissionStatusMessage('')
        showToast({
          title: 'Correspondence registered with a pending document upload.',
          message: error.createdRecord.referenceNumber,
        })
        return
      }

      const { fieldErrors, formMessage } = mapRegistrationApiErrors(error)
      setErrors((current) => ({ ...current, ...fieldErrors }))
      setFormError(formMessage)
      setSubmissionStatusMessage('')
      focusFirstInvalidField(fieldErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetryFailedAttachmentUpload = async () => {
    if (!attachmentRecoveryState?.createdRecord?.id || isBusy) {
      return
    }

    setIsRetryingAttachment(true)
    setFormError('')
    setSubmissionStatusMessage('')

    try {
      const retryResult = await retryRegistrationAttachmentUploads({
        attachmentService,
        correspondenceId: attachmentRecoveryState.createdRecord.id,
        failedAttachments: attachmentRecoveryState.failedAttachments,
        onProgress: ({ message }) => {
          setSubmissionStatusMessage(message)
        },
      })

      if (retryResult.failedAttachments.length) {
        setAttachmentRecoveryState((current) => ({
          ...current,
          failedAttachments: retryResult.failedAttachments,
          lastErrorMessage: getRegistrationAttachmentErrorMessage(
            retryResult.failedAttachments[0]?.error,
          ),
        }))
        setSubmissionStatusMessage('')
        return
      }

      setSubmissionStatusMessage('Finalizing registration...')
      showToast({
        title: 'Document uploaded successfully.',
        message: attachmentRecoveryState.createdRecord.referenceNumber,
      })
      const immediateReviewAttachment = formValues.attachment
        ? normalizeAttachment({
            ...(retryResult.uploadedAttachments[0] ??
              attachmentRecoveryState.createdRecord.attachments?.[0] ??
              {}),
            ...formValues.attachment,
            id:
              retryResult.uploadedAttachments[0]?.id ??
              attachmentRecoveryState.createdRecord.attachments?.[0]?.id ??
              formValues.attachment.id,
            correspondenceId:
              retryResult.uploadedAttachments[0]?.correspondenceId ??
              attachmentRecoveryState.createdRecord.attachments?.[0]?.correspondenceId ??
              attachmentRecoveryState.createdRecord.id,
            fileObject: formValues.attachment.fileObject ?? null,
            previewUrl: formValues.attachment.previewUrl ?? formValues.attachment.fileUrl ?? null,
            fileUrl: formValues.attachment.fileUrl ?? formValues.attachment.previewUrl ?? null,
            source: 'local',
            isTemporary: true,
          })
        : null
      const reviewSnapshot = buildRegistrationReviewSnapshot({
        createdRecord: attachmentRecoveryState.createdRecord,
        formValues,
        currentUser,
        uploadedAttachments: retryResult.uploadedAttachments,
        fallbackAttachment:
          retryResult.uploadedAttachments[0] ?? attachmentRecoveryState.createdRecord.attachments?.[0] ?? null,
      })
      preserveAttachmentOnUnmountRef.current = true
      openRegistrationReview(
        attachmentRecoveryState.createdRecord,
        reviewSnapshot,
        immediateReviewAttachment,
      )
    } catch (error) {
      setAttachmentRecoveryState((current) =>
        current
          ? {
              ...current,
              lastErrorMessage: getRegistrationAttachmentErrorMessage(error),
            }
          : current,
      )
      setSubmissionStatusMessage('')
    } finally {
      setIsRetryingAttachment(false)
    }
  }

  const handleContinueToCorrespondence = () => {
    if (!attachmentRecoveryState?.createdRecord?.id) {
      return
    }

    navigate(`/correspondence/${encodeURIComponent(attachmentRecoveryState.createdRecord.id)}`, {
      state: {
        correspondenceId: attachmentRecoveryState.createdRecord.id,
        correspondenceReference: attachmentRecoveryState.createdRecord.referenceNumber,
      },
    })
  }

  const overviewSummary = {
    reference: registrationPresentation.referencePreview,
    subject: formValues.subject,
    documentType: formValues.documentType,
    direction: formValues.direction,
    priority: formValues.priority,
    destinationOffice: registrationPresentation.destinationOfficeName,
    initialStage: formValues.initialStage,
    stageDeadline: formValues.stageDeadline ? formatDateSummary(formValues.stageDeadline) : '',
  }

  return (
    <section className="register-page registration-page">
      <PageHeader
        title="Register New Correspondence"
        description={registrationPresentation.pageDescription || undefined}
      />

      <form className="app-form register-page__form" onSubmit={handleSubmit}>
        <div className="register-layout registration-layout">
          <section className="section-card register-form-card">
            <div className="register-form-card__body">
              {attachmentRecoveryState ? (
                <div className="notice-strip register-form-notice" role="status">
                  <div className="register-form-notice__copy">
                    <strong>
                      Correspondence {attachmentRecoveryState.createdRecord.referenceNumber} was
                      registered, but the document upload did not finish.
                    </strong>
                    <p>
                      {attachmentRecoveryState.lastErrorMessage}{' '}
                      Retry the upload or continue to the correspondence record.
                    </p>
                  </div>
                </div>
              ) : null}

              {submissionStatusMessage && !attachmentRecoveryState ? (
                <div className="notice-strip register-form-notice" role="status">
                  <div className="register-form-notice__copy">
                    <strong>Registration in progress</strong>
                    <p>{submissionStatusMessage}</p>
                  </div>
                </div>
              ) : null}

              {formError ? (
                <div className="form-field__error register-form-error" role="alert">
                  {formError}
                </div>
              ) : null}

              <div className="register-form-section">
                <div className="register-form-section__header">
                  <h2>Correspondence Details</h2>
                </div>
                <div className="register-form-section__body">
                  <div className="form-grid form-grid--two">
                    <FormField
                      id="system-reference"
                      label="System Reference"
                      value={registrationPresentation.referencePreview}
                      readOnly
                      disabled={isFormLocked}
                    />
                    <SelectField
                      id="document-type"
                      label="Document Type"
                      value={formValues.documentType}
                      onChange={(event) => setFieldValue('documentType', event.target.value)}
                      options={REGISTRATION_DOCUMENT_TYPE_OPTIONS}
                      error={errors.documentType}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.documentType = node
                      }}
                    />
                    <FormField
                      id="subject"
                      label="Subject / Title"
                      value={formValues.subject}
                      onChange={(event) => setFieldValue('subject', event.target.value)}
                      error={errors.subject}
                      required
                      className="register-form-span-full"
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.subject = node
                      }}
                    />
                    <SelectField
                      id="direction"
                      label="Direction"
                      value={formValues.direction}
                      onChange={(event) => setFieldValue('direction', event.target.value)}
                      options={availableDirectionOptions}
                      error={errors.direction}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.direction = node
                      }}
                    />
                    <SelectField
                      id="priority"
                      label="Priority"
                      value={formValues.priority}
                      onChange={(event) => setFieldValue('priority', event.target.value)}
                      options={REGISTRATION_PRIORITY_OPTIONS}
                      error={errors.priority}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.priority = node
                      }}
                    />
                    <FormField
                      id="sender"
                      label="Sender / Originating Organisation"
                      value={formValues.sender}
                      onChange={(event) => setFieldValue('sender', event.target.value)}
                      error={errors.sender}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.sender = node
                      }}
                    />
                    {showExternalReferenceField ? (
                      <FormField
                        id="external-reference"
                        label="External Reference"
                        value={formValues.externalReference}
                        onChange={(event) => setFieldValue('externalReference', event.target.value)}
                        disabled={isFormLocked}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="register-form-section">
                <div className="register-form-section__header">
                  <h2>{registrationPresentation.routingSectionTitle}</h2>
                </div>
                <div className="register-form-section__body">
                  <div className="form-grid form-grid--three register-form-grid--dates">
                    <DateField
                      id="document-date"
                      label="Document Date"
                      value={formValues.documentDate}
                      onChange={(event) => setFieldValue('documentDate', event.target.value)}
                      error={errors.documentDate}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.documentDate = node
                      }}
                    />
                    <DateField
                      id="date-received"
                      label="Date Received"
                      value={formValues.dateReceived}
                      onChange={(event) => setFieldValue('dateReceived', event.target.value)}
                      error={errors.dateReceived}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.dateReceived = node
                      }}
                    />
                    <DateField
                      id="overall-completion-date"
                      label="Overall Completion Date"
                      value={formValues.overallCompletionDate}
                      onChange={(event) => setFieldValue('overallCompletionDate', event.target.value)}
                      error={errors.overallCompletionDate}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.overallCompletionDate = node
                      }}
                    />
                  </div>

                  <div className="form-grid form-grid--two">
                    <FormField
                      id="registering-office"
                      label="Registering Office"
                      value={currentOfficeName}
                      readOnly
                      disabled={isFormLocked}
                    />
                    <FormField
                      id="initial-office"
                      label="Initial Office"
                      value={currentOfficeName}
                      readOnly
                      disabled={isFormLocked}
                    />
                    <SelectField
                      id="initial-stage"
                      label="Initial Stage"
                      value={formValues.initialStage}
                      onChange={(event) => setFieldValue('initialStage', event.target.value)}
                      options={REGISTRATION_STAGE_OPTIONS}
                      error={errors.initialStage}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.initialStage = node
                      }}
                    />
                    <DateField
                      id="stage-deadline"
                      label="Stage Deadline"
                      value={formValues.stageDeadline}
                      onChange={(event) => setFieldValue('stageDeadline', event.target.value)}
                      error={errors.stageDeadline}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.stageDeadline = node
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="register-form-section">
                <div className="register-form-section__header">
                  <h2>Instructions &amp; Notes</h2>
                </div>
                <div className="register-form-section__body">
                  <div className="form-grid form-grid--full">
                    <TextAreaField
                      id="required-action"
                      label="Required Action / Instructions"
                      value={formValues.requiredAction}
                      onChange={(event) => setFieldValue('requiredAction', event.target.value)}
                      error={errors.requiredAction}
                      required
                      disabled={isFormLocked}
                      inputRef={(node) => {
                        fieldRefs.current.requiredAction = node
                      }}
                    />
                    <TextAreaField
                      id="administrative-notes"
                      label="Administrative Notes"
                      value={formValues.administrativeNotes}
                      onChange={(event) => setFieldValue('administrativeNotes', event.target.value)}
                      disabled={isFormLocked}
                    />
                  </div>
                </div>
              </div>

              <div className="register-form-actions registration-actions">
                {attachmentRecoveryState ? (
                  <>
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={handleContinueToCorrespondence}
                    >
                      Continue to Correspondence
                    </button>
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={handleRetryFailedAttachmentUpload}
                      disabled={isBusy}
                    >
                      {isRetryingAttachment ? 'Retrying...' : 'Retry Failed Upload'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={handleCancel}
                      disabled={isBusy}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="button button--primary" disabled={isBusy}>
                      {isSubmitting ? 'Registering...' : 'Register Correspondence'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          <aside className="register-sidebar registration-aside">
            <SectionCard
              title="Document Attachment"
              description={registrationPresentation.attachmentDescription}
              className="register-sidebar__card"
            >
              {registrationPresentation.showsAttachmentInput ? (
                <FileUploadField
                  id="attachment"
                  file={formValues.attachment}
                  error={errors.attachment}
                  accept={ATTACHMENT_INPUT_ACCEPT}
                  disabled={isFormLocked}
                  emptyLabel="Choose Document"
                  emptyHint=""
                  showInlinePreview={false}
                  inputRef={(node) => {
                    fieldRefs.current.attachment = node
                  }}
                  onChange={handleFileChange}
                  onRemove={() => {
                    preserveAttachmentOnUnmountRef.current = false
                    setFieldValue('attachment', removeAttachmentDraft(formValues.attachment))
                    if (fieldRefs.current.attachment) {
                      fieldRefs.current.attachment.value = ''
                    }
                  }}
                />
              ) : (
                null
              )}
            </SectionCard>

            <SectionCard
              title="Registration Overview"
              className="register-sidebar__card"
            >
              <RegistrationOverview
                summary={overviewSummary}
                registeringOffice={currentOfficeName}
                isApiMode
              />
            </SectionCard>
          </aside>
        </div>
      </form>

      <ConfirmDialog
        isOpen={isDiscardDialogOpen}
        title="Discard changes?"
        description="Discard the information entered on this form?"
        confirmLabel="Discard"
        onConfirm={() => navigate('/correspondence?status=all')}
        onClose={() => setIsDiscardDialogOpen(false)}
      />
    </section>
  )
}

export default RegisterCorrespondencePage
