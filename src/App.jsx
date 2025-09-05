import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store'
import { CallProvider } from './contexts/CallContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import BottomNav from './components/BottomNav'
import CallModal from './components/CallModal'
import InstallPrompt from './components/InstallPrompt'
import OfflineIndicator from './components/OfflineIndicator'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Messages from './pages/Messages'
import Connections from './pages/Connections'
import Profile from './pages/Profile'
import Blocked from './pages/Blocked'

function App() {
  const location = useLocation()
  const isMessagesPage = location.pathname.startsWith('/messages')
  const isConnectionsPage = location.pathname.startsWith('/connections')
  const isProfilePage = location.pathname.startsWith('/profile')

  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    )
  }

  return (
    <WebSocketProvider>
      <CallProvider>
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
          <main className={`flex-grow ${isMessagesPage || isConnectionsPage || isProfilePage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            <Routes>
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="/feed" element={<Feed />} />
              {/* Redirect legacy /chat URLs to /messages for compatibility */}
              <Route path="/chat" element={<Navigate to="/messages" replace />} />

              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:userId" element={<Messages />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/blocked" element={<Blocked />} />
              <Route path="*" element={<Navigate to="/feed" replace />} />
            </Routes>
          </main>
          {!isMessagesPage && <div className="flex-shrink-0"><BottomNav /></div>}
        </div>
        <CallModal />
        <InstallPrompt />
        <OfflineIndicator />
      </CallProvider>
    </WebSocketProvider>
  )
}

export default App
