import { Routes, Route, Navigate } from "react-router-dom"

import DashboardHome from "../pages/dashboard/DashboardHome"
import Messages from "../pages/chat/Messages"
import Community from "../pages/community/Community"
import Spaces from "../pages/spaces/Spaces"
import CreateSpace from "../pages/spaces/CreateSpace"
import SpaceRoom from "../pages/spaces/SpaceRoom"
import Login from "../pages/auth/Login"
import Register from "../pages/auth/Register"
import AuthLayout from "../pages/auth/AuthLayout"

import { useAuth } from "../hooks/useAuth"

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Authentication */}
      <Route
        element={
          <PublicRoute>
            <AuthLayout />
          </PublicRoute>
        }
      >
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected application */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />

      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <Community />
          </ProtectedRoute>
        }
      />

      <Route
        path="/spaces"
        element={
          <ProtectedRoute>
            <Spaces />
          </ProtectedRoute>
        }
      />

      <Route
        path="/spaces/create"
        element={
          <ProtectedRoute>
            <CreateSpace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/spaces/:spaceId"
        element={
          <ProtectedRoute>
            <SpaceRoom />
          </ProtectedRoute>
        }
      />

      <Route
        path="/family-tree"
        element={<Navigate to="/" replace />}
      />

      <Route
        path="/events"
        element={<Navigate to="/" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default AppRoutes
