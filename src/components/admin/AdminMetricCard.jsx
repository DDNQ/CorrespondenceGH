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
      <p className="admin-metric-card__description">{description}</p>
    </article>
  )
}

export default AdminMetricCard
