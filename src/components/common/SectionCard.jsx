function SectionCard({
  title,
  description,
  action,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  actionClassName = '',
}) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {(title || description || action) ? (
        <header className={`section-card__header ${headerClassName}`.trim()}>
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div className={actionClassName}>{action}</div> : null}
        </header>
      ) : null}
      <div className={`section-card__body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  )
}

export default SectionCard
