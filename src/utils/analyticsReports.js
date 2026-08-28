import { getOfficeDisplayName, normalizeOffice } from './offices.js'
import { formatDuration } from './duration.js'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMonthLabel(yearValue, monthValue) {
  const year = toNumericValue(yearValue)
  const month = toNumericValue(monthValue)

  if (year === null || month === null || month < 1 || month > 12) {
    return ''
  }

  return `${year}-${String(month).padStart(2, '0')}`
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getSafeObjectKeys(value) {
  return isPlainObject(value) ? Object.keys(value).sort() : []
}

function unwrapAnalyticsEnvelope(rawResponse) {
  if (Array.isArray(rawResponse)) {
    return rawResponse
  }

  if (!isPlainObject(rawResponse)) {
    return {}
  }

  if (isPlainObject(rawResponse.data)) {
    return rawResponse.data
  }

  return rawResponse
}

function hasOwnValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source ?? {}, key)
}

function pickDefinedValue(source, keys = []) {
  for (const key of keys) {
    if (!hasOwnValue(source, key)) {
      continue
    }

    const value = source[key]

    if (value === null || value === undefined) {
      continue
    }

    if (typeof value === 'string' && !value.trim()) {
      continue
    }

    return value
  }

  return null
}

function toNumericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toDisplayMetricValue(value) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    return value.trim() || null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  return null
}

export function formatAnalyticsAverageTurnaroundHours(value) {
  const numericValue = toNumericValue(value)

  if (numericValue === null || numericValue < 0) {
    return 'Unavailable'
  }

  return formatDuration(numericValue, { inputUnit: 'hours' }) ?? 'Unavailable'
}

export function formatAnalyticsMetricValue(metricKey, value) {
  if (metricKey === 'averageTurnaround') {
    return formatAnalyticsAverageTurnaroundHours(value)
  }

  if (value === null || value === undefined || value === '') {
    return 'Not available'
  }

  return value
}

function normalizeBreakdownEntries(input) {
  if (Array.isArray(input)) {
    return input
      .map((entry) => {
        if (Array.isArray(entry)) {
          return {
            label: normalizeText(entry[0]),
            count: toNumericValue(entry[1]),
          }
        }

        if (!isPlainObject(entry)) {
          return null
        }

        return {
          label: normalizeText(
            entry.label ??
              entry.name ??
              entry.status ??
              entry.type ??
              entry.period ??
              entry.month ??
              entry.band,
          ),
          count: toNumericValue(
            pickDefinedValue(entry, ['count', 'value', 'total', 'volume', 'items']),
          ),
        }
      })
      .filter((entry) => entry?.label)
  }

  if (isPlainObject(input)) {
    return Object.entries(input)
      .map(([label, value]) => ({
        label: normalizeText(label),
        count: toNumericValue(value),
      }))
      .filter((entry) => entry.label)
  }

  return []
}

function normalizeMetricList(summarySource, envelope) {
  const metricDefinitions = [
    {
      key: 'received',
      label: 'Correspondence Received',
      paths: ['received', 'total', 'total_received', 'total_records', 'totalRecords'],
    },
    {
      key: 'registered',
      label: 'Registered',
      paths: ['registered'],
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      paths: ['in_progress', 'inProgress'],
    },
    {
      key: 'awaitingAction',
      label: 'Awaiting Action',
      paths: ['awaiting_action', 'awaitingAction'],
    },
    {
      key: 'forwarded',
      label: 'Forwarded',
      paths: ['forwarded'],
    },
    {
      key: 'completed',
      label: 'Completed',
      paths: ['completed'],
    },
    {
      key: 'filed',
      label: 'Filed',
      paths: ['filed'],
    },
    {
      key: 'pending',
      label: 'Pending',
      paths: ['pending', 'total_open', 'totalOpen'],
    },
    {
      key: 'overdue',
      label: 'Overdue',
      paths: ['overdue', 'total_overdue', 'totalOverdue'],
    },
    {
      key: 'averageTurnaround',
      label: 'Average Turnaround Time',
      paths: [
        'average_turnaround',
        'avg_turnaround_hours',
        'average_turnaround_days',
        'average_turnaround_time',
        'averageTurnaround',
        'avgTurnaroundHours',
        'averageTurnaroundDays',
        'averageTurnaroundTime',
      ],
    },
  ]

  return metricDefinitions
    .map((definition) => {
      const value =
        toDisplayMetricValue(pickDefinedValue(summarySource, definition.paths)) ??
        toDisplayMetricValue(pickDefinedValue(envelope, definition.paths))

      if (value === null && definition.key !== 'averageTurnaround') {
        return null
      }

      return {
        key: definition.key,
        label: definition.label,
        value,
        displayValue: formatAnalyticsMetricValue(definition.key, value),
      }
    })
    .filter(Boolean)
}

function normalizeTrendBreakdown(entry) {
  const breakdownSource =
    entry.by_type ??
    entry.byType ??
    entry.breakdown ??
    entry.types ??
    entry.series ??
    entry.counts ??
    entry.values ??
    null

  return normalizeBreakdownEntries(breakdownSource).map((item) => ({
    type: item.label,
    count: item.count,
  }))
}

export function resolveAnalyticsOfficeContext(currentUser, workspace = null) {
  const office = normalizeOffice(currentUser?.office ?? workspace?.office ?? null)

  return {
    office,
    officeId: office?.id ?? null,
    officeName: getOfficeDisplayName(office),
  }
}

export function resolveAnalyticsSummaryDateRange(filters = {}) {
  const period = normalizeText(filters.period)
  const start = normalizeText(filters.startDate ?? filters.start)
  const end = normalizeText(filters.endDate ?? filters.end)
  const requiresExplicitRange = period === 'Custom Range' || Boolean(start || end)

  if (!requiresExplicitRange) {
    return {
      valid: true,
      usesCustomRange: false,
      start: '',
      end: '',
      error: '',
    }
  }

  if (!start || !end) {
    return {
      valid: false,
      usesCustomRange: true,
      start,
      end,
      error: 'Select both a start date and an end date.',
    }
  }

  if (start > end) {
    return {
      valid: false,
      usesCustomRange: true,
      start,
      end,
      error: 'The end date cannot be earlier than the start date.',
    }
  }

  return {
    valid: true,
    usesCustomRange: true,
    start,
    end,
    error: '',
  }
}

export function normalizeOfficeAnalyticsSummaryResponse(rawResponse) {
  const envelope = unwrapAnalyticsEnvelope(rawResponse)
  const summarySource = isPlainObject(envelope.summary) ? envelope.summary : envelope

  return {
    highlightMetrics: normalizeMetricList(summarySource, envelope),
    statusBreakdown: normalizeBreakdownEntries(
      envelope.status_breakdown ??
        envelope.statusBreakdown ??
        envelope.by_status ??
        summarySource.status_breakdown ??
        summarySource.statusBreakdown ??
        summarySource.by_status,
    ),
    typeBreakdown: normalizeBreakdownEntries(
      envelope.type_breakdown ??
        envelope.typeBreakdown ??
        envelope.by_type ??
        envelope.document_type_breakdown ??
        envelope.documentTypeBreakdown ??
        summarySource.type_breakdown ??
        summarySource.typeBreakdown ??
        summarySource.by_type ??
        summarySource.document_type_breakdown ??
        summarySource.documentTypeBreakdown,
    ),
    averageTurnaround:
      toDisplayMetricValue(
        pickDefinedValue(summarySource, [
          'average_turnaround',
          'avg_turnaround_hours',
          'average_turnaround_days',
          'average_turnaround_time',
          'averageTurnaround',
          'avgTurnaroundHours',
          'averageTurnaroundDays',
          'averageTurnaroundTime',
        ]),
      ) ??
      toDisplayMetricValue(
        pickDefinedValue(envelope, [
          'average_turnaround',
          'avg_turnaround_hours',
          'average_turnaround_days',
          'average_turnaround_time',
          'averageTurnaround',
          'avgTurnaroundHours',
          'averageTurnaroundDays',
          'averageTurnaroundTime',
        ]),
      ),
    safeTopLevelKeys: getSafeObjectKeys(envelope),
  }
}

export function normalizeOfficeStaffContributionResponse(rawResponse) {
  const envelope = unwrapAnalyticsEnvelope(rawResponse)
  const source =
    (Array.isArray(envelope) && envelope) ||
    envelope.results ||
    envelope.items ||
    envelope.staff_contribution ||
    envelope.staffContribution ||
    envelope.contributors ||
    []

  const contributors = Array.isArray(source)
    ? source.map((entry, index) => {
        const registered = toNumericValue(
          pickDefinedValue(entry, ['registered', 'correspondence_registered']),
        )
        const stageUpdates = toNumericValue(
          pickDefinedValue(entry, ['stage_updates', 'stageUpdates', 'stage_updated']),
        )
        const forwarded = toNumericValue(
          pickDefinedValue(entry, ['forwarded', 'forwarding_actions']),
        )
        const completed = toNumericValue(
          pickDefinedValue(entry, ['completed', 'completion_actions']),
        )
        const filed = toNumericValue(pickDefinedValue(entry, ['filed', 'filing_actions']))
        const notesAdded = toNumericValue(
          pickDefinedValue(entry, ['notes_added', 'notesAdded']),
        )
        const attachmentsUploaded = toNumericValue(
          pickDefinedValue(entry, [
            'attachments_uploaded',
            'attachmentsUploaded',
            'attachments_added',
            'attachmentsAdded',
          ]),
        )
        const knownActionCounts = [
          registered,
          stageUpdates,
          forwarded,
          completed,
          filed,
          notesAdded,
          attachmentsUploaded,
        ]
          .filter((value) => value !== null)
          .reduce((total, value) => total + value, 0)

        return {
          userId:
            normalizeText(
              entry.user_id ?? entry.userId ?? entry.id ?? entry.staff_id ?? entry.staffId,
            ) || `contributor-${index + 1}`,
          userName:
            normalizeText(
              entry.user_name ??
                entry.userName ??
                entry.display_name ??
                entry.displayName ??
                entry.name,
            ) || 'Not available',
          userEmail:
            normalizeText(entry.user_email ?? entry.userEmail ?? entry.email) || null,
          registered,
          stageUpdates,
          forwarded,
          completed,
          filed,
          notesAdded,
          attachmentsUploaded,
          totalActions:
            toNumericValue(pickDefinedValue(entry, ['total_actions', 'totalActions'])) ??
            knownActionCounts,
          lastActivity:
            normalizeText(entry.last_activity ?? entry.lastActivity ?? entry.last_action_date) ||
            null,
        }
      })
    : []

  return {
    contributors,
    safeTopLevelKeys: getSafeObjectKeys(envelope),
  }
}

export function normalizeOfficeBacklogResponse(rawResponse) {
  const envelope = unwrapAnalyticsEnvelope(rawResponse)
  const source = isPlainObject(envelope.backlog) ? envelope.backlog : envelope
  const bandsInput = source.bands ?? []
  const bands = Array.isArray(bandsInput)
    ? bandsInput
        .map((entry, index) => ({
          key: normalizeText(entry?.key) || `band-${index + 1}`,
          label: normalizeText(entry?.label) || `Band ${index + 1}`,
          minDays: toNumericValue(entry?.min_days ?? entry?.minDays),
          maxDays:
            entry?.max_days === null || entry?.maxDays === null
              ? null
              : toNumericValue(entry?.max_days ?? entry?.maxDays),
          count: toNumericValue(entry?.count) ?? 0,
        }))
        .filter((entry) => entry.label)
    : normalizeBreakdownEntries(bandsInput).map((entry, index) => ({
        key: `band-${index + 1}`,
        label: entry.label,
        minDays: null,
        maxDays: null,
        count: entry.count ?? 0,
      }))

  return {
    totalOpen:
      toNumericValue(pickDefinedValue(source, ['total_open', 'totalOpen'])) ??
      bands.reduce((total, band) => total + (band.count ?? 0), 0),
    bands,
    safeTopLevelKeys: getSafeObjectKeys(source),
  }
}

export function normalizeOfficeTrendsResponse(rawResponse) {
  const envelope = unwrapAnalyticsEnvelope(rawResponse)
  const source =
    (Array.isArray(envelope) && envelope) ||
    envelope.results ||
    envelope.items ||
    envelope.data ||
    envelope.trends ||
    envelope.months ||
    []
  const periods = []
  const groupedPeriods = new Map()

  if (Array.isArray(source)) {
    source.forEach((entry, index) => {
      if (!isPlainObject(entry)) {
        return
      }

      const flatPeriodLabel = normalizeText(
        entry.label ??
          entry.period_label ??
          entry.periodLabel ??
          entry.month_label ??
          entry.monthLabel ??
          entry.period ??
          entry.month,
      )
      const numericMonthPeriodLabel =
        flatPeriodLabel || normalizeMonthLabel(entry.year, entry.month)
      const flatType = normalizeText(
        entry.type ??
          entry.correspondence_type ??
          entry.correspondenceType ??
          entry.document_type ??
          entry.documentType,
      )
      const flatCount = toNumericValue(
        pickDefinedValue(entry, ['count', 'volume', 'total', 'value']),
      )

      if (numericMonthPeriodLabel && flatType && flatCount !== null) {
        const currentPeriod =
          groupedPeriods.get(numericMonthPeriodLabel) ?? { label: numericMonthPeriodLabel, values: [] }
        currentPeriod.values.push({ type: flatType, count: flatCount })
        groupedPeriods.set(numericMonthPeriodLabel, currentPeriod)
        return
      }

      const nestedValues = normalizeTrendBreakdown(entry)

      if (!numericMonthPeriodLabel || !nestedValues.length) {
        return
      }

      periods.push({
        label: numericMonthPeriodLabel,
        values: nestedValues,
        order: index,
      })
    })
  }

  const groupedEntries = [...groupedPeriods.values()].map((entry, index) => ({
    label: entry.label,
    values: entry.values,
    order: index,
  }))

  const normalizedPeriods = [...periods, ...groupedEntries]
    .filter((entry) => entry.values.length)
    .sort((left, right) => left.order - right.order)
    .map((entry) => ({
      label: entry.label,
      values: entry.values.map((value) => ({
        type: value.type,
        count: value.count,
      })),
    }))

  return {
    periods: normalizedPeriods,
    safeTopLevelKeys: getSafeObjectKeys(envelope),
  }
}
