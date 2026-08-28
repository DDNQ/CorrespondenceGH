import {
  canDownloadAttachment,
  getAttachmentDownloadUrl,
  getAttachmentViewUrl,
  isImageAttachment,
  isPdfAttachment,
  isWordAttachment,
} from './attachments.js'
import { formatDuration, formatOverdueDuration } from './duration.js'

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeText(value) {
  if (isNonEmptyString(value)) {
    return value.trim()
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function normalizeDate(value) {
  if (!value) {
    return null
  }

  const parsedDate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function sameOffice(leftOffice, rightOffice) {
  const leftId = normalizeText(leftOffice?.id).toLowerCase()
  const rightId = normalizeText(rightOffice?.id).toLowerCase()

  if (leftId && rightId) {
    return leftId === rightId
  }

  const leftName = normalizeText(leftOffice?.name).toLowerCase()
  const rightName = normalizeText(rightOffice?.name).toLowerCase()

  return Boolean(leftName && rightName && leftName === rightName)
}

function getOfficeName(office, fallback = '') {
  return normalizeText(office?.name) || fallback
}

function getAttachmentMovementLabel(note) {
  const normalizedNote = normalizeText(note)

  if (!normalizedNote) {
    return ''
  }

  return normalizedNote.replace(/^uploaded:\s*/i, '').trim()
}

function getMovementActionKind(action) {
  const normalizedAction = normalizeText(action).toLowerCase()

  if (!normalizedAction) {
    return 'unknown'
  }

  if (normalizedAction.includes('register')) {
    return 'registered'
  }

  if (normalizedAction.includes('forward')) {
    return 'forwarded'
  }

  if (normalizedAction.includes('stage')) {
    return 'stage-updated'
  }

  if (normalizedAction.includes('attachment')) {
    return 'attachment-uploaded'
  }

  if (normalizedAction.includes('note')) {
    return 'note-added'
  }

  if (normalizedAction.includes('complete')) {
    return 'completed'
  }

  if (normalizedAction.includes('file')) {
    return 'filed'
  }

  return 'unknown'
}

export function formatDetailDateTime(value, fallback = 'Unavailable') {
  const normalizedDate = normalizeDate(value)

  if (!normalizedDate) {
    return fallback
  }

  return normalizedDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDetailDateOnly(value, fallback = 'Unavailable') {
  const normalizedDate = normalizeDate(value)

  if (!normalizedDate) {
    return fallback
  }

  return normalizedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatElapsedMilliseconds(milliseconds) {
  return formatDuration(milliseconds, { inputUnit: 'milliseconds' })
}

function sortMovementsByPerformedAtDescending(movements = []) {
  return [...movements]
    .filter((movement) => normalizeDate(movement?.performedAt))
    .sort((leftMovement, rightMovement) => {
      return normalizeDate(rightMovement.performedAt).getTime() - normalizeDate(leftMovement.performedAt).getTime()
    })
}

export function getDetailTerminalTimestamp(detail, movements = []) {
  const normalizedStatus = normalizeText(detail?.status).toLowerCase()
  const orderedMovements = sortMovementsByPerformedAtDescending(movements)

  if (normalizedStatus === 'filed') {
    return orderedMovements.find((movement) => getMovementActionKind(movement?.action) === 'filed')?.performedAt ?? null
  }

  if (normalizedStatus === 'completed') {
    return (
      orderedMovements.find((movement) => getMovementActionKind(movement?.action) === 'completed')?.performedAt ??
      detail?.resolvedAt ??
      null
    )
  }

  return null
}

export function getDetailTimeRemaining(deadline, status, now = new Date(), terminalTimestamp = null) {
  const normalizedDeadline = normalizeDate(deadline)
  const normalizedNow = normalizeDate(now)
  const normalizedStatus = normalizeText(status).toLowerCase()

  if (!normalizedDeadline) {
    return {
      label: 'Unavailable',
      tone: 'neutral',
      overviewLabel:
        normalizedStatus === 'filed'
          ? 'Time Remaining at Filing'
          : normalizedStatus === 'completed'
            ? 'Time Remaining at Completion'
            : 'Time Remaining',
      trackLabel:
        normalizedStatus === 'filed'
          ? 'Time Remaining at Filing'
          : normalizedStatus === 'completed'
            ? 'Time Remaining at Completion'
            : 'Time Until Action Is Due',
    }
  }

  const isTerminalStatus = normalizedStatus === 'completed' || normalizedStatus === 'filed'
  const referenceTime = isTerminalStatus ? normalizeDate(terminalTimestamp) : normalizedNow
  const overviewLabel = isTerminalStatus
    ? normalizedStatus === 'filed'
      ? 'Time Remaining at Filing'
      : 'Time Remaining at Completion'
    : 'Time Remaining'
  const trackLabel = isTerminalStatus ? overviewLabel : 'Time Until Action Is Due'

  if (!referenceTime) {
    return {
      label: 'Unavailable',
      tone: normalizedStatus === 'filed' ? 'filed' : normalizedStatus === 'completed' ? 'completed' : 'neutral',
      overviewLabel,
      trackLabel,
    }
  }

  const difference = normalizedDeadline.getTime() - referenceTime.getTime()
  const durationLabel =
    difference < 0
      ? formatOverdueDuration(difference, { inputUnit: 'milliseconds' })
      : formatElapsedMilliseconds(difference)

  if (!durationLabel) {
    return {
      label: 'Unavailable',
      tone: 'neutral',
      overviewLabel,
      trackLabel,
    }
  }

  if (difference < 0) {
    return {
      label: durationLabel,
      tone: 'overdue',
      overviewLabel,
      trackLabel,
    }
  }

  return {
    label: durationLabel,
    tone: isTerminalStatus
      ? normalizedStatus === 'filed'
        ? 'filed'
        : 'completed'
      : difference <= 48 * 60 * 60 * 1000
        ? 'due-soon'
        : 'neutral',
    overviewLabel,
    trackLabel,
  }
}

export function getCurrentOfficeArrivalTimestamp(detail, movements = []) {
  if (!detail?.currentOffice || !Array.isArray(movements) || !movements.length) {
    return null
  }

  const orderedMovements = sortMovementsByPerformedAtDescending(movements)

  for (const movement of orderedMovements) {
    const actionKind = getMovementActionKind(movement.action)
    const movedToCurrentOffice = sameOffice(movement.toOffice, detail.currentOffice)

    if (!movedToCurrentOffice && actionKind !== 'registered') {
      continue
    }

    if (actionKind === 'forwarded' || actionKind === 'registered') {
      return movement.performedAt
    }
  }

  return null
}

export function getTimeInCurrentOffice(arrivedAt, now = new Date()) {
  const normalizedArrivedAt = normalizeDate(arrivedAt)
  const normalizedNow = normalizeDate(now)

  if (!normalizedArrivedAt || !normalizedNow) {
    return {
      label: 'Unavailable',
      tone: 'neutral',
    }
  }

  const difference = normalizedNow.getTime() - normalizedArrivedAt.getTime()
  const durationLabel = formatElapsedMilliseconds(difference)

  return {
    label: durationLabel || 'Unavailable',
    tone: durationLabel ? 'neutral' : 'neutral',
  }
}

export function getAttachmentTypeLabel(attachment) {
  if (isPdfAttachment(attachment)) {
    return 'PDF document'
  }

  if (isWordAttachment(attachment)) {
    return 'Word document'
  }

  if (isImageAttachment(attachment)) {
    return 'Image document'
  }

  return normalizeText(attachment?.contentType) || 'Document'
}

export function getDetailDocumentPreviewState(attachment) {
  return getDetailDocumentPreviewStateWithOptions(attachment)
}

export function getAttachmentPreviewAvailabilityState(error) {
  const status = Number(error?.status)

  if (status === 404) {
    return 'missing'
  }

  if (status === 403) {
    return 'restricted'
  }

  return 'preview-failed'
}

export function getDetailDocumentPreviewStateWithOptions(attachment, options = {}) {
  if (!attachment) {
    return {
      mode: 'empty',
      title: 'No document available',
      description: 'No document has been linked to this correspondence.',
      viewUrl: null,
      downloadUrl: null,
      fileName: '',
      typeLabel: '',
      sizeLabel: '',
    }
  }

  const viewUrl = getAttachmentViewUrl(attachment)
  const downloadUrl = getAttachmentDownloadUrl(attachment)
  const fileName =
    normalizeText(attachment?.originalFilename) ||
    normalizeText(attachment?.fileName) ||
    normalizeText(attachment?.name) ||
    'Attachment'
  const typeLabel = getAttachmentTypeLabel(attachment)
  const sizeLabel = normalizeText(attachment?.sizeLabel)
  const isLocalPreview = String(viewUrl ?? '').startsWith('blob:')
  const availability = normalizeText(options?.availability).toLowerCase() || 'available'

  if (availability === 'missing') {
    return {
      mode: 'missing-file',
      title: 'Document no longer available',
      description: 'The stored document file is no longer available.',
      viewUrl: null,
      downloadUrl: null,
      fileName,
      typeLabel,
      sizeLabel,
    }
  }

  if (availability === 'restricted') {
    return {
      mode: 'access-restricted',
      title: 'Document access restricted',
      description: 'You do not have permission to open this stored document.',
      viewUrl: null,
      downloadUrl: null,
      fileName,
      typeLabel,
      sizeLabel,
    }
  }

  if (isImageAttachment(attachment) && viewUrl && isLocalPreview) {
    return {
      mode: 'image',
      title: fileName,
      description: typeLabel,
      viewUrl,
      downloadUrl,
      fileName,
      typeLabel,
      sizeLabel,
    }
  }

  if (isPdfAttachment(attachment) && viewUrl && isLocalPreview) {
    return {
      mode: 'embedded-pdf',
      title: fileName,
      description: typeLabel,
      viewUrl,
      downloadUrl,
      fileName,
      typeLabel,
      sizeLabel,
    }
  }

  if (isPdfAttachment(attachment) || isImageAttachment(attachment)) {
    return {
      mode: 'preview-unavailable',
      title: 'Preview unavailable in this window',
      description:
        availability === 'preview-failed'
          ? 'The document preview could not be loaded right now. Use the actions below to open or download the document.'
          : 'Use the actions below to open or download the document.',
      viewUrl,
      downloadUrl,
      fileName,
      typeLabel,
      sizeLabel,
    }
  }

  return {
    mode: 'document',
    title: fileName,
    description: typeLabel,
    viewUrl,
    downloadUrl,
    fileName,
    typeLabel,
    sizeLabel,
  }
}

export function getJourneyAuditPresentation(movement) {
  const actionKind = getMovementActionKind(movement?.action)
  const actorName = normalizeText(movement?.performedBy?.fullName) || normalizeText(movement?.actorEmail)
  const fromOfficeName = getOfficeName(movement?.fromOffice)
  const toOfficeName = getOfficeName(movement?.toOffice)
  const referenceNumber = normalizeText(movement?.referenceNumber)
  const currentStage = normalizeText(movement?.currentStage)
  const previousStage = normalizeText(movement?.previousStage)
  const newStage = normalizeText(movement?.newStage)
  const note = normalizeText(movement?.note)

  switch (actionKind) {
    case 'registered':
      return {
        title: 'Correspondence registered',
        description: toOfficeName
          ? `Registered at ${toOfficeName}.`
          : referenceNumber
            ? `Reference ${referenceNumber} created and initial details captured.`
            : 'Correspondence registered.',
      }

    case 'stage-updated':
      return {
        title: 'Current stage updated',
        description:
          previousStage && newStage
            ? `Stage changed from ${previousStage} to ${newStage}.`
            : newStage
              ? `Stage updated to ${newStage}.`
              : currentStage
                ? `Stage updated to ${currentStage}.`
              : 'Correspondence stage updated.',
      }

    case 'forwarded':
      return {
        title: toOfficeName ? `Forwarded to ${toOfficeName}` : 'Correspondence forwarded',
        description:
          fromOfficeName && toOfficeName
            ? `Forwarded from ${fromOfficeName} to ${toOfficeName}.`
            : toOfficeName
              ? `Forwarded to ${toOfficeName}.`
              : fromOfficeName
                ? `Forwarded from ${fromOfficeName}.`
                : 'Correspondence forwarded.',
      }

    case 'note-added':
      return {
        title: 'Note added',
        description: 'Note added.',
      }

    case 'attachment-uploaded':
      {
        const attachmentLabel = getAttachmentMovementLabel(note)

      return {
        title: 'Attachment uploaded',
        description: attachmentLabel
          ? `Attachment uploaded: ${attachmentLabel}.`
          : 'Attachment uploaded.',
      }
      }

    case 'completed':
      return {
        title: 'Correspondence completed',
        description: 'Correspondence marked completed.',
      }

    case 'filed':
      return {
        title: 'Correspondence filed',
        description: 'Correspondence filed.',
      }

    default:
      return {
        title: normalizeText(movement?.action) || 'Recorded action',
        description:
          note ||
          currentStage ||
          (actorName ? `Recorded by ${actorName}.` : 'Workflow activity recorded.'),
      }
  }
}

export function getWorkflowProgressSteps(detail, movements = []) {
  const normalizedMovements = Array.isArray(movements) ? movements : []
  const chronologicalMovements = [...normalizedMovements]
    .filter((movement) => normalizeDate(movement?.performedAt))
    .sort((leftMovement, rightMovement) => {
      return normalizeDate(leftMovement.performedAt).getTime() - normalizeDate(rightMovement.performedAt).getTime()
    })

  const steps = []

  for (const movement of chronologicalMovements) {
    const actionKind = getMovementActionKind(movement.action)
    const office =
      movement.toOffice ??
      movement.fromOffice ??
      (actionKind === 'registered' ? detail?.currentOffice ?? null : null)
    const officeName = getOfficeName(office)

    if (!officeName) {
      continue
    }

    const description = getJourneyAuditPresentation(movement).description
    const previousStep = steps[steps.length - 1]

    if (previousStep && sameOffice(previousStep.office, office)) {
      previousStep.description = description
      previousStep.performedAt = movement.performedAt
      continue
    }

    steps.push({
      id: movement.id ?? `${officeName}-${steps.length + 1}`,
      office,
      title: officeName,
      description,
      performedAt: movement.performedAt ?? null,
    })
  }

  const currentOfficeName = getOfficeName(detail?.currentOffice)
  const currentStage = normalizeText(detail?.currentStage)

  if (!steps.length && currentOfficeName) {
    return [
      {
        id: 'workflow-current-office',
        office: detail.currentOffice,
        title: currentOfficeName,
        description: currentStage || 'Current office position.',
        state: 'current',
      },
    ]
  }

  if (currentOfficeName) {
    const lastStep = steps[steps.length - 1]

    if (!lastStep || !sameOffice(lastStep.office, detail.currentOffice)) {
      steps.push({
        id: 'workflow-current-office',
        office: detail.currentOffice,
        title: currentOfficeName,
        description: currentStage || 'Current office position.',
        performedAt: null,
      })
    } else if (currentStage) {
      lastStep.description = currentStage
    }
  }

  return steps.map((step, index) => ({
    ...step,
    state: index === steps.length - 1 ? 'current' : 'done',
  }))
}

function createRecordField(label, value, options = {}) {
  const hasValue =
    options.format === 'date-time' || options.format === 'date'
      ? Boolean(normalizeDate(value))
      : Boolean(normalizeText(value))

  if (!options.required && !hasValue) {
    return null
  }

  const formattedValue = options.format === 'date-time'
    ? formatDetailDateTime(value)
    : options.format === 'date'
      ? formatDetailDateOnly(value)
      : normalizeText(value)

  return {
    label,
    value:
      normalizeText(formattedValue) ||
      (options.required ? 'Unavailable' : ''),
    tone: options.tone ?? 'text',
  }
}

export function getRecordDetailSections(detail) {
  if (!detail) {
    return []
  }

  const identificationFields = [
    createRecordField('Reference', detail.referenceNumber, { required: true }),
    createRecordField('Document Type', detail.type, { required: true }),
    createRecordField('Direction', detail.direction, { required: true }),
    createRecordField('Subject', detail.subject, { required: true }),
    createRecordField('Sender / Origin', detail.sender, { required: true }),
  ].filter(Boolean)

  const workflowFields = [
    createRecordField('Current Office', getOfficeName(detail.currentOffice), { required: true }),
    createRecordField('Priority', detail.priority, { required: true, tone: 'priority' }),
    createRecordField('Status', detail.status, { required: true, tone: 'status' }),
    createRecordField('Document Date', detail.documentDate ?? detail.document_date ?? null, { format: 'date' }),
    createRecordField('Date Received', detail.receivedAt ?? detail.received_at ?? detail.registeredAt ?? null, {
      format: 'date-time',
    }),
    createRecordField('Deadline', detail.deadline, { format: 'date-time' }),
    createRecordField('Current Stage', detail.currentStage, { required: true }),
  ].filter(Boolean)

  const notesFields = [
    createRecordField('Instructions', detail.instructions ?? detail.requiredAction ?? null),
  ].filter(Boolean)

  return [
    {
      id: 'identification',
      title: 'Record Identification',
      fields: identificationFields,
    },
    {
      id: 'workflow',
      title: 'Routing & Status',
      fields: workflowFields,
    },
    ...(notesFields.length
      ? [
          {
            id: 'instructions',
            title: 'Instructions',
            fields: notesFields,
            fullWidth: true,
          },
        ]
      : []),
  ]
}

export function getAttachmentListItemPresentation(attachment) {
  return {
    fileName:
      normalizeText(attachment?.originalFilename) ||
      normalizeText(attachment?.fileName) ||
      normalizeText(attachment?.name) ||
      'Attachment',
    typeLabel: getAttachmentTypeLabel(attachment),
    sizeLabel: normalizeText(attachment?.sizeLabel) || 'Size unavailable',
    uploadedBy:
      normalizeText(attachment?.uploadedBy?.fullName) ||
      normalizeText(attachment?.uploadedBy?.email) ||
      'Uploader unavailable',
    uploadedAt: formatDetailDateTime(attachment?.uploadedAt),
    canOpen: canDownloadAttachment(attachment),
    viewUrl: getAttachmentViewUrl(attachment),
    downloadUrl: getAttachmentDownloadUrl(attachment),
  }
}
