import { useAuth } from '../../context/useAuth'

function PagePlaceholder({ title, description }) {
  const { currentUser } = useAuth()

  return (
    <section className="page-placeholder">
      <header className="page-placeholder__header">
        <p className="app-eyebrow">Page Placeholder</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      <dl className="page-placeholder__meta">
        <div>
          <dt>Current signed-in user</dt>
          <dd>{currentUser?.fullName ?? 'Not signed in'}</dd>
        </div>
        <div>
          <dt>Current role</dt>
          <dd>{currentUser?.role ?? 'No active role'}</dd>
        </div>
        <div>
          <dt>Assigned office</dt>
          <dd>{currentUser?.officeName ?? 'No assigned office'}</dd>
        </div>
      </dl>
    </section>
  )
}

export default PagePlaceholder
