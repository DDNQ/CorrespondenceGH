const REFRESH_TOKEN_STORAGE_KEY = 'mrh.auth.refreshToken'

let accessToken = null

function normalizeToken(token) {
  if (typeof token !== 'string') {
    return null
  }

  const trimmedToken = token.trim()
  return trimmedToken ? trimmedToken : null
}

function getSessionStorageSafe() {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null
  } catch {
    return null
  }
}

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = normalizeToken(token)
  return accessToken
}

export function clearAccessToken() {
  accessToken = null
}

export function getRefreshToken() {
  const storage = getSessionStorageSafe()

  if (!storage) {
    return null
  }

  try {
    return normalizeToken(storage.getItem(REFRESH_TOKEN_STORAGE_KEY))
  } catch {
    return null
  }
}

export function setRefreshToken(token) {
  const normalizedToken = normalizeToken(token)
  const storage = getSessionStorageSafe()

  if (!storage) {
    return normalizedToken
  }

  try {
    if (normalizedToken) {
      storage.setItem(REFRESH_TOKEN_STORAGE_KEY, normalizedToken)
    } else {
      storage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    }
  } catch {
    return null
  }

  return normalizedToken
}

export function clearRefreshToken() {
  const storage = getSessionStorageSafe()

  if (!storage) {
    return
  }

  try {
    storage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function setTokens({ access, refresh }) {
  setAccessToken(access)
  setRefreshToken(refresh)
}

export function clearTokens() {
  clearAccessToken()
  clearRefreshToken()
}

export function hasRefreshToken() {
  return Boolean(getRefreshToken())
}

export function getRefreshTokenStorageKey() {
  return REFRESH_TOKEN_STORAGE_KEY
}
