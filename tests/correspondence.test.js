import test from 'node:test'
import assert from 'node:assert/strict'

import { USER_ROLES } from '../src/constants/roles.js'
import {
  addCorrespondenceRecord,
  getCorrespondenceByReference as getMockRecordByReference,
  mockCorrespondence,
} from '../src/data/correspondence.js'
import {
  CORRESPONDENCE_DIRECTION_OPTIONS,
  CORRESPONDENCE_PRIORITY_OPTIONS,
  CORRESPONDENCE_TYPE_OPTIONS,
  getCorrespondenceApiId,
  getCorrespondenceById,
  getCorrespondenceByReference,
  getCorrespondenceDisplayReference,
  normalizeCorrespondence,
  normalizeCorrespondenceDetailResponse,
  normalizeCorrespondenceListResponse,
  toCreateCorrespondencePayload,
} from '../src/utils/correspondence.js'

test('normalizeCorrespondence keeps id and referenceNumber separate for backend records', () => {
  const normalized = normalizeCorrespondence({
    id: '5dbd08e7-79e0-4e2d-8de7-32e934e71856',
    reference_number: 'LEG-2026-0007',
    type: 'Contract',
    subject: 'Bridge assessment contract',
    sender: 'Highway Planning Directorate',
    priority: 'High',
    direction: 'Incoming',
    status: 'Received',
    current_stage: 'Initial legal review',
    current_office: '3e8043fb-e811-42db-b5ad-138d64a36d7c',
    current_office_name: 'Correspondence Integration Test Office',
    registered_by: {
      id: 'user-legal-1',
      full_name: 'Ama Mensah',
      office_id: 'office-legal',
    },
    received_at: '2026-07-19T17:00:00Z',
    created_at: '2026-07-19T17:00:00Z',
    updated_at: '2026-07-20T08:15:00Z',
    receipt_status: 'Pending',
    is_overdue: true,
  })

  assert.equal(normalized.id, '5dbd08e7-79e0-4e2d-8de7-32e934e71856')
  assert.equal(normalized.referenceNumber, 'LEG-2026-0007')
  assert.equal(normalized.currentOffice?.id, '3e8043fb-e811-42db-b5ad-138d64a36d7c')
  assert.equal(normalized.currentOffice?.name, 'Correspondence Integration Test Office')
  assert.equal(normalized.registeredBy?.fullName, 'Ama Mensah')
  assert.equal(normalized.receiptStatus, 'Pending')
  assert.equal(normalized.isOverdue, true)
  assert.equal(normalized.receivedAt, '2026-07-19T17:00:00.000Z')
  assert.equal(normalized.registeredAt, '2026-07-19T17:00:00.000Z')
  assert.equal(normalized.createdAt, '2026-07-19T17:00:00.000Z')
})

test('normalizeCorrespondence supports existing mock records and null optionals', () => {
  const normalized = normalizeCorrespondence({
    id: 'mock-correspondence-099',
    reference: 'MRH/LET/2026/0099',
    documentType: 'Letter',
    subject: 'Letter subject',
    sender: 'Central Registry',
    priority: 'Normal',
    direction: 'Internal',
    status: 'In Progress',
    currentOffice: 'Legal Directorate',
    currentStage: 'Review',
    receiptStatus: null,
    isOverdue: false,
    registeredAt: null,
  })

  assert.equal(normalized.id, 'mock-correspondence-099')
  assert.equal(normalized.referenceNumber, 'MRH/LET/2026/0099')
  assert.equal(normalized.currentOffice?.name, 'Legal Directorate')
  assert.equal(normalized.registeredAt, null)
  assert.equal(normalized.deadline, null)
})

test('correspondence identity helpers do not interchange id and referenceNumber', () => {
  const normalizedRecords = mockCorrespondence.map((record) => normalizeCorrespondence(record))
  const target = normalizedRecords[0]

  assert.equal(getCorrespondenceById(normalizedRecords, target.id)?.referenceNumber, target.referenceNumber)
  assert.equal(
    getCorrespondenceByReference(normalizedRecords, target.referenceNumber)?.id,
    target.id,
  )
  assert.equal(getCorrespondenceById(normalizedRecords, target.referenceNumber), null)
  assert.equal(getCorrespondenceApiId({ id: 'mock-correspondence-001' }), 'mock-correspondence-001')
  assert.equal(getCorrespondenceApiId({ referenceNumber: 'MRH/CON/2026/0012' }), null)
  assert.equal(
    getCorrespondenceDisplayReference({
      id: '5dbd08e7-79e0-4e2d-8de7-32e934e71856',
      referenceNumber: '',
    }),
    'Reference unavailable',
  )
})

test('list and detail adapters normalize plain arrays and paginated responses', () => {
  const plain = normalizeCorrespondenceListResponse([
    { id: 'mock-correspondence-201', reference: 'MRH/MEM/2026/0201', currentOffice: 'Legal Directorate' },
  ])
  const paginated = normalizeCorrespondenceListResponse({
    count: 2,
    next: '/api/correspondence?page=2',
    previous: null,
    results: [
      {
        id: 'mock-correspondence-202',
        reference_number: 'LEG-2026-0202',
        current_office: '3e8043fb-e811-42db-b5ad-138d64a36d7c',
        current_office_name: 'Correspondence Integration Test Office',
        received_at: '2026-08-12T12:00:00.000Z',
      },
    ],
  })
  const detail = normalizeCorrespondenceDetailResponse({
    id: 'mock-correspondence-203',
    reference_number: 'LEG-2026-0203',
    current_office: 'office-legal',
  })

  assert.equal(plain.count, 1)
  assert.equal(plain.results[0].referenceNumber, 'MRH/MEM/2026/0201')
  assert.equal(paginated.count, 2)
  assert.equal(paginated.results[0].currentOffice?.id, '3e8043fb-e811-42db-b5ad-138d64a36d7c')
  assert.equal(paginated.results[0].currentOffice?.name, 'Correspondence Integration Test Office')
  assert.equal(paginated.results[0].registeredAt, '2026-08-12T12:00:00.000Z')
  assert.equal(detail.referenceNumber, 'LEG-2026-0203')
})

test('normalizeCorrespondence preserves unavailable human references instead of displaying machine ids', () => {
  const normalized = normalizeCorrespondence({
    id: '3e0ed9ee-32ce-47da-83cc-8d861bf470e6',
    reference_number: '',
    subject: 'Legacy malformed record',
    received_at: '2026-08-12T12:00:00.000Z',
  })

  assert.equal(normalized.id, '3e0ed9ee-32ce-47da-83cc-8d861bf470e6')
  assert.equal(normalized.referenceNumber, 'Reference unavailable')
  assert.notEqual(normalized.referenceNumber, normalized.id)
  assert.equal(normalized.registeredAt, '2026-08-12T12:00:00.000Z')
})

test('payload adapter uses backend field names and rejects invalid registration inputs', () => {
  const currentUser = {
    role: USER_ROLES.OFFICE_USER,
    office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
  }
  const payload = toCreateCorrespondencePayload(
    {
      documentType: 'Contract',
      subject: 'Procurement contract',
      sender: 'Central Registry',
      priority: 'High',
      direction: 'Incoming',
      initialStage: 'Initial legal review',
      requiredAction: 'Review and advise.',
      documentDate: '2026-07-28',
      dateReceived: '2026-07-30',
      stageDeadline: '2026-07-30',
      status: 'Registered',
      referenceNumber: 'IGNORE-ME',
      reference_number: 'IGNORE-ME-TOO',
      current_office: 'DO-NOT-SEND',
      initial_office: 'DO-NOT-SEND',
      officeId: 'DO-NOT-SEND',
      destinationOffice: 'DO-NOT-SEND',
      attachment: { id: 'att-1' },
      externalReference: 'DO-NOT-SEND',
    },
    currentUser,
  )

  assert.deepEqual(Object.keys(payload), [
    'type',
    'subject',
    'sender',
    'priority',
    'direction',
    'current_office',
    'current_stage',
    'instructions',
    'document_date',
    'received_at',
    'deadline',
  ])
  assert.equal(payload.type, 'Contract')
  assert.equal(payload.direction, 'Incoming')
  assert.equal(payload.priority, 'High')
  assert.equal(payload.instructions, 'Review and advise.')
  assert.equal(payload.document_date, '2026-07-28')
  assert.equal(payload.received_at, '2026-07-30T00:00:00.000Z')
  assert.equal(payload.deadline, '2026-07-30T00:00:00.000Z')
  assert.equal(payload.current_office, 'office-legal')
  assert.equal('initial_office' in payload, false)
  assert.equal('officeId' in payload, false)
  assert.equal('destinationOffice' in payload, false)
  assert.equal('attachment' in payload, false)
  assert.equal('referenceNumber' in payload, false)
  assert.equal('reference_number' in payload, false)
  assert.equal('externalReference' in payload, false)
  assert.equal('external_reference' in payload, false)
  assert.deepEqual(CORRESPONDENCE_TYPE_OPTIONS, ['Contract', 'Letter', 'Memo', 'Report'])
  assert.deepEqual(CORRESPONDENCE_PRIORITY_OPTIONS, ['Normal', 'High', 'Urgent'])
  assert.deepEqual(CORRESPONDENCE_DIRECTION_OPTIONS, ['Incoming', 'Internal'])

  assert.throws(
    () =>
      toCreateCorrespondencePayload(
        {
          documentType: 'Contract',
          subject: 'Admin attempt',
          sender: 'Central Registry',
          priority: 'High',
          direction: 'Incoming',
          initialStage: 'Initial legal review',
        },
        {
          role: USER_ROLES.ADMIN,
          office: { id: 'office-ict' },
        },
      ),
    /Administrators cannot register office correspondence\./,
  )
  assert.throws(
    () =>
      toCreateCorrespondencePayload(
        {
          documentType: 'Contract',
          subject: 'Outgoing payload',
          sender: 'Central Registry',
          priority: 'High',
          direction: 'Outgoing',
          initialStage: 'Initial legal review',
        },
        currentUser,
      ),
    /Invalid correspondence direction\./,
  )
  assert.throws(
    () =>
      toCreateCorrespondencePayload(
        {
          documentType: 'Contract',
          subject: 'Missing office payload',
          sender: 'Central Registry',
          priority: 'High',
          direction: 'Incoming',
          initialStage: 'Initial legal review',
        },
        {
          role: USER_ROLES.OFFICE_USER,
          office: null,
        },
      ),
    /An assigned office is required to register correspondence\./,
  )

  assert.deepEqual(
    toCreateCorrespondencePayload(
      {
        documentType: 'Letter',
        subject: 'Optional values omitted',
        sender: 'Central Registry',
        priority: 'Normal',
        direction: 'Incoming',
        initialStage: 'Initial review',
        requiredAction: '   ',
        documentDate: '',
        dateReceived: '',
        stageDeadline: '',
      },
      currentUser,
    ),
    {
      type: 'Letter',
      subject: 'Optional values omitted',
      sender: 'Central Registry',
      priority: 'Normal',
      direction: 'Incoming',
      current_office: 'office-legal',
      current_stage: 'Initial review',
    },
  )
})

test('mock registration creates a stable id separate from the generated reference number', () => {
  const newReference = addCorrespondenceRecord(
    {
      subject: 'Unit test correspondence',
      documentType: 'Memo',
      sender: 'Finance Directorate',
      direction: 'Internal',
      externalReference: 'FIN/TEST/01',
      priority: 'Normal',
      routeToOffice: 'Legal Directorate',
      initialStage: 'Initial legal review',
      dateReceived: '27 Jul 2026',
      stageDeadline: '30 Jul 2026',
      overallCompletionDate: '31 Jul 2026',
      instructions: 'Review test correspondence.',
      administrativeNotes: 'Created during automated testing.',
      attachmentName: 'test-memo.pdf',
    },
    {
      fullName: 'Test Registry User',
      officeName: 'Central Registry',
      role: USER_ROLES.OFFICE_USER,
    },
  )
  const createdRecord = getMockRecordByReference(newReference)

  assert.ok(createdRecord)
  assert.match(createdRecord.id, /^mock-correspondence-/)
  assert.equal(createdRecord.referenceNumber, newReference)
  assert.notEqual(createdRecord.id, createdRecord.referenceNumber)
})
