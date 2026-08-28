function StatCard({ title, value, description, tone = 'default', className = '', valueClassName = '' }) {
  return (
    <article className={`stat-card stat-card--${tone} ${className}`.trim()}>
      <p className="stat-card__title">{title}</p>
      <strong className={`stat-card__value ${valueClassName}`.trim()}>{value}</strong>
      {description ? <p className="stat-card__description">{description}</p> : null}
    </article>
  )
}

export default StatCard
