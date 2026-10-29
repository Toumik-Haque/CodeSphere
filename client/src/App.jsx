
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import VideoBackground from './components/VideoBackground';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Events from './components/Events';
import TeamCarousel from './components/TeamCarousel';
import CTA from './components/CTA'
import About from './components/About';
import Footer from './components/Footer';

import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import EventsPage from './pages/EventsPage';
import EventDetails from './pages/EventDetails';
import Team from './pages/Team';

function HomePage() {
  return (
    <>
      <VideoBackground />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Events />
        <TeamCarousel />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

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

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, [pathname, hash]);

  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:slug" element={<EventDetails />} />
      <Route path="/team" element={<Team />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        }
      />

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
