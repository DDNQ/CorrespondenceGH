function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>

      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}

export default PageHeader
