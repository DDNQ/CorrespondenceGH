import EmptyState from '../common/EmptyState'

function RetryAction({ onRetry }) {
  if (typeof onRetry !== 'function') {
    return null
  }

  return (
    <button type="button" className="button button--secondary" onClick={onRetry}>
      Retry
    </button>
  )
}

export function CorrespondenceListLoading() {
  return (
    <EmptyState
      title="Loading correspondence"
      description="Loading correspondence..."
    />
  )
}

export function CorrespondenceListEmpty() {
  return (
    <EmptyState
      title="No correspondence found"
    />
  )
}

export function CorrespondenceLoadError({ onRetry }) {
  return (
    <EmptyState
      title="Unable to load correspondence"
      description="The correspondence records could not be loaded right now."
      action={<RetryAction onRetry={onRetry} />}
    />
  )
}

export function CorrespondenceAccessDenied() {
  return (
    <EmptyState
      title="Record access unavailable"
      description="This correspondence is no longer held by your office. Detailed record access is restricted while it is with another office."
    />
  )
}

export function CorrespondenceNotFound() {
  return (
    <EmptyState
      title="Correspondence could not be found."
      description="The requested correspondence record could not be located."
    />
  )
}

export function CorrespondenceContractMismatch({ onRetry }) {
  return (
    <EmptyState
      title="Correspondence unavailable"
      description="The correspondence data could not be displayed right now. Please try again later."
      action={<RetryAction onRetry={onRetry} />}
    />
  )
}
