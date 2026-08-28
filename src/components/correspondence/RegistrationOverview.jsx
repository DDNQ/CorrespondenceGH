function getValueOrPlaceholder(value) {
  return value?.trim?.() ? value : 'Not selected'
}

function RegistrationOverview({ summary, registeringOffice, isApiMode = false }) {
  const hasDestination = Boolean(summary.destinationOffice?.trim?.())
  const routeDestination = getValueOrPlaceholder(summary.destinationOffice)

  return (
    <div className="register-overview">
      {isApiMode ? (
        <div className="register-overview__destination register-overview__destination--selected">
          <span>Initial Office</span>
          <strong>{getValueOrPlaceholder(registeringOffice)}</strong>
        </div>
      ) : (
        <div
          className={
            hasDestination
              ? 'register-overview__destination register-overview__destination--selected'
              : 'register-overview__destination'
          }
        >
          <span>Destination Office</span>
          <strong>{routeDestination}</strong>
        </div>
      )}

      <dl className="register-overview__details">
        <div>
          <dt>System Reference</dt>
          <dd>{summary.reference}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>{getValueOrPlaceholder(summary.subject)}</dd>
        </div>
        <div>
          <dt>Document Type</dt>
          <dd>{getValueOrPlaceholder(summary.documentType)}</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{getValueOrPlaceholder(summary.direction)}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{getValueOrPlaceholder(summary.priority)}</dd>
        </div>
        <div>
          <dt>Registering Office</dt>
          <dd>{registeringOffice}</dd>
        </div>
        <div>
          <dt>{isApiMode ? 'Initial Office' : 'Destination Office'}</dt>
          <dd>{isApiMode ? getValueOrPlaceholder(registeringOffice) : routeDestination}</dd>
        </div>
        <div>
          <dt>Initial Stage</dt>
          <dd>{getValueOrPlaceholder(summary.initialStage)}</dd>
        </div>
        <div>
          <dt>Stage Deadline</dt>
          <dd>{getValueOrPlaceholder(summary.stageDeadline)}</dd>
        </div>
        {isApiMode ? null : (
          <div>
            <dt>Initial Route</dt>
            <dd className="register-overview__route">
              <span>{registeringOffice}</span>
              <span aria-hidden="true">-&gt;</span>
              <span>{routeDestination}</span>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export default RegistrationOverview
