import { Menu, Search } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'
import { getPageLabel } from '../../utils/navigation'
import { getOfficeDisplayName } from '../../utils/offices.js'
import UserSummary from './UserSummary'

function Topbar({ onOpenSidebar }) {
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')
  const pageLabel = getPageLabel(location.pathname, searchParams)
  const isOfficeDashboard = location.pathname === '/dashboard'
  const isNotificationsPage = location.pathname === '/notifications'
  const isSettingsPage = location.pathname === '/settings'
  const isReportsPage = location.pathname === '/reports'
  const isCorrespondenceDetail =
    location.pathname.startsWith('/correspondence/') && location.pathname !== '/correspondence/new'
  const detailPathSegment = isCorrespondenceDetail
    ? decodeURIComponent(location.pathname.replace('/correspondence/', ''))
    : ''
  const detailReference = isCorrespondenceDetail
    ? typeof location.state?.correspondenceReference === 'string' &&
      location.state.correspondenceReference.trim()
      ? location.state.correspondenceReference.trim()
      : detailPathSegment.includes('/')
        ? detailPathSegment
        : 'Details'
    : ''
  const officeName = getOfficeDisplayName(currentUser?.office)

  const handleSearchSubmit = (event) => {
    event.preventDefault()

    const nextSearchParams = new URLSearchParams()
    nextSearchParams.set('status', 'all')

    if (searchValue.trim()) {
      nextSearchParams.set('q', searchValue.trim())
    }

    navigate(`/correspondence?${nextSearchParams.toString()}`)
  }

  return (
    <header className="app-topbar">
      <div className="app-topbar__leading">
        <button
          type="button"
          className="app-topbar__menu-button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="app-topbar__title-block">
          {isOfficeDashboard ? (
            <p className="app-topbar__breadcrumb">
              <span className="app-topbar__breadcrumb-current">Dashboard</span>
              <span className="app-topbar__breadcrumb-separator">/</span>
                <span className="app-topbar__breadcrumb-context">
                {officeName}
              </span>
            </p>
          ) : isCorrespondenceDetail ? (
            <p className="app-topbar__breadcrumb">
              <span className="app-topbar__breadcrumb-current">Correspondence</span>
              <span className="app-topbar__breadcrumb-separator">/</span>
              <span className="app-topbar__breadcrumb-context">{detailReference}</span>
            </p>
          ) : isNotificationsPage ? (
            <p className="app-topbar__breadcrumb">
              <span className="app-topbar__breadcrumb-current">Notifications</span>
              <span className="app-topbar__breadcrumb-separator">/</span>
              <span className="app-topbar__breadcrumb-context">{officeName}</span>
            </p>
          ) : isReportsPage ? (
            <p className="app-topbar__breadcrumb">
              <span className="app-topbar__breadcrumb-current">Reports</span>
              <span className="app-topbar__breadcrumb-separator">/</span>
              <span className="app-topbar__breadcrumb-context">{officeName}</span>
            </p>
          ) : isSettingsPage ? (
            <p className="app-topbar__breadcrumb">
              <span className="app-topbar__breadcrumb-current">Account</span>
              <span className="app-topbar__breadcrumb-separator">/</span>
              <span className="app-topbar__breadcrumb-context">Settings</span>
            </p>
          ) : (
            <h2>{pageLabel}</h2>
          )}
        </div>
      </div>

      <div className="app-topbar__actions">
        <form className="search-field" onSubmit={handleSearchSubmit}>
          <label htmlFor="global-search" className="sr-only">
            Search correspondence
          </label>
          <Search size={18} />
          <input
            id="global-search"
            name="global-search"
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search reference, subject or sender"
          />
        </form>

        <UserSummary user={currentUser} compact />
      </div>
    </header>
  )
}

export default Topbar
