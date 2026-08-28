import {
  DEFAULT_API_BASE_URL,
  DEFAULT_API_TIMEOUT_MS,
  normalizeApiBaseUrl,
  normalizeApiTimeoutMs,
} from '../../src/config/environment.js'

export class CorrespondenceContractInspectionConfigError extends Error {
  constructor(message, code = 'CORRESPONDENCE_CONTRACT_INSPECTION_INVALID') {
    super(message)
    this.name = 'CorrespondenceContractInspectionConfigError'
    this.code = code
  }
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateCorrespondenceInspectionEnvironment(env = process.env) {
  const enabled = trimString(env.MRH_RUN_CORRESPONDENCE_INSPECTION)

  if (enabled !== 'true') {
    throw new CorrespondenceContractInspectionConfigError(
      'Correspondence contract inspection is disabled. Set MRH_RUN_CORRESPONDENCE_INSPECTION=true to run it.',
      'CORRESPONDENCE_CONTRACT_INSPECTION_DISABLED',
    )
  }

  const baseUrl = normalizeApiBaseUrl(
    trimString(env.MRH_CORRESPONDENCE_INSPECTION_BASE_URL) || DEFAULT_API_BASE_URL,
  )
  const timeoutMs = normalizeApiTimeoutMs(
    trimString(env.MRH_CORRESPONDENCE_INSPECTION_TIMEOUT_MS) || DEFAULT_API_TIMEOUT_MS,
  )
  const correspondenceId = trimString(env.MRH_CORRESPONDENCE_INSPECTION_ID) || null

  let parsedUrl = null

  try {
    parsedUrl = new URL(baseUrl)
  } catch {
    throw new CorrespondenceContractInspectionConfigError(
      'MRH_CORRESPONDENCE_INSPECTION_BASE_URL must be a valid HTTPS URL.',
      'CORRESPONDENCE_CONTRACT_INSPECTION_BASE_URL_INVALID',
    )
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new CorrespondenceContractInspectionConfigError(
      'MRH_CORRESPONDENCE_INSPECTION_BASE_URL must use HTTPS.',
      'CORRESPONDENCE_CONTRACT_INSPECTION_BASE_URL_NOT_HTTPS',
    )
  }

  if (!/\/api\/$/i.test(parsedUrl.pathname)) {
    throw new CorrespondenceContractInspectionConfigError(
      'MRH_CORRESPONDENCE_INSPECTION_BASE_URL must end with /api/.',
      'CORRESPONDENCE_CONTRACT_INSPECTION_BASE_URL_NOT_API_ROOT',
    )
  }

  return {
    enabled: true,
    baseUrl,
    timeoutMs,
    correspondenceId,
  }
}

export function buildCorrespondenceInspectionPlan(config) {
  const endpoints = [
    { name: 'list', method: 'GET', path: 'correspondence/', enabled: true },
    {
      name: 'detail',
      method: 'GET',
      path: config.correspondenceId ? `correspondence/${config.correspondenceId}/` : null,
      enabled: Boolean(config.correspondenceId),
    },
    {
      name: 'movements',
      method: 'GET',
      path: config.correspondenceId ? `correspondence/${config.correspondenceId}/movements/` : null,
      enabled: Boolean(config.correspondenceId),
    },
    {
      name: 'attachments',
      method: 'GET',
      path: config.correspondenceId ? `correspondence/${config.correspondenceId}/attachments/` : null,
      enabled: Boolean(config.correspondenceId),
    },
    {
      name: 'notes',
      method: 'GET',
      path: config.correspondenceId ? `correspondence/${config.correspondenceId}/notes/` : null,
      enabled: Boolean(config.correspondenceId),
    },
  ]

  return {
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    endpoints,
  }
}

export function summarizeContractInspectionPlan(plan) {
  const lines = [
    'MRH correspondence contract inspection plan',
    `Base URL: ${plan.baseUrl}`,
    `Timeout: ${plan.timeoutMs} ms`,
    'Endpoints:',
  ]

  plan.endpoints.forEach((endpoint) => {
    lines.push(
      `- ${endpoint.name}: ${endpoint.enabled ? `${endpoint.method} ${endpoint.path}` : 'skipped until a correspondence ID is supplied'}`,
    )
  })

  lines.push('No request was sent by this utility in the current offline preparation task.')
  return lines.join('\n')
}
