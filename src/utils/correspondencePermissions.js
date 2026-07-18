import { ROLES } from '../constants/roles'
import { getOfficeById, offices } from '../data/offices'

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getOfficeByName(officeName) {
  const normalizedOfficeName = normalizeText(officeName)

  return offices.find((office) => normalizeText(office.name) === normalizedOfficeName) ?? null
}

function normalizeForwardingEvent(event, index = 0) {
  const fromOfficeName =
    event.fromOfficeName ??
    event.forwardedFromOfficeName ??
    getOfficeById(event.fromOfficeId ?? event.forwardedFromOfficeId)?.name ??
    ''
  const toOfficeName =
    event.toOfficeName ??
    event.forwardedToOfficeName ??
    getOfficeById(event.toOfficeId ?? event.forwardedToOfficeId)?.name ??
    ''

  return {
    id: event.id ?? `forward-${index + 1}`,
    fromOfficeId:
      event.fromOfficeId ??
      event.forwardedFromOfficeId ??
      getOfficeByName(fromOfficeName)?.id ??
      '',
    fromOfficeName,
    toOfficeId:
      event.toOfficeId ??
      event.forwardedToOfficeId ??
      getOfficeByName(toOfficeName)?.id ??
      '',
    toOfficeName,
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
          id: `${record.id ?? record.reference ?? 'record'}-forwarding-legacy`,
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

  const currentOfficeName =
    record.currentOfficeName ??
    record.currentOffice ??
    record.destinationOffice ??
    record.routeToOffice ??
    getOfficeById(record.currentOfficeId)?.name ??
    ''
  const currentOfficeId =
    record.currentOfficeId ??
    getOfficeByName(currentOfficeName)?.id ??
    ''
  const registeringOfficeName =
    record.registeringOfficeName ??
    record.registeringOffice ??
    getOfficeById(record.registeringOfficeId)?.name ??
    ''
  const registeringOfficeId =
    record.registeringOfficeId ??
    getOfficeByName(registeringOfficeName)?.id ??
    ''

  return {
    ...record,
    currentOfficeId,
    currentOfficeName,
    currentOffice: currentOfficeName,
    registeringOfficeId,
    registeringOfficeName,
    registeringOffice: registeringOfficeName,
    forwardingHistory: getForwardingHistory(record),
    receiptStatus:
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

  if (
    normalizedRecord.currentOfficeId &&
    user.officeId &&
    normalizedRecord.currentOfficeId === user.officeId
  ) {
    return true
  }

  return normalizeText(normalizedRecord.currentOfficeName) === normalizeText(user.officeName)
}

export function getCorrespondenceActionPermissions({
  record,
  user,
  isGuidedReview = false,
}) {
  const normalizedRecord = normalizeCorrespondenceRecord(record)
  const isOfficeActor =
    user?.role === ROLES.OFFICE_USER || user?.role === ROLES.OFFICE_SUPERVISOR
  const isSystemAdmin = user?.role === ROLES.SYSTEM_ADMIN
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
  const canEditRecord = false
  const canAddNote = canUseNormalWorkflowActions
  const canAddAttachment = canUseNormalWorkflowActions
  const showActionsMenu = [canUpdateStage, canForward, canMarkCompleted, canEditRecord]
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
    if (event.fromOfficeId && user.officeId && event.fromOfficeId === user.officeId) {
      return true
    }

    return normalizeText(event.fromOfficeName) === normalizeText(user.officeName)
  })

  if (matchesHistory) {
    return true
  }

  if (
    normalizedRecord.forwardedFromOfficeId &&
    user.officeId &&
    normalizedRecord.forwardedFromOfficeId === user.officeId
  ) {
    return true
  }

  return (
    normalizeText(normalizedRecord.forwardedFromOfficeName) ===
    normalizeText(user.officeName)
  )
}

export function getLatestForwardingEventForOffice(record, user) {
  if (!record || !user) {
    return null
  }

  const normalizedRecord = normalizeCorrespondenceRecord(record)
  const matchingEvents = normalizedRecord.forwardingHistory.filter((event) => {
    if (event.fromOfficeId && user.officeId && event.fromOfficeId === user.officeId) {
      return true
    }

    return normalizeText(event.fromOfficeName) === normalizeText(user.officeName)
  })

  return matchingEvents.at(-1) ?? null
}
