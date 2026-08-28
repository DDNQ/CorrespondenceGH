import { useEffect, useRef, useState } from 'react'

import { addAuditLog } from '../data/auditLogs'
import { getUserRoleLabel } from '../constants/roles'
import { mockCorrespondence } from '../data/correspondence'
import { offices, resolveOffice } from '../data/offices'
import {
  normalizeAttachment,
  revokeAttachmentUrls,
  validateAttachmentFile,
} from '../utils/attachments.js'
import {
  createMockCorrespondenceId,
  getCorrespondenceApiId,
  getCorrespondenceById as findCorrespondenceById,
  getCorrespondenceByReference as findCorrespondenceByReference,
  getCorrespondenceDisplayReference,
} from '../utils/correspondence.js'
import { normalizeCorrespondenceRecord } from '../utils/correspondencePermissions'
import { normalizeOffice } from '../utils/offices.js'
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
  return getUserRoleLabel(role)
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
    getCorrespondenceDisplayReference(record).startsWith(`MRH/${documentCode}/${currentYear}/`),
  ).length

  // TODO: Replace this frontend-generated reference with a backend-generated sequence to prevent duplicates.
  return `MRH/${documentCode}/${currentYear}/${String(matchingCount + 1).padStart(4, '0')}`
}

function normalizeJourneyEntry(entry, index) {
  const office = normalizeOffice(entry.office ?? entry.officeName ?? entry.officeId ?? null, offices)
  const fromOffice = normalizeOffice(entry.fromOffice ?? entry.previousValue ?? null, offices)
  const toOffice = normalizeOffice(entry.toOffice ?? entry.newValue ?? null, offices)

  return {
    id: entry.id ?? `journey-${index + 1}`,
    title: entry.title ?? 'Office movement recorded',
    description: entry.description ?? '',
    actionType: entry.actionType ?? entry.type ?? 'Updated',
    office,
    officeId: office?.id ?? null,
    officeName: office?.name ?? '',
    actor: entry.actor ?? entry.userName ?? 'System',
    actorId: entry.actorId ?? entry.userId ?? '',
    time: entry.time ?? entry.timestamp ?? '',
    state: entry.state ?? 'done',
    fromOffice,
    fromOfficeId: fromOffice?.id ?? null,
    fromOfficeName: fromOffice?.name ?? '',
    toOffice,
    toOfficeId: toOffice?.id ?? null,
    toOfficeName: toOffice?.name ?? '',
    note: entry.note ?? '',
  }
}

function normalizeActionEntry(entry, index) {
  const office = normalizeOffice(entry.office ?? entry.officeName ?? entry.officeId ?? null, offices)

  return {
    id: entry.id ?? `action-${index + 1}`,
    type: entry.type ?? entry.actionType ?? 'Updated',
    actionType: entry.actionType ?? entry.type ?? 'Updated',
    title: entry.title ?? 'Correspondence updated',
    description: entry.description ?? '',
    actor: entry.actor ?? entry.userName ?? 'System',
    actorId: entry.actorId ?? entry.userId ?? '',
    office,
    officeId: office?.id ?? null,
    officeName: office?.name ?? '',
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
    attachments: (normalizedRecord.attachments ?? []).map((attachment) =>
      normalizeAttachment(attachment, {
        correspondenceId: normalizedRecord.id,
      }),
    ),
    notes: (normalizedRecord.notes ?? []).map((note) => {
      const office = normalizeOffice(note.office ?? note.officeId ?? note.officeName ?? null, offices)

      return {
        ...note,
        office,
        officeId: office?.id ?? null,
        officeName: office?.name ?? '',
      }
    }),
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
    office: currentUser.office,
    officeId: currentUser.office?.id ?? null,
    officeName: currentUser.office?.name ?? '',
    role: currentUser.role,
    userId: currentUser.id,
    userName: currentUser.fullName,
    timestamp,
    previousValue,
    newValue,
    note,
  }
}

function appendSystemAuditLog(referenceNumber, action, description) {
  addAuditLog({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: action.actionType,
    title: action.title,
    description: description || `${referenceNumber} - ${action.title}`,
    reference: referenceNumber,
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
          revokeAttachmentUrls(attachment)
        })
      })
    },
    [],
  )

  const getCorrespondenceById = (id) => {
    const record = findCorrespondenceById(records, id)
    return record ? cloneRecord(record) : null
  }

  const getCorrespondenceByReference = (referenceNumber) => {
    const record = findCorrespondenceByReference(records, referenceNumber)
    return record ? cloneRecord(record) : null
  }

  const resolveCurrentRecord = (currentRecords, correspondenceTarget) => {
    if (!correspondenceTarget) {
      return null
    }

    if (typeof correspondenceTarget === 'object') {
      const targetId = getCorrespondenceApiId(correspondenceTarget)
      return (
        findCorrespondenceById(currentRecords, targetId) ??
        findCorrespondenceByReference(
          currentRecords,
          getCorrespondenceDisplayReference(correspondenceTarget),
        ) ??
        null
      )
    }

    return (
      findCorrespondenceById(currentRecords, correspondenceTarget) ??
      findCorrespondenceByReference(currentRecords, correspondenceTarget) ??
      null
    )
  }

  const updateCorrespondence = (correspondenceTarget, updater) => {
    let updatedRecord = null

    setRecords((current) =>
      current.map((record) => {
        const recordId = getCorrespondenceApiId(record)
        const targetRecord = resolveCurrentRecord(current, correspondenceTarget)

        if (!targetRecord || recordId !== getCorrespondenceApiId(targetRecord)) {
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

  const addAuditAction = (correspondenceTarget, action, description) => {
    const normalizedAction = normalizeActionEntry(action, 0)

    updateCorrespondence(correspondenceTarget, (record) => ({
      ...record,
      actions: [normalizedAction, ...record.actions],
    }))

    const referenceNumber =
      typeof correspondenceTarget === 'object'
        ? getCorrespondenceDisplayReference(correspondenceTarget)
        : getCorrespondenceDisplayReference(resolveCurrentRecord(records, correspondenceTarget))
    appendSystemAuditLog(referenceNumber, normalizedAction, description)
    return normalizedAction
  }

  const addCorrespondence = (formValues, currentUser) => {
    const referenceNumber = createReference(records, formValues.documentType)
    const registeredTimestamp = formatTimestampDisplay(SYSTEM_DATE, '9:00 AM')
    const deadlineDisplay = formatDateDisplay(formValues.stageDeadline)
    const deadlineDetails = getDeadlineDetails(deadlineDisplay)
    const destinationOffice = resolveOffice(formValues.destinationOffice)
    const isRoutedToAnotherOffice =
      Boolean(destinationOffice?.id) && destinationOffice.id !== currentUser.office?.id
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
          normalizeAttachment(
            {
              ...formValues.attachment,
              correspondenceId: null,
              uploadedAt: registeredTimestamp,
              uploadedBy: {
                id: currentUser.id,
                fullName: currentUser.fullName,
                office: currentUser.office,
              },
              uploadedForOffice: currentUser.office,
            },
            {
              source: formValues.attachment.source ?? 'local',
            },
          ),
        ]
      : []

    const newRecord = normalizeRecord({
      id: createMockCorrespondenceId(),
      referenceNumber,
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
          id: `journey-${Date.now()}-1`,
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
              id: `note-${Date.now()}-registration`,
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
    appendSystemAuditLog(
      referenceNumber,
      action,
      `${referenceNumber} - ${formValues.subject.trim()}`,
    )

    if (isRoutedToAnotherOffice && destinationOffice) {
      const receivedNotification = createReceivedNotification({
        record: newRecord,
        sourceOffice: { id: currentUser.officeId, name: currentUser.officeName },
        destinationOffice,
        createdAt: registeredTimestamp,
        message: `${currentUser.officeName} registered and routed ${newRecord.referenceNumber} to ${destinationOffice.name}.`,
        eventId: `registration-route-${newRecord.id}`,
        title: 'New correspondence received',
      })

      addNotification(receivedNotification)
    }

    return cloneRecord(newRecord)
  }

  const updateCorrespondenceStage = (correspondenceTarget, updateValues, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '10:42 AM')
    const deadlineDisplay = formatDateDisplay(updateValues.stageDeadline)
    const deadlineDetails = getDeadlineDetails(deadlineDisplay)
    let updated = null

    updateCorrespondence(correspondenceTarget, (record) => {
      const referenceNumber = getCorrespondenceDisplayReference(record)
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

      appendSystemAuditLog(
        referenceNumber,
        action,
        `${referenceNumber} - stage updated to ${updateValues.stage}`,
      )
      return updated
    })

    if (!updated) {
      return null
    }

    return updated.error ? updated : cloneRecord(updated)
  }

  const forwardCorrespondence = (correspondenceTarget, updateValues, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, SYSTEM_FORWARD_TIME)
    const deadlineDisplay = formatDateDisplay(updateValues.stageDeadline)
    const deadlineDetails = getDeadlineDetails(deadlineDisplay)
    let updated = null

    updateCorrespondence(correspondenceTarget, (record) => {
      const referenceNumber = getCorrespondenceDisplayReference(record)
      const destinationOffice = resolveOffice(updateValues.destinationOffice)
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
            id: `forwarding-${record.id}-${Date.now()}`,
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

      appendSystemAuditLog(
        referenceNumber,
        action,
        `${referenceNumber} - forwarded to ${updateValues.destinationOffice}`,
      )
      return updated
    })

    if (updated && updated.forwardingHistory.length) {
      const forwardingEvent = updated.forwardingHistory.at(-1)
      const destinationOffice = resolveOffice(updateValues.destinationOffice)

      if (destinationOffice) {
        addNotification(
          createReceivedNotification({
            record: updated,
            forwardingEvent,
            sourceOffice: { id: currentUser.officeId, name: currentUser.officeName },
            destinationOffice,
            createdAt: timestamp,
            message: `${currentUser.officeName} forwarded ${updated.referenceNumber} to ${destinationOffice.name}.`,
            eventId: forwardingEvent.id,
          }),
        )
      }
    }

    return updated ? cloneRecord(updated) : null
  }

  const acknowledgeReceipt = (correspondenceTarget, receiptNote, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, SYSTEM_RECEIPT_TIME)
    let updated = null

    updateCorrespondence(correspondenceTarget, (record) => {
      const referenceNumber = getCorrespondenceDisplayReference(record)
      if (record.status !== 'Received' || record.receiptStatus !== 'Pending') {
        updated = { error: 'already-acknowledged', referenceNumber }
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
        referenceNumber,
        action,
        `${referenceNumber} - receipt acknowledged by ${currentUser.officeName}`,
      )
      return updated
    })

    if (updated && !updated.error) {
      markCorrespondenceNotificationAsRead({
        correspondenceReference: updated.referenceNumber,
        correspondenceId: updated.id,
        destinationOfficeId: currentUser.officeId,
        destinationOfficeName: currentUser.officeName,
      })
    }

    return updated ? cloneRecord(updated) : null
  }

  const completeCorrespondence = (correspondenceTarget, currentUser, completionNote = '') => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '12:18 PM')
    let updated = null

    updateCorrespondence(correspondenceTarget, (record) => {
      const referenceNumber = getCorrespondenceDisplayReference(record)
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

      appendSystemAuditLog(referenceNumber, action, `${referenceNumber} - correspondence completed`)
      return updated
    })

    return updated ? cloneRecord(updated) : null
  }

  const fileCorrespondence = (correspondenceTarget, currentUser, filingNote = '') => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '12:27 PM')
    let updated = null

    updateCorrespondence(correspondenceTarget, (record) => {
      const referenceNumber = getCorrespondenceDisplayReference(record)
      const action = createAuditAction({
        actionType: 'Filed',
        title: 'Correspondence filed',
        description: `Filed by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        currentUser,
        timestamp,
        previousValue: record.status,
        newValue: 'Filed',
        note: filingNote.trim(),
      })

      updated = {
        ...record,
        status: 'Filed',
        isFiled: true,
        currentStage: 'Correspondence filed',
        timeRemaining: 'Filed',
        deadlineState: 'completed',
        timeSpentInOffice: 'Filed',
        filedAt: timestamp,
        currentHandler: currentUser.fullName,
        actions: [action, ...record.actions],
        journey: [
          normalizeJourneyEntry(
            {
              id: `journey-file-${Date.now()}`,
              title: 'Correspondence filed',
              description: `Filed by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
              actionType: 'Filed',
              office: currentUser.officeName,
              officeId: currentUser.officeId,
              actor: currentUser.fullName,
              actorId: currentUser.id,
              time: timestamp,
              state: 'current',
              note: filingNote.trim(),
            },
            0,
          ),
          ...record.journey.map((entry) => ({
            ...entry,
            state: entry.state === 'current' ? 'done' : entry.state,
          })),
        ],
      }

      if (filingNote.trim()) {
        updated.notes = [
          {
            id: `note-file-${Date.now()}`,
            author: currentUser.fullName,
            authorId: currentUser.id,
            office: currentUser.officeName,
            officeId: currentUser.officeId,
            date: timestamp,
            body: filingNote.trim(),
          },
          ...record.notes,
        ]
      }

      appendSystemAuditLog(referenceNumber, action, `${referenceNumber} - correspondence filed`)
      return updated
    })

    return updated ? cloneRecord(updated) : null
  }

  const addNote = (correspondenceTarget, noteBody, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '12:35 PM')
    let updated = null

    updateCorrespondence(correspondenceTarget, (record) => {
      const referenceNumber = getCorrespondenceDisplayReference(record)
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

      appendSystemAuditLog(referenceNumber, action, `${referenceNumber} - workflow note added`)
      return updated
    })

    return updated ? cloneRecord(updated) : null
  }

  const addAttachment = (correspondenceTarget, file, currentUser) => {
    const timestamp = formatTimestampDisplay(SYSTEM_DATE, '12:48 PM')
    let updated = null

    updateCorrespondence(correspondenceTarget, (record) => {
      const referenceNumber = getCorrespondenceDisplayReference(record)
      const descriptionNote = file.description?.trim() ?? ''
      const fileObject = file.fileObject ?? file.originalFile ?? file
      const validation = fileObject instanceof File ? validateAttachmentFile(fileObject) : { valid: true }

      if (!validation.valid) {
        updated = {
          error: validation.errors[0]?.code ?? 'INVALID_ATTACHMENT',
          validation,
        }
        return record
      }

      const normalizedAttachment = normalizeAttachment(
        {
          ...file,
          description: descriptionNote,
          correspondenceId: record.id,
          uploadedAt: timestamp,
          uploadedBy: {
            id: currentUser.id,
            fullName: currentUser.fullName,
            office: currentUser.office,
          },
          uploadedForOffice: currentUser.office,
        },
        {
          source: file.source ?? (file.fileObject ? 'local' : 'mock'),
        },
      )
      const fileName = normalizedAttachment.originalFilename
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
          normalizedAttachment,
          ...record.attachments,
        ],
        actions: [action, ...record.actions],
      }

      appendSystemAuditLog(referenceNumber, action, `${referenceNumber} - attachment added: ${fileName}`)
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
    fileCorrespondence,
    addCorrespondenceNote: addNote,
    getCorrespondenceById,
    getCorrespondenceByReference,
    generateNextReference: (documentType) => createReference(records, documentType),
    getRoleLabel,
  }

  // TODO: Replace this lightweight frontend correspondence state with backend API calls when data services are available.
  return <CorrespondenceContext.Provider value={value}>{children}</CorrespondenceContext.Provider>
}
