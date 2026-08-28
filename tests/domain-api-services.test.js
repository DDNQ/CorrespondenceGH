import test from 'node:test'
import assert from 'node:assert/strict'

import { clearApiHttpStateForTests } from '../src/services/api/httpClient.js'
import { setAccessToken, setRefreshToken, getRefreshTokenStorageKey } from '../src/services/api/tokenStore.js'
import {
  clearOfficeDirectoryCacheForTests,
  createOffice,
  listOffices,
  resolveOfficeFromDirectory,
} from '../src/services/api/officeApi.js'
import {
  createUser,
  getCreateUserPayloadKeyList,
  listUsers,
  normalizeGeneratedCredentialResponse,
  regenerateUserPassword,
  toCreateUserPayload,
} from '../src/services/api/userAdminApi.js'
import {
  completeCorrespondence,
  createCorrespondence,
  fileCorrespondence,
  forwardCorrespondence,
  getCorrespondenceById,
  listCorrespondence,
  listCorrespondenceMovements,
  toCorrespondenceActionNotePayload,
  toForwardCorrespondencePayload,
  toUpdateStagePayload,
  updateCorrespondenceStage,
} from '../src/services/api/correspondenceApi.js'
import { getAttachmentPreviewBlob, listAttachments, uploadAttachment } from '../src/services/api/attachmentApi.js'
import { createNote, listNotes } from '../src/services/api/noteApi.js'
import {
  getAdminDashboardSummary,
  getOfficeDashboardSummary,
  normalizeOfficeDashboardResponse,
} from '../src/services/api/dashboardApi.js'
import {
  buildFormalReportGeneratePayload,
  buildFormalReportPreviewQuery,
  generateFormalReport,
  generateFormalReportPreview,
  getFormalReportById,
  getOfficeBacklogReport,
  getOfficeReportWorkspace,
  getOfficeStaffContributionReport,
  getOfficeSummaryReport,
  getOfficeTrendsReport,
  listFormalReportsHistory,
  normalizeFormalReportResponse,
} from '../src/services/api/reportApi.js'
import {
  getOfficeDashboardRecentRecordRoute,
} from '../src/utils/dashboard.js'

class MemoryStorage {
  constructor() {
    this.store = new Map()
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  setItem(key, value) {
    this.store.set(key, String(value))
  }

  removeItem(key) {
    this.store.delete(key)
  }
}

function createJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test.beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage()
  globalThis.localStorage = new MemoryStorage()
  clearApiHttpStateForTests()
  clearOfficeDirectoryCacheForTests()
  setAccessToken('access-token')
  setRefreshToken('refresh-token')
})

test.afterEach(() => {
  clearApiHttpStateForTests()
  clearOfficeDirectoryCacheForTests()
})

test('office and user api modules use documented paths, payloads, and one-time credential normalization', async () => {
  const requests = []

  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })

    if (String(url).endsWith('/offices/')) {
      if (init.method === 'GET') {
        return createJsonResponse([
          { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
          { id: 'office-finance', name: 'Finance Directorate', code: 'FIN', status: 'Active' },
        ])
      }

      return createJsonResponse({
        office: { id: 'office-admin', name: 'Administration Directorate', code: 'ADM', status: 'Active' },
      })
    }

    if (String(url).endsWith('/users/')) {
      return createJsonResponse({
        user: {
          id: 'user-100',
          first_name: 'Abena',
          last_name: 'Owusu',
          display_name: 'Abena Owusu',
          email: 'abena.owusu@legal.mrh.gov.gh',
          role: 'OFFICE_USER',
          office: 'office-legal',
          account_status: 'Active',
        },
        generated_password: 'TempPassword123',
      })
    }

    if (String(url).endsWith('/users/user-100/regenerate-password/')) {
      return createJsonResponse({
        user_id: 'user-100',
        email: 'abena.owusu@legal.mrh.gov.gh',
        generated_password: 'ResetPassword456',
      })
    }

    return createJsonResponse({})
  }

  const officeDirectory = await listOffices()
  const office = await createOffice({ name: ' Administration Directorate ', code: ' ADM ' })
  const createdUser = await createUser({
    firstName: 'Abena',
    middleName: 'Akosua',
    lastName: 'Owusu',
    role: 'OFFICE_USER',
    officeId: 'office-legal',
    phoneNumber: '0200000000',
    accountStatus: 'Active',
  })
  const regenerated = await regenerateUserPassword('user-100')

  assert.equal(officeDirectory[0].id, 'office-legal')
  assert.equal(officeDirectory[0].name, 'Legal Directorate')
  assert.equal(officeDirectory[0].code, 'LEG')
  assert.equal(officeDirectory[0].status, 'Active')
  assert.equal(office.name, 'Administration Directorate')
  assert.equal(requests[0].init.method, 'GET')
  assert.equal(requests[0].url.endsWith('/offices/'), true)
  assert.equal(requests[1].init.method, 'POST')
  assert.equal(requests[1].url.endsWith('/offices/'), true)
  assert.equal(requests[2].url.endsWith('/users/'), true)
  assert.equal(
    requests[2].init.body,
    JSON.stringify({
      first_name: 'Abena',
      middle_name: 'Akosua',
      last_name: 'Owusu',
      role: 'OFFICE_USER',
      office: 'office-legal',
      phone_number: '0200000000',
    }),
  )
  assert.equal(createdUser.user.email, 'abena.owusu@legal.mrh.gov.gh')
  assert.equal(createdUser.user.office?.id, 'office-legal')
  assert.equal(createdUser.user.office?.name, 'Legal Directorate')
  assert.equal(createdUser.generatedPassword, 'TempPassword123')
  assert.equal(regenerated.generatedPassword, 'ResetPassword456')
  assert.equal(globalThis.localStorage.getItem(getRefreshTokenStorageKey()), null)

  const normalizedCredential = normalizeGeneratedCredentialResponse({
    user: { id: 'user-100', email: 'abena.owusu@legal.mrh.gov.gh', role: 'OFFICE_USER', office: 'office-legal' },
    generated_password: 'SecretTemp789',
  })
  assert.equal(normalizedCredential.generatedPassword, 'SecretTemp789')
})

test('office directory api rejects non-array and non-active live responses without a mock fallback', async () => {
  globalThis.fetch = async () => {
    return createJsonResponse([
      { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Inactive' },
    ])
  }

  await assert.rejects(
    () => listOffices(),
    /non-active office record/i,
  )
})

test('office directory resolution enriches authenticated office context without fabricating codes', async () => {
  const requests = []

  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })

    return createJsonResponse([
      {
        id: 'office-cit',
        name: 'Correspondence Integration Test Office',
        code: 'CIT',
        status: 'Active',
      },
      {
        id: 'office-legal',
        name: 'Legal Directorate',
        code: 'LEG',
        status: 'Active',
      },
    ])
  }

  const byId = await resolveOfficeFromDirectory({
    id: 'office-cit',
    name: 'Correspondence Integration Test Office',
    code: null,
    status: null,
  })

  assert.equal(byId.id, 'office-cit')
  assert.equal(byId.code, 'CIT')
  assert.equal(byId.status, 'Active')

  const byName = await resolveOfficeFromDirectory({
    id: null,
    name: ' Correspondence Integration Test Office ',
    code: null,
    status: null,
  })

  assert.equal(byName.id, 'office-cit')
  assert.equal(byName.code, 'CIT')

  const differentOffice = await resolveOfficeFromDirectory({
    id: 'office-unknown',
    name: 'Unknown Office',
    code: null,
    status: null,
  })

  assert.equal(differentOffice.id, 'office-unknown')
  assert.equal(differentOffice.name, 'Unknown Office')
  assert.equal(differentOffice.code, null)

  clearOfficeDirectoryCacheForTests()

  globalThis.fetch = async () => {
    throw new Error('Directory unavailable')
  }

  const unavailableDirectory = await resolveOfficeFromDirectory({
    id: 'office-cit',
    name: 'Correspondence Integration Test Office',
    code: null,
    status: null,
  })

  assert.equal(unavailableDirectory.id, 'office-cit')
  assert.equal(unavailableDirectory.code, null)
  assert.equal(unavailableDirectory.status, null)
  assert.equal(requests.length, 1)
})

test('create-user payload adapter converts frontend camelCase form values into documented snake_case backend keys only', () => {
  const payload = toCreateUserPayload({
    firstName: ' Frontend ',
    middleName: ' Integration Test ',
    lastName: ' User 07280016 ',
    role: 'OFFICE_USER',
    officeId: ' 7da676fa-a4c1-4265-baab-0a41adce720e ',
    phoneNumber: ' ',
    accountStatus: 'Active',
    temporaryPassword: 'Password123',
    password: 'Password123',
    officeName: 'FRONTEND INTEGRATION TEST OFFICE 07280016',
  })

  assert.deepEqual(payload, {
    first_name: 'Frontend',
    middle_name: 'Integration Test',
    last_name: 'User 07280016',
    role: 'OFFICE_USER',
    office: '7da676fa-a4c1-4265-baab-0a41adce720e',
  })
  assert.deepEqual(getCreateUserPayloadKeyList({
    firstName: ' Frontend ',
    middleName: ' Integration Test ',
    lastName: ' User 07280016 ',
    role: 'OFFICE_USER',
    officeId: ' 7da676fa-a4c1-4265-baab-0a41adce720e ',
    phoneNumber: ' ',
    accountStatus: 'Active',
  }), ['first_name', 'middle_name', 'last_name', 'role', 'office'])
  assert.equal('firstName' in payload, false)
  assert.equal('middleName' in payload, false)
  assert.equal('lastName' in payload, false)
  assert.equal('officeId' in payload, false)
  assert.equal('phoneNumber' in payload, false)
  assert.equal('accountStatus' in payload, false)
  assert.equal('temporaryPassword' in payload, false)
  assert.equal('password' in payload, false)
  assert.equal('officeName' in payload, false)
})

test('user directory api accepts documented list envelopes and normalizes real user records', async () => {
  const requests = []

  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })

    if (String(url).endsWith('/users/')) {
      return createJsonResponse({
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 'user-1',
            first_name: 'Ama',
            last_name: 'Mensah',
            display_name: 'Ama Mensah',
            email: 'ama.mensah@legal.mrh.gov.gh',
            role: 'OFFICE_USER',
            office: 'office-legal',
            account_status: 'Active',
            last_login: '2026-08-22T10:00:00.000Z',
          },
          {
            id: 'user-2',
            first_name: 'Esi',
            last_name: 'Owusu',
            display_name: 'Esi Owusu',
            email: 'esi.owusu@mrh.gov.gh',
            role: 'ADMIN',
            office: null,
            account_status: 'Inactive',
            last_login: null,
          },
        ],
      })
    }

    if (String(url).endsWith('/offices/')) {
      return createJsonResponse([
        { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
      ])
    }

    return createJsonResponse({})
  }

  const listedUsers = await listUsers()

  assert.equal(requests[0].url.endsWith('/users/'), true)
  assert.equal(requests[0].init.method, 'GET')
  assert.equal(requests[1].url.endsWith('/offices/'), true)
  assert.equal(listedUsers.length, 2)
  assert.equal(listedUsers[0].office?.name, 'Legal Directorate')
  assert.equal(listedUsers[0].lastLogin, '2026-08-22T10:00:00.000Z')
  assert.equal(listedUsers[1].role, 'ADMIN')
  assert.equal(listedUsers[1].office, null)
  assert.equal(listedUsers[1].accountStatus, 'Inactive')
  assert.equal(listedUsers[1].lastLogin, 'Not yet signed in')
})

test('correspondence api enriches identifier-only current-office values from the live office directory', async () => {
  const calls = []

  globalThis.fetch = async (url) => {
    calls.push(String(url))

    if (String(url).endsWith('/offices/')) {
      return createJsonResponse([
        {
          id: '238cf6e0-6dae-48a5-b872-a9802e784803',
          name: 'testFINACIAL OFFICE',
          code: 'FIN',
          status: 'Active',
        },
      ])
    }

    if (String(url).endsWith('/correspondence/?scope=current')) {
      return createJsonResponse({
        count: 1,
        results: [
          {
            id: 'corr-destination-1',
            reference_number: 'CIT-2026-0009',
            status: 'Forwarded',
            current_office: '238cf6e0-6dae-48a5-b872-a9802e784803',
          },
        ],
      })
    }

    if (String(url).endsWith('/correspondence/corr-destination-1/')) {
      return createJsonResponse({
        id: 'corr-destination-1',
        reference_number: 'CIT-2026-0009',
        status: 'Forwarded',
        current_stage: 'Initial classification',
        current_office: '238cf6e0-6dae-48a5-b872-a9802e784803',
      })
    }

    return createJsonResponse({})
  }

  const listed = await listCorrespondence({ scope: 'current' })
  const detail = await getCorrespondenceById('corr-destination-1')

  assert.equal(listed.records[0].currentOffice?.id, '238cf6e0-6dae-48a5-b872-a9802e784803')
  assert.equal(listed.records[0].currentOffice?.name, 'testFINACIAL OFFICE')
  assert.equal(detail.currentOffice?.id, '238cf6e0-6dae-48a5-b872-a9802e784803')
  assert.equal(detail.currentOffice?.name, 'testFINACIAL OFFICE')
  assert.equal(calls.filter((url) => url.endsWith('/offices/')).length, 1)
})

test('correspondence api modules use documented endpoints and canonical payload adapters', async () => {
  const calls = []

  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })

    if (String(url).endsWith('/correspondence/corr-001/')) {
      return createJsonResponse({
        id: 'corr-001',
        reference_number: 'MRH/CON/2026/0101',
        current_office_name: 'Legal Directorate',
        current_office: 'office-legal',
      })
    }

    if (String(url).endsWith('/forward/')) {
      return createJsonResponse({ correspondence: { id: 'corr-001', reference_number: 'MRH/CON/2026/0101' } })
    }

    if (String(url).endsWith('/update-stage/')) {
      return createJsonResponse({ correspondence: { id: 'corr-001', reference_number: 'MRH/CON/2026/0101' } })
    }

    if (String(url).endsWith('/complete/')) {
      return createJsonResponse({ correspondence: { id: 'corr-001', reference_number: 'MRH/CON/2026/0101' } })
    }

    if (String(url).endsWith('/file/')) {
      return createJsonResponse({ correspondence: { id: 'corr-001', reference_number: 'MRH/CON/2026/0101' } })
    }

    if (String(url).endsWith('/movements/')) {
      return createJsonResponse([{ id: 'move-1', correspondence_id: 'corr-001', reference_number: 'MRH/CON/2026/0101' }])
    }

    if (String(url).includes('/correspondence/')) {
      if (init.method === 'POST') {
        return createJsonResponse({
          id: 'corr-001',
          reference_number: 'MRH/CON/2026/0101',
          current_office_name: 'Legal Directorate',
          current_office: 'office-legal',
          current_stage: 'Initial legal review',
        })
      }

      return createJsonResponse({
        count: 1,
        results: [
          {
            id: 'corr-001',
            reference_number: 'MRH/CON/2026/0101',
            current_office: 'office-legal',
            current_office_name: 'Legal Directorate',
          },
        ],
      })
    }

    return createJsonResponse({})
  }

  const currentUser = { role: 'OFFICE_USER', office: { id: 'office-legal' } }
  const createdRecord = await createCorrespondence(
    {
      documentType: 'Contract',
      subject: 'Bridge assessment',
      sender: 'Central Registry',
      priority: 'High',
      direction: 'Incoming',
      initialStage: 'Initial legal review',
      requiredAction: 'Please review.',
      documentDate: '2026-07-28',
      dateReceived: '2026-07-29',
      stageDeadline: '2026-07-30',
    },
    currentUser,
  )
  const listed = await listCorrespondence({ scope: 'forwarded' })
  const detail = await getCorrespondenceById('corr-001')
  await forwardCorrespondence('corr-001', { destinationOfficeId: 'office-finance', note: 'Please review.' })
  await updateCorrespondenceStage('corr-001', { currentStage: 'Director review', note: 'Escalated.' })
  await completeCorrespondence('corr-001', { note: 'Completed.' })
  await fileCorrespondence('corr-001', { note: 'Filed.' })
  const movements = await listCorrespondenceMovements('corr-001')

  assert.equal(calls[0].url.endsWith('/correspondence/'), true)
  assert.equal(calls[1].url.endsWith('/correspondence/?scope=forwarded'), true)
  assert.equal(calls[2].url.endsWith('/correspondence/corr-001/'), true)
  assert.equal(calls[3].url.endsWith('/correspondence/corr-001/forward/'), true)
  assert.equal(calls[4].url.endsWith('/correspondence/corr-001/update-stage/'), true)
  assert.equal(calls[5].url.endsWith('/correspondence/corr-001/complete/'), true)
  assert.equal(calls[6].url.endsWith('/correspondence/corr-001/file/'), true)
  assert.equal(calls[7].url.endsWith('/correspondence/corr-001/movements/'), true)
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    type: 'Contract',
    subject: 'Bridge assessment',
    sender: 'Central Registry',
    priority: 'High',
    direction: 'Incoming',
    current_office: 'office-legal',
    current_stage: 'Initial legal review',
    instructions: 'Please review.',
    document_date: '2026-07-28',
    received_at: '2026-07-29T00:00:00.000Z',
    deadline: '2026-07-30T00:00:00.000Z',
  })
  assert.equal(JSON.parse(calls[0].init.body).initial_office, undefined)
  assert.equal(JSON.parse(calls[0].init.body).reference_number, undefined)
  assert.equal(JSON.parse(calls[0].init.body).destination_office, undefined)
  assert.equal(JSON.parse(calls[0].init.body).attachment, undefined)
  assert.equal(JSON.parse(calls[0].init.body).external_reference, undefined)
  assert.equal(createdRecord.id, 'corr-001')
  assert.equal(createdRecord.referenceNumber, 'MRH/CON/2026/0101')
  assert.equal(detail.id, 'corr-001')
  assert.equal(listed.records[0].referenceNumber, 'MRH/CON/2026/0101')
  assert.equal(listed.sourceEnvelope, 'paginated')
  assert.equal(movements[0].correspondenceId, 'corr-001')
  assert.deepEqual(toForwardCorrespondencePayload({ destinationOfficeId: 'office-legal', note: '  Test  ' }), {
    to_office: 'office-legal',
    note: 'Test',
  })
  assert.deepEqual(toUpdateStagePayload({ currentStage: ' Review ', note: '  Escalate ' }), {
    current_stage: 'Review',
    note: 'Escalate',
  })
  assert.deepEqual(toUpdateStagePayload({ currentStage: ' Under Review ', note: '   ' }), {
    current_stage: 'Under Review',
  })
  assert.deepEqual(toCorrespondenceActionNotePayload({ note: '  Completed ' }), { note: 'Completed' })
  assert.deepEqual(toCorrespondenceActionNotePayload({ note: '   ' }), {})
})

test('complete and file api actions use documented endpoints, empty bodies, and trimmed optional notes only', async () => {
  const calls = []

  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })

    return createJsonResponse({
      detail: 'Workflow action accepted.',
    })
  }

  await completeCorrespondence('corr-100', {})
  await completeCorrespondence('corr-101', { note: '  Completed by office.  ', officeId: 'office-legal' })
  await fileCorrespondence('corr-102', {})
  await fileCorrespondence('corr-103', { note: '  Filed after review.  ', status: 'Filed' })

  assert.equal(calls[0].url.endsWith('/correspondence/corr-100/complete/'), true)
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), {})

  assert.equal(calls[1].url.endsWith('/correspondence/corr-101/complete/'), true)
  assert.deepEqual(JSON.parse(calls[1].init.body), { note: 'Completed by office.' })
  assert.equal('officeId' in JSON.parse(calls[1].init.body), false)
  assert.equal('current_office' in JSON.parse(calls[1].init.body), false)
  assert.equal('userId' in JSON.parse(calls[1].init.body), false)
  assert.equal('status' in JSON.parse(calls[1].init.body), false)
  assert.equal('current_stage' in JSON.parse(calls[1].init.body), false)

  assert.equal(calls[2].url.endsWith('/correspondence/corr-102/file/'), true)
  assert.equal(calls[2].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[2].init.body), {})

  assert.equal(calls[3].url.endsWith('/correspondence/corr-103/file/'), true)
  assert.deepEqual(JSON.parse(calls[3].init.body), { note: 'Filed after review.' })
  assert.equal('officeId' in JSON.parse(calls[3].init.body), false)
  assert.equal('current_office' in JSON.parse(calls[3].init.body), false)
  assert.equal('userId' in JSON.parse(calls[3].init.body), false)
  assert.equal('status' in JSON.parse(calls[3].init.body), false)
  assert.equal('current_stage' in JSON.parse(calls[3].init.body), false)
})

test('attachment and note api modules validate inputs and use documented endpoints', async () => {
  const calls = []
  const previewBlob = new Blob(['preview'], { type: 'application/pdf' })

  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })

    if (String(url).endsWith('/files/contract.pdf')) {
      return new Response(previewBlob, {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })
    }

    if (String(url).endsWith('/attachments/')) {
      if (init.method === 'POST') {
        return createJsonResponse({
          attachment: {
            id: 'att-1',
            correspondence_id: 'corr-001',
            original_filename: 'contract.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1024,
            file_url: '/files/contract.pdf',
          },
        })
      }

      return createJsonResponse([
        {
          id: 'att-1',
          correspondence_id: 'corr-001',
          original_filename: 'contract.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          file_url: '/files/contract.pdf',
        },
      ])
    }

    if (String(url).endsWith('/notes/')) {
      if (init.method === 'POST') {
        return createJsonResponse({
          note: { id: 'note-1', correspondence_id: 'corr-001', text: 'Processed.', office: 'office-legal' },
        })
      }

      return createJsonResponse([{ id: 'note-1', correspondence_id: 'corr-001', text: 'Processed.', office: 'office-legal' }])
    }

    return createJsonResponse({})
  }

  const file = new File(['pdf'], 'contract.pdf', { type: 'application/pdf' })
  const uploaded = await uploadAttachment('corr-001', file)
  const attachments = await listAttachments('corr-001')
  const preview = await getAttachmentPreviewBlob(attachments[0])
  const createdNote = await createNote('corr-001', '  Processed. ')
  const notes = await listNotes('corr-001')

  assert.equal(calls[0].url.endsWith('/correspondence/corr-001/attachments/'), true)
  assert.equal(calls[0].init.body instanceof FormData, true)
  assert.equal(calls[0].init.body.get('file').name, 'contract.pdf')
  assert.equal(calls[0].init.headers.get('Content-Type'), null)
  assert.equal(calls[2].url.endsWith('/files/contract.pdf'), true)
  assert.equal(calls[2].init.method, 'GET')
  assert.equal(calls[2].init.headers.get('Authorization'), 'Bearer access-token')
  assert.equal(calls[3].url.endsWith('/correspondence/corr-001/notes/'), true)
  assert.deepEqual(JSON.parse(calls[3].init.body), { text: 'Processed.' })
  assert.equal('office' in JSON.parse(calls[3].init.body), false)
  assert.equal('officeId' in JSON.parse(calls[3].init.body), false)
  assert.equal('author' in JSON.parse(calls[3].init.body), false)
  assert.equal('user' in JSON.parse(calls[3].init.body), false)
  assert.equal('timestamp' in JSON.parse(calls[3].init.body), false)
  assert.equal(uploaded.originalFilename, 'contract.pdf')
  assert.equal(uploaded.url, 'https://mrh-backend.onrender.com/files/contract.pdf')
  assert.equal(uploaded.fileUrl, 'https://mrh-backend.onrender.com/files/contract.pdf')
  assert.equal(attachments.length, 1)
  assert.equal(attachments[0].url, 'https://mrh-backend.onrender.com/files/contract.pdf')
  assert.equal(attachments[0].fileUrl, 'https://mrh-backend.onrender.com/files/contract.pdf')
  assert.equal(preview instanceof Blob, true)
  assert.equal(preview.type, 'application/pdf')
  assert.equal(createdNote.text, 'Processed.')
  assert.equal(notes.length, 1)

  await assert.rejects(() => createNote('corr-001', '   '), /Enter a note before saving\./)
})

test('dashboard and report api modules use documented analytics paths and endpoint-specific query parameters', async () => {
  const calls = []

  globalThis.fetch = async (url) => {
    calls.push(String(url))

    if (String(url).includes('/dashboard/office-summary/')) {
      return createJsonResponse({
        office: 'Legal Directorate',
        active_count: 8,
        overdue_count: 0,
        completed_count: 3,
        avg_time_in_office_hours: 27.5,
        by_status: {
          'In Progress': 5,
          'Awaiting Action': 2,
          Escalated: 1,
        },
        by_type: {
          Letter: 6,
          Brief: 2,
        },
        recent: [
          {
            id: '10272b78-9ec7-4853-be7a-ac313a584165',
            reference_number: 'CIT-2026-0001',
            subject: 'Frontend Integration Registration Test',
            sender: 'Integration Test Sender',
            type: 'Letter',
            priority: 'Normal',
            status: 'In Progress',
            direction: 'Incoming',
            received_at: '2026-08-12T12:00:00.000Z',
            deadline: '2026-08-15T12:00:00.000Z',
            current_office: 'office-legal',
            current_office_name: 'Legal Directorate',
            assigned_to: null,
          },
        ],
      })
    }

    if (String(url).includes('/dashboard/admin-summary/')) {
      return createJsonResponse({
        counts_bucket: { total_records: 10 },
        offices_snapshot: [{ office_uuid: 'office-legal', total: 4 }],
        activity_feed: [{ title: 'Recent activity unavailable for this test' }],
      })
    }

    return createJsonResponse({ summary: { received: 12 }, trends: [], buckets: [] })
  }

  const officeDashboard = await getOfficeDashboardSummary()
  const adminDashboard = await getAdminDashboardSummary()
  await getOfficeSummaryReport('office-legal')
  await getOfficeSummaryReport('office-legal', { start: '2026-07-01', end: '2026-07-27' })
  await getOfficeStaffContributionReport('office-legal')
  await getOfficeBacklogReport('office-legal')
  await getOfficeTrendsReport('office-legal')

  assert.equal(calls[0].endsWith('/dashboard/office-summary/'), true)
  assert.equal(calls[1].endsWith('/dashboard/admin-summary/'), true)
  assert.equal(calls[1].includes('?'), false)
  assert.equal(calls[2].endsWith('/reports/offices/office-legal/summary/'), true)
  assert.equal(calls[2].includes('?'), false)
  assert.equal(calls[3].includes('/reports/offices/office-legal/summary/'), true)
  assert.equal(calls[3].includes('start=2026-07-01'), true)
  assert.equal(calls[3].includes('end=2026-07-27'), true)
  assert.equal(calls[4].endsWith('/reports/offices/office-legal/staff-contribution/'), true)
  assert.equal(calls[4].includes('?'), false)
  assert.equal(calls[5].endsWith('/reports/offices/office-legal/backlog/'), true)
  assert.equal(calls[5].includes('?'), false)
  assert.equal(calls[6].endsWith('/reports/offices/office-legal/trends/'), true)
  assert.equal(calls[6].includes('?'), false)
  assert.equal(officeDashboard.activeCount, 8)
  assert.equal(officeDashboard.overdueCount, 0)
  assert.equal(officeDashboard.completedCount, 3)
  assert.equal(officeDashboard.averageTimeInOfficeHours, 27.5)
  assert.equal(officeDashboard.averageTimeInOfficeLabel, '1 day 3 hrs')
  assert.equal(officeDashboard.contractDiagnostics.averageTimeField, 'avg_time_in_office_hours')
  assert.equal(officeDashboard.contractDiagnostics.averageTimeUnit, 'hours')
  assert.equal(officeDashboard.statusBreakdown[2].label, 'Escalated')
  assert.equal(officeDashboard.typeBreakdown[1].label, 'Brief')
  assert.equal(officeDashboard.recentRecords[0].id, '10272b78-9ec7-4853-be7a-ac313a584165')
  assert.equal(officeDashboard.recentRecords[0].referenceNumber, 'CIT-2026-0001')
  assert.equal(
    getOfficeDashboardRecentRecordRoute(officeDashboard.recentRecords[0]),
    '/correspondence/10272b78-9ec7-4853-be7a-ac313a584165',
  )
  assert.equal(adminDashboard.summary.activeCorrespondence, null)
  assert.equal(adminDashboard.summary.activeUsers, null)
  assert.deepEqual(adminDashboard.officeBreakdown, [])
  assert.deepEqual(adminDashboard.recentActivity, [])
  assert.equal(adminDashboard.availability.officeBreakdown, false)
  assert.equal(adminDashboard.availability.recentActivity, false)
  assert.deepEqual(adminDashboard.contractDiagnostics.safeTopLevelKeys, [
    'activity_feed',
    'counts_bucket',
    'offices_snapshot',
  ])
})

test('formal report preview adapters use documented endpoint mapping, omit office selection, and preserve preview references', async () => {
  const calls = []
  const currentUser = {
    id: 'user-supervisor-1',
    fullName: 'Kwesi Boateng',
    role: 'SUPERVISOR',
    office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
  }

  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })

    return createJsonResponse({
      report_type: 'OFFICE_PERFORMANCE',
      report_reference: 'MRH-LEG-PERFORMANCE-2026-07-PREVIEW',
      office: {
        id: 'office-legal',
        name: 'Legal Directorate',
        code: 'LEG',
        status: 'Active',
      },
      period: {
        type: 'monthly',
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        label: 'July 2026',
      },
      generated_at: '2026-08-13T09:00:00.000Z',
      summary: {
        received: 12,
        completed: 8,
        pending: 3,
        overdue: 1,
        completion_rate: '66.7%',
      },
      status_breakdown: { 'In Progress': 3, Completed: 8, Overdue: 1 },
      priority_breakdown: { High: 4, Normal: 8 },
      type_breakdown: { Letter: 10, Memo: 2 },
      overdue_summary: { bands: { '1-7 Days Overdue': 1 } },
      pending_ageing_summary: { bands: { 'Less Than 7 Days': 2, '7-14 Days': 1 } },
      staff_contribution_summary: [
        { staff_member: 'Kwesi Boateng', total_actions: 7 },
      ],
      executive_summary: 'Backend executive summary.',
      bottlenecks: 'Backend bottleneck summary.',
      observations: 'Backend observation.',
      recommendations: 'Backend recommendation.',
    })
  }

  const workspace = await getOfficeReportWorkspace(currentUser)
  const report = await generateFormalReportPreview(currentUser, {
    reportType: 'office-performance',
    periodType: 'monthly',
    year: '2026',
    month: '07',
    observations: 'Frontend observation.',
    recommendations: 'Frontend recommendation.',
    officeId: 'office-finance',
    officeName: 'Finance Directorate',
  })

  assert.equal(workspace.office.id, 'office-legal')
  assert.equal(workspace.metadata.officeSelectorAllowed, false)
  assert.equal(calls[0].url.endsWith('/reports/formal/office-performance/?month=7&period_type=monthly&year=2026'), true)
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(calls[0].init.body, undefined)
  assert.equal(report.reference, 'MRH-LEG-PERFORMANCE-2026-07-PREVIEW')
  assert.equal(report.reportType, 'office-performance')
  assert.equal(report.office.id, 'office-legal')
  assert.equal(report.period.label, 'July 2026')
  assert.equal(report.printOrientation, 'portrait')
  assert.equal(report.isMockPreview, false)
  assert.equal(report.sections.some((section) => section.id === 'status-breakdown'), true)
  assert.equal(report.observations, 'Backend observation.')
  assert.equal(report.recommendations, 'Backend recommendation.')
})

test('formal report query and payload builders omit unused period fields and never include office ids', () => {
  assert.deepEqual(
    buildFormalReportPreviewQuery({
      reportType: 'pending-ageing',
      periodType: 'annual',
      year: '2026',
      month: '07',
      officeId: 'office-legal',
    }),
    {
      period_type: 'annual',
      year: 2026,
    },
  )

  assert.deepEqual(
    buildFormalReportPreviewQuery({
      reportType: 'staff-contribution',
      periodType: 'custom',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      year: '2026',
      month: '07',
      officeId: 'office-legal',
    }),
    {
      period_type: 'custom',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
    },
  )

  const payload = buildFormalReportGeneratePayload({
    reportType: 'staff-contribution',
    periodType: 'custom',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    year: '2026',
    month: '07',
    officeId: 'office-legal',
    observations: 'Observation',
    recommendations: 'Recommendation',
  })

  assert.deepEqual(payload, {
    report_type: 'STAFF_CONTRIBUTION',
    period_type: 'custom',
    observations: 'Observation',
    recommendations: 'Recommendation',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
  })
  assert.equal('year' in payload, false)
  assert.equal('month' in payload, false)
  assert.equal('officeId' in payload, false)
  assert.equal('office' in payload, false)
})

test('formal report generate uses documented endpoint and preserves official backend reference', async () => {
  const calls = []
  const currentUser = {
    id: 'user-supervisor-1',
    fullName: 'Kwesi Boateng',
    role: 'SUPERVISOR',
    office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
  }

  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })

    return createJsonResponse({
      report_type: 'OFFICE_PERFORMANCE',
      report_reference: 'MRH-LEG-PERFORMANCE-2026-07-V1',
      office: {
        id: 'office-legal',
        name: 'Legal Directorate',
        code: 'LEG',
        status: 'Active',
      },
      period: {
        type: 'monthly',
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        label: 'July 2026',
      },
      generated_at: '2026-08-13T09:30:00.000Z',
      summary: {
        received: 12,
        completed: 8,
        pending: 3,
        overdue: 1,
        completion_rate: '66.7%',
      },
      status_breakdown: { 'In Progress': 3, Completed: 8, Overdue: 1 },
      priority_breakdown: { High: 4, Normal: 8 },
      type_breakdown: { Letter: 10, Memo: 2 },
      overdue_summary: { bands: { '1-7 Days Overdue': 1 } },
      pending_ageing_summary: { bands: { 'Less Than 7 Days': 2, '7-14 Days': 1 } },
      staff_contribution_summary: [
        { staff_member: 'Kwesi Boateng', total_actions: 7 },
      ],
      executive_summary: 'Backend executive summary.',
      bottlenecks: 'Backend bottleneck summary.',
      observations: 'Frontend integration verification.',
      recommendations: 'Frontend integration verification.',
    })
  }

  const report = await generateFormalReport(currentUser, {
    reportType: 'office-performance',
    periodType: 'monthly',
    year: '2026',
    month: '07',
    observations: 'Frontend integration verification.',
    recommendations: 'Frontend integration verification.',
    officeId: 'office-finance',
  })

  assert.equal(calls[0].url.endsWith('/reports/formal/generate/'), true)
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    report_type: 'OFFICE_PERFORMANCE',
    period_type: 'monthly',
    observations: 'Frontend integration verification.',
    recommendations: 'Frontend integration verification.',
    year: 2026,
    month: 7,
  })
  assert.equal(report.reference, 'MRH-LEG-PERFORMANCE-2026-07-V1')
  assert.equal(report.reference.endsWith('-PREVIEW'), false)
  assert.equal(report.observations, 'Frontend integration verification.')
  assert.equal(report.recommendations, 'Frontend integration verification.')
})

test('formal report history reads the existing backend contract without generating a new report', async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  const currentUser = {
    id: 'user-supervisor-1',
    fullName: 'Kwesi Boateng',
    role: 'SUPERVISOR',
    office: {
      id: 'office-cit',
      name: 'Correspondence Integration Test Office',
      code: 'CIT',
      status: 'Active',
    },
  }

  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init })

    if (String(url).endsWith('/reports/formal/history/')) {
      return createJsonResponse({
        results: [
          {
            id: 'report-history-001',
            report_reference: 'MRH-CIT-OVERDUE-2026-08-V1',
            report_type: 'OVERDUE',
            period_type: 'monthly',
            period_start: '2026-08-01',
            period_end: '2026-08-31',
            generated_at: '2026-08-22T08:45:00.000Z',
            generated_by: {
              name: 'Kwesi Boateng',
            },
          },
        ],
      })
    }

    throw new Error(`Unexpected URL: ${url}`)
  }

  const history = await listFormalReportsHistory({ currentUser })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.endsWith('/reports/formal/history/'), true)
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(history.length, 1)
  assert.equal(history[0].id, 'report-history-001')
  assert.equal(history[0].reference, 'MRH-CIT-OVERDUE-2026-08-V1')
  assert.equal(history[0].reportTitle, 'Overdue Documents Report')
  assert.equal(history[0].period.label, 'August 2026')
  assert.equal(history[0].office.code, 'CIT')
  assert.equal(history[0].office.name, 'Correspondence Integration Test Office')
  assert.equal(history[0].generatedBy, 'Kwesi Boateng')

  globalThis.fetch = originalFetch
})

test('formal report detail opens the frozen backend snapshot without calling generate', async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  const currentUser = {
    id: 'user-supervisor-1',
    fullName: 'Kwesi Boateng',
    role: 'SUPERVISOR',
    office: {
      id: 'office-legal',
      name: 'Legal Directorate',
      code: 'LEG',
      status: 'Active',
    },
  }

  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init })

    if (String(url).endsWith('/reports/formal/report-history-001/')) {
      return createJsonResponse({
        id: 'report-history-001',
        report_type: 'OFFICE_PERFORMANCE',
        report_reference: 'MRH-LEG-PERFORMANCE-2026-07-V1',
        office: {
          id: 'office-legal',
          name: 'Legal Directorate',
          code: 'LEG',
          status: 'Active',
        },
        period: {
          type: 'monthly',
          start_date: '2026-07-01',
          end_date: '2026-07-31',
          label: 'July 2026',
        },
        generated_at: '2026-08-22T08:45:00.000Z',
        prepared_by: {
          name: 'Kwesi Boateng',
          role: 'Office Supervisor',
        },
        summary: {
          total_records: 7,
          completed: 4,
          pending: 2,
          overdue: 1,
        },
        status_breakdown: {
          Registered: 2,
          Completed: 4,
          Overdue: 1,
        },
        observations: 'Frozen historical observation.',
        recommendations: 'Frozen historical recommendation.',
      })
    }

    throw new Error(`Unexpected URL: ${url}`)
  }

  const report = await getFormalReportById('report-history-001', { currentUser })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.endsWith('/reports/formal/report-history-001/'), true)
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(calls.some((call) => call.url.endsWith('/reports/formal/generate/')), false)
  assert.equal(report.id, 'report-history-001')
  assert.equal(report.reference, 'MRH-LEG-PERFORMANCE-2026-07-V1')
  assert.equal(report.office.code, 'LEG')
  assert.equal(report.observations, 'Frozen historical observation.')
  assert.equal(report.recommendations, 'Frozen historical recommendation.')

  globalThis.fetch = originalFetch
})

test('formal report normalization preserves backend overdue items and office-based responsibility without UUID leakage', () => {
  const normalizedOverdue = normalizeFormalReportResponse(
    {
      report_type: 'OVERDUE',
      report_reference: 'MRH-LEG-OVERDUE-2026-07-PREVIEW',
      office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
      period: {
        type: 'monthly',
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        label: 'July 2026',
      },
      generated_at: '2026-08-13T09:45:00.000Z',
      overdue_summary: {
        total_overdue: 2,
        bands: { '1-7 Days Overdue': 1, '8-14 Days Overdue': 1 },
      },
      oldest_overdue_item: { reference_number: 'CIT-2026-0001' },
      items: [
        {
          id: '10272b78-9ec7-4853-be7a-ac313a584165',
          reference_number: 'CIT-2026-0001',
          subject: 'Frontend Integration Registration Test',
          date_received: '2026-07-12',
          due_date: '2026-07-19',
          current_stage: 'Director review',
          current_status: 'Completed',
          days_pending: 7,
          days_overdue: 2,
          last_action_date: '2026-07-21 08:30',
          last_action_by: 'Kwesi Boateng',
        },
      ],
    },
    {
      configuration: {
        reportType: 'overdue-documents',
        periodType: 'monthly',
        year: '2026',
        month: '07',
      },
      currentUser: {
        id: 'user-supervisor-1',
        fullName: 'Kwesi Boateng',
        role: 'SUPERVISOR',
        office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
      },
    },
  )

  const overdueTable = normalizedOverdue.sections.find((section) => section.id === 'overdue-table')
  assert.equal(normalizedOverdue.reference, 'MRH-LEG-OVERDUE-2026-07-PREVIEW')
  assert.equal(overdueTable.rows[0][0], 'CIT-2026-0001')
  assert.equal(overdueTable.rows[0].includes('10272b78-9ec7-4853-be7a-ac313a584165'), false)
  assert.equal(overdueTable.rows[0][5], 'Completed')
  assert.equal(overdueTable.rows[0][6], '1 week')
  assert.equal(overdueTable.rows[0][7], '2 days')

  const normalizedPending = normalizeFormalReportResponse(
    {
      report_type: 'PENDING_AGEING',
      report_reference: 'MRH-LEG-PENDING-2026-07-PREVIEW',
      office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
      period: {
        type: 'monthly',
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        label: 'July 2026',
      },
      generated_at: '2026-08-13T09:50:00.000Z',
      pending_ageing_summary: {
        bands: { 'Less Than 7 Days': 2 },
      },
      items: [
        {
          reference_number: 'CIT-2026-0001',
          subject: 'Frontend Integration Registration Test',
          date_received: '2026-07-12',
          current_stage: 'Director review',
          current_status: 'In Progress',
          priority: 'Normal',
          days_pending: 5,
          responsible_office: 'Legal Directorate',
          last_action_date: '2026-07-21 08:30',
        },
      ],
    },
    {
      configuration: {
        reportType: 'pending-ageing',
        periodType: 'monthly',
        year: '2026',
        month: '07',
      },
      currentUser: {
        id: 'user-supervisor-1',
        fullName: 'Kwesi Boateng',
        role: 'SUPERVISOR',
        office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
      },
    },
  )

  const pendingTable = normalizedPending.sections.find((section) => section.id === 'pending-table')
  assert.equal(pendingTable.rows[0][6], '5 days')
  assert.equal(pendingTable.rows[0][7], 'Legal Directorate')
})

test('office dashboard normalization preserves zero counts, null averages, and object-map breakdowns', () => {
  const normalized = normalizeOfficeDashboardResponse({
    office: 'Correspondence Integration Test Office',
    active_count: 0,
    overdue_count: 0,
    completed_count: 0,
    avg_time_in_office_hours: null,
    by_status: {
      'In Progress': 0,
      CustomStatus: 1,
    },
    by_type: {
      Letter: 0,
      Advisory: 1,
    },
    recent: [
      {
        id: '10272b78-9ec7-4853-be7a-ac313a584165',
        reference_number: 'CIT-2026-0001',
        subject: 'Frontend Integration Registration Test',
        sender: 'Integration Test Sender',
        type: 'Letter',
        priority: 'Normal',
        status: 'In Progress',
        direction: 'Incoming',
        received_at: '2026-08-12T12:00:00.000Z',
      },
      {
        id: '3e0ed9ee-32ce-47da-83cc-8d861bf470e6',
        reference_number: '',
        subject: 'Legacy malformed record',
        received_at: '2026-08-12T12:00:00.000Z',
      },
    ],
  })

  assert.equal(normalized.office.name, 'Correspondence Integration Test Office')
  assert.equal(normalized.activeCount, 0)
  assert.equal(normalized.overdueCount, 0)
  assert.equal(normalized.completedCount, 0)
  assert.equal(normalized.averageTimeInOfficeHours, null)
  assert.equal(normalized.averageTimeInOfficeLabel, 'Unavailable')
  assert.equal(normalized.statusBreakdown[1].label, 'CustomStatus')
  assert.equal(normalized.typeBreakdown[1].label, 'Advisory')
  assert.equal(normalized.recentRecords[0].referenceNumber, 'CIT-2026-0001')
  assert.equal(normalized.recentRecords[0].id, '10272b78-9ec7-4853-be7a-ac313a584165')
  assert.equal(normalized.recentRecords.length, 1)
  assert.equal(normalized.contractDiagnostics.statusBreakdownShape, 'object-map')
  assert.equal(normalized.contractDiagnostics.typeBreakdownShape, 'object-map')
  assert.equal(normalized.contractDiagnostics.skippedRecentRecordCount, 1)
})

test('office dashboard normalization treats negative average time values as unavailable without fabricating a replacement', () => {
  const normalized = normalizeOfficeDashboardResponse({
    office: 'Correspondence Integration Test Office',
    active_count: 5,
    overdue_count: 1,
    completed_count: 2,
    avg_time_in_office_hours: '-12397.059078',
    by_status: { 'In Progress': 3, Overdue: 1, Completed: 1 },
    by_type: { Letter: 4, Memo: 1 },
    recent: [],
  })

  assert.equal(normalized.averageTimeInOfficeHours, -12397.059078)
  assert.equal(normalized.averageTimeInOfficeLabel, 'Unavailable')
  assert.equal(normalized.contractDiagnostics.averageTimeField, 'avg_time_in_office_hours')
  assert.equal(normalized.contractDiagnostics.averageTimeUnit, 'hours')
})
