import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import Sidebar from './Sidebar'
import Topbar from './Topbar'

function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="app-content">
        <Topbar onOpenSidebar={() => setIsSidebarOpen(true)} />

        <main className="app-main">
          <div className="app-main__content">
            <Outlet />
          </div>
        </main>

        <footer className="app-footer">
          <span>© 2026 Ministry of Roads and Highways</span>
          <span>Correspondence Management &amp; Tracking System</span>
        </footer>
      </div>
    </div>
  )
}

export default AppLayout
