export const API_CORRESPONDENCE_READ_STATUSES = Object.freeze({
  INITIAL: 'initial',
  LOADING_LIST: 'loading-list',
  LIST_SUCCESS: 'list-success',
  LIST_EMPTY: 'list-empty',
  LOADING_DETAIL: 'loading-detail',
  DETAIL_SUCCESS: 'detail-success',
  LOADING_MOVEMENTS: 'loading-movements',
  LOADING_ATTACHMENTS: 'loading-attachments',
  LOADING_NOTES: 'loading-notes',
  SESSION_EXPIRED: 'session-expired',
  ACCESS_DENIED: 'access-denied',
  NOT_FOUND: 'not-found',
  NETWORK_ERROR: 'network-error',
  TIMEOUT: 'timeout',
  SERVER_ERROR: 'server-error',
  CONTRACT_MISMATCH: 'contract-mismatch',
})

export const API_CORRESPONDENCE_READ_ACTIONS = Object.freeze({
  RESET: 'reset',
  LOAD_LIST: 'load-list',
  LIST_SUCCESS: 'list-success',
  LOAD_DETAIL: 'load-detail',
  DETAIL_SUCCESS: 'detail-success',
  LOAD_MOVEMENTS: 'load-movements',
  MOVEMENTS_SUCCESS: 'movements-success',
  LOAD_ATTACHMENTS: 'load-attachments',
  ATTACHMENTS_SUCCESS: 'attachments-success',
  LOAD_NOTES: 'load-notes',
  NOTES_SUCCESS: 'notes-success',
  FAIL_SESSION_EXPIRED: 'fail-session-expired',
  FAIL_ACCESS_DENIED: 'fail-access-denied',
  FAIL_NOT_FOUND: 'fail-not-found',
  FAIL_NETWORK: 'fail-network',
  FAIL_TIMEOUT: 'fail-timeout',
  FAIL_SERVER: 'fail-server',
  FAIL_CONTRACT: 'fail-contract',
  RETRY: 'retry',
})

export function createInitialApiCorrespondenceReadState() {
  return {
    status: API_CORRESPONDENCE_READ_STATUSES.INITIAL,
    records: [],
    detail: null,
    movements: [],
    attachments: [],
    notes: [],
    pagination: {
      count: null,
      next: null,
      previous: null,
      page: null,
      pageSize: null,
    },
    sourceEnvelope: null,
    error: null,
    lastRequestedOperation: null,
    retryCount: 0,
  }
}

function withBaseState(state, updates) {
  return {
    ...state,
    ...updates,
  }
}

export function apiCorrespondenceReadStateReducer(state, action) {
  switch (action?.type) {
    case API_CORRESPONDENCE_READ_ACTIONS.RESET:
      return createInitialApiCorrespondenceReadState()
    case API_CORRESPONDENCE_READ_ACTIONS.LOAD_LIST:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.LOADING_LIST,
        error: null,
        lastRequestedOperation: 'list',
      })
    case API_CORRESPONDENCE_READ_ACTIONS.LIST_SUCCESS: {
      const records = Array.isArray(action.records) ? action.records : []
      return withBaseState(state, {
        status: records.length
          ? API_CORRESPONDENCE_READ_STATUSES.LIST_SUCCESS
          : API_CORRESPONDENCE_READ_STATUSES.LIST_EMPTY,
        records,
        pagination: action.pagination ?? state.pagination,
        sourceEnvelope: action.sourceEnvelope ?? null,
        error: null,
      })
    }
    case API_CORRESPONDENCE_READ_ACTIONS.LOAD_DETAIL:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.LOADING_DETAIL,
        error: null,
        lastRequestedOperation: 'detail',
      })
    case API_CORRESPONDENCE_READ_ACTIONS.DETAIL_SUCCESS:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.DETAIL_SUCCESS,
        detail: action.detail ?? null,
        error: null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.LOAD_MOVEMENTS:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.LOADING_MOVEMENTS,
        error: null,
        lastRequestedOperation: 'movements',
      })
    case API_CORRESPONDENCE_READ_ACTIONS.MOVEMENTS_SUCCESS:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.DETAIL_SUCCESS,
        movements: Array.isArray(action.movements) ? action.movements : [],
        error: null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.LOAD_ATTACHMENTS:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.LOADING_ATTACHMENTS,
        error: null,
        lastRequestedOperation: 'attachments',
      })
    case API_CORRESPONDENCE_READ_ACTIONS.ATTACHMENTS_SUCCESS:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.DETAIL_SUCCESS,
        attachments: Array.isArray(action.attachments) ? action.attachments : [],
        error: null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.LOAD_NOTES:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.LOADING_NOTES,
        error: null,
        lastRequestedOperation: 'notes',
      })
    case API_CORRESPONDENCE_READ_ACTIONS.NOTES_SUCCESS:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.DETAIL_SUCCESS,
        notes: Array.isArray(action.notes) ? action.notes : [],
        error: null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.FAIL_SESSION_EXPIRED:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.SESSION_EXPIRED,
        error: action.error ?? null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.FAIL_ACCESS_DENIED:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.ACCESS_DENIED,
        error: action.error ?? null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.FAIL_NOT_FOUND:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.NOT_FOUND,
        error: action.error ?? null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.FAIL_NETWORK:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.NETWORK_ERROR,
        error: action.error ?? null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.FAIL_TIMEOUT:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.TIMEOUT,
        error: action.error ?? null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.FAIL_SERVER:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.SERVER_ERROR,
        error: action.error ?? null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.FAIL_CONTRACT:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.CONTRACT_MISMATCH,
        error: action.error ?? null,
      })
    case API_CORRESPONDENCE_READ_ACTIONS.RETRY:
      return withBaseState(state, {
        status: API_CORRESPONDENCE_READ_STATUSES.INITIAL,
        error: null,
        retryCount: state.retryCount + 1,
      })
    default:
      return state
  }
}

export function mapApiCorrespondenceReadErrorToAction(error) {
  const status = Number.isFinite(error?.status) ? error.status : null
  const code = typeof error?.code === 'string' ? error.code : ''

  if (status === 401) {
    return API_CORRESPONDENCE_READ_ACTIONS.FAIL_SESSION_EXPIRED
  }

  if (status === 403) {
    return API_CORRESPONDENCE_READ_ACTIONS.FAIL_ACCESS_DENIED
  }

  if (status === 404) {
    return API_CORRESPONDENCE_READ_ACTIONS.FAIL_NOT_FOUND
  }

  if (code === 'REQUEST_TIMEOUT' || error?.isTimeout) {
    return API_CORRESPONDENCE_READ_ACTIONS.FAIL_TIMEOUT
  }

  if (code === 'API_CONTRACT_MISMATCH') {
    return API_CORRESPONDENCE_READ_ACTIONS.FAIL_CONTRACT
  }

  if (status && status >= 500) {
    return API_CORRESPONDENCE_READ_ACTIONS.FAIL_SERVER
  }

  return API_CORRESPONDENCE_READ_ACTIONS.FAIL_NETWORK
}
