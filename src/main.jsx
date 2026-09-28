import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import AdminRoot from './AdminRoot'
import { AuthProvider } from './context/AuthContext'
import { AuthRealtimeBridge } from './components/AuthRealtimeBridge'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

// The admin panel is a separate deployment (VITE_ADMIN_ENTRY=admin) with its own URL,
// completely outside the players' app.
const isAdminEntry = import.meta.env.VITE_ADMIN_ENTRY === 'admin'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {isAdminEntry ? (
          <AdminRoot />
        ) : (
          <AuthProvider>
            <AuthRealtimeBridge>
              <App />
            </AuthRealtimeBridge>
          </AuthProvider>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)

// PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
