import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import BrandMark from '../../components/common/BrandMark'
import FormField from '../../components/common/FormField'
import PasswordField from '../../components/common/PasswordField'
import { useAuth } from '../../context/useAuth'
import { getDefaultRouteForRole } from '../../utils/auth'

function LoginPage() {
  const { currentUser, isAuthenticated, signIn } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  if (isAuthenticated && currentUser) {
    return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.email.trim()) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Enter your password.'
    }

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = validateForm()
    setErrors(validationErrors)
    setAuthError('')

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const authenticatedUser = await signIn(formData)
      navigate(getDefaultRouteForRole(authenticatedUser.role), { replace: true })
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-shell__glow auth-shell__glow--top"></div>
        <div className="auth-shell__glow auth-shell__glow--side"></div>
        <div className="auth-shell__glow auth-shell__glow--base"></div>

        <header className="auth-shell__brand">
          <BrandMark invert small />
        </header>

        <div className="auth-mobile-brand">
          <BrandMark small />
        </div>

        <div className="auth-center">
          <div className="auth-emblem">
            <BrandMark invert showCopy={false} small />
          </div>

          <div className="auth-card">
            <div className="auth-card__header">
              <h2>Sign in</h2>
              <p>Use your ministry account to continue.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <FormField
                id="email"
                name="email"
                label="Email address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@mrh.gov.gh"
                autoComplete="username"
                error={errors.email}
              />

              <PasswordField
                id="password"
                name="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                isVisible={isPasswordVisible}
                onToggle={() => setIsPasswordVisible((visible) => !visible)}
              />

              <label className="checkbox-field" htmlFor="rememberMe">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <span>Remember me on this device</span>
              </label>

              {authError ? (
                <p className="auth-form__error" role="alert">
                  {authError}
                </p>
              ) : null}

              <button
                type="submit"
                className="button button--primary button--block"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="auth-card__support">
              <span>Need help?</span> Contact the system administrator.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
