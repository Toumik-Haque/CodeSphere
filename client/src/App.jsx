
import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import VideoBackground from './components/VideoBackground';
import BadgeCelebration from './components/BadgeCelebration';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Events from './components/Events';
import TeamCarousel from './components/TeamCarousel';
import CTA from './components/CTA';
import PlaygroundHighlight from './components/PlaygroundHighlight';
import About from './components/About';
import Footer from './components/Footer';

import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';
import EventsPage from './pages/EventsPage';
import EventDetails from './pages/EventDetails';
import Team from './pages/Team';
import Contact from './pages/Contact';
import OpenSource from './pages/OpenSource';
import Playground from './pages/Playground';
import Leaderboard from './pages/Leaderboard';
import Forum from './pages/Forum';
import ForumNew from './pages/ForumNew';
import ForumThread from './pages/ForumThread';
import AdminForum from './pages/AdminForum';
import ReverseCoding from './pages/ReverseCoding';
import ReverseChallenge from './pages/ReverseChallenge';
import AdminReverse from './pages/AdminReverse';
import News from './pages/News';
import AdminNews from './pages/AdminNews';

import UserDashboard from './pages/UserDashboard';
import MemberProfile from './pages/MemberProfile';

function HomePage() {
  return (
    <>
      <VideoBackground />
      <Navbar />

      <main>
        <Hero />
        <About />
        <Events />
        <PlaygroundHighlight />
        <TeamCarousel />
        <CTA />
      </main>

      <Footer />
    </>
  );
}

// Protect routes that require authentication.
// anyRole: any signed-in user (students and admins), e.g. forum posting.
function ProtectedRoute({ children, adminOnly = false, anyRole = false }) {
  const { user, token } = useAuth();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!adminOnly && !anyRole && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

// Scroll to the top whenever the route changes.
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, [pathname]);

  return null;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/team" element={<Team />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/open-source" element={<OpenSource />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/forum" element={<Forum />} />
      <Route path="/forum/new" element={<ProtectedRoute anyRole><ForumNew /></ProtectedRoute>} />
      <Route path="/forum/:id" element={<ForumThread />} />
      <Route path="/admin/forum" element={<ProtectedRoute adminOnly><AdminForum /></ProtectedRoute>} />
      <Route path="/reverse-coding" element={<ReverseCoding />} />
      <Route path="/reverse-coding/:slug" element={<ReverseChallenge />} />
      <Route path="/admin/reverse-coding" element={<ProtectedRoute adminOnly><AdminReverse /></ProtectedRoute>} />
      <Route path="/news" element={<News />} />
      <Route path="/news/:slug" element={<News />} />
      <Route path="/admin/news" element={<ProtectedRoute adminOnly><AdminNews /></ProtectedRoute>} />

      {/* Authentication pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected event details page */}
      <Route
        path="/events/:slug"
        element={<EventDetails />}
      />

      {/* Protected user dashboard */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard/profile" replace />
          </ProtectedRoute>
        }
      />

      {/* Protected user dashboard */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected member profiles */}
      <Route
        path="/:username"
        element={
          <ProtectedRoute>
            <MemberProfile />
          </ProtectedRoute>
        }
      />

      {/* Protected admin dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        }
      />

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <AuthProvider>
        <AppRoutes />
        <BadgeCelebration />
      </AuthProvider>
    </BrowserRouter>
  );
}
