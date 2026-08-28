import { getCorrespondenceRecords } from '../../data/correspondence.js'
import {
  createAttachmentDraftFromFile,
  normalizeAttachment,
} from '../../utils/attachments.js'
import { normalizeCorrespondence } from '../../utils/correspondence.js'

function resolveRecord(correspondenceId) {
  return getCorrespondenceRecords()
    .map((record) => normalizeCorrespondence(record))
    .find((record) => record.id === correspondenceId) ?? null
}

export async function listAttachments(correspondenceId) {
  const record = resolveRecord(correspondenceId)

  if (!record) {
    return []
  }

  const sourceRecord =
    getCorrespondenceRecords().find((item) => item.id === correspondenceId) ?? null

  return Array.isArray(sourceRecord?.attachments)
    ? sourceRecord.attachments.map((attachment) =>
        normalizeAttachment(attachment, { correspondenceId: record.id }),
      )
    : []
}

export async function uploadAttachment(correspondenceId, file) {
  const record = resolveRecord(correspondenceId)

  if (!record) {
    return null
  }

  return createAttachmentDraftFromFile(file, { correspondenceId: record.id })
}

export const mockAttachmentService = Object.freeze({
  uploadAttachment,
  listAttachments,
})
