import { CORRESPONDENCE_DIRECTION_OPTIONS } from './correspondence.js'

export const REGISTRATION_DOCUMENT_TYPE_OPTIONS = Object.freeze([
  'Contract',
  'Letter',
  'Memo',
  'Report',
])
export const REGISTRATION_PRIORITY_OPTIONS = Object.freeze(['Normal', 'High', 'Urgent'])
export const REGISTRATION_STAGE_OPTIONS = Object.freeze([
  'Initial classification',
  'Initial legal review',
  'Awaiting action',
  'Director review',
  'Technical assessment',
  'Financial review',
  'Procurement review',
])
export const WORKFLOW_STAGE_OPTIONS = Object.freeze([
  ...REGISTRATION_STAGE_OPTIONS,
  'Legal opinion preparation',
  'Contract compliance assessment',
  'Ready for forwarding',
])

function normalizeDateSeed(currentDate) {
  const candidate = currentDate instanceof Date ? currentDate : new Date(currentDate)
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate
}

function formatDateInputValue(currentDate) {
  const normalizedDate = normalizeDateSeed(currentDate)
  const year = normalizedDate.getFullYear()
  const month = String(normalizedDate.getMonth() + 1).padStart(2, '0')
  const day = String(normalizedDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getApiRegistrationDateDefaults(currentDate = new Date()) {
  return {
    documentDate: formatDateInputValue(currentDate),
    dateReceived: formatDateInputValue(currentDate),
    overallCompletionDate: '',
    stageDeadline: '',
  }
}

export function buildRegistrationFormValues(currentDate = new Date()) {
  const registrationDates = getApiRegistrationDateDefaults(currentDate)
  return {
    documentType: 'Contract',
    direction: 'Incoming',
    subject: '',
    sender: '',
    externalReference: '',
    priority: 'Normal',
    documentDate: registrationDates.documentDate,
    dateReceived: registrationDates.dateReceived,
    overallCompletionDate: registrationDates.overallCompletionDate,
    destinationOffice: '',
    initialStage: 'Initial classification',
    stageDeadline: registrationDates.stageDeadline,
    requiredAction: '',
    administrativeNotes: '',
    attachment: null,
  }
}

export function getRegistrationDirectionFieldOptions() {
  return [...CORRESPONDENCE_DIRECTION_OPTIONS]
}

export function shouldShowExternalReferenceField() {
  return false
}
