import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/common/PageHeader'
import SectionCard from '../../components/common/SectionCard'
import CorrespondenceFilters from '../../components/correspondence/CorrespondenceFilters'
import CorrespondenceList from '../../components/correspondence/CorrespondenceList'
import { ROLES } from '../../constants/roles'
import { useAuth } from '../../context/useAuth'
import { useCorrespondence } from '../../context/useCorrespondence'
import {
  getLatestForwardingEventForOffice,
  normalizeCorrespondenceRecord,
  wasForwardedByOffice,
} from '../../utils/correspondencePermissions'
import {
  dateGroupOptions,
  documentTypeOptions,
  normalizeStatusParam,
  priorityOptions,
  statusParamMap,
} from '../../data/correspondence'

const statusTitleMap = {
  All: 'All Correspondence',
  Registered: 'Registered Correspondence',
  Received: 'Received Correspondence',
  'In Progress': 'In Progress Correspondence',
  'Awaiting Action': 'Awaiting Action Correspondence',
  Forwarded: 'Forwarded Correspondence',
  Completed: 'Completed Correspondence',
  Filed: 'Filed Correspondence',
  Overdue: 'Overdue Correspondence',
}

function CorrespondenceListPage() {
  const { currentUser } = useAuth()
  const { records } = useCorrespondence()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedStatus = searchParams.get('status')
  const selectedStatus = normalizeStatusParam(requestedStatus)
  const [completionBanner, setCompletionBanner] = useState(() => {
    const state = location.state

    if (!state?.correspondenceAction || !state?.correspondenceReference) {
      return null
    }

    return {
      action: state.correspondenceAction,
      reference: state.correspondenceReference,
      subject: state.correspondenceSubject ?? '',
      destinationOffice: state.destinationOffice ?? '',
    }
  })
  const [highlightedReference, setHighlightedReference] = useState(
    () => location.state?.correspondenceReference ?? '',
  )
  const [filters, setFilters] = useState({
    search: '',
    documentType: 'All document types',
    priority: 'All priorities',
    dateGroup: 'Any date',
  })

  const canRegister =
    currentUser?.role === ROLES.OFFICE_USER || currentUser?.role === ROLES.OFFICE_SUPERVISOR

  useEffect(() => {
    if (!requestedStatus || !statusParamMap[requestedStatus]) {
      setSearchParams({ status: 'all' }, { replace: true })
    }
  }, [requestedStatus, setSearchParams])

  useEffect(() => {
    if (!completionBanner || !location.state) {
      return
    }

    navigate('/correspondence?status=all', { replace: true, state: null })
  }, [completionBanner, location.state, navigate])

  const visibleRecords = useMemo(() => {
    const scopedRecords =
      currentUser?.role === ROLES.SYSTEM_ADMIN
        ? records
        : records.filter(
            (record) =>
              normalizeCorrespondenceRecord(record).currentOfficeName === currentUser?.officeName ||
              normalizeCorrespondenceRecord(record).registeringOfficeName === currentUser?.officeName ||
              wasForwardedByOffice(record, currentUser),
          )

    return scopedRecords.filter((record) => {
      const normalizedRecord = normalizeCorrespondenceRecord(record)
      const matchesStatus =
        selectedStatus === 'All' ||
        (selectedStatus === 'Received'
          ? normalizedRecord.status === 'Received' &&
            normalizedRecord.receiptStatus === 'Pending' &&
            (currentUser?.role === ROLES.SYSTEM_ADMIN ||
              normalizedRecord.currentOfficeName === currentUser?.officeName)
          : selectedStatus === 'Forwarded'
            ? currentUser?.role === ROLES.SYSTEM_ADMIN
              ? normalizedRecord.status === 'Forwarded'
              : wasForwardedByOffice(normalizedRecord, currentUser)
            : normalizedRecord.status === selectedStatus)
      const searchTerm = filters.search.trim().toLowerCase()
      const haystack = [
        normalizedRecord.reference,
        normalizedRecord.subject,
        normalizedRecord.sender,
        normalizedRecord.currentStage,
        normalizedRecord.currentOfficeName,
      ]
        .join(' ')
        .toLowerCase()
      const matchesSearch = !searchTerm || haystack.includes(searchTerm)
      const matchesType =
        filters.documentType === 'All document types' ||
        normalizedRecord.documentType === filters.documentType
      const matchesPriority =
        filters.priority === 'All priorities' || normalizedRecord.priority === filters.priority
      const matchesDateGroup =
        filters.dateGroup === 'Any date' ||
        (filters.dateGroup === 'Recently received' && normalizedRecord.dateGroup === 'recent') ||
        (filters.dateGroup === 'Older records' && normalizedRecord.dateGroup === 'older')

      return (
        matchesStatus &&
        matchesSearch &&
        matchesType &&
        matchesPriority &&
        matchesDateGroup
      )
    }).map((record) => {
      const normalizedRecord = normalizeCorrespondenceRecord(record)

      if (selectedStatus !== 'Forwarded' || currentUser?.role === ROLES.SYSTEM_ADMIN) {
        return normalizedRecord
      }

      const forwardingEvent = getLatestForwardingEventForOffice(normalizedRecord, currentUser)

      return {
        ...normalizedRecord,
        forwardingContext: forwardingEvent
          ? {
              text: `Forwarded to ${forwardingEvent.toOfficeName}`,
              timestamp: forwardingEvent.forwardedAt,
            }
          : null,
      }
    })
  }, [currentUser, filters, records, selectedStatus])

  useEffect(() => {
    if (!highlightedReference) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedReference('')
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [highlightedReference])

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      documentType: 'All document types',
      priority: 'All priorities',
      dateGroup: 'Any date',
    })
  }

  const resultLabel = `${visibleRecords.length} record${visibleRecords.length === 1 ? '' : 's'} shown`

  return (
    <section className="correspondence-page">
      <PageHeader
        title={statusTitleMap[selectedStatus]}
        description={
          currentUser?.role === ROLES.SYSTEM_ADMIN
            ? 'Review correspondence records available for system oversight.'
            : 'Search and track correspondence available to your office.'
        }
        actions={
          canRegister ? (
            <button
              type="button"
              className="button button--primary correspondence-page__action"
              onClick={() => navigate('/correspondence/new')}
            >
              Register New Correspondence
            </button>
          ) : null
        }
      />

      {completionBanner ? (
        <div className="correspondence-page__confirmation-banner" role="status">
          <div className="correspondence-page__confirmation-copy">
            <strong>
              {completionBanner.action === 'updated'
                ? 'Correspondence updated successfully'
                : 'Correspondence registered successfully'}
            </strong>
            <p>
              {completionBanner.action === 'updated'
                ? `${completionBanner.reference} has been updated.`
                : `${completionBanner.reference} has been registered and routed to ${completionBanner.destinationOffice || 'the selected office'}.`}
            </p>
          </div>
          <div className="correspondence-page__confirmation-actions">
            <Link
              to={`/correspondence/${encodeURIComponent(completionBanner.reference)}`}
              className="button button--secondary"
            >
              View Correspondence
            </Link>
            <button
              type="button"
              className="correspondence-page__confirmation-dismiss"
              aria-label="Dismiss confirmation"
              onClick={() => setCompletionBanner(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <CorrespondenceFilters
        filters={filters}
        documentTypeOptions={documentTypeOptions}
        priorityOptions={priorityOptions}
        dateGroupOptions={dateGroupOptions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <SectionCard
        title={statusTitleMap[selectedStatus]}
        description={
          selectedStatus === 'All'
            ? 'All correspondence records available under your current access.'
            : `Only records currently classified as ${selectedStatus}.`
        }
        action={<span className="muted-copy">{resultLabel}</span>}
      >
        {visibleRecords.length ? (
          <CorrespondenceList
            records={visibleRecords}
            highlightedReference={highlightedReference}
            onOpenRecord={(reference) =>
              navigate(`/correspondence/${encodeURIComponent(reference)}`)
            }
          />
        ) : (
          <EmptyState
            title="No correspondence found"
            description="Try changing the search, status or filter criteria."
          />
        )}
      </SectionCard>
    </section>
  )
}

export default CorrespondenceListPage
