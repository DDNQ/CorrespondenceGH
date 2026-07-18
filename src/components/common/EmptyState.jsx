function EmptyState({ title, description, compact = false }) {
  return (
    <div className={compact ? 'empty-state empty-state--compact' : 'empty-state'}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export default EmptyState
