import { Link } from 'react-router-dom'

import StatusBadge from '../common/StatusBadge'

function CorrespondenceAttentionItem({ record }) {
  const attentionMeta =
    record.status === 'Received' && record.receiptStatus === 'Pending'
      ? `Received from ${record.forwardedFromOfficeName || record.sender}`
      : `${record.documentType} | ${record.sender}`
  const timeLabel =
    record.status === 'Received' && record.receiptStatus === 'Pending'
      ? 'Awaiting receipt acknowledgement'
      : 'Time remaining'
  const timeValue =
    record.status === 'Received' && record.receiptStatus === 'Pending'
      ? record.timeSpentInOffice
      : record.timeRemaining

  return (
    <Link
      to={`/correspondence/${encodeURIComponent(record.reference)}`}
      className="attention-item"
    >
      <div className="attention-item__primary">
        <p className="attention-item__reference">{record.reference}</p>
        <h3>{record.subject}</h3>
        <p className="attention-item__meta">{attentionMeta}</p>
      </div>

      <div className="attention-item__stage">
        <p className="attention-item__label">Current stage</p>
        <p>{record.currentStage}</p>
      </div>

      <div className="attention-item__status">
        <p className="attention-item__label">Status</p>
        <StatusBadge status={record.status} />
      </div>

      <div className={`attention-item__time-block attention-item__time-block--${record.deadlineState}`}>
        <p className="attention-item__label">{timeLabel}</p>
        <p className="attention-item__time">{timeValue}</p>
      </div>
    </Link>
  )
}

export default CorrespondenceAttentionItem
