function StatCard({ title, value, description, tone = 'default' }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <p className="stat-card__title">{title}</p>
      <strong className="stat-card__value">{value}</strong>
      <p className="stat-card__description">{description}</p>
    </article>
  )
}

export default StatCard
