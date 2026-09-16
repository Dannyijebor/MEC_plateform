import { Routes, Route, Navigate } from "react-router-dom"

import DashboardHome from "../pages/dashboard/DashboardHome"
import Messages from "../pages/chat/Messages"
import Community from "../pages/community/Community"
import Spaces from "../pages/spaces/Spaces"
import CreateSpace from "../pages/spaces/CreateSpace"
import SpaceRoom from "../pages/spaces/SpaceRoom"

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/community" element={<Community />} />

      <Route path="/spaces" element={<Spaces />} />
      <Route path="/spaces/create" element={<CreateSpace />} />
      <Route path="/spaces/:spaceId" element={<SpaceRoom />} />

      <Route path="/family-tree" element={<Navigate to="/" replace />} />
      <Route path="/events" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
