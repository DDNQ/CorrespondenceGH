export function getOfficeDashboardRecentRecordRoute(record) {
  const recordId = typeof record?.id === 'string' ? record.id.trim() : ''

  if (!recordId) {
    return '/correspondence'
  }

  return `/correspondence/${encodeURIComponent(recordId)}`
}

export function formatOfficeDashboardDate(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Not available'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value.trim()
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
