function StatusBadge({ status }) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-')

  return (
    <span className={`status-badge status-badge--${normalizedStatus}`}>
      <span className="status-badge__dot" aria-hidden="true"></span>
      <span>{status}</span>
    </span>
  )
}

export default StatusBadge
