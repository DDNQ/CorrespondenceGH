import { ChevronDown, LogOut, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'
import { navigationByRole } from '../../utils/navigation'
import BrandMark from '../common/BrandMark'

function Sidebar({ isOpen, onClose }) {
  const { currentUser, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const navigation = currentUser ? navigationByRole[currentUser.role] : null
  const [isCorrespondenceExpanded, setIsCorrespondenceExpanded] = useState(false)
  const isOnCorrespondenceRoute = location.pathname.startsWith('/correspondence')
  const isSubmenuOpen = isOnCorrespondenceRoute || isCorrespondenceExpanded

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <aside
        className={isOpen ? 'app-sidebar app-sidebar--open' : 'app-sidebar'}
        aria-label="Primary navigation"
      >
        <div className="app-sidebar__inner">
          <div className="app-sidebar__top">
            <button
              type="button"
              className="app-sidebar__close"
              onClick={onClose}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>

            <BrandMark compact invert />
          </div>

          <nav className="sidebar-nav">
            {navigation?.primary.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
                  }
                  onClick={onClose}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}

            {navigation?.sections.map((section) => (
              <div key={section.title} className="sidebar-section">
                <p className="sidebar-section__title">{section.title}</p>
                <div className="sidebar-section__items">
                  {section.items.map((item) => {
                    const Icon = item.icon

                    if (item.children) {
                      return (
                        <div key={item.to} className="sidebar-submenu">
                          <button
                            type="button"
                            className="sidebar-link sidebar-link--button"
                            onClick={() =>
                              setIsCorrespondenceExpanded((expanded) => !expanded)
                            }
                            aria-expanded={isSubmenuOpen}
                          >
                            <span className="sidebar-link__content">
                              <Icon size={18} />
                              <span>{item.label}</span>
                            </span>
                            <ChevronDown
                              size={18}
                              className={
                                isSubmenuOpen
                                  ? 'sidebar-link__chevron sidebar-link__chevron--open'
                                  : 'sidebar-link__chevron'
                              }
                            />
                          </button>

                          {isSubmenuOpen ? (
                            <div className="sidebar-submenu__items">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon
                                const childSearch = new URLSearchParams(location.search)
                                const isAllStatus =
                                  child.status === 'all' &&
                                  (!childSearch.get('status') ||
                                    childSearch.get('status') === 'all')
                                const isActive =
                                  location.pathname === '/correspondence' &&
                                  (isAllStatus ||
                                    childSearch.get('status') === child.status)

                                return (
                                  <NavLink
                                    key={child.to}
                                    to={child.to}
                                    className={
                                      isActive
                                        ? 'sidebar-sublink sidebar-sublink--active'
                                        : 'sidebar-sublink'
                                    }
                                    onClick={onClose}
                                  >
                                    <ChildIcon size={15} />
                                    <span>{child.label}</span>
                                  </NavLink>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      )
                    }

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        className={({ isActive }) =>
                          isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
                        }
                        onClick={onClose}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="app-sidebar__footer">
            {navigation?.footer.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
                  }
                  onClick={onClose}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}

            <button
              type="button"
              className="sidebar-link sidebar-link--button sidebar-link--logout"
              onClick={handleLogout}
            >
              <span className="sidebar-link__content">
                <LogOut size={18} />
                <span>Logout</span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      {isOpen ? (
        <button
          type="button"
          className="app-overlay"
          onClick={onClose}
          aria-label="Close navigation overlay"
        />
      ) : null}
    </>
  )
}

export default Sidebar
