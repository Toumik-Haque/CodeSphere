
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ScrollToTop from './ScrollToTop.jsx';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Events from './components/Events';
import JoinUs from './components/JoinUs';
import About from './components/About';
import Footer from './components/Footer';

import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import EventsPage from './pages/EventsPage';
import EventDetails from './pages/EventDetails';

function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Events />
        <JoinUs />
        <About />
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:slug" element={<EventDetails />} />

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
