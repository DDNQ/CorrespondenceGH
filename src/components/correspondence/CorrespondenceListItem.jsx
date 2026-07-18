import { useEffect, useRef } from 'react'

import StatusBadge from '../common/StatusBadge'

function CorrespondenceListItem({ record, isHighlighted = false, onOpen }) {
  const rowRef = useRef(null)

  useEffect(() => {
    if (!isHighlighted) {
      return
    }

    rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [isHighlighted])

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      ref={rowRef}
      className={`correspondence-row ${isHighlighted ? 'correspondence-row--highlighted' : ''}`.trim()}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="correspondence-row__primary">
        <p className="correspondence-row__reference">{record.reference}</p>
        <h3>{record.subject}</h3>
        <p className="correspondence-row__meta">
          {record.documentType}
          <span aria-hidden="true"> | </span>
          {record.sender}
        </p>
      </div>

      <div className="correspondence-row__stage">
        <p className="correspondence-row__label">Current Stage</p>
        <p>{record.currentStage}</p>
      </div>

      <div className="correspondence-row__office">
        <p className="correspondence-row__label">Current Office</p>
        <p>{record.currentOffice}</p>
        <p className="correspondence-row__support">
          {record.forwardingContext?.text || record.arrivedAtCurrentOffice}
        </p>
        {record.forwardingContext?.timestamp ? (
          <p className="correspondence-row__support">{record.forwardingContext.timestamp}</p>
        ) : null}
      </div>

      <div className="correspondence-row__status">
        <p className="correspondence-row__label">Status</p>
        <StatusBadge status={record.status} />
        <p className="correspondence-row__support">{record.priority}</p>
      </div>

      <div className={`correspondence-row__time correspondence-row__time--${record.deadlineState}`}>
        <p className="correspondence-row__label">Time Remaining</p>
        <p>{record.timeRemaining}</p>
      </div>
    </article>
  )
}

export default CorrespondenceListItem
