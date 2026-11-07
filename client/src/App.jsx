
import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
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

function HomePage() {
  return (
    <>
      <VideoBackground />
      <Navbar />

      <main>
        <Hero />
        <Events />
        <PlaygroundHighlight />
        <About />
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
    return <Navigate to="/user" replace />;
  }

  if (!adminOnly && !anyRole && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function RoleBasedMemberProfile() {
  const { user } = useAuth();
  const { username } = useParams();
  const location = useLocation();

  if (!user || !username) {
    return <Navigate to="/login" replace />;
  }

  const dashboardPath = user.role === 'admin' ? '/admin' : '/user';
  const targetPath = `${dashboardPath}/${encodeURIComponent(username)}`;

  if (location.pathname !== targetPath) {
    return <Navigate
      to={targetPath}
      replace
      state={user.role === 'admin' ? { activeSection: 'users' } : undefined}
    />;
  }

  return user.role === 'admin' ? <Admin /> : <UserDashboard />;
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
  const userPages = [
    '/user',
    '/user/overview',
    '/user/milestone',
    '/user/profile',
    '/user/activities',
    '/user/discover',
    '/user/projects',
    '/user/skills',
    '/user/badges',
    '/user/settings',
  ];

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
            <Navigate to="/user/profile" replace />
          </ProtectedRoute>
        }
      />

      {/* Protected dashboard pages and member profiles */}
      {userPages.map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
      ))}
      <Route
        path="/user/:username"
        element={
          <ProtectedRoute anyRole>
            <RoleBasedMemberProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/*"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/:username"
        element={
          <ProtectedRoute anyRole>
            <RoleBasedMemberProfile />
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
