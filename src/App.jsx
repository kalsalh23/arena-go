import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/ui'
import Splash from './components/Splash'
import ScrollToTop from './components/ScrollToTop'

import AuthPage from './pages/auth/AuthPage'
import HomePage from './pages/HomePage'
import VenuesPage from './pages/venues/VenuesPage'
import VenueDetailPage from './pages/venues/VenueDetailPage'
import BookingPage from './pages/venues/BookingPage'
import TeamsPage from './pages/teams/TeamsPage'
import TeamDetailPage from './pages/teams/TeamDetailPage'
import CreateTeamPage from './pages/teams/CreateTeamPage'
import JoinByCodePage from './pages/teams/JoinByCodePage'
import TournamentsPage from './pages/tournaments/TournamentsPage'
import TournamentDetailPage from './pages/tournaments/TournamentDetailPage'
import MyMatchesPage from './pages/MyMatchesPage'
import ProfilePage from './pages/profile/ProfilePage'
import PlayerProfilePage from './pages/profile/PlayerProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import PremiumPage from './pages/premium/PremiumPage'
import OwnerDashboard from './pages/dashboard/OwnerDashboard'
import VenueForm from './pages/dashboard/VenueForm'
import TournamentForm from './pages/dashboard/TournamentForm'
import ManageTournamentPage from './pages/dashboard/ManageTournamentPage'
import AboutPage from './pages/about/AboutPage'

function RequireAuth({ children, roles }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <>
      <Splash />
      <ScrollToTop />
      <Routes>
      <Route path="/auth" element={<AuthPage />} />

      <Route path="/" element={<HomePage />} />
      <Route path="/venues" element={<VenuesPage />} />
      <Route path="/venues/:id" element={<VenueDetailPage />} />
      <Route path="/venues/:id/book" element={<RequireAuth><BookingPage /></RequireAuth>} />

      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/teams/create" element={<RequireAuth><CreateTeamPage /></RequireAuth>} />
      <Route path="/teams/:id" element={<TeamDetailPage />} />
      <Route path="/join/:code" element={<JoinByCodePage />} />

      <Route path="/tournaments" element={<TournamentsPage />} />
      <Route path="/tournaments/:id" element={<TournamentDetailPage />} />

      <Route path="/matches" element={<RequireAuth><MyMatchesPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/players/:id" element={<PlayerProfilePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
      <Route path="/premium" element={<RequireAuth><PremiumPage /></RequireAuth>} />

      <Route path="/dashboard" element={<RequireAuth roles={['venue_owner','admin']}><OwnerDashboard /></RequireAuth>} />
      <Route path="/dashboard/venues/new" element={<RequireAuth roles={['venue_owner','admin']}><VenueForm /></RequireAuth>} />
      <Route path="/dashboard/venues/:id/edit" element={<RequireAuth roles={['venue_owner','admin']}><VenueForm /></RequireAuth>} />
      <Route path="/dashboard/tournaments/new" element={<RequireAuth roles={['venue_owner','admin']}><TournamentForm /></RequireAuth>} />
      <Route path="/dashboard/tournaments/:id" element={<RequireAuth roles={['venue_owner','admin']}><ManageTournamentPage /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
