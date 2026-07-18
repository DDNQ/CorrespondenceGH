function ReportMetricCard({
  label,
  value,
  description,
  tone = 'default',
}) {
  return (
    <article className={`report-metric-card report-metric-card--${tone}`}>
      <p className="report-metric-card__label">{label}</p>
      <h3 className="report-metric-card__value">{value}</h3>
      {description ? (
        <p className="report-metric-card__description">{description}</p>
      ) : null}
    </article>
  )
}

export default ReportMetricCard
