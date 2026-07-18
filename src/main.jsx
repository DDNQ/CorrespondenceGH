import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CorrespondenceProvider } from './context/CorrespondenceContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <ToastProvider>
            <NotificationProvider>
              <CorrespondenceProvider>
                <App />
              </CorrespondenceProvider>
            </NotificationProvider>
          </ToastProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
