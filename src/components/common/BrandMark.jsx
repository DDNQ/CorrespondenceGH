function BrandMark({
  compact = false,
  invert = false,
  showCopy = true,
  small = false,
  className = '',
}) {
  const resolvedClassName = [
    'brand-mark',
    compact ? 'brand-mark--compact' : '',
    invert ? 'brand-mark--invert' : '',
    small ? 'brand-mark--small' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={resolvedClassName}>
      <div className="brand-mark__seal" aria-hidden="true">
        <span>MRH</span>
      </div>
      {showCopy ? (
        <div className="brand-mark__copy">
          <p>Ministry of Roads and Highways</p>
          <h1>Correspondence Management &amp; Tracking System</h1>
        </div>
      ) : null}
    </div>
  )
}

export default BrandMark
