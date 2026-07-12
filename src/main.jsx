import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { WindowsProvider } from './context/WindowsContext.jsx'
import './styles/index.css'
import './styles/panels.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <ThemeProvider>
      <NotificationProvider>
        <WindowsProvider>
          <App />
        </WindowsProvider>
      </NotificationProvider>
    </ThemeProvider>
  </AuthProvider>
)
