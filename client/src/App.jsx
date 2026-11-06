
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
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import EventsPage from './pages/EventsPage';
import EventDetails from './pages/EventDetails';
import Team from './pages/Team';
import Contact from './pages/Contact';
import Playground from './pages/Playground';
import Leaderboard from './pages/Leaderboard';

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
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, token } = useAuth();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/profile" replace />;
  }

  if (!adminOnly && user.role === 'admin') {
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
      <Route path="/events/:slug" element={<EventDetails />} />
      <Route path="/team" element={<Team />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/leaderboard" element={<Leaderboard />} />

      {/* Authentication pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected student profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Redirect old capital-P profile URL */}
      <Route
        path="/Profile"
        element={<Navigate to="/profile" replace />}
      />

      {/* Development-only profile preview (no login required) */}
      {import.meta.env.DEV && (
        <Route
          path="/profile-preview"
          element={<Profile preview />}
        />
      )}

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
      </AuthProvider>
    </BrowserRouter>
  );
}
