const SUPPORTED_SCOPE_VALUES = Object.freeze(['current', 'received', 'forwarded', 'handled'])

const SIDEBAR_FILTERS = Object.freeze([
  {
    id: 'all',
    label: 'All',
    scope: 'current',
    statusParam: 'all',
    title: 'All Correspondence',
    localStatusLabel: null,
  },
  {
    id: 'registered',
    label: 'Registered',
    scope: 'current',
    statusParam: 'registered',
    title: 'Registered Correspondence',
    localStatusLabel: 'Registered',
  },
  {
    id: 'received',
    label: 'Received',
    scope: 'received',
    statusParam: 'received',
    title: 'Received Correspondence',
    localStatusLabel: null,
  },
  {
    id: 'in-progress',
    label: 'In Progress',
    scope: 'current',
    statusParam: 'in-progress',
    title: 'In Progress Correspondence',
    localStatusLabel: 'In Progress',
  },
  {
    id: 'awaiting-action',
    label: 'Awaiting Action',
    scope: 'current',
    statusParam: 'awaiting-action',
    title: 'Awaiting Action Correspondence',
    localStatusLabel: 'Awaiting Action',
  },
  {
    id: 'forwarded',
    label: 'Forwarded',
    scope: 'forwarded',
    statusParam: 'forwarded',
    title: 'Forwarded Correspondence',
    localStatusLabel: null,
  },
  {
    id: 'completed',
    label: 'Completed',
    scope: 'handled',
    statusParam: 'completed',
    title: 'Completed Correspondence',
    localStatusLabel: 'Completed',
  },
  {
    id: 'filed',
    label: 'Filed',
    scope: 'handled',
    statusParam: 'filed',
    title: 'Filed Correspondence',
    localStatusLabel: 'Filed',
  },
  {
    id: 'overdue',
    label: 'Overdue',
    scope: 'current',
    statusParam: 'overdue',
    title: 'Overdue Correspondence',
    localStatusLabel: 'Overdue',
  },
])

const FILTERS_BY_ID = Object.freeze(
  Object.fromEntries(SIDEBAR_FILTERS.map((filter) => [filter.id, filter])),
)

const CURRENT_SCOPE_FILTER_IDS = new Set(['all', 'registered', 'in-progress', 'awaiting-action', 'overdue'])
const HANDLED_SCOPE_FILTER_IDS = new Set(['completed', 'filed'])

function toSearchParams(input) {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input)
  }

  return new URLSearchParams(input ?? '')
}

function isSupportedScope(scope) {
  return SUPPORTED_SCOPE_VALUES.includes(scope)
}

function normalizeScope(scope) {
  return typeof scope === 'string' && isSupportedScope(scope.trim().toLowerCase())
    ? scope.trim().toLowerCase()
    : null
}

function normalizeFilterId(filterId) {
  return typeof filterId === 'string' && FILTERS_BY_ID[filterId.trim().toLowerCase()]
    ? filterId.trim().toLowerCase()
    : null
}

function getCanonicalFilterIdForScope(scope, currentFilterId) {
  if (scope === 'received') {
    return 'received'
  }

  if (scope === 'forwarded') {
    return 'forwarded'
  }

  if (scope === 'handled') {
    return HANDLED_SCOPE_FILTER_IDS.has(currentFilterId) ? currentFilterId : null
  }

  if (CURRENT_SCOPE_FILTER_IDS.has(currentFilterId)) {
    return currentFilterId
  }

  return 'all'
}

function buildCanonicalSearchParams(baseSearchParams, scope, filterId) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  nextSearchParams.set('scope', scope)

  if (filterId) {
    nextSearchParams.set('status', FILTERS_BY_ID[filterId].statusParam)
  } else {
    nextSearchParams.delete('status')
  }

  return nextSearchParams
}

export function getCorrespondenceSidebarFilters() {
  return SIDEBAR_FILTERS.map((filter) => ({ ...filter }))
}

export function getCorrespondenceSidebarFilter(filterId) {
  const normalizedFilterId = normalizeFilterId(filterId)
  return normalizedFilterId ? { ...FILTERS_BY_ID[normalizedFilterId] } : null
}

export function buildSearchParamsForSidebarFilter(filterId, searchParamsInput = '') {
  const filter = getCorrespondenceSidebarFilter(filterId)

  if (!filter) {
    return new URLSearchParams(searchParamsInput)
  }

  return buildCanonicalSearchParams(toSearchParams(searchParamsInput), filter.scope, filter.id)
}

export function buildSearchParamsForScope(scope, searchParamsInput = '') {
  const normalizedScope = normalizeScope(scope) ?? 'current'
  const searchParams = toSearchParams(searchParamsInput)
  const currentFilterId = normalizeFilterId(searchParams.get('status'))
  const nextFilterId = getCanonicalFilterIdForScope(normalizedScope, currentFilterId)

  return buildCanonicalSearchParams(searchParams, normalizedScope, nextFilterId)
}

export function resolveCorrespondenceListView(searchParamsInput = '') {
  const searchParams = toSearchParams(searchParamsInput)
  const requestedScope = normalizeScope(searchParams.get('scope')) ?? 'current'
  const requestedFilterId = normalizeFilterId(searchParams.get('status'))
  const activeFilterId = getCanonicalFilterIdForScope(requestedScope, requestedFilterId)
  const canonicalSearchParams = buildCanonicalSearchParams(
    searchParams,
    requestedScope,
    activeFilterId,
  )
  const activeFilter = activeFilterId ? FILTERS_BY_ID[activeFilterId] : null

  return {
    activeScope: requestedScope,
    activeFilterId,
    activeFilter,
    localStatusLabel: activeFilter?.localStatusLabel ?? null,
    pageTitle:
      activeFilter?.title ??
      (requestedScope === 'handled' ? 'Handled Correspondence' : 'All Correspondence'),
    sectionDescription: null,
    canonicalSearchParams,
  }
}
