import { getCorrespondenceRecords } from '../../data/correspondence.js'
import { normalizeCorrespondence } from '../../utils/correspondence.js'
import { normalizeOffice } from '../../utils/offices.js'

function resolveRecord(correspondenceId) {
  return getCorrespondenceRecords().find((item) => item.id === correspondenceId) ?? null
}

export function normalizeMockNote(rawNote, correspondenceId = null) {
  if (!rawNote) {
    return null
  }

  return {
    id: rawNote.id ?? `note-${Date.now()}`,
    correspondenceId,
    text: rawNote.text ?? rawNote.body ?? '',
    createdAt: rawNote.createdAt ?? rawNote.created_at ?? rawNote.date ?? null,
    createdBy: rawNote.author
      ? {
          id: rawNote.authorId ?? null,
          fullName: rawNote.author,
          role: rawNote.role ?? null,
          office: normalizeOffice(rawNote.office ?? rawNote.officeId ?? rawNote.officeName ?? null),
        }
      : null,
    office: normalizeOffice(rawNote.office ?? rawNote.officeId ?? rawNote.officeName ?? null),
  }
}

export async function listNotes(correspondenceId) {
  const record = resolveRecord(correspondenceId)
  const normalizedRecord = record ? normalizeCorrespondence(record) : null

  return Array.isArray(record?.notes)
    ? record.notes.map((note) => normalizeMockNote(note, normalizedRecord?.id ?? correspondenceId))
    : []
}

export async function createNote(correspondenceId, text) {
  return normalizeMockNote(
    {
      id: `note-${Date.now()}`,
      body: String(text ?? '').trim(),
      date: new Date().toISOString(),
    },
    correspondenceId,
  )
}

export const mockNoteService = Object.freeze({
  createNote,
  listNotes,
})
