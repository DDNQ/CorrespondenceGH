import test from 'node:test'
import assert from 'node:assert/strict'

import {
  API_CORRESPONDENCE_READ_ACTIONS,
  API_CORRESPONDENCE_READ_STATUSES,
  apiCorrespondenceReadStateReducer,
  createInitialApiCorrespondenceReadState,
  mapApiCorrespondenceReadErrorToAction,
} from '../src/context/apiCorrespondenceReadState.js'
import { getApiApplicationReadiness } from '../src/config/apiApplicationReadiness.js'
import {
  ApiContractMismatchError,
  UnsupportedApiQueryError,
} from '../src/services/api/errors.js'
import {
  buildCorrespondenceListQuery,
  getCorrespondenceListQuerySupport,
  normalizeAttachmentListReadResponse,
  normalizeCorrespondenceDetailReadResponse,
  normalizeCorrespondenceListReadResponse,
  normalizeCorrespondenceMovementsReadResponse,
  normalizeNoteListReadResponse,
} from '../src/services/api/validators/correspondenceReadValidators.js'
import {
  buildCorrespondenceInspectionPlan,
  CorrespondenceContractInspectionConfigError,
  summarizeContractInspectionPlan,
  validateCorrespondenceInspectionEnvironment,
} from '../scripts/lib/correspondenceContractInspection.mjs'
import { getCorrespondenceReadCapabilityRegistry } from '../src/services/api/correspondenceReadCapabilities.js'
import { syntheticCorrespondenceReadFixtures } from './fixtures/correspondence-read-fixtures.js'

test('readiness model exposes live correspondence reads and mutations while tracking known backend limits', () => {
  const readiness = getApiApplicationReadiness()

  assert.equal(readiness.correspondence.registrationLiveVerified, true)
  assert.equal(readiness.correspondence.listReadVerified, true)
  assert.equal(readiness.correspondence.detailReadVerified, true)
  assert.equal(readiness.correspondence.movementsReadVerified, true)
  assert.equal(readiness.correspondence.attachmentsReadVerified, true)
  assert.equal(readiness.correspondence.notesReadVerified, true)
  assert.equal(readiness.correspondence.stageUpdateLiveVerified, true)
  assert.equal(readiness.correspondence.notesMutationLiveVerified, true)
  assert.equal(readiness.correspondence.attachmentUploadLiveVerified, true)
  assert.equal(readiness.correspondence.attachmentRetrievalLiveVerified, true)
  assert.equal(readiness.correspondence.completionLiveVerified, true)
  assert.equal(readiness.correspondence.filingLiveVerified, true)
  assert.equal(readiness.correspondence.forwardingDestinationDirectoryAvailable, true)
  assert.equal(readiness.correspondence.historicalScopesVerified, true)
  assert.equal(readiness.correspondence.readsReady, true)
  assert.equal(readiness.correspondence.mutationsReady, true)
  assert.equal(readiness.authenticatedApplicationReady, true)
})

test('correspondence read validators normalize supported list envelopes and preserve identity separation', () => {
  const plain = normalizeCorrespondenceListReadResponse(
    syntheticCorrespondenceReadFixtures.plainArrayList,
  )
  const paginated = normalizeCorrespondenceListReadResponse(
    syntheticCorrespondenceReadFixtures.paginatedList,
  )

  assert.equal(plain.sourceEnvelope, 'array')
  assert.equal(plain.pagination.count, null)
  assert.equal(plain.records[0].id, 'corr-synthetic-001')
  assert.equal(plain.records[0].referenceNumber, 'SYN/CON/2026/0001')
  assert.notEqual(plain.records[0].id, plain.records[0].referenceNumber)

  assert.equal(paginated.sourceEnvelope, 'paginated')
  assert.equal(paginated.pagination.count, 2)
  assert.equal(paginated.records[0].currentOffice.id, 'office-finance')
  assert.equal(paginated.records[0].currentOffice.name, 'Finance Directorate')
  assert.equal(paginated.records[1].currentOffice, null)
  assert.deepEqual(
    paginated.records[1].contractDiagnostics.unknownEnumFields,
    ['direction', 'priority', 'type'],
  )
  assert.equal(paginated.records[1].type, 'Directive')
  assert.equal(paginated.records[1].priority, 'Critical')
  assert.equal(paginated.records[1].direction, 'External')
})

test('correspondence detail validator rejects missing machine identity and keeps office diagnostics safe', () => {
  const detail = normalizeCorrespondenceDetailReadResponse(
    syntheticCorrespondenceReadFixtures.detail,
  )

  assert.equal(detail.id, 'corr-synthetic-004')
  assert.equal(detail.referenceNumber, 'SYN/REP/2026/0004')
  assert.equal(detail.currentOffice.name, 'Legal Directorate')
  assert.equal(detail.documentDate, '2026-07-28')
  assert.equal(detail.instructions, 'Provide the review note.')
  assert.equal(detail.registeredBy?.id, 'user-synthetic-001')
  assert.equal(detail.contractDiagnostics.officeShapeCategory, 'identifier-string')

  assert.throws(
    () =>
      normalizeCorrespondenceDetailReadResponse(
        syntheticCorrespondenceReadFixtures.missingIdDetail,
      ),
    (error) =>
      error instanceof ApiContractMismatchError &&
      error.operation === 'correspondence.detail' &&
      error.missingExpectedKeys.includes('id'),
  )
})

test('movement, attachment, and note adapters normalize synthetic collections without sensitive diagnostics', () => {
  const movements = normalizeCorrespondenceMovementsReadResponse(
    syntheticCorrespondenceReadFixtures.movementList,
  )
  const attachments = normalizeAttachmentListReadResponse(
    syntheticCorrespondenceReadFixtures.attachmentList,
    {
      correspondenceId: 'corr-synthetic-004',
    },
  )
  const notes = normalizeNoteListReadResponse(syntheticCorrespondenceReadFixtures.noteList)

  assert.equal(movements[0].fromOffice, null)
  assert.equal(movements[0].toOffice.id, 'office-legal')
  assert.equal(movements[0].toOffice.name, 'Legal Directorate')
  assert.equal(movements[0].performedBy?.email, 'registry@synthetic.mrh.gov.gh')
  assert.equal(attachments[0].correspondenceId, 'corr-synthetic-004')
  assert.equal(attachments[0].source, 'remote')
  assert.equal(
    attachments[0].url,
    'https://mrh-backend.onrender.com/synthetic/files/brief.pdf',
  )
  assert.equal(attachments[0].previewUrl, 'https://mrh-backend.onrender.com/synthetic/files/brief.pdf')
  assert.equal(attachments[0].name, 'synthetic-brief.pdf')
  assert.equal(attachments[0].uploadedBy?.email, 'uploader@synthetic.mrh.gov.gh')
  assert.equal(notes[0].text, 'Synthetic workflow note.')
  assert.equal(notes[0].office.id, 'office-legal')
  assert.equal(notes[0].createdBy?.email, 'author@synthetic.mrh.gov.gh')
})

test('movement adapter supports live action_type and actor_email shapes', () => {
  const movements = normalizeCorrespondenceMovementsReadResponse([
    {
      id: 'move-live-001',
      correspondence_id: 'corr-live-001',
      action_type: 'stage_updated',
      actor_email: 'supervisor@legal.mrh.gov.gh',
      previous_stage: 'Initial legal review',
      new_stage: 'Director review',
      timestamp: '2026-08-22T10:15:00.000Z',
      from_office: 'office-legal',
      to_office: 'office-legal',
    },
  ])

  assert.equal(movements[0].action, 'stage_updated')
  assert.equal(movements[0].performedAt, '2026-08-22T10:15:00.000Z')
  assert.equal(movements[0].actorEmail, 'supervisor@legal.mrh.gov.gh')
  assert.equal(movements[0].performedBy?.fullName, 'supervisor@legal.mrh.gov.gh')
  assert.equal(movements[0].previousStage, 'Initial legal review')
  assert.equal(movements[0].newStage, 'Director review')
  assert.equal(movements[0].currentStage, 'Director review')
})

test('unsupported envelopes fail explicitly and diagnostic output stays key-only', () => {
  assert.throws(
    () =>
      normalizeCorrespondenceListReadResponse(
        syntheticCorrespondenceReadFixtures.malformedResponses.unsupportedEnvelope,
      ),
    (error) =>
      error instanceof ApiContractMismatchError &&
      error.receivedTopLevelType === 'object' &&
      error.safeTopLevelKeys.includes('data') &&
      !String(error.message).includes('Synthetic contract review record'),
  )

  assert.throws(
    () =>
      normalizeCorrespondenceMovementsReadResponse(
        syntheticCorrespondenceReadFixtures.malformedResponses.invalidCollection,
      ),
    (error) =>
      error instanceof ApiContractMismatchError &&
      error.operation === 'correspondence.movements' &&
      error.safeTopLevelKeys.includes('results'),
  )
})

test('query builder rejects all unconfirmed correspondence list filters', () => {
  assert.equal(buildCorrespondenceListQuery({}), '')
  assert.equal(buildCorrespondenceListQuery({ scope: 'current' }), 'scope=current')
  assert.equal(buildCorrespondenceListQuery({ scope: 'Forwarded' }), 'scope=forwarded')
  assert.deepEqual(getCorrespondenceListQuerySupport(), {
    confirmed: ['scope'],
    pending: [
      'search',
      'status',
      'type',
      'priority',
      'start',
      'end',
      'ordering',
      'page',
      'pageSize',
      'page_size',
      'current',
      'received',
      'forwarded',
      'handled',
    ],
  })

  assert.throws(
    () => buildCorrespondenceListQuery({ status: 'Received', page: 2 }),
    (error) =>
      error instanceof UnsupportedApiQueryError &&
      error.unsupportedParams.includes('status') &&
      error.unsupportedParams.includes('page'),
  )

  assert.throws(
    () => buildCorrespondenceListQuery({ scope: 'archived' }),
    (error) =>
      error instanceof UnsupportedApiQueryError &&
      error.unsupportedParams.includes('scope'),
  )
})

test('correspondence read capability registry keeps filters conservative while historical scopes are now live-verified', () => {
  const registry = getCorrespondenceReadCapabilityRegistry()

  assert.equal(registry.list.prepared, true)
  assert.equal(registry.list.verified, true)
  assert.deepEqual(registry.list.query.confirmed, ['scope'])
  assert.equal(registry.historicalScopesVerified, true)
  assert.equal(registry.readsReady, true)
  assert.equal(registry.mutationsReady, true)
})

test('read-state coordinator supports explicit loading, success, failure, and retry transitions', () => {
  const initialState = createInitialApiCorrespondenceReadState()
  const loadingList = apiCorrespondenceReadStateReducer(initialState, {
    type: API_CORRESPONDENCE_READ_ACTIONS.LOAD_LIST,
  })
  const listSuccess = apiCorrespondenceReadStateReducer(loadingList, {
    type: API_CORRESPONDENCE_READ_ACTIONS.LIST_SUCCESS,
    records: [{ id: 'corr-synthetic-001' }],
    pagination: { count: 1, next: null, previous: null, page: null, pageSize: null },
    sourceEnvelope: 'array',
  })
  const loadingDetail = apiCorrespondenceReadStateReducer(listSuccess, {
    type: API_CORRESPONDENCE_READ_ACTIONS.LOAD_DETAIL,
  })
  const denied = apiCorrespondenceReadStateReducer(loadingDetail, {
    type: mapApiCorrespondenceReadErrorToAction({ status: 403 }),
    error: { status: 403 },
  })
  const retried = apiCorrespondenceReadStateReducer(denied, {
    type: API_CORRESPONDENCE_READ_ACTIONS.RETRY,
  })

  assert.equal(loadingList.status, API_CORRESPONDENCE_READ_STATUSES.LOADING_LIST)
  assert.equal(listSuccess.status, API_CORRESPONDENCE_READ_STATUSES.LIST_SUCCESS)
  assert.equal(loadingDetail.status, API_CORRESPONDENCE_READ_STATUSES.LOADING_DETAIL)
  assert.equal(denied.status, API_CORRESPONDENCE_READ_STATUSES.ACCESS_DENIED)
  assert.equal(retried.status, API_CORRESPONDENCE_READ_STATUSES.INITIAL)
  assert.equal(retried.retryCount, 1)
})

test('correspondence inspection utility fails safely unless explicitly enabled and produces a request plan only', () => {
  assert.throws(
    () => validateCorrespondenceInspectionEnvironment({}),
    (error) =>
      error instanceof CorrespondenceContractInspectionConfigError &&
      error.code === 'CORRESPONDENCE_CONTRACT_INSPECTION_DISABLED',
  )

  const config = validateCorrespondenceInspectionEnvironment({
    MRH_RUN_CORRESPONDENCE_INSPECTION: 'true',
    MRH_CORRESPONDENCE_INSPECTION_BASE_URL: 'https://mrh-backend.onrender.com/api/',
  })
  const plan = buildCorrespondenceInspectionPlan(config)
  const summary = summarizeContractInspectionPlan(plan)

  assert.equal(plan.endpoints[0].enabled, true)
  assert.equal(plan.endpoints[1].enabled, false)
  assert.match(summary, /No request was sent/)
  assert.doesNotMatch(summary, /Synthetic|workflow note|brief\.pdf|Authorization|token/i)
})
