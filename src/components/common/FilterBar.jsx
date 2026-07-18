function FilterBar({ children, className = '' }) {
  return <section className={`filter-bar ${className}`.trim()}>{children}</section>
}

export default FilterBar
