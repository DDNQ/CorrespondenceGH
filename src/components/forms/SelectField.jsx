function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  required = false,
  inputRef,
  className = '',
}) {
  return (
    <div className={`form-field ${className}`.trim()}>
      <label htmlFor={id} className="form-field__label">
        {label}
        {required ? <span className="form-field__required"> *</span> : null}
      </label>
      <select
        ref={inputRef}
        id={id}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default SelectField
