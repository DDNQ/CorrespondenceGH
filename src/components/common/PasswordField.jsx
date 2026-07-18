import { Eye, EyeOff } from 'lucide-react'

function PasswordField({ id, name, label, value, onChange, error, isVisible, onToggle }) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field__label">
        {label}
      </label>
      <div className={error ? 'password-field password-field--error' : 'password-field'}>
        <input
          id={id}
          name={name}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete="current-password"
          className="password-field__input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={onToggle}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
        >
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default PasswordField
