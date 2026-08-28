import test from 'node:test'
import assert from 'node:assert/strict'

import { offices } from '../src/data/offices.js'
import { normalizeAuthenticatedUser } from '../src/utils/auth.js'
import {
  getCorrespondenceActionPermissions,
  isRecordAtUserOffice,
  normalizeCorrespondenceRecord,
} from '../src/utils/correspondencePermissions.js'
import { notificationBelongsToOffice, normalizeNotification } from '../src/utils/notifications.js'
import {
  getOfficeByCode,
  getOfficeById,
  getOfficeByName,
  getOfficeDisplayLabel,
  getOfficeDisplayName,
  getSelectableForwardingOffices,
  isSameOffice,
  normalizeOffice,
  resolveOffice,
} from '../src/utils/offices.js'

function toCanonicalOffice(office) {
  return office
    ? {
        id: office.id ?? null,
        name: office.name ?? '',
        code: office.code ?? null,
        status: office.status ?? null,
      }
    : null
}

test('normalizeOffice handles object and string source shapes', () => {
  const fullOffice = normalizeOffice({
    id: 'office-legal',
    name: 'Legal Directorate',
    code: 'LEG',
    status: 'Active',
  })
  const snakeCaseOffice = normalizeOffice({
    office_id: 'office-legal',
    office_name: 'Legal Directorate',
    office_code: 'LEG',
    office_status: 'Active',
  })
  const camelCaseOffice = normalizeOffice({
    officeId: 'office-legal',
    officeName: 'Legal Directorate',
    officeCode: 'LEG',
    officeStatus: 'Active',
  })
  const stringNameOffice = normalizeOffice('Legal Directorate', offices)
  const stringIdOffice = normalizeOffice('office-legal', offices)
  const missingCodeOffice = normalizeOffice({
    officeId: 'office-missing-code',
    officeName: 'Missing Code Office',
  })
  const inactiveOffice = normalizeOffice({
    officeId: 'office-archive',
    officeName: 'Archive Office',
    officeCode: 'ARC',
    officeStatus: 'Inactive',
  })

  assert.equal(fullOffice.id, 'office-legal')
  assert.equal(snakeCaseOffice.code, 'LEG')
  assert.equal(camelCaseOffice.status, 'Active')
  assert.equal(stringNameOffice?.name, 'Legal Directorate')
  assert.equal(stringIdOffice?.id, 'office-legal')
  assert.equal(missingCodeOffice.code, null)
  assert.equal(inactiveOffice.status, 'Inactive')
  assert.equal(normalizeOffice(null), null)
  assert.equal(normalizeOffice(undefined), null)
})

test('office lookup helpers resolve by id, code, and name', () => {
  assert.equal(getOfficeById(offices, 'office-legal')?.name, 'Legal Directorate')
  assert.equal(getOfficeByCode(offices, 'leg')?.id, 'office-legal')
  assert.equal(getOfficeByName(offices, 'legal directorate')?.code, 'LEG')
  assert.equal(resolveOffice(offices, 'LEG')?.id, 'office-legal')
  assert.equal(resolveOffice(offices, 'Legal Directorate')?.id, 'office-legal')
})

test('office display helpers avoid raw undefined output', () => {
  assert.equal(getOfficeDisplayName(null), 'Office not available')
  assert.equal(getOfficeDisplayLabel(getOfficeById(offices, 'office-legal')), 'Legal Directorate (LEG)')
  assert.equal(getOfficeDisplayLabel({ id: 'office-unknown', name: '', code: null, status: null }), 'Office not available')
})

test('forwarding destination helper excludes the current office while preserving live office labels', () => {
  const selectable = getSelectableForwardingOffices(
    [
      { id: 'office-cit', name: 'Correspondence Integration Test Office', code: 'CIT', status: 'Active' },
      { id: 'office-fin', name: 'testFINACIAL OFFICE', code: 'FIN', status: 'Active' },
      { id: 'office-mon', name: 'testMONITORY OFFICE', code: 'MON', status: 'Active' },
    ],
    {
      id: 'office-cit',
      name: 'Correspondence Integration Test Office',
      code: 'CIT',
      status: 'Active',
    },
  )

  assert.deepEqual(
    selectable.map((office) => office.id),
    ['office-fin', 'office-mon'],
  )
  assert.equal(getOfficeDisplayLabel(selectable[0]), 'testFINACIAL OFFICE (FIN)')
})

test('isSameOffice matches safely and denies null identity', () => {
  assert.equal(
    isSameOffice(
      { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
      { officeId: 'office-legal', officeName: 'Legal Directorate', officeCode: 'LEG', officeStatus: 'Active' },
    ),
    true,
  )
  assert.equal(
    isSameOffice(
      { id: null, name: 'Legal Directorate', code: 'LEG', status: 'Active' },
      { id: null, name: 'Another Name', code: 'LEG', status: 'Active' },
    ),
    false,
  )
  assert.equal(
    isSameOffice(
      { id: null, name: 'Finance Directorate', code: null, status: 'Active' },
      { id: null, name: 'finance directorate', code: null, status: 'Active' },
    ),
    true,
  )
  assert.equal(isSameOffice({ id: 'office-legal', name: 'Legal Directorate' }, { id: 'office-finance', name: 'Finance Directorate' }), false)
  assert.equal(isSameOffice(null, null), false)
})

test('authenticated users normalize office values into canonical office objects', () => {
  const officeNameUser = normalizeAuthenticatedUser({
    role: 'OFFICE_USER',
    office: 'Legal Directorate',
  })
  const officeIdUser = normalizeAuthenticatedUser({
    role: 'SUPERVISOR',
    office: 'office-finance',
  })
  const fullOfficeUser = normalizeAuthenticatedUser({
    role: 'ADMIN',
    office: {
      office_id: 'office-ict',
      office_name: 'ICT Directorate',
      office_code: 'ICT',
      office_status: 'Active',
    },
  })

  assert.deepEqual(officeNameUser?.office, {
    id: null,
    name: 'Legal Directorate',
    code: null,
    status: null,
  })
  assert.deepEqual(officeIdUser?.office, {
    id: 'office-finance',
    name: '',
    code: null,
    status: null,
  })
  assert.deepEqual(
    toCanonicalOffice(fullOfficeUser?.office),
    toCanonicalOffice(getOfficeById(offices, 'office-ict')),
  )
})

test('authenticated user normalization preserves office names when auth payload splits id and display fields', () => {
  const liveSupervisor = normalizeAuthenticatedUser({
    role: 'SUPERVISOR',
    office: '10272b78-9ec7-4853-be7a-ac313a584165',
    office_name: 'Correspondence Integration Test Office',
  })
  const liveOfficeUser = normalizeAuthenticatedUser({
    role: 'OFFICE_USER',
    office_id: '10272b78-9ec7-4853-be7a-ac313a584165',
    officeName: 'Correspondence Integration Test Office',
  })
  const uuidOnlyOfficeUser = normalizeAuthenticatedUser({
    role: 'OFFICE_USER',
    office: '10272b78-9ec7-4853-be7a-ac313a584165',
  })

  assert.equal(liveSupervisor?.office?.id, '10272b78-9ec7-4853-be7a-ac313a584165')
  assert.equal(liveSupervisor?.office?.name, 'Correspondence Integration Test Office')
  assert.equal(getOfficeDisplayName(liveSupervisor?.office), 'Correspondence Integration Test Office')
  assert.equal(liveOfficeUser?.office?.id, '10272b78-9ec7-4853-be7a-ac313a584165')
  assert.equal(liveOfficeUser?.office?.name, 'Correspondence Integration Test Office')
  assert.equal(uuidOnlyOfficeUser?.office?.id, '10272b78-9ec7-4853-be7a-ac313a584165')
  assert.equal(uuidOnlyOfficeUser?.office?.name, '')
  assert.equal(getOfficeDisplayName(uuidOnlyOfficeUser?.office), 'Office not available')
})

test('office-based permissions continue using assigned office identity', () => {
  const user = normalizeAuthenticatedUser({
    role: 'OFFICE_USER',
    office: {
      id: 'office-legal',
      name: 'Legal Directorate',
      code: 'LEG',
      status: 'Active',
    },
  })
  const supervisor = normalizeAuthenticatedUser({
    role: 'SUPERVISOR',
    office: {
      id: 'office-legal',
      name: 'Legal Directorate',
      code: 'LEG',
      status: 'Active',
    },
  })
  const admin = normalizeAuthenticatedUser({
    role: 'ADMIN',
    office: 'office-ict',
  })
  const recordAtLegal = normalizeCorrespondenceRecord({
    currentOffice: 'Legal Directorate',
    registeringOffice: 'Central Registry',
    status: 'In Progress',
  })
  const recordAtFinance = normalizeCorrespondenceRecord({
    currentOffice: 'Finance Directorate',
    registeringOffice: 'Central Registry',
    status: 'In Progress',
  })
  const notificationForLegal = normalizeNotification({
    destinationOffice: 'Legal Directorate',
    sourceOffice: 'Central Registry',
    correspondenceReference: 'MRH/CON/2026/0012',
  })

  assert.equal(isRecordAtUserOffice(recordAtLegal, user), true)
  assert.equal(isRecordAtUserOffice(recordAtFinance, user), false)
  assert.equal(notificationBelongsToOffice(notificationForLegal, supervisor), true)
  assert.equal(notificationBelongsToOffice(notificationForLegal, admin), false)
})

test('correspondence action permissions deny admin and historical-office mutations while allowing current office workflow access', () => {
  const officeUser = normalizeAuthenticatedUser({
    role: 'OFFICE_USER',
    office: 'office-legal',
  })
  const supervisor = normalizeAuthenticatedUser({
    role: 'SUPERVISOR',
    office: 'office-legal',
  })
  const admin = normalizeAuthenticatedUser({
    role: 'ADMIN',
    office: null,
  })

  const currentOfficeRecord = {
    id: 'corr-current-001',
    reference_number: 'MRH/CON/2026/0201',
    current_office: 'office-legal',
    status: 'Registered',
    current_stage: 'Initial Review',
    attachments: [{ id: 'att-existing-001', fileName: 'initial-letter.pdf' }],
  }
  const historicalRecord = {
    id: 'corr-history-001',
    reference_number: 'MRH/CON/2026/0202',
    current_office: 'office-finance',
    status: 'Registered',
    current_stage: 'Initial Review',
  }

  const currentPermissions = getCorrespondenceActionPermissions({
    record: currentOfficeRecord,
    user: officeUser,
  })
  const supervisorPermissions = getCorrespondenceActionPermissions({
    record: currentOfficeRecord,
    user: supervisor,
  })
  const adminPermissions = getCorrespondenceActionPermissions({
    record: currentOfficeRecord,
    user: admin,
  })
  const historicalPermissions = getCorrespondenceActionPermissions({
    record: historicalRecord,
    user: officeUser,
  })

  assert.equal(currentPermissions.canUpdateStage, true)
  assert.equal(currentPermissions.canForward, true)
  assert.equal(currentPermissions.canMarkCompleted, true)
  assert.equal(currentPermissions.canFile, true)
  assert.equal(currentPermissions.canAddNote, true)
  assert.equal(currentPermissions.canAddAttachment, true)
  const multiAttachmentPermissions = getCorrespondenceActionPermissions({
    record: {
      ...currentOfficeRecord,
      attachments: [
        { id: 'att-existing-001', fileName: 'initial-letter.pdf' },
        { id: 'att-existing-002', fileName: 'follow-up-memo.pdf' },
        { id: 'att-existing-003', fileName: 'supporting-note.docx' },
      ],
    },
    user: officeUser,
  })
  assert.equal(multiAttachmentPermissions.canAddAttachment, true)
  assert.equal(supervisorPermissions.canUpdateStage, true)
  assert.equal(supervisorPermissions.canForward, true)
  assert.equal(supervisorPermissions.canMarkCompleted, true)
  assert.equal(supervisorPermissions.canFile, true)
  assert.equal(adminPermissions.canUpdateStage, false)
  assert.equal(adminPermissions.canForward, false)
  assert.equal(adminPermissions.canMarkCompleted, false)
  assert.equal(adminPermissions.canFile, false)
  assert.equal(adminPermissions.canAddNote, false)
  assert.equal(adminPermissions.canAddAttachment, false)
  assert.match(adminPermissions.reason, /read-only correspondence oversight/i)
  assert.equal(historicalPermissions.canUpdateStage, false)
  assert.equal(historicalPermissions.canForward, false)
  assert.equal(historicalPermissions.canMarkCompleted, false)
  assert.equal(historicalPermissions.canFile, false)
  assert.equal(historicalPermissions.canAddNote, false)
  assert.equal(historicalPermissions.canAddAttachment, false)
  assert.match(historicalPermissions.reason, /currently with another office/i)
})

test('correspondence action permissions allow conservative live office matching by id first and exact name second', () => {
  const loginUser = normalizeAuthenticatedUser({
    role: 'SUPERVISOR',
    office: 'Correspondence Integration Test Office',
  })
  const refreshedUser = {
    ...loginUser,
    office: normalizeOffice({
      id: '3e8043fb-e811-42db-b5ad-138d64a36d7c',
      name: 'Correspondence Integration Test Office',
    }),
  }

  const uuidAndNameRecord = {
    id: 'corr-live-001',
    current_office: '3e8043fb-e811-42db-b5ad-138d64a36d7c',
    current_office_name: 'Correspondence Integration Test Office',
    status: 'Registered',
    current_stage: 'Initial classification',
  }
  const nameOnlyRecord = {
    id: 'corr-live-002',
    current_office: 'Correspondence Integration Test Office',
    status: 'Registered',
    current_stage: 'Initial classification',
  }
  const differentNameRecord = {
    id: 'corr-live-003',
    current_office: 'Different Office',
    status: 'Registered',
    current_stage: 'Initial classification',
  }
  const unknownOfficeRecord = {
    id: 'corr-live-004',
    current_office: null,
    status: 'Registered',
    current_stage: 'Initial classification',
  }

  assert.equal(isRecordAtUserOffice(uuidAndNameRecord, refreshedUser), true)
  assert.equal(isRecordAtUserOffice(nameOnlyRecord, loginUser), true)
  assert.equal(isRecordAtUserOffice(differentNameRecord, refreshedUser), false)
  assert.equal(isRecordAtUserOffice(unknownOfficeRecord, refreshedUser), false)

  const guidedReviewPermissions = getCorrespondenceActionPermissions({
    record: uuidAndNameRecord,
    user: refreshedUser,
    isGuidedReview: true,
  })

  assert.equal(guidedReviewPermissions.canUpdateStage, false)
  assert.equal(guidedReviewPermissions.canForward, false)
  assert.equal(guidedReviewPermissions.canMarkCompleted, false)
  assert.equal(guidedReviewPermissions.canFile, false)
  assert.equal(guidedReviewPermissions.canAddAttachment, false)
  assert.equal(guidedReviewPermissions.canAddNote, false)
  assert.match(guidedReviewPermissions.reason, /guided review/i)
})
