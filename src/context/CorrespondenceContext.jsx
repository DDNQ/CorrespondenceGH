import { useEffect, useRef, useState } from 'react'

import { addAuditLog } from '../data/auditLogs'
import { mockCorrespondence } from '../data/correspondence'
import { offices } from '../data/offices'
import { normalizeCorrespondenceRecord } from '../utils/correspondencePermissions'
import CorrespondenceContext from './correspondence-context'
import { useNotification } from './useNotification'

const SYSTEM_DATE = '2026-07-17'
const SYSTEM_TIME = '10:30 AM'
const SYSTEM_NOW = new Date(`${SYSTEM_DATE}T10:30:00`)
const SYSTEM_FORWARD_TIME = '11:05 AM'
const SYSTEM_RECEIPT_TIME = '11:22 AM'
const CORRESPONDENCE_STORAGE_KEY = 'mrh-correspondence-records'

function cloneEntry(entry) {
  return { ...entry }
}

function cloneRecord(record) {
  return {
    ...record,
    journey: record.journey.map((item) => cloneEntry(item)),
    actions: record.actions.map((item) => cloneEntry(item)),
    attachments: record.attachments.map((item) => cloneEntry(item)),
    notes: record.notes.map((item) => cloneEntry(item)),
  }
}

function cloneRecords(records) {
  return records.map((record) => cloneRecord(record))
}

function getStoredRecords() {
  const storedValue = localStorage.getItem(CORRESPONDENCE_STORAGE_KEY)

  if (!storedValue) {
    return cloneRecords(mockCorrespondence.map((record) => normalizeRecord(record)))
  }

  try {
    return JSON.parse(storedValue).map((record) => normalizeRecord(record))
  } catch {
    localStorage.removeItem(CORRESPONDENCE_STORAGE_KEY)
    return cloneRecords(mockCorrespondence.map((record) => normalizeRecord(record)))
  }
}

function getDocumentCode(documentType) {
  return {
    Contract: 'CON',
    Letter: 'LET',
    Memo: 'MEM',
    Report: 'REP',
  }[documentType] ?? 'DOC'
}

function getRoleLabel(role) {
  return {
    OFFICE_USER: 'Office User',
    OFFICE_SUPERVISOR: "Director's Administrator",
    SYSTEM_ADMIN: 'System Administrator',
  }[role] ?? role
}

function formatDateDisplay(dateValue) {
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

function parseDisplayDate(value) {
  if (!value) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }

  const normalizedValue = value.replace(',', '')
  const parsed = new Date(normalizedValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatTimestampDisplay(dateValue = SYSTEM_DATE, timeLabel = SYSTEM_TIME) {
  return `${formatDateDisplay(dateValue)}, ${timeLabel}`
}

function formatFileSize(sizeInBytes) {
  if (!sizeInBytes) {
    return '0 KB'
  }

  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`
}

function getOfficeByName(officeName) {
  return offices.find((office) => office.name === officeName) ?? null
}

function getDateGroup(dateValue) {
  if (!dateValue) {
    return 'recent'
  }

  const target = new Date(`${dateValue}T00:00:00`)
  const differenceInDays = Math.round((SYSTEM_NOW.getTime() - target.getTime()) / 86400000)

  return differenceInDays > 7 ? 'older' : 'recent'
}

function getDeadlineDetails(stageDeadline) {
  const deadlineDate = parseDisplayDate(stageDeadline)

  if (!deadlineDate) {
    return { timeRemaining: 'Pending review', deadlineState: 'normal' }
  }

  const differenceInMs = deadlineDate.getTime() - SYSTEM_NOW.getTime()
  const differenceInDays = Math.floor(Math.abs(differenceInMs) / 86400000)
  const differenceInHours = Math.max(0, Math.round((Math.abs(differenceInMs) % 86400000) / 3600000))

  if (differenceInMs < 0) {
    return {
      timeRemaining: `${Math.max(1, differenceInDays)} day${differenceInDays === 1 ? '' : 's'} overdue`,
      deadlineState: 'overdue',
    }
  }

  if (differenceInDays === 0 && differenceInHours === 0) {
    return { timeRemaining: 'Due today', deadlineState: 'due-soon' }
  }

  if (differenceInDays <= 2) {
    if (differenceInHours && differenceInDays < 1) {
      return {
        timeRemaining: `${differenceInHours} hr${differenceInHours === 1 ? '' : 's'}`,
        deadlineState: 'due-soon',
      }
    }

    return {
      timeRemaining: `${Math.max(1, differenceInDays)} day${differenceInDays === 1 ? '' : 's'}${differenceInHours ? ` ${differenceInHours} hr${differenceInHours === 1 ? '' : 's'}` : ''}`,
      deadlineState: 'due-soon',
    }
  }

  return {
    timeRemaining: `${differenceInDays} day${differenceInDays === 1 ? '' : 's'}`,
    deadlineState: 'normal',
  }
}

function getTimeSpentInOffice(arrivedAtCurrentOffice, status) {
  if (status === 'Completed') {
    return 'Completed'
  }

  if (status === 'Filed') {
    return 'Filed'
  }

  const arrivalDate = parseDisplayDate(arrivedAtCurrentOffice)

  if (!arrivalDate) {
    return 'Not recorded'
  }

  const differenceInMs = SYSTEM_NOW.getTime() - arrivalDate.getTime()
  const totalHours = Math.max(0, Math.round(differenceInMs / 3600000))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} hour${hours === 1 ? '' : 's'}` : ''}`
  }

  return `${Math.max(1, hours)} hour${hours === 1 ? '' : 's'}`
}

function formatAcknowledgementDelay(arrivedAtCurrentOffice, receivedAt) {
  const arrivalDate = parseDisplayDate(arrivedAtCurrentOffice)
  const receiptDate = parseDisplayDate(receivedAt)

  if (!arrivalDate || !receiptDate) {
    return ''
  }

  const differenceInMinutes = Math.max(
    0,
    Math.round((receiptDate.getTime() - arrivalDate.getTime()) / 60000),
  )

  if (differenceInMinutes < 60) {
    return `${Math.max(1, differenceInMinutes)} minute${differenceInMinutes === 1 ? '' : 's'} after arrival`
  }

  const hours = Math.floor(differenceInMinutes / 60)
  const remainingMinutes = differenceInMinutes % 60

  return `${hours} hour${hours === 1 ? '' : 's'}${remainingMinutes ? ` ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}` : ''} after arrival`
}

function createReference(records, documentType) {
  const currentYear = '2026'
  const documentCode = getDocumentCode(documentType)
  const matchingCount = records.filter((record) =>
    record.reference.startsWith(`MRH/${documentCode}/${currentYear}/`),
  ).length

  // TODO: Replace this frontend-generated reference with a backend-generated sequence to prevent duplicates.
  return `MRH/${documentCode}/${currentYear}/${String(matchingCount + 1).padStart(4, '0')}`
}

function normalizeJourneyEntry(entry, index) {
  return {
    id: entry.id ?? `journey-${index + 1}`,
    title: entry.title ?? 'Office movement recorded',
    description: entry.description ?? '',
    actionType: entry.actionType ?? entry.type ?? 'Updated',
    office: entry.office ?? entry.officeName ?? '',
    officeId: entry.officeId ?? '',
    actor: entry.actor ?? entry.userName ?? 'System',
    actorId: entry.actorId ?? entry.userId ?? '',
    time: entry.time ?? entry.timestamp ?? '',
    state: entry.state ?? 'done',
    fromOffice: entry.fromOffice ?? entry.previousValue ?? '',
    toOffice: entry.toOffice ?? entry.newValue ?? '',
    note: entry.note ?? '',
  }
}

function normalizeActionEntry(entry, index) {
  return {
    id: entry.id ?? `action-${index + 1}`,
    type: entry.type ?? entry.actionType ?? 'Updated',
    actionType: entry.actionType ?? entry.type ?? 'Updated',
    title: entry.title ?? 'Correspondence updated',
    description: entry.description ?? '',
    actor: entry.actor ?? entry.userName ?? 'System',
    actorId: entry.actorId ?? entry.userId ?? '',
    office: entry.office ?? entry.officeName ?? '',
    officeId: entry.officeId ?? '',
    officeName: entry.officeName ?? entry.office ?? '',
    role: entry.role ?? '',
    userId: entry.userId ?? entry.actorId ?? '',
    userName: entry.userName ?? entry.actor ?? 'System',
    timestamp: entry.timestamp ?? entry.time ?? '',
    previousValue: entry.previousValue ?? '',
    newValue: entry.newValue ?? '',
    note: entry.note ?? '',
  }
}

function normalizeRecord(record) {
  const normalizedRecord = normalizeCorrespondenceRecord(record)
  const deadlineDetails = getDeadlineDetails(
    normalizedRecord.stageDeadline || normalizedRecord.deadline,
  )

  return {
    ...normalizedRecord,
    deadline: normalizedRecord.deadline || normalizedRecord.stageDeadline || '',
    stageDeadline: normalizedRecord.stageDeadline || normalizedRecord.deadline || '',
    overallCompletionDate:
      normalizedRecord.overallCompletionDate || normalizedRecord.deadline || '',
    forwardedFromOfficeId: normalizedRecord.forwardedFromOfficeId ?? '',
    forwardedFromOfficeName: normalizedRecord.forwardedFromOfficeName ?? '',
    forwardedToOfficeId: normalizedRecord.forwardedToOfficeId ?? '',
    forwardedToOfficeName: normalizedRecord.forwardedToOfficeName ?? '',
    forwardedAt: normalizedRecord.forwardedAt ?? '',
    forwardedByUserId: normalizedRecord.forwardedByUserId ?? '',
    forwardedByUserName: normalizedRecord.forwardedByUserName ?? '',
    forwardingHistory: (normalizedRecord.forwardingHistory ?? []).map((event) => ({ ...event })),
    receiptStatus: normalizedRecord.receiptStatus ?? null,
    receivedAt: normalizedRecord.receivedAt ?? '',
    receivedByUserId: normalizedRecord.receivedByUserId ?? '',
    receivedByUserName: normalizedRecord.receivedByUserName ?? '',
    receivedByOfficeId: normalizedRecord.receivedByOfficeId ?? '',
    receivedByOfficeName: normalizedRecord.receivedByOfficeName ?? '',
    receiptNote: normalizedRecord.receiptNote ?? '',
    acknowledgementTime:
      normalizedRecord.acknowledgementTime ??
      formatAcknowledgementDelay(
        normalizedRecord.arrivedAtCurrentOffice,
        normalizedRecord.receivedAt,
      ),
    timeSpentInOffice:
      normalizedRecord.timeSpentInOffice ||
      getTimeSpentInOffice(normalizedRecord.arrivedAtCurrentOffice, normalizedRecord.status),
    timeRemaining: normalizedRecord.timeRemaining || deadlineDetails.timeRemaining,
    deadlineState: normalizedRecord.deadlineState || deadlineDetails.deadlineState,
    journey: (normalizedRecord.journey ?? []).map((entry, index) =>
      normalizeJourneyEntry(entry, index),
    ),
    actions: (normalizedRecord.actions ?? []).map((entry, index) =>
      normalizeActionEntry(entry, index),
    ),
    attachments: (normalizedRecord.attachments ?? []).map((attachment) => ({
      ...attachment,
      fileType: attachment.fileType ?? attachment.type ?? '',
      mimeType: attachment.mimeType ?? '',
      description: attachment.description ?? '',
      uploadedByUserId: attachment.uploadedByUserId ?? attachment.uploadedById ?? '',
      uploadedByUserName: attachment.uploadedByUserName ?? attachment.uploadedBy ?? '',
      uploadedByOfficeId: attachment.uploadedByOfficeId ?? attachment.officeId ?? '',
      uploadedByOfficeName: attachment.uploadedByOfficeName ?? attachment.office ?? '',
      uploadedAt: attachment.uploadedAt ?? attachment.date ?? '',
      // TODO: Replace temporary object URLs with protected backend file URLs and durable storage once backend file services are available.
      fileUrl:
        attachment.fileUrl ??
        attachment.objectUrl ??
        (attachment.fileObject ? URL.createObjectURL(attachment.fileObject) : ''),
      fileObject: attachment.fileObject ?? null,
      isTemporary: attachment.isTemporary ?? Boolean(attachment.fileObject),
    })),
    notes: (normalizedRecord.notes ?? []).map((note) => ({ ...note })),
  }
}

function createAuditAction({
  actionType,
  title,
  description,
  currentUser,
  timestamp,
  previousValue = '',
  newValue = '',
  note = '',
}) {
  return {
    id: `action-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: actionType,
    actionType,
    title,
    description,
    actor: currentUser.fullName,
    actorId: currentUser.id,
    office: currentUser.officeName,
    officeId: currentUser.officeId,
    officeName: currentUser.officeName,
    role: currentUser.role,
    userId: currentUser.id,
    userName: currentUser.fullName,
    timestamp,
    previousValue,
    newValue,
    note,
  }
}

function appendSystemAuditLog(reference, action, description) {
  addAuditLog({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: action.actionType,
    title: action.title,
    description: description || `${reference} - ${action.title}`,
    reference,
    user: action.userName,
    office: action.officeName,
    role: action.role,
    time: action.timestamp,
    dateGroup: 'Today',
  })
}

export function CorrespondenceProvider({ children }) {
  const {
    addNotification,
    createReceivedNotification,
    markCorrespondenceNotificationAsRead,
  } = useNotification()
  const [records, setRecords] = useState(getStoredRecords)
  const recordsRef = useRef(records)

  useEffect(() => {
    recordsRef.current = records
    localStorage.setItem(CORRESPONDENCE_STORAGE_KEY, JSON.stringify(records))
  }, [records])

  useEffect(
    () => () => {
      recordsRef.current.forEach((record) => {
        record.attachments.forEach((attachment) => {
          if (attachment.isTemporary && attachment.fileUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(attachment.fileUrl)
          }
        })
      })
    },
    [],
  )

  const getCorrespondenceByReference = (reference) => {
    const normalizedReference = decodeURIComponent(reference)
    const record = records.find(
      (item) => item.reference.toLowerCase() === normalizedReference.toLowerCase(),
    )

    return record ? cloneRecord(record) : null
  }

  const updateCorrespondence = (reference, updater) => {
    let updatedRecord = null

    setRecords((current) =>
      current.map((record) => {
        if (record.reference !== reference) {
          return record
        }

        const nextRecord =
          typeof updater === 'function' ? updater(cloneRecord(record)) : { ...record, ...updater }
        updatedRecord = normalizeRecord(nextRecord)
        return updatedRecord
      }),
    )

    return updatedRecord ? cloneRecord(updatedRecord) : null
  }

  const addAuditAction = (reference, action, description) => {
    const normalizedAction = normalizeActionEntry(action, 0)

    updateCorrespondence(reference, (record) => ({
      ...record,
      actions: [normalizedAction, ...record.actions],
    }))

    appendSystemAuditLog(reference, normalizedAction, description)
    return normalizedAction
  }

  const addCorrespondence = (formValues, currentUser) => {
    const reference = createReference(records, formValues.documentType)
    const registeredTimestamp = formatTimestampDisplay(SYSTEM_DATE, '9:00 AM')
    const deadlineDisplay = formatDateDisplay(formValues.stageDeadline)
    const deadlineDetails = getDeadlineDetails(deadlineDisplay)
    const destinationOffice = getOfficeByName(formValues.destinationOffice)
    const isRoutedToAnotherOffice =
      Boolean(destinationOffice?.id) && destinationOffice.id !== currentUser.officeId
    const action = createAuditAction({
      actionType: 'Registered',
      title: 'Correspondence registered',
      description: `Correspondence registered by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
      currentUser,
      timestamp: registeredTimestamp,
      newValue: 'Registered',
    })
    const attachmentEntry = formValues.attachment
      ? [
          {
            id: `att-${reference.toLowerCase().replaceAll('/', '-')}`,
            fileName: formValues.attachment.name,
            fileType: formValues.attachment.fileType || formValues.attachment.extension.replace('.', '').toUpperCase(),
            type: formValues.attachment.fileType || formValues.attachment.extension.replace('.', '').toUpperCase(),
            mimeType: formValues.attachment.mimeType || '',
            description: '',
            uploadedByUserId: currentUser.id,
            uploadedByUserName: currentUser.fullName,
            uploadedBy: currentUser.fullName,
            uploadedById: currentUser.id,
            uploadedByOfficeId: currentUser.officeId,
            uploadedByOfficeName: currentUser.officeName,
            office: currentUser.officeName,
            officeId: currentUser.officeId,
            uploadedAt: registeredTimestamp,
            date: registeredTimestamp,
            size: formatFileSize(formValues.attachment.sizeInBytes || formValues.attachment.size),
            sizeInBytes: formValues.attachment.sizeInBytes || formValues.attachment.size,
            fileUrl: formValues.attachment.fileUrl || '',
            fileObject: formValues.attachment.fileObject || null,
            isTemporary: Boolean(formValues.attachment.isTemporary),
          },
        ]
      : []

    const newRecord = normalizeRecord({
      id: `corr-${reference.split('/').pop()?.toLowerCase()}`,
      reference,
      subject: formValues.subject.trim(),
      documentType: formValues.documentType,
      sender: formValues.sender.trim(),
      direction: formValues.direction,
      externalReference: formValues.externalReference.trim(),
      priority: formValues.priority,
      currentOfficeId: destinationOffice?.id ?? '',
      currentOfficeName: destinationOffice?.name ?? formValues.destinationOffice,
      currentOffice: destinationOffice?.name ?? formValues.destinationOffice,
      currentStage: formValues.initialStage,
      status: isRoutedToAnotherOffice ? 'Received' : 'Registered',
      receiptStatus: isRoutedToAnotherOffice ? 'Pending' : 'Acknowledged',
      forwardedFromOfficeId: isRoutedToAnotherOffice ? currentUser.officeId : '',
      forwardedFromOfficeName: isRoutedToAnotherOffice ? currentUser.officeName : '',
      forwardedToOfficeId: isRoutedToAnotherOffice ? destinationOffice?.id ?? '' : '',
      forwardedToOfficeName:
        isRoutedToAnotherOffice ? destinationOffice?.name ?? formValues.destinationOffice : '',
      forwardedAt: isRoutedToAnotherOffice ? registeredTimestamp : '',
      forwardedByUserId: isRoutedToAnotherOffice ? currentUser.id : '',
      forwardedByUserName: isRoutedToAnotherOffice ? currentUser.fullName : '',
      dateReceived: formatDateDisplay(formValues.dateReceived),
      arrivedAtCurrentOffice: registeredTimestamp,
      deadline: deadlineDisplay,
      stageDeadline: deadlineDisplay,
      overallCompletionDate: formatDateDisplay(formValues.overallCompletionDate),
      timeSpentInOffice: 'New',
      timeRemaining: deadlineDetails.timeRemaining,
      deadlineState: deadlineDetails.deadlineState,
      dateGroup: getDateGroup(formValues.dateReceived),
      registeringOfficeId: currentUser.officeId,
      registeringOfficeName: currentUser.officeName,
      registeringOffice: currentUser.officeName,
      routeToOffice: destinationOffice?.name ?? formValues.destinationOffice,
      routeToOfficeId: destinationOffice?.id ?? '',
      requiredAction: formValues.requiredAction.trim(),
      administrativeNotes: formValues.administrativeNotes.trim(),
      isFiled: false,
      isArchived: false,
      journey: [
        {
          id: `journey-${reference.toLowerCase().replaceAll('/', '-')}-1`,
          title: 'Correspondence registered',
          description: `Recorded by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
          actionType: 'Registered',
          office: currentUser.officeName,
          officeId: currentUser.officeId,
          actor: currentUser.fullName,
          actorId: currentUser.id,
          time: registeredTimestamp,
          state: 'current',
        },
      ],
      actions: [action],
      attachments: attachmentEntry,
      notes: formValues.administrativeNotes.trim()
        ? [
            {
              id: `note-${reference.toLowerCase().replaceAll('/', '-')}`,
              author: currentUser.fullName,
              authorId: currentUser.id,
              office: currentUser.officeName,
              officeId: currentUser.officeId,
              date: registeredTimestamp,
              body: formValues.administrativeNotes.trim(),
            },
          ]
        : [],
    })

    setRecords((current) => [newRecord, ...current])
    appendSystemAuditLog(reference, action, `${reference} - ${formValues.subject.trim()}`)

    if (isRoutedToAnotherOffice && destinationOffice) {
      const receivedNotification = createReceivedNotification({
        record: newRecord,
        sourceOffice: { id: currentUser.officeId, name: currentUser.officeName },
        destinationOffice,
        createdAt: registeredTimestamp,
        message: `${currentUser.officeName} registered and routed ${newRecord.reference} to ${destinationOffice.name}.`,
        eventId: `registration-route-${newRecord.reference}`,
        title: 'New correspondence received',
      })

      addNotification(receivedNotification)
    }

    return cloneRecord(newRecord)
  }

  const updateCorrespondenceStage = (reference, updateValues, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '10:42 AM')
    const deadlineDisplay = formatDateDisplay(updateValues.stageDeadline)
    const deadlineDetails = getDeadlineDetails(deadlineDisplay)
    let updated = null

    updateCorrespondence(reference, (record) => {
      const action = createAuditAction({
        actionType: 'Stage Updated',
        title: 'Stage updated',
        description: `Stage updated by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        currentUser,
        timestamp,
        previousValue: record.currentStage,
        newValue: updateValues.stage,
        note: updateValues.note?.trim() ?? '',
      })

      updated = {
        ...record,
        currentOfficeId: record.currentOfficeId,
        currentOfficeName: record.currentOfficeName,
        currentStage: updateValues.stage,
        stageDeadline: deadlineDisplay,
        deadline: deadlineDisplay,
        status:
          record.status === 'Registered' || record.status === 'Awaiting Action'
            ? 'In Progress'
            : record.status,
        timeRemaining: deadlineDetails.timeRemaining,
        deadlineState: deadlineDetails.deadlineState,
        currentHandler: currentUser.fullName,
        actions: [action, ...record.actions],
        journey: [
          normalizeJourneyEntry(
            {
              id: `journey-${Date.now()}`,
              title: `Stage updated to ${updateValues.stage}`,
              description: `Updated by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
              actionType: 'Stage Updated',
              office: currentUser.officeName,
              officeId: currentUser.officeId,
              actor: currentUser.fullName,
              actorId: currentUser.id,
              time: timestamp,
              state: 'current',
              note: updateValues.note?.trim() ?? '',
            },
            0,
          ),
          ...record.journey.map((entry) => ({
            ...entry,
            state: entry.state === 'current' ? 'done' : entry.state,
          })),
        ],
      }

      if (updateValues.note?.trim()) {
        updated.notes = [
          {
            id: `note-stage-${Date.now()}`,
            author: currentUser.fullName,
            authorId: currentUser.id,
            office: currentUser.officeName,
            officeId: currentUser.officeId,
            date: timestamp,
            body: updateValues.note.trim(),
          },
          ...record.notes,
        ]
      }

      appendSystemAuditLog(reference, action, `${reference} - stage updated to ${updateValues.stage}`)
      return updated
    })

    if (!updated) {
      return null
    }

    return updated.error ? updated : cloneRecord(updated)
  }

  const forwardCorrespondence = (reference, updateValues, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, SYSTEM_FORWARD_TIME)
    const deadlineDisplay = formatDateDisplay(updateValues.stageDeadline)
    const deadlineDetails = getDeadlineDetails(deadlineDisplay)
    let updated = null

    updateCorrespondence(reference, (record) => {
      const destinationOffice = getOfficeByName(updateValues.destinationOffice)
      const action = createAuditAction({
        actionType: 'Forwarded',
        title: `Forwarded to ${updateValues.destinationOffice}`,
        description: `Forwarded by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        currentUser,
        timestamp,
        previousValue: record.currentOffice,
        newValue: updateValues.destinationOffice,
        note: updateValues.instructions.trim(),
      })

      updated = {
        ...record,
        forwardingHistory: [
          ...(record.forwardingHistory ?? []),
          {
            id: `forwarding-${record.reference}-${Date.now()}`,
            fromOfficeId: currentUser.officeId,
            fromOfficeName: currentUser.officeName,
            toOfficeId: destinationOffice?.id ?? '',
            toOfficeName: destinationOffice?.name ?? updateValues.destinationOffice,
            forwardedByUserId: currentUser.id,
            forwardedByUserName: currentUser.fullName,
            forwardedAt: timestamp,
            nextStage: updateValues.nextStage,
            stageDeadline: deadlineDisplay,
            instructions: updateValues.instructions.trim(),
          },
        ],
        forwardedFromOfficeId: currentUser.officeId,
        forwardedFromOfficeName: currentUser.officeName,
        forwardedToOfficeId: destinationOffice?.id ?? '',
        forwardedToOfficeName: updateValues.destinationOffice,
        forwardedAt: timestamp,
        forwardedByUserId: currentUser.id,
        forwardedByUserName: currentUser.fullName,
        currentOfficeId: destinationOffice?.id ?? '',
        currentOfficeName: destinationOffice?.name ?? updateValues.destinationOffice,
        currentOffice: destinationOffice?.name ?? updateValues.destinationOffice,
        routeToOffice: destinationOffice?.name ?? updateValues.destinationOffice,
        routeToOfficeId: destinationOffice?.id ?? '',
        currentStage: updateValues.nextStage,
        arrivedAtCurrentOffice: timestamp,
        receivedAt: '',
        receivedByUserId: '',
        receivedByUserName: '',
        receivedByOfficeId: '',
        receivedByOfficeName: '',
        receiptStatus: 'Pending',
        receiptNote: '',
        acknowledgementTime: '',
        deadline: deadlineDisplay,
        stageDeadline: deadlineDisplay,
        timeRemaining: deadlineDetails.timeRemaining,
        deadlineState: deadlineDetails.deadlineState,
        status: 'Received',
        currentHandler: '',
        actions: [action, ...record.actions],
        journey: [
          normalizeJourneyEntry(
            {
              id: `journey-forward-${Date.now()}`,
              title: `Forwarded to ${updateValues.destinationOffice}`,
              description: `Forwarded by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
              actionType: 'Forwarded',
              office: currentUser.officeName,
              officeId: currentUser.officeId,
              actor: currentUser.fullName,
              actorId: currentUser.id,
              time: timestamp,
              fromOffice: record.currentOffice,
              toOffice: updateValues.destinationOffice,
              state: 'current',
              note: updateValues.instructions.trim(),
            },
            0,
          ),
          ...record.journey.map((entry) => ({
            ...entry,
            state: entry.state === 'current' ? 'done' : entry.state,
          })),
        ],
      }

      appendSystemAuditLog(reference, action, `${reference} - forwarded to ${updateValues.destinationOffice}`)
      return updated
    })

    if (updated && updated.forwardingHistory.length) {
      const forwardingEvent = updated.forwardingHistory.at(-1)
      const destinationOffice = getOfficeByName(updateValues.destinationOffice)

      if (destinationOffice) {
        addNotification(
          createReceivedNotification({
            record: updated,
            forwardingEvent,
            sourceOffice: { id: currentUser.officeId, name: currentUser.officeName },
            destinationOffice,
            createdAt: timestamp,
            message: `${currentUser.officeName} forwarded ${updated.reference} to ${destinationOffice.name}.`,
            eventId: forwardingEvent.id,
          }),
        )
      }
    }

    return updated ? cloneRecord(updated) : null
  }

  const acknowledgeReceipt = (reference, receiptNote, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, SYSTEM_RECEIPT_TIME)
    let updated = null

    updateCorrespondence(reference, (record) => {
      if (record.status !== 'Received' || record.receiptStatus !== 'Pending') {
        updated = { error: 'already-acknowledged', reference: record.reference }
        return record
      }

      const note = receiptNote?.trim() ?? ''
      const action = createAuditAction({
        actionType: 'Receipt Acknowledged',
        title: `Received by ${currentUser.officeName}`,
        description: `Receipt acknowledged by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        currentUser,
        timestamp,
        previousValue: 'Received / Pending',
        newValue: 'Awaiting Action / Acknowledged',
        note,
      })

      updated = {
        ...record,
        status: 'Awaiting Action',
        receiptStatus: 'Acknowledged',
        receivedAt: timestamp,
        receivedByUserId: currentUser.id,
        receivedByUserName: currentUser.fullName,
        receivedByOfficeId: currentUser.officeId,
        receivedByOfficeName: currentUser.officeName,
        receiptNote: note,
        acknowledgementTime: formatAcknowledgementDelay(record.arrivedAtCurrentOffice, timestamp),
        actions: [action, ...record.actions],
        journey: [
          normalizeJourneyEntry(
            {
              id: `journey-received-${Date.now()}`,
              title: `Received by ${currentUser.officeName}`,
              description: `Receipt acknowledged by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
              actionType: 'Receipt Acknowledged',
              office: currentUser.officeName,
              officeId: currentUser.officeId,
              actor: currentUser.fullName,
              actorId: currentUser.id,
              time: timestamp,
              fromOffice: record.forwardedFromOfficeName || '',
              toOffice: currentUser.officeName,
              state: 'current',
              note,
            },
            0,
          ),
          ...record.journey.map((entry) => ({
            ...entry,
            state: entry.state === 'current' ? 'done' : entry.state,
          })),
        ],
      }

      appendSystemAuditLog(
        reference,
        action,
        `${reference} - receipt acknowledged by ${currentUser.officeName}`,
      )
      return updated
    })

    if (updated && !updated.error) {
      markCorrespondenceNotificationAsRead({
        correspondenceReference: reference,
        destinationOfficeId: currentUser.officeId,
        destinationOfficeName: currentUser.officeName,
      })
    }

    return updated ? cloneRecord(updated) : null
  }

  const completeCorrespondence = (reference, currentUser, completionNote = '') => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '12:18 PM')
    let updated = null

    updateCorrespondence(reference, (record) => {
      const action = createAuditAction({
        actionType: 'Completed',
        title: 'Correspondence completed',
        description: `Completed by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        currentUser,
        timestamp,
        previousValue: record.status,
        newValue: 'Completed',
        note: completionNote.trim(),
      })

      updated = {
        ...record,
        status: 'Completed',
        currentStage: 'Office action completed',
        timeRemaining: 'Completed',
        deadlineState: 'completed',
        timeSpentInOffice: 'Completed',
        completedAt: timestamp,
        currentHandler: currentUser.fullName,
        actions: [action, ...record.actions],
        journey: [
          normalizeJourneyEntry(
            {
              id: `journey-complete-${Date.now()}`,
              title: 'Office action completed',
              description: `Completed by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
              actionType: 'Completed',
              office: currentUser.officeName,
              officeId: currentUser.officeId,
              actor: currentUser.fullName,
              actorId: currentUser.id,
              time: timestamp,
              state: 'current',
              note: completionNote.trim(),
            },
            0,
          ),
          ...record.journey.map((entry) => ({
            ...entry,
            state: entry.state === 'current' ? 'done' : entry.state,
          })),
        ],
      }

      if (completionNote.trim()) {
        updated.notes = [
          {
            id: `note-complete-${Date.now()}`,
            author: currentUser.fullName,
            authorId: currentUser.id,
            office: currentUser.officeName,
            officeId: currentUser.officeId,
            date: timestamp,
            body: completionNote.trim(),
          },
          ...record.notes,
        ]
      }

      appendSystemAuditLog(reference, action, `${reference} - correspondence completed`)
      return updated
    })

    return updated ? cloneRecord(updated) : null
  }

  const addNote = (reference, noteBody, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '12:35 PM')
    let updated = null

    updateCorrespondence(reference, (record) => {
      const action = createAuditAction({
        actionType: 'Note Added',
        title: 'Workflow note added',
        description: `Workflow note added by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        currentUser,
        timestamp,
        note: noteBody.trim(),
      })

      updated = {
        ...record,
        notes: [
          {
            id: `note-${Date.now()}`,
            author: currentUser.fullName,
            authorId: currentUser.id,
            office: currentUser.officeName,
            officeId: currentUser.officeId,
            date: timestamp,
            body: noteBody.trim(),
          },
          ...record.notes,
        ],
        actions: [action, ...record.actions],
      }

      appendSystemAuditLog(reference, action, `${reference} - workflow note added`)
      return updated
    })

    return updated ? cloneRecord(updated) : null
  }

  const addAttachment = (reference, file, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '12:48 PM')
    let updated = null

    updateCorrespondence(reference, (record) => {
      const fileName = file.fileName || file.name
      const fileType = file.fileType || file.type || file.extension?.replace('.', '').toUpperCase() || 'FILE'
      const sizeLabel = file.sizeLabel || file.size || formatFileSize(file.sizeInBytes)
      const descriptionNote = file.description?.trim() ?? ''
      const action = createAuditAction({
        actionType: 'Attachment Added',
        title: 'Attachment added',
        description: `${fileName} added by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        currentUser,
        timestamp,
        newValue: fileName,
        note: descriptionNote || fileName,
      })

      updated = {
        ...record,
        attachments: [
          {
            id: `att-${Date.now()}`,
            fileName,
            fileType,
            type: fileType,
            size: sizeLabel,
            sizeInBytes: file.sizeInBytes ?? file.size ?? 0,
            mimeType: file.mimeType ?? file.fileObject?.type ?? '',
            description: descriptionNote,
            uploadedByUserId: currentUser.id,
            uploadedByUserName: currentUser.fullName,
            uploadedBy: currentUser.fullName,
            uploadedById: currentUser.id,
            uploadedByOfficeId: currentUser.officeId,
            uploadedByOfficeName: currentUser.officeName,
            office: currentUser.officeName,
            officeId: currentUser.officeId,
            uploadedAt: timestamp,
            date: timestamp,
            fileUrl: file.fileUrl ?? file.objectUrl ?? '',
            fileObject: file.fileObject ?? file.originalFile ?? null,
            isTemporary: Boolean(file.isTemporary ?? file.objectUrl ?? file.fileObject),
          },
          ...record.attachments,
        ],
        actions: [action, ...record.actions],
      }

      appendSystemAuditLog(reference, action, `${reference} - attachment added: ${fileName}`)
      return updated
    })

    return updated ? cloneRecord(updated) : null
  }

  const value = {
    records,
    addCorrespondence,
    updateCorrespondence,
    addAuditAction,
    addNote,
    addAttachment,
    updateCorrespondenceStage,
    forwardCorrespondence,
    acknowledgeReceipt,
    completeCorrespondence,
    addCorrespondenceNote: addNote,
    getCorrespondenceByReference,
    generateNextReference: (documentType) => createReference(records, documentType),
    getRoleLabel,
  }

  // TODO: Replace this lightweight frontend correspondence state with backend API calls when data services are available.
  return <CorrespondenceContext.Provider value={value}>{children}</CorrespondenceContext.Provider>
}
