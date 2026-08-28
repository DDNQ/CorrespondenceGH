const OFFICE_DISPLAY_FALLBACK = 'Office not available'

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function pickNonEmptyString(...values) {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value.trim()
    }
  }

  return null
}

function looksLikeOfficeIdentifier(value) {
  const normalizedValue = String(value ?? '').trim()

  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalizedValue,
    ) || /^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(normalizedValue)
  )
}

function buildCanonicalOffice(baseOffice = {}, overrides = {}) {
  return {
    ...baseOffice,
    ...overrides,
    id: overrides.id ?? baseOffice.id ?? null,
    name: overrides.name ?? baseOffice.name ?? '',
    code: overrides.code ?? baseOffice.code ?? null,
    status: overrides.status ?? baseOffice.status ?? null,
  }
}

function normalizeLookupCollection(officeLookup = []) {
  return Array.isArray(officeLookup)
    ? officeLookup
        .map((office) => normalizeOffice(office, []))
        .filter(Boolean)
    : []
}

export function getOfficeById(offices, officeId) {
  if (!isNonEmptyString(officeId)) {
    return null
  }

  const trimmedOfficeId = officeId.trim()

  return normalizeLookupCollection(offices).find((office) => office.id === trimmedOfficeId) ?? null
}

export function getOfficeByCode(offices, officeCode) {
  const normalizedOfficeCode = normalizeText(officeCode)

  if (!normalizedOfficeCode) {
    return null
  }

  return (
    normalizeLookupCollection(offices).find(
      (office) => normalizeText(office.code) === normalizedOfficeCode,
    ) ?? null
  )
}

export function getOfficeByName(offices, officeName) {
  const normalizedOfficeName = normalizeText(officeName)

  if (!normalizedOfficeName) {
    return null
  }

  return (
    normalizeLookupCollection(offices).find(
      (office) => normalizeText(office.name) === normalizedOfficeName,
    ) ?? null
  )
}

export function resolveOffice(offices, rawOffice) {
  if (rawOffice === null || rawOffice === undefined) {
    return null
  }

  if (typeof rawOffice === 'string') {
    return (
      getOfficeById(offices, rawOffice) ??
      getOfficeByCode(offices, rawOffice) ??
      getOfficeByName(offices, rawOffice) ??
      null
    )
  }

  if (typeof rawOffice !== 'object') {
    return null
  }

  const candidateId = rawOffice.id ?? rawOffice.office_id ?? rawOffice.officeId ?? null
  const candidateCode = rawOffice.code ?? rawOffice.office_code ?? rawOffice.officeCode ?? null
  const candidateName = rawOffice.name ?? rawOffice.office_name ?? rawOffice.officeName ?? null

  return (
    getOfficeById(offices, candidateId) ??
    getOfficeByCode(offices, candidateCode) ??
    getOfficeByName(offices, candidateName) ??
    null
  )
}

export function normalizeOffice(rawOffice, officeLookup = []) {
  if (rawOffice === null || rawOffice === undefined) {
    return null
  }

  const resolvedOffice = resolveOffice(officeLookup, rawOffice)

  if (typeof rawOffice === 'string') {
    if (resolvedOffice) {
      return buildCanonicalOffice(resolvedOffice)
    }

    const trimmedValue = rawOffice.trim()

    if (!trimmedValue) {
      return null
    }

    if (looksLikeOfficeIdentifier(trimmedValue)) {
      return {
        id: trimmedValue,
        name: '',
        code: null,
        status: null,
      }
    }

    return {
      id: null,
      name: trimmedValue,
      code: null,
      status: null,
    }
  }

  if (typeof rawOffice !== 'object') {
    return null
  }

  const officeId =
    pickNonEmptyString(
      rawOffice.id,
      rawOffice.office_id,
      rawOffice.officeId,
      resolvedOffice?.id,
    ) ?? null
  const officeName =
    pickNonEmptyString(
      rawOffice.name,
      rawOffice.office_name,
      rawOffice.officeName,
      resolvedOffice?.name,
    ) ?? ''
  const officeCode =
    pickNonEmptyString(
      rawOffice.code,
      rawOffice.office_code,
      rawOffice.officeCode,
      resolvedOffice?.code,
    ) ?? null
  const officeStatus =
    pickNonEmptyString(
      rawOffice.status,
      rawOffice.office_status,
      rawOffice.officeStatus,
      resolvedOffice?.status,
    ) ?? null

  return buildCanonicalOffice(resolvedOffice ?? rawOffice, {
    id: officeId,
    name: officeName,
    code: officeCode,
    status: officeStatus,
  })
}

export function getOfficeDisplayName(office) {
  const normalizedOffice = normalizeOffice(office)

  if (normalizedOffice?.name) {
    return normalizedOffice.name
  }

  return OFFICE_DISPLAY_FALLBACK
}

export function getOfficeCode(office) {
  const normalizedOffice = normalizeOffice(office)

  return normalizedOffice?.code ?? null
}

export function getOfficeDisplayLabel(office) {
  const normalizedOffice = normalizeOffice(office)

  if (!normalizedOffice) {
    return OFFICE_DISPLAY_FALLBACK
  }

  if (normalizedOffice.name && normalizedOffice.code) {
    return `${normalizedOffice.name} (${normalizedOffice.code})`
  }

  if (normalizedOffice.name) {
    return normalizedOffice.name
  }

  return OFFICE_DISPLAY_FALLBACK
}

export function getSelectableForwardingOffices(offices, currentOffice) {
  const normalizedCurrentOffice = normalizeOffice(currentOffice)

  return normalizeLookupCollection(offices).filter((office) => {
    return !isSameOffice(office, normalizedCurrentOffice)
  })
}

export function isSameOffice(officeA, officeB) {
  const normalizedOfficeA = normalizeOffice(officeA)
  const normalizedOfficeB = normalizeOffice(officeB)

  if (!normalizedOfficeA || !normalizedOfficeB) {
    return false
  }

  if (normalizedOfficeA.id && normalizedOfficeB.id) {
    return normalizedOfficeA.id === normalizedOfficeB.id
  }

  if (normalizedOfficeA.name && normalizedOfficeB.name) {
    return normalizeText(normalizedOfficeA.name) === normalizeText(normalizedOfficeB.name)
  }

  return false
}
