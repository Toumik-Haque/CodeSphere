
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
import Materials from './pages/Materials';
import AdminMaterials from './pages/AdminMaterials';
import Hackathons from './pages/Hackathons';
import HackathonDetail from './pages/HackathonDetail';
import AdminHackathons from './pages/AdminHackathons';
import HostSubmit from './pages/HostSubmit';
import MyHosting from './pages/MyHosting';
import AdminReview from './pages/AdminReview';
import ProjectHub from './pages/ProjectHub';
import ProjectDetail from './pages/ProjectDetail';
import ProjectEditor from './pages/ProjectEditor';
import GuidedProject from './pages/GuidedProject';
import AdminProjects from './pages/AdminProjects';

import UserDashboard from './pages/UserDashboard';

function HomePage() {
  return (
    <>
      <VideoBackground />
      <Navbar />

      <main>
        <Hero />
        <Events />
        <About />
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
// staff: a staff role (moderator, news-editor, challenge-editor); admins and
// students holding that role may enter.
function ProtectedRoute({ children, adminOnly = false, anyRole = false, staff = null }) {
  const { user, token } = useAuth();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (staff) {
    const allowed = user.role === 'admin' || user.staffRoles?.includes(staff);
    return allowed ? children : <Navigate to="/" replace />;
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
      <Route path="/admin/forum" element={<ProtectedRoute staff="moderator"><AdminForum /></ProtectedRoute>} />
      <Route path="/reverse-coding" element={<ReverseCoding />} />
      <Route path="/reverse-coding/:slug" element={<ReverseChallenge />} />
      <Route path="/admin/reverse-coding" element={<ProtectedRoute staff="challenge-editor"><AdminReverse /></ProtectedRoute>} />
      <Route path="/materials" element={<Materials />} />
      <Route path="/materials/:slug" element={<Materials />} />
      <Route path="/admin/materials" element={<ProtectedRoute staff="challenge-editor"><AdminMaterials /></ProtectedRoute>} />
      <Route path="/host" element={<ProtectedRoute anyRole><MyHosting /></ProtectedRoute>} />
      <Route path="/host/:kind/new" element={<ProtectedRoute anyRole><HostSubmit /></ProtectedRoute>} />
      <Route path="/host/:kind/:id/edit" element={<ProtectedRoute anyRole><HostSubmit /></ProtectedRoute>} />
      <Route path="/admin/review" element={<ProtectedRoute staff="hackathon-organizer"><AdminReview /></ProtectedRoute>} />
      <Route path="/projects" element={<ProjectHub />} />
      <Route path="/projects/new" element={<ProtectedRoute anyRole><ProjectEditor /></ProtectedRoute>} />
      <Route path="/projects/guided/:slug" element={<GuidedProject />} />
      <Route path="/projects/:id/edit" element={<ProtectedRoute anyRole><ProjectEditor /></ProtectedRoute>} />
      <Route path="/projects/:slug" element={<ProjectDetail />} />
      <Route path="/admin/projects" element={<ProtectedRoute staff="project-reviewer"><AdminProjects /></ProtectedRoute>} />
      <Route path="/hackathons" element={<Hackathons />} />
      <Route path="/hackathons/:slug" element={<HackathonDetail />} />
      <Route path="/admin/hackathons" element={<ProtectedRoute staff="hackathon-organizer"><AdminHackathons /></ProtectedRoute>} />
      <Route path="/news" element={<News />} />
      <Route path="/news/:slug" element={<News />} />
      <Route path="/admin/news" element={<ProtectedRoute staff="news-editor"><AdminNews /></ProtectedRoute>} />

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
