import { getUserRoleLabel } from '../../constants/roles'
import { getAdminIdentityPresentation } from '../../utils/adminUsersOffices.js'

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
  const identityPresentation = getAdminIdentityPresentation(user)

  return (
    <div className={compact ? 'user-summary user-summary--compact' : 'user-summary'}>
      <div className="user-summary__avatar" aria-hidden="true">
        {getInitials(user?.fullName)}
      </div>
      <div className="user-summary__copy">
        <strong>{user?.fullName}</strong>
        <span>{identityPresentation.secondaryLine}</span>
        <span>{identityPresentation.tertiaryLine || getUserRoleLabel(user?.role)}</span>
      </div>
    </div>
  )
}

export default UserSummary
