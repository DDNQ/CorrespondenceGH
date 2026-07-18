function parseDateTime(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(String(value).replace(',', ''))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function calculateProcessingRate(completed, received) {
  if (!received) {
    return 0
  }

  return (completed / received) * 100
}

export function calculateWorkEngagementRate(workedOn, received) {
  if (!received) {
    return 0
  }

  return (workedOn / received) * 100
}

export function calculateOverdueRate(overdue, requiringAction) {
  if (!requiringAction) {
    return 0
  }

  return (overdue / requiringAction) * 100
}

export function calculateAcknowledgementRate(acknowledged, received) {
  if (!received) {
    return 0
  }

  return (acknowledged / received) * 100
}

export function calculateAverageAcknowledgementTime(records) {
  const durations = records
    .map((record) => {
      const arrivedAt = parseDateTime(record.arrivedAtCurrentOffice)
      const receivedAt = parseDateTime(record.receivedAt)

      if (!arrivedAt || !receivedAt) {
        return null
      }

      return Math.max(0, Math.round((receivedAt.getTime() - arrivedAt.getTime()) / 60000))
    })
    .filter((duration) => duration !== null)

  if (!durations.length) {
    return 0
  }

  return durations.reduce((total, current) => total + current, 0) / durations.length
}

export function calculateAverageTurnaroundTime(records) {
  const values = records
    .map((record) => {
      const value = Number(record.turnaroundDays)
      return Number.isFinite(value) ? value : null
    })
    .filter((value) => value !== null)

  if (!values.length) {
    return 0
  }

  return values.reduce((total, current) => total + current, 0) / values.length
}

export function calculateAgeingBand(arrivedAtCurrentOffice) {
  const arrivedAt = parseDateTime(arrivedAtCurrentOffice)

  if (!arrivedAt) {
    return 'Less than 1 day'
  }

  const now = new Date('2026-07-18T12:00:00')
  const differenceInDays = Math.max(
    0,
    Math.floor((now.getTime() - arrivedAt.getTime()) / 86400000),
  )

  if (differenceInDays < 1) {
    return 'Less than 1 day'
  }

  if (differenceInDays <= 3) {
    return '1-3 days'
  }

  if (differenceInDays <= 7) {
    return '4-7 days'
  }

  if (differenceInDays <= 14) {
    return '8-14 days'
  }

  return 'More than 14 days'
}
