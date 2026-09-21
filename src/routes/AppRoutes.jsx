import { Routes, Route, Navigate } from "react-router-dom"

import DashboardHome from "../pages/dashboard/DashboardHome"
import Messages from "../pages/chat/Messages"
import GroupInfo from "../pages/chat/GroupInfo"
import FamilyTree from "../pages/family/FamilyTree"
import GamesHub from "../pages/games/GamesHub"
import AyoLobby from "../pages/games/AyoLobby"
import MatchRoom from "../pages/games/MatchRoom"
import AyoPractice from "../pages/games/AyoPractice"
import NeonWavesPage from "../pages/games/NeonWavesPage"
import Events from "../pages/events/Events"
import Community from "../pages/community/Community"
import Spaces from "../pages/spaces/Spaces"
import CreateSpace from "../pages/spaces/CreateSpace"
import SpaceRoom from "../pages/spaces/SpaceRoom"
import Login from "../pages/auth/Login"
import Register from "../pages/auth/Register"
import Welcome from "../pages/auth/Welcome"
import AuthLayout from "../pages/auth/AuthLayout"
import Profile from "../pages/profile/Profile"
import UserProfile from "../pages/profile/UserProfile"
import Settings from "../pages/settings/Settings"
import Notifications from "../pages/notifications/Notifications"
import Call from "../pages/calls/Call"
import CallHistory from "../pages/calls/CallHistory"

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
        path="/user/:userId"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/group/:conversationId"
        element={
          <ProtectedRoute>
            <GroupInfo />
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
        path="/games"
        element={
          <ProtectedRoute>
            <GamesHub />
          </ProtectedRoute>
        }
      />

      <Route
        path="/games/ayo"
        element={
          <ProtectedRoute>
            <AyoLobby />
          </ProtectedRoute>
        }
      />

      <Route
        path="/games/ayo/practice"
        element={
          <ProtectedRoute>
            <AyoPractice />
          </ProtectedRoute>
        }
      />

      <Route
        path="/games/neon"
        element={
          <ProtectedRoute>
            <NeonWavesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/games/:gameId/:matchId"
        element={
          <ProtectedRoute>
            <MatchRoom />
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
        element={
          <ProtectedRoute>
            <FamilyTree />
          </ProtectedRoute>
        }
      />

      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <div className="p-8">Members coming soon.</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <Events />
          </ProtectedRoute>
        }
      />

      <Route
        path="/committees"
        element={
          <ProtectedRoute>
            <div className="p-8">Committees coming soon.</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <div className="p-8">Documents coming soon.</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calls/history"
        element={
          <ProtectedRoute>
            <CallHistory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/calls"
        element={
          <ProtectedRoute>
            <Call />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default AppRoutes
