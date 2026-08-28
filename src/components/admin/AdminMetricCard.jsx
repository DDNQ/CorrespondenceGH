function AdminMetricCard({
  label,
  value,
  description,
  tone = 'default',
}) {
  return (
    <article className={`admin-metric-card admin-metric-card--${tone}`}>
      <p className="admin-metric-card__label">{label}</p>
      <h3 className="admin-metric-card__value">{value}</h3>
      {description ? <p className="admin-metric-card__description">{description}</p> : null}
    </article>
  )
}

export default AdminMetricCard
