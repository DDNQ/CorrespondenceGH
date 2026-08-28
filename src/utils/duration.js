const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY

function toFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getExplicitUnitMultiplier(unitText) {
  const normalizedUnit = String(unitText ?? '').trim().toLowerCase()

  if (!normalizedUnit) {
    return null
  }

  if (['week', 'weeks', 'wk', 'wks'].includes(normalizedUnit)) {
    return MINUTES_PER_WEEK
  }

  if (['day', 'days'].includes(normalizedUnit)) {
    return MINUTES_PER_DAY
  }

  if (['hour', 'hours', 'hr', 'hrs'].includes(normalizedUnit)) {
    return MINUTES_PER_HOUR
  }

  if (['minute', 'minutes', 'min', 'mins'].includes(normalizedUnit)) {
    return 1
  }

  return null
}

function getDefaultUnitMultiplier(inputUnit) {
  const normalizedUnit = String(inputUnit ?? 'minutes').trim().toLowerCase()

  if (normalizedUnit === 'milliseconds') {
    return 1 / 60000
  }

  return getExplicitUnitMultiplier(normalizedUnit) ?? 1
}

function parseDurationToMinutes(value, inputUnit) {
  if (typeof value === 'string' && value.trim()) {
    const normalizedValue = value.trim()
    const explicitUnitMatch = normalizedValue.match(
      /^(-?\d+(?:\.\d+)?)\s*(weeks?|wks?|days?|hours?|hrs?|minutes?|mins?)$/i,
    )

    if (explicitUnitMatch) {
      const numericValue = toFiniteNumber(explicitUnitMatch[1])
      const unitMultiplier = getExplicitUnitMultiplier(explicitUnitMatch[2])

      if (numericValue === null || unitMultiplier === null) {
        return null
      }

      return numericValue * unitMultiplier
    }
  }

  const numericValue = toFiniteNumber(value)

  if (numericValue === null) {
    return null
  }

  return numericValue * getDefaultUnitMultiplier(inputUnit)
}

function pluralize(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`
}

export function formatDuration(value, options = {}) {
  const {
    inputUnit = 'minutes',
    maxUnits = 4,
  } = options
  const totalMinutesValue = parseDurationToMinutes(value, inputUnit)

  if (totalMinutesValue === null || totalMinutesValue < 0) {
    return null
  }

  const boundedMaxUnits = Math.max(1, maxUnits)
  const totalMinutes = Math.floor(totalMinutesValue)

  if (totalMinutes === 0) {
    return '0 mins'
  }

  if (totalMinutes < MINUTES_PER_HOUR) {
    return pluralize(totalMinutes, 'min', 'mins')
  }

  if (totalMinutes < MINUTES_PER_DAY) {
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
    return pluralize(hours, 'hr', 'hrs')
  }

  let remainingMinutes = totalMinutes
  const weeks = Math.floor(remainingMinutes / MINUTES_PER_WEEK)
  remainingMinutes -= weeks * MINUTES_PER_WEEK

  const days = Math.floor(remainingMinutes / MINUTES_PER_DAY)
  remainingMinutes -= days * MINUTES_PER_DAY

  const hours = Math.floor(remainingMinutes / MINUTES_PER_HOUR)
  remainingMinutes -= hours * MINUTES_PER_HOUR

  const minutes = remainingMinutes
  const parts = []

  if (weeks > 0) {
    parts.push(pluralize(weeks, 'week', 'weeks'))
  }

  if (days > 0) {
    parts.push(pluralize(days, 'day', 'days'))
  }

  if (hours > 0) {
    parts.push(pluralize(hours, 'hr', 'hrs'))
  }

  if (weeks === 0 && days === 0 && minutes > 0) {
    parts.push(pluralize(minutes, 'min', 'mins'))
  }

  return parts.slice(0, boundedMaxUnits).join(' ')
}

export function formatOverdueDuration(value, options = {}) {
  const {
    inputUnit = 'minutes',
  } = options
  const totalMinutesValue = parseDurationToMinutes(value, inputUnit)

  if (totalMinutesValue === null) {
    return null
  }

  const durationLabel = formatDuration(Math.abs(totalMinutesValue), { inputUnit: 'minutes' })
  return durationLabel ? `${durationLabel} overdue` : null
}
