const ROUTE_CACHE_STORAGE_KEY = 'mrh-api-correspondence-route-cache'

function getSessionStorageSafe() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function readPersistedCache() {
  const storage = getSessionStorageSafe()

  if (!storage) {
    return {}
  }

  try {
    const rawValue = storage.getItem(ROUTE_CACHE_STORAGE_KEY)

    if (!rawValue) {
      return {}
    }

    const parsedValue = JSON.parse(rawValue)

    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? parsedValue
      : {}
  } catch {
    storage.removeItem(ROUTE_CACHE_STORAGE_KEY)
    return {}
  }
}

let routeCache = readPersistedCache()

function persistCache(nextCache) {
  routeCache = nextCache
  const storage = getSessionStorageSafe()

  if (!storage) {
    return
  }

  storage.setItem(ROUTE_CACHE_STORAGE_KEY, JSON.stringify(nextCache))
}

export function registerApiCorrespondenceRouteRecord(record) {
  const referenceNumber =
    typeof record?.referenceNumber === 'string' ? record.referenceNumber.trim() : ''
  const correspondenceId = typeof record?.id === 'string' ? record.id.trim() : ''

  if (!referenceNumber || !correspondenceId) {
    return
  }

  persistCache({
    ...routeCache,
    [referenceNumber]: correspondenceId,
  })
}

export function getApiCorrespondenceIdForReference(referenceNumber) {
  const normalizedReference =
    typeof referenceNumber === 'string' ? decodeURIComponent(referenceNumber).trim() : ''

  if (!normalizedReference) {
    return null
  }

  const cachedId = routeCache[normalizedReference]
  return typeof cachedId === 'string' && cachedId.trim() ? cachedId.trim() : null
}

export function clearApiCorrespondenceRouteCache() {
  routeCache = {}
  const storage = getSessionStorageSafe()

  if (!storage) {
    return
  }

  storage.removeItem(ROUTE_CACHE_STORAGE_KEY)
}
