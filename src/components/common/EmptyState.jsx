function EmptyState({ title, description, action = null, compact = false }) {
  return (
    <div className={compact ? 'empty-state empty-state--compact' : 'empty-state'}>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  )
}

export default EmptyState
