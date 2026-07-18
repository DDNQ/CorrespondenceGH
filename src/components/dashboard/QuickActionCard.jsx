import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function QuickActionCard({ title, description, to, icon: Icon }) {
  return (
    <Link to={to} className="quick-action-card">
      <div className="quick-action-card__content">
        <span className="quick-action-card__icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <div className="quick-action-card__copy">
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>
      <ArrowRight size={16} aria-hidden="true" className="quick-action-card__arrow" />
    </Link>
  )
}

export default QuickActionCard
