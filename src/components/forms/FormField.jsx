function FormField({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  readOnly = false,
  placeholder,
  type = 'text',
  autoComplete,
  inputRef,
  name,
  className = '',
}) {
  return (
    <div className={`form-field ${className}`.trim()}>
      <label htmlFor={id} className="form-field__label">
        {label}
        {required ? <span className="form-field__required"> *</span> : null}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={name ?? id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        readOnly={readOnly}
        className={readOnly ? 'readonly-field' : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default FormField
