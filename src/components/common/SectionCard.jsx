function SectionCard({ title, description, action, children, className = '' }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {(title || description || action) ? (
        <header className="section-card__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </header>
      ) : null}
      <div className="section-card__body">{children}</div>
    </section>
  )
}

export default SectionCard
