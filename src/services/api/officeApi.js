import { apiRequest } from '../apiClient.js'
import { assertApiCapability, API_CAPABILITIES } from './capabilities.js'
import { normalizeOffice } from '../../utils/offices.js'
import { createApiContractMismatchError } from './errors.js'
import { createUnsupportedApiOperationError } from './unsupported.js'

let officeDirectoryCache = null
let officeDirectoryPromise = null

function normalizeOfficePayload(input = {}) {
  const name = String(input.name ?? '').trim()
  const code = String(input.code ?? '').trim()

  if (!name || !code) {
    throw new Error('Office name and code are required.')
  }

  return { name, code }
}

export async function createOffice(input, options = {}) {
  assertApiCapability(API_CAPABILITIES.OFFICE_CREATE)

  const response = await apiRequest('offices/', {
    method: 'POST',
    body: normalizeOfficePayload(input),
    authenticated: true,
    signal: options.signal,
  })

  const office = normalizeOffice(response?.office ?? response ?? null)

  if (office?.id) {
    const currentDirectory = Array.isArray(officeDirectoryCache) ? officeDirectoryCache : []
    officeDirectoryCache = [
      office,
      ...currentDirectory.filter((currentOffice) => currentOffice?.id !== office.id),
    ]
  }

  return office
}

function normalizeOfficeDirectoryResponse(response) {
  if (!Array.isArray(response)) {
    throw createApiContractMismatchError('The office directory response must be an array.', {
      operation: 'offices.list',
      receivedTopLevelType: Array.isArray(response) ? 'array' : typeof response,
      safeTopLevelKeys:
        response && typeof response === 'object' && !Array.isArray(response)
          ? Object.keys(response).sort()
          : [],
    })
  }

  return response.map((item) => {
    const office = normalizeOffice(item)
    const missingExpectedKeys = ['id', 'name', 'code', 'status'].filter((key) => {
      return typeof office?.[key] !== 'string' || !office[key].trim()
    })

    if (!office || missingExpectedKeys.length) {
      throw createApiContractMismatchError('Each office directory item must include id, name, code, and status.', {
        operation: 'offices.list',
        receivedTopLevelType: 'array',
        safeTopLevelKeys:
          item && typeof item === 'object' && !Array.isArray(item)
            ? Object.keys(item).sort()
            : [],
        missingExpectedKeys,
      })
    }

    if (office.status !== 'Active') {
      throw createApiContractMismatchError('The office directory returned a non-active office record.', {
        operation: 'offices.list',
        receivedTopLevelType: 'array',
        safeTopLevelKeys:
          item && typeof item === 'object' && !Array.isArray(item)
            ? Object.keys(item).sort()
            : [],
      })
    }

    return {
      ...office,
      id: office.id.trim(),
      name: office.name.trim(),
      code: office.code.trim(),
      status: office.status.trim(),
    }
  })
}

function cloneOfficeDirectory(directory = []) {
  return directory.map((office) => ({ ...office }))
}

async function loadOfficeDirectory(options = {}) {
  assertApiCapability(API_CAPABILITIES.OFFICE_LIST)

  const shouldForceReload = options.force === true

  if (!shouldForceReload && Array.isArray(officeDirectoryCache)) {
    return officeDirectoryCache
  }

  if (!shouldForceReload && officeDirectoryPromise) {
    return officeDirectoryPromise
  }

  officeDirectoryPromise = apiRequest('offices/', {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })
    .then((response) => {
      const normalizedDirectory = normalizeOfficeDirectoryResponse(response)
      officeDirectoryCache = normalizedDirectory
      return normalizedDirectory
    })
    .finally(() => {
      officeDirectoryPromise = null
    })

  return officeDirectoryPromise
}

export async function listOffices(options = {}) {
  const directory = await loadOfficeDirectory(options)
  return cloneOfficeDirectory(directory)
}

export async function resolveOfficeFromDirectory(rawOffice, options = {}) {
  const cachedOffice = normalizeOffice(rawOffice, officeDirectoryCache ?? [])

  if (!cachedOffice) {
    return cachedOffice
  }

  const hasCompleteDirectoryIdentity = Boolean(
    cachedOffice.id &&
      cachedOffice.name &&
      cachedOffice.code &&
      cachedOffice.status,
  )

  if (hasCompleteDirectoryIdentity) {
    return cachedOffice
  }

  try {
    const directory = Array.isArray(options.directory) && options.directory.length
      ? options.directory
      : await loadOfficeDirectory(options)

    return normalizeOffice(rawOffice, directory) ?? cachedOffice
  } catch {
    return cachedOffice
  }
}

export function clearOfficeDirectoryCacheForTests() {
  officeDirectoryCache = null
  officeDirectoryPromise = null
}

export async function getOfficeById() {
  throw createUnsupportedApiOperationError('offices.getById')
}

export const officeApiService = Object.freeze({
  listOffices,
  resolveOfficeFromDirectory,
  getOfficeById,
  createOffice,
})
