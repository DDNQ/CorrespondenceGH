import { ROLES } from '../../constants/roles'

const roleLabels = {
  [ROLES.OFFICE_USER]: 'Office User',
  [ROLES.OFFICE_SUPERVISOR]: 'Office Supervisor',
  [ROLES.SYSTEM_ADMIN]: 'System Administrator',
}

function getInitials(fullName = '') {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join('')
    .toUpperCase()
}

function UserSummary({ user, compact = false }) {
  return (
    <div className={compact ? 'user-summary user-summary--compact' : 'user-summary'}>
      <div className="user-summary__avatar" aria-hidden="true">
        {getInitials(user?.fullName)}
      </div>
      <div className="user-summary__copy">
        <strong>{user?.fullName}</strong>
        <span>{user?.officeName}</span>
        <span>{roleLabels[user?.role] ?? user?.role}</span>
      </div>
    </div>
  )
}

export default UserSummary
