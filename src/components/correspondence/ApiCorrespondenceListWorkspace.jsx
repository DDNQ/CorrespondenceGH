import { RotateCcw, Search } from 'lucide-react'
import { useEffect, useMemo, useReducer, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import FilterBar from '../common/FilterBar'
import PageHeader from '../common/PageHeader'
import SectionCard from '../common/SectionCard'
import StatusBadge from '../common/StatusBadge'
import {
  CorrespondenceAccessDenied,
  CorrespondenceContractMismatch,
  CorrespondenceLoadError,
  CorrespondenceListEmpty,
  CorrespondenceListLoading,
} from './CorrespondenceApiReadStates.jsx'
import {
  API_CORRESPONDENCE_READ_ACTIONS,
  API_CORRESPONDENCE_READ_STATUSES,
  apiCorrespondenceReadStateReducer,
  createInitialApiCorrespondenceReadState,
  mapApiCorrespondenceReadErrorToAction,
} from '../../context/apiCorrespondenceReadState.js'
import { getServiceBundle } from '../../services/serviceProvider.js'
import { registerApiCorrespondenceRouteRecord } from '../../utils/apiCorrespondenceRouteCache.js'
import {
  buildSearchParamsForScope,
  resolveCorrespondenceListView,
} from '../../utils/correspondenceListView.js'

const API_SCOPE_OPTIONS = Object.freeze([
  { id: 'current', label: 'Current' },
  { id: 'received', label: 'Received' },
  { id: 'forwarded', label: 'Forwarded' },
  { id: 'handled', label: 'Handled' },
])

const DEFAULT_FILTERS = Object.freeze({
  search: '',
  status: 'All statuses',
  priority: 'All priorities',
})

function formatApiListDate(record) {
  const sourceValue = record.updatedAt ?? record.registeredAt ?? record.createdAt ?? null

  if (!sourceValue) {
    return 'Not available'
  }

  const parsedDate = new Date(sourceValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getApiOfficeDisplayName(office) {
  if (office?.name) {
    return office.name
  }

  return 'Office details unavailable'
}

function getFieldDisplayValue(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return 'Not available'
}

function ApiCorrespondenceListRow({ record, onOpenRecord }) {
  return (
    <article
      className="correspondence-row correspondence-row--api"
      role="button"
      tabIndex={0}
      onClick={() => onOpenRecord(record)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenRecord(record)
        }
      }}
    >
      <div className="correspondence-row__primary">
        <p className="correspondence-row__reference">{record.referenceNumber}</p>
        <h3>{getFieldDisplayValue(record.subject)}</h3>
        <p className="correspondence-row__meta">
          {getFieldDisplayValue(record.type)}
          <span aria-hidden="true"> | </span>
          {getFieldDisplayValue(record.sender)}
        </p>
      </div>

      <div className="correspondence-row__stage">
        <p className="correspondence-row__label">Current Stage</p>
        <p>{getFieldDisplayValue(record.currentStage)}</p>
      </div>

      <div className="correspondence-row__office">
        <p className="correspondence-row__label">Current Office</p>
        <p>{getApiOfficeDisplayName(record.currentOffice)}</p>
      </div>

      <div className="correspondence-row__status">
        <p className="correspondence-row__label">Status</p>
        <StatusBadge status={getFieldDisplayValue(record.status)} />
        <p className="correspondence-row__support">{getFieldDisplayValue(record.priority)}</p>
      </div>

      <div className="correspondence-row__time">
        <p className="correspondence-row__label">Date</p>
        <p>{formatApiListDate(record)}</p>
      </div>
    </article>
  )
}

function ApiCorrespondenceListWorkspace() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const correspondenceService = useMemo(() => getServiceBundle().correspondence, [])
  const [state, dispatch] = useReducer(
    apiCorrespondenceReadStateReducer,
    undefined,
    createInitialApiCorrespondenceReadState,
  )
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const correspondenceView = useMemo(
    () => resolveCorrespondenceListView(searchParams),
    [searchParams],
  )
  const activeScope = correspondenceView.activeScope

  useEffect(() => {
    const canonicalSearch = correspondenceView.canonicalSearchParams.toString()

    if (searchParams.toString() === canonicalSearch) {
      return
    }

    setSearchParams(correspondenceView.canonicalSearchParams, { replace: true })
  }, [correspondenceView.canonicalSearchParams, searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false

    async function loadCorrespondence() {
      dispatch({ type: API_CORRESPONDENCE_READ_ACTIONS.LOAD_LIST })

      try {
        const response = await correspondenceService.listCorrespondence({
          scope: activeScope,
        })

        if (cancelled) {
          return
        }

        response.records.forEach((record) => registerApiCorrespondenceRouteRecord(record))
        dispatch({
          type: API_CORRESPONDENCE_READ_ACTIONS.LIST_SUCCESS,
          records: response.records,
          pagination: response.pagination,
          sourceEnvelope: response.sourceEnvelope,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        dispatch({
          type: mapApiCorrespondenceReadErrorToAction(error),
          error,
        })
      }
    }

    void loadCorrespondence()

    return () => {
      cancelled = true
    }
  }, [activeScope, correspondenceService, state.retryCount])

  const statusOptions = useMemo(() => {
    const statuses = new Set(
      state.records
        .map((record) => record.status)
        .filter((status) => typeof status === 'string' && status.trim()),
    )

    return ['All statuses', ...Array.from(statuses).sort()]
  }, [state.records])

  const priorityOptions = useMemo(() => {
    const priorities = new Set(
      state.records
        .map((record) => record.priority)
        .filter((priority) => typeof priority === 'string' && priority.trim()),
    )

    return ['All priorities', ...Array.from(priorities).sort()]
  }, [state.records])

  const visibleRecords = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()

    return state.records.filter((record) => {
      const matchesSidebarFilter =
        correspondenceView.localStatusLabel === null ||
        record.status === correspondenceView.localStatusLabel ||
        (correspondenceView.activeFilterId === 'overdue' && record.isOverdue)
      const haystack = [
        record.referenceNumber,
        record.subject,
        record.status,
        record.currentStage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !searchTerm || haystack.includes(searchTerm)
      const matchesStatus =
        filters.status === 'All statuses' || record.status === filters.status
      const matchesPriority =
        filters.priority === 'All priorities' || record.priority === filters.priority

      return matchesSidebarFilter && matchesSearch && matchesStatus && matchesPriority
    })
  }, [
    correspondenceView.activeFilterId,
    correspondenceView.localStatusLabel,
    filters.priority,
    filters.search,
    filters.status,
    state.records,
  ])

  const handleOpenRecord = (record) => {
    registerApiCorrespondenceRouteRecord(record)
    navigate(`/correspondence/${encodeURIComponent(record.id)}`, {
      state: {
        correspondenceId: record.id,
        correspondenceReference: record.referenceNumber,
      },
    })
  }

  const handleRetry = () => {
    dispatch({ type: API_CORRESPONDENCE_READ_ACTIONS.RETRY })
  }

  const resultLabel = `${visibleRecords.length} record${visibleRecords.length === 1 ? '' : 's'} shown`

  return (
    <section className="correspondence-page correspondence-page--api">
      <PageHeader
        title={correspondenceView.pageTitle}
      />

      <div className="correspondence-api-scope-tabs" role="tablist" aria-label="Correspondence scopes">
        {API_SCOPE_OPTIONS.map((scope) => (
          <button
            key={scope.id}
            type="button"
            role="tab"
            aria-selected={activeScope === scope.id}
            className={
              activeScope === scope.id
                ? 'tab-button tab-button--active correspondence-api-scope-tab'
                : 'tab-button correspondence-api-scope-tab'
            }
            onClick={() => {
              setSearchParams(buildSearchParamsForScope(scope.id, searchParams), { replace: true })
            }}
          >
            {scope.label}
          </button>
        ))}
      </div>

      <FilterBar className="correspondence-filters correspondence-filters--api">
        <label
          className="correspondence-search-field correspondence-filters__search"
          htmlFor="api-correspondence-search"
        >
          <Search size={18} />
          <input
            id="api-correspondence-search"
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search by reference, subject or status..."
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
        >
          {priorityOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <button type="button" className="button button--secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
          <RotateCcw size={16} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </FilterBar>

      <SectionCard
        title="Correspondence Records"
        action={<span className="muted-copy">{resultLabel}</span>}
      >
        {state.status === API_CORRESPONDENCE_READ_STATUSES.LOADING_LIST ? (
          <CorrespondenceListLoading />
        ) : state.status === API_CORRESPONDENCE_READ_STATUSES.ACCESS_DENIED ? (
          <CorrespondenceAccessDenied />
        ) : state.status === API_CORRESPONDENCE_READ_STATUSES.CONTRACT_MISMATCH ? (
          <CorrespondenceContractMismatch onRetry={handleRetry} />
        ) : [
            API_CORRESPONDENCE_READ_STATUSES.NETWORK_ERROR,
            API_CORRESPONDENCE_READ_STATUSES.TIMEOUT,
            API_CORRESPONDENCE_READ_STATUSES.SERVER_ERROR,
            API_CORRESPONDENCE_READ_STATUSES.SESSION_EXPIRED,
          ].includes(state.status) ? (
          <CorrespondenceLoadError onRetry={handleRetry} />
        ) : visibleRecords.length ? (
          <div className="correspondence-list" role="list">
            {visibleRecords.map((record) => (
              <ApiCorrespondenceListRow
                key={record.id}
                record={record}
                onOpenRecord={handleOpenRecord}
              />
            ))}
          </div>
        ) : (
          <CorrespondenceListEmpty />
        )}
      </SectionCard>
    </section>
  )
}

export default ApiCorrespondenceListWorkspace
