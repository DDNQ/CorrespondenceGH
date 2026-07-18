import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'
import { getDashboardRoute } from '../../utils/errorRoutes'

function AccessDeniedPage() {
  const { currentUser } = useAuth()
  const dashboardPath = getDashboardRoute(currentUser)
  const showCorrespondence = Boolean(currentUser)

  return (
    <main className="error-page">
      <section className="status-card">
        <div className="status-card__icon" aria-hidden="true">
          <Lock size={28} />
        </div>
        <p className="app-eyebrow">Security</p>
        <h1>Access Denied</h1>
        <p>You do not have permission to view this area of the correspondence system.</p>
        <div className="status-card__summary">
          <strong>Restricted Area</strong>
          <p>
            Administrative functions and role-protected areas are limited to authorised users.
          </p>
        </div>
        <div className="notice-strip">
          Your account remains active. No changes have been made to your access profile.
        </div>
        <div className="error-page-actions">
          <Link to={dashboardPath} className="button button--primary">
            Return to Dashboard
          </Link>
          {showCorrespondence ? (
            <Link to="/correspondence?status=all" className="button button--secondary">
              View Correspondence
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default AccessDeniedPage
