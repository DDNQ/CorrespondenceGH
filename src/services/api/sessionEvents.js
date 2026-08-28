let sessionExpiredHandler = null

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = typeof handler === 'function' ? handler : null
}

export function clearSessionExpiredHandler() {
  sessionExpiredHandler = null
}

export function notifySessionExpired(error) {
  if (typeof sessionExpiredHandler === 'function') {
    sessionExpiredHandler(error)
  }
}
