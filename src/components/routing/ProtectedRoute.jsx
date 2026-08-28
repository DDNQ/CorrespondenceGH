import { Navigate, Outlet, useLocation } from 'react-router-dom'

import BrandMark from '../common/BrandMark.jsx'
import { useAuth } from '../../context/useAuth'

function AuthInitializingScreen() {
  return (
    <main className="auth-page">
      <section className="auth-shell">
        <header className="auth-shell__brand">
          <BrandMark invert small />
        </header>

        <div className="auth-center">
          <div className="auth-emblem">
            <BrandMark invert showCopy={false} small />
          </div>

          <div className="auth-card">
            <div className="auth-card__header">
              <h2>Restoring session</h2>
              <p>Please wait while access is being verified.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProtectedRoute() {
  const { isAuthenticated, isInitializing, isRestoringSession } = useAuth()
  const location = useLocation()

  if (isInitializing || isRestoringSession) {
    return <AuthInitializingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
