import {
  addCorrespondenceRecord,
  completeCorrespondence as completeMockRecord,
  fileCorrespondence as fileMockRecord,
  forwardCorrespondence as forwardMockRecord,
  getCorrespondenceByReference as getMockRecordByReference,
  getCorrespondenceRecords,
  updateCorrespondenceStage as updateMockRecordStage,
} from '../../data/correspondence.js'
import {
  getCorrespondenceById as findCorrespondenceById,
  getCorrespondenceByReference as findCorrespondenceByReference,
  normalizeCorrespondence,
  normalizeCorrespondenceDetailResponse,
  normalizeCorrespondenceListResponse,
} from '../../utils/correspondence.js'

function getNormalizedRecords() {
  return getCorrespondenceRecords().map((record) => normalizeCorrespondence(record))
}

function resolveRecordById(correspondenceId) {
  return findCorrespondenceById(getNormalizedRecords(), correspondenceId)
}

function resolveReferenceFromId(correspondenceId) {
  const record = resolveRecordById(correspondenceId)
  return record?.referenceNumber ?? null
}

export async function listCorrespondence() {
  const normalized = normalizeCorrespondenceListResponse(getCorrespondenceRecords())

  return {
    records: normalized.results,
    pagination: {
      count: normalized.count ?? null,
      next: normalized.next ?? null,
      previous: normalized.previous ?? null,
      page: null,
      pageSize: null,
    },
    sourceEnvelope: 'array',
  }
}

export async function getCorrespondenceById(correspondenceId) {
  const record = resolveRecordById(correspondenceId)
  return record ? normalizeCorrespondenceDetailResponse(record) : null
}

export async function getCorrespondenceByReference(referenceNumber) {
  const record = findCorrespondenceByReference(getNormalizedRecords(), referenceNumber)
  return record ? normalizeCorrespondenceDetailResponse(record) : null
}

export async function createCorrespondence(input, currentUser) {
  const referenceNumber = addCorrespondenceRecord(input, currentUser)
  return normalizeCorrespondenceDetailResponse(getMockRecordByReference(referenceNumber))
}

export async function forwardCorrespondence(correspondenceId, input, currentUser) {
  const referenceNumber = resolveReferenceFromId(correspondenceId)

  if (!referenceNumber) {
    return null
  }

  forwardMockRecord(referenceNumber, input, currentUser)
  return normalizeCorrespondenceDetailResponse(getMockRecordByReference(referenceNumber))
}

export async function updateCorrespondenceStage(correspondenceId, input, currentUser) {
  const referenceNumber = resolveReferenceFromId(correspondenceId)

  if (!referenceNumber) {
    return null
  }

  updateMockRecordStage(referenceNumber, input, currentUser)
  return normalizeCorrespondenceDetailResponse(getMockRecordByReference(referenceNumber))
}

export async function completeCorrespondence(correspondenceId, input, currentUser) {
  const referenceNumber = resolveReferenceFromId(correspondenceId)

  if (!referenceNumber) {
    return null
  }

  completeMockRecord(referenceNumber, currentUser, input?.note ?? '')
  return normalizeCorrespondenceDetailResponse(getMockRecordByReference(referenceNumber))
}

export async function fileCorrespondence(correspondenceId, input, currentUser) {
  const referenceNumber = resolveReferenceFromId(correspondenceId)

  if (!referenceNumber) {
    return null
  }

  fileMockRecord(referenceNumber, currentUser, input?.note ?? '')
  return normalizeCorrespondenceDetailResponse(getMockRecordByReference(referenceNumber))
}

export async function listCorrespondenceMovements(correspondenceId) {
  const record = resolveRecordById(correspondenceId)
  return Array.isArray(record?.journey) ? record.journey.map((entry) => ({ ...entry })) : []
}

export const mockCorrespondenceService = Object.freeze({
  createCorrespondence,
  listCorrespondence,
  getCorrespondenceById,
  getCorrespondenceByReference,
  forwardCorrespondence,
  updateCorrespondenceStage,
  completeCorrespondence,
  fileCorrespondence,
  listCorrespondenceMovements,
})
