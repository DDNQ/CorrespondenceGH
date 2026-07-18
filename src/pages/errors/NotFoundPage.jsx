import { Link } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'
import { getDashboardRoute } from '../../utils/errorRoutes'

function NotFoundPage() {
  const { currentUser } = useAuth()
  const dashboardPath = getDashboardRoute(currentUser)

  return (
    <main className="error-page">
      <section className="status-card">
        <p className="app-eyebrow">Route Error</p>
        <h1>Page Not Found</h1>
        <p>The requested page could not be located within the correspondence system.</p>
        <div className="status-card__summary">
          <strong>Requested Page Unavailable</strong>
          <p>Please return to the appropriate dashboard and continue from an available screen.</p>
        </div>
        <div className="error-page-actions">
          <Link to={dashboardPath} className="button button--primary">
            Return to Dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}

export default NotFoundPage
