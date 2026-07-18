function TextAreaField({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  inputRef,
  className = '',
}) {
  return (
    <div className={`form-field ${className}`.trim()}>
      <label htmlFor={id} className="form-field__label">
        {label}
        {required ? <span className="form-field__required"> *</span> : null}
      </label>
      <textarea
        ref={inputRef}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
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

export default TextAreaField
