import { canPerformOfficeWorkflow, isAdmin } from '../constants/roles.js'
import { getCorrespondenceDisplayReference, normalizeCorrespondence } from './correspondence.js'
import { isSameOffice, normalizeOffice } from './offices.js'

function normalizeForwardingEvent(event, index = 0) {
  const fromOffice = normalizeOffice(
    event.fromOffice ??
      event.from_office ??
      event.fromOfficeId ??
      event.forwardedFromOfficeId ??
      event.fromOfficeCode ??
      event.fromOfficeName ??
      event.forwardedFromOfficeName ??
      null,
  )
  const toOffice = normalizeOffice(
    event.toOffice ??
      event.to_office ??
      event.toOfficeId ??
      event.forwardedToOfficeId ??
      event.toOfficeCode ??
      event.toOfficeName ??
      event.forwardedToOfficeName ??
      null,
  )

  return {
    id: event.id ?? `forward-${index + 1}`,
    fromOffice,
    fromOfficeId: fromOffice?.id ?? null,
    fromOfficeName: fromOffice?.name ?? '',
    toOffice,
    toOfficeId: toOffice?.id ?? null,
    toOfficeName: toOffice?.name ?? '',
    forwardedByUserId: event.forwardedByUserId ?? event.userId ?? '',
    forwardedByUserName: event.forwardedByUserName ?? event.userName ?? '',
    forwardedAt: event.forwardedAt ?? event.timestamp ?? '',
    nextStage: event.nextStage ?? '',
    stageDeadline: event.stageDeadline ?? '',
    instructions: event.instructions ?? event.note ?? '',
  }
}

function getForwardingHistory(record) {
  if (record.forwardingHistory?.length) {
    return record.forwardingHistory.map((event, index) => normalizeForwardingEvent(event, index))
  }

  if (
    record.forwardedFromOfficeId ||
    record.forwardedFromOfficeName ||
    record.forwardedToOfficeId ||
    record.forwardedToOfficeName ||
    record.forwardedAt ||
    record.forwardedByUserId ||
    record.forwardedByUserName
  ) {
    return [
      normalizeForwardingEvent(
        {
          id: `${record.id ?? getCorrespondenceDisplayReference(record) ?? 'record'}-forwarding-legacy`,
          fromOfficeId: record.forwardedFromOfficeId ?? '',
          fromOfficeName: record.forwardedFromOfficeName ?? '',
          toOfficeId: record.forwardedToOfficeId ?? '',
          toOfficeName: record.forwardedToOfficeName ?? '',
          forwardedByUserId: record.forwardedByUserId ?? '',
          forwardedByUserName: record.forwardedByUserName ?? '',
          forwardedAt: record.forwardedAt ?? '',
          nextStage: record.currentStage ?? '',
          stageDeadline: record.stageDeadline ?? record.deadline ?? '',
        },
        0,
      ),
    ]
  }

  return []
}

export function normalizeCorrespondenceRecord(record) {
  if (!record) {
    return null
  }

  const canonicalRecord = normalizeCorrespondence(record)
  const currentOffice = normalizeOffice(
    canonicalRecord.currentOffice ??
      record.currentOffice ??
      record.current_office ??
      record.office ??
      record.currentOfficeId ??
      record.current_office_id ??
      record.officeId ??
      record.office_id ??
      record.currentOfficeCode ??
      record.officeCode ??
      record.office_code ??
      record.currentOfficeName ??
      record.current_office_name ??
      record.officeName ??
      record.office_name ??
      record.destinationOffice ??
      record.routeToOffice ??
      null,
  )
  const registeringOffice = normalizeOffice(
    record.registeringOffice ??
      record.registering_office ??
      record.registeringOfficeId ??
      record.registering_office_id ??
      record.registeringOfficeCode ??
      record.registeringOfficeName ??
      record.registering_office_name ??
      record.originatingOffice ??
      null,
  )
  const forwardedFromOffice = normalizeOffice(
    record.forwardedFromOffice ??
      record.forwarded_from_office ??
      record.forwardedFromOfficeId ??
      record.forwarded_from_office_id ??
      record.forwardedFromOfficeName ??
      record.forwarded_from_office_name ??
      null,
  )
  const forwardedToOffice = normalizeOffice(
    record.forwardedToOffice ??
      record.forwarded_to_office ??
      record.forwardedToOfficeId ??
      record.forwarded_to_office_id ??
      record.forwardedToOfficeName ??
      record.forwarded_to_office_name ??
      record.destinationOffice ??
      record.routeToOffice ??
      null,
  )
  const receivedByOffice = normalizeOffice(
    record.receivedByOffice ??
      record.received_by_office ??
      record.receivedByOfficeId ??
      record.received_by_office_id ??
      record.receivedByOfficeName ??
      record.received_by_office_name ??
      null,
  )

  return {
    ...record,
    ...canonicalRecord,
    currentOffice,
    currentOfficeId: currentOffice?.id ?? null,
    currentOfficeName: currentOffice?.name ?? '',
    currentOfficeCode: currentOffice?.code ?? null,
    registeringOffice,
    registeringOfficeId: registeringOffice?.id ?? null,
    registeringOfficeName: registeringOffice?.name ?? '',
    registeringOfficeCode: registeringOffice?.code ?? null,
    destinationOffice: forwardedToOffice ?? currentOffice,
    forwardedFromOffice,
    forwardedFromOfficeId: forwardedFromOffice?.id ?? null,
    forwardedFromOfficeName: forwardedFromOffice?.name ?? '',
    forwardedToOffice,
    forwardedToOfficeId: forwardedToOffice?.id ?? null,
    forwardedToOfficeName: forwardedToOffice?.name ?? '',
    receivedByOffice,
    receivedByOfficeId: receivedByOffice?.id ?? null,
    receivedByOfficeName: receivedByOffice?.name ?? '',
    forwardingHistory: getForwardingHistory(record),
    receiptStatus:
      canonicalRecord.receiptStatus ??
      record.receiptStatus ??
      (record.status === 'Received' ? 'Pending' : null),
    isFiled: record.isFiled ?? record.status === 'Filed',
    isArchived: record.isArchived ?? false,
  }
}

export function isRecordAtUserOffice(record, user) {
  if (!record || !user) {
    return false
  }

  const normalizedRecord = normalizeCorrespondenceRecord(record)
  return isSameOffice(normalizedRecord.currentOffice, user.office)
}

export function getCorrespondenceActionPermissions({
  record,
  user,
  isGuidedReview = false,
}) {
  const normalizedRecord = normalizeCorrespondenceRecord(record)
  const isOfficeActor = canPerformOfficeWorkflow(user)
  const isSystemAdmin = isAdmin(user)
  const isAtUserOffice = isRecordAtUserOffice(normalizedRecord, user)
  const isPendingReceipt =
    normalizedRecord?.status === 'Received' &&
    normalizedRecord?.receiptStatus === 'Pending'
  const isTerminal =
    normalizedRecord?.isFiled ||
    normalizedRecord?.isArchived ||
    normalizedRecord?.status === 'Filed' ||
    normalizedRecord?.status === 'Completed'

  const canAcknowledgeReceipt =
    Boolean(normalizedRecord) &&
    isOfficeActor &&
    isAtUserOffice &&
    !isGuidedReview &&
    isPendingReceipt &&
    !normalizedRecord.isArchived

  const canUseNormalWorkflowActions =
    Boolean(normalizedRecord) &&
    isOfficeActor &&
    isAtUserOffice &&
    !isGuidedReview &&
    !isPendingReceipt &&
    !isTerminal

  const canUpdateStage = canUseNormalWorkflowActions
  const canForward = canUseNormalWorkflowActions
  const canMarkCompleted = canUseNormalWorkflowActions
  const canFile = canUseNormalWorkflowActions
  const canEditRecord = false
  const canAddNote = canUseNormalWorkflowActions
  const canAddAttachment = canUseNormalWorkflowActions
  const showActionsMenu = [canUpdateStage, canForward, canMarkCompleted, canFile, canEditRecord]
    .filter(Boolean)
    .length > 0

  let reason = ''

  if (!normalizedRecord) {
    reason = 'Correspondence record not found.'
  } else if (isSystemAdmin) {
    reason = 'System administrators have read-only correspondence oversight.'
  } else if (!isOfficeActor) {
    reason = 'This account cannot perform office workflow actions.'
  } else if (isGuidedReview) {
    reason = 'Workflow actions are hidden during guided review.'
  } else if (!isAtUserOffice) {
    reason = 'This correspondence is currently with another office.'
  } else if (isPendingReceipt) {
    reason = 'Receipt acknowledgement is required before workflow actions become available.'
  } else if (normalizedRecord.isArchived) {
    reason = 'Archived correspondence is read-only.'
  } else if (normalizedRecord.isFiled || normalizedRecord.status === 'Filed') {
    reason = 'Filed correspondence is read-only.'
  } else if (normalizedRecord.status === 'Completed') {
    reason = 'Completed correspondence has no further office workflow actions.'
  }

  return {
    record: normalizedRecord,
    isOfficeActor,
    isSystemAdmin,
    isAtUserOffice,
    isPendingReceipt,
    showActionsMenu,
    canAcknowledgeReceipt,
    canUpdateStage,
    canForward,
    canMarkCompleted,
    canFile,
    canEditRecord,
    canAddNote,
    canAddAttachment,
    reason,
  }
}

export function wasForwardedByOffice(record, user) {
  if (!record || !user) {
    return false
  }

  const normalizedRecord = normalizeCorrespondenceRecord(record)
  const matchesHistory = normalizedRecord.forwardingHistory.some((event) => {
    return isSameOffice(event.fromOffice, user.office)
  })

  if (matchesHistory) {
    return true
  }

  return isSameOffice(normalizedRecord.forwardedFromOffice, user.office)
}

export function getLatestForwardingEventForOffice(record, user) {
  if (!record || !user) {
    return null
  }

  const normalizedRecord = normalizeCorrespondenceRecord(record)
  const matchingEvents = normalizedRecord.forwardingHistory.filter((event) => {
    return isSameOffice(event.fromOffice, user.office)
  })

  return matchingEvents.at(-1) ?? null
}
