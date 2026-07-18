import { useMemo, useRef, useState } from 'react'
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
import { useCorrespondence } from '../../context/useCorrespondence'
import {
  registrationDirectionOptions,
  registrationDocumentTypeOptions,
  registrationPriorityOptions,
  registrationStageOptions,
} from '../../data/correspondence'
import { offices } from '../../data/offices'
import { getRegistrationReviewSteps } from '../../utils/correspondenceReview'

const SYSTEM_TODAY = '2026-07-16'
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_ATTACHMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
const ROUTEABLE_OFFICES = [
  'Central Registry',
  'Legal Directorate',
  'Finance Directorate',
  'Procurement Directorate',
  'Highway Planning Directorate',
  'Office of the Chief Director',
  'Human Resource Directorate',
  'ICT Directorate',
]

function buildInitialFormValues() {
  return {
    documentType: 'Contract',
    direction: 'Incoming',
    subject: '',
    sender: '',
    externalReference: '',
    priority: 'Normal',
    documentDate: SYSTEM_TODAY,
    dateReceived: SYSTEM_TODAY,
    overallCompletionDate: '2026-07-23',
    destinationOffice: '',
    initialStage: 'Initial classification',
    stageDeadline: '2026-07-21',
    requiredAction: '',
    administrativeNotes: '',
    attachment: null,
  }
}

function getFileExtension(fileName) {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : ''
}

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

function RegisterCorrespondencePage() {
  const { currentUser } = useAuth()
  const { addCorrespondence, generateNextReference } = useCorrespondence()
  const navigate = useNavigate()
  const fieldRefs = useRef({})
  const routeableOffices = useMemo(
    () => offices.filter((office) => ROUTEABLE_OFFICES.includes(office.name)),
    [],
  )
  const [formValues, setFormValues] = useState(() => buildInitialFormValues())
  const [errors, setErrors] = useState({})
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const generatedReference = useMemo(
    () => generateNextReference(formValues.documentType),
    [formValues.documentType, generateNextReference],
  )

  const isDirty = useMemo(() => {
    const initialValues = buildInitialFormValues()

    return Object.keys(initialValues).some((key) => {
      if (key === 'attachment') {
        return Boolean(formValues.attachment)
      }

      return formValues[key] !== initialValues[key]
    })
  }, [formValues])

  const setFieldValue = (field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
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
      destinationOffice: 'Select a destination office.',
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
      if (formValues.attachment?.isTemporary && formValues.attachment.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(formValues.attachment.fileUrl)
      }
      setFieldValue('attachment', null)
      return
    }

    const extension = getFileExtension(selectedFile.name)

    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
      event.target.value = ''
      if (formValues.attachment?.isTemporary && formValues.attachment.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(formValues.attachment.fileUrl)
      }
      setErrors((current) => ({
        ...current,
        attachment: 'Choose a PDF, Word, or image file.',
      }))
      setFormValues((current) => ({ ...current, attachment: null }))
      return
    }

    if (selectedFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
      event.target.value = ''
      if (formValues.attachment?.isTemporary && formValues.attachment.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(formValues.attachment.fileUrl)
      }
      setErrors((current) => ({
        ...current,
        attachment: 'The selected file must be 10 MB or smaller.',
      }))
      setFormValues((current) => ({ ...current, attachment: null }))
      return
    }

    setErrors((current) => ({ ...current, attachment: undefined }))
    if (formValues.attachment?.isTemporary && formValues.attachment.fileUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(formValues.attachment.fileUrl)
    }
    setFormValues((current) => ({
      ...current,
      attachment: {
        name: selectedFile.name,
        size: selectedFile.size,
        sizeInBytes: selectedFile.size,
        extension,
        fileType: extension.replace('.', '').toUpperCase(),
        mimeType: selectedFile.type,
        // TODO: Replace temporary object URLs with protected backend file URLs once backend file storage is available.
        fileUrl: URL.createObjectURL(selectedFile),
        fileObject: selectedFile,
        isTemporary: true,
      },
    }))
  }

  const handleCancel = () => {
    if (!isDirty) {
      navigate('/correspondence?status=all')
      return
    }

    setIsDiscardDialogOpen(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    const validationErrors = validateForm()

    if (Object.keys(validationErrors).length) {
      setIsSubmitting(false)
      focusFirstInvalidField(validationErrors)
      return
    }

    const newRecord = addCorrespondence(formValues, currentUser)
    const reviewSteps = getRegistrationReviewSteps(
      newRecord.attachments?.[0] ?? formValues.attachment,
    )
    const initialStep = reviewSteps[0]?.id ?? 'record-details'

    navigate(
      `/correspondence/${encodeURIComponent(newRecord.reference)}?flow=registration&step=${encodeURIComponent(initialStep)}`,
    )
  }

  const overviewSummary = {
    reference: generatedReference,
    subject: formValues.subject,
    documentType: formValues.documentType,
    direction: formValues.direction,
    priority: formValues.priority,
    destinationOffice: formValues.destinationOffice,
    initialStage: formValues.initialStage,
    stageDeadline: formValues.stageDeadline ? formatDateSummary(formValues.stageDeadline) : '',
  }

  return (
    <section className="register-page registration-page">
      <PageHeader
        title="Register New Correspondence"
        description="Create a correspondence record and establish its initial office route."
      />

      <form className="app-form register-page__form" onSubmit={handleSubmit}>
        <div className="register-layout registration-layout">
          <section className="section-card register-form-card">
            <div className="register-form-card__body">
              <div className="register-form-section">
                <div className="register-form-section__header">
                  <h2>Correspondence Details</h2>
                  <p>Basic identifying information for the correspondence record.</p>
                </div>
                <div className="register-form-section__body">
                  <div className="form-grid form-grid--two">
                    <FormField
                      id="system-reference"
                      label="System Reference"
                      value={generatedReference}
                      readOnly
                    />
                    <SelectField
                      id="document-type"
                      label="Document Type"
                      value={formValues.documentType}
                      onChange={(event) => setFieldValue('documentType', event.target.value)}
                      options={registrationDocumentTypeOptions}
                      error={errors.documentType}
                      required
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
                      inputRef={(node) => {
                        fieldRefs.current.subject = node
                      }}
                    />
                    <SelectField
                      id="direction"
                      label="Direction"
                      value={formValues.direction}
                      onChange={(event) => setFieldValue('direction', event.target.value)}
                      options={registrationDirectionOptions}
                      error={errors.direction}
                      required
                      inputRef={(node) => {
                        fieldRefs.current.direction = node
                      }}
                    />
                    <SelectField
                      id="priority"
                      label="Priority"
                      value={formValues.priority}
                      onChange={(event) => setFieldValue('priority', event.target.value)}
                      options={registrationPriorityOptions}
                      error={errors.priority}
                      required
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
                      inputRef={(node) => {
                        fieldRefs.current.sender = node
                      }}
                    />
                    <FormField
                      id="external-reference"
                      label="External Reference"
                      value={formValues.externalReference}
                      onChange={(event) => setFieldValue('externalReference', event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="register-form-section">
                <div className="register-form-section__header">
                  <h2>Dates &amp; Routing</h2>
                  <p>Set the receiving details and initial office route.</p>
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
                      inputRef={(node) => {
                        fieldRefs.current.overallCompletionDate = node
                      }}
                    />
                  </div>

                  <div className="form-grid form-grid--two">
                    <FormField
                      id="registering-office"
                      label="Registering Office"
                      value={currentUser?.officeName ?? ''}
                      readOnly
                    />
                    <SelectField
                      id="destination-office"
                      label="Route to Office"
                      value={formValues.destinationOffice}
                      onChange={(event) => setFieldValue('destinationOffice', event.target.value)}
                      options={routeableOffices.map((office) => office.name)}
                      placeholder="Select destination office"
                      error={errors.destinationOffice}
                      required
                      inputRef={(node) => {
                        fieldRefs.current.destinationOffice = node
                      }}
                    />
                    <SelectField
                      id="initial-stage"
                      label="Initial Stage"
                      value={formValues.initialStage}
                      onChange={(event) => setFieldValue('initialStage', event.target.value)}
                      options={registrationStageOptions}
                      error={errors.initialStage}
                      required
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
                  <p>Record the required action and relevant administrative context.</p>
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
                      inputRef={(node) => {
                        fieldRefs.current.requiredAction = node
                      }}
                    />
                    <TextAreaField
                      id="administrative-notes"
                      label="Administrative Notes"
                      value={formValues.administrativeNotes}
                      onChange={(event) => setFieldValue('administrativeNotes', event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="register-form-actions registration-actions">
                <button type="button" className="button button--secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="button button--primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register Correspondence'}
                </button>
              </div>
            </div>
          </section>

          <aside className="register-sidebar registration-aside">
            <SectionCard
              title="Document Attachment"
              description="Attach the correspondence document."
              className="register-sidebar__card"
            >
              <FileUploadField
                id="attachment"
                file={formValues.attachment}
                error={errors.attachment}
                accept={ALLOWED_ATTACHMENT_EXTENSIONS.join(',')}
                inputRef={(node) => {
                  fieldRefs.current.attachment = node
                }}
                onChange={handleFileChange}
                onRemove={() => {
                  if (formValues.attachment?.isTemporary && formValues.attachment.fileUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(formValues.attachment.fileUrl)
                  }
                  setFieldValue('attachment', null)
                  if (fieldRefs.current.attachment) {
                    fieldRefs.current.attachment.value = ''
                  }
                }}
              />
            </SectionCard>

            <SectionCard
              title="Registration Overview"
              description="Summary of the record to be created."
              className="register-sidebar__card"
            >
              <RegistrationOverview
                summary={overviewSummary}
                registeringOffice={currentUser?.officeName ?? 'Office'}
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
