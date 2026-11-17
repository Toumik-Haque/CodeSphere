import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { AUTH_EXPIRED_EVENT, apiRequest } from '../lib/api';
import SessionExpiredModal from '../components/SessionExpiredModal';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('codesphere_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('codesphere_user');
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem('codesphere_token')
  );

  const navigate = useNavigate();
  const [sessionNotice, setSessionNotice] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem('codesphere_token');
    localStorage.removeItem('codesphere_user');

    setToken(null);
    setUser(null);
    setSessionNotice(null);
  }, []);

  const closeSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  const goToSignIn = useCallback(() => {
    setSessionNotice(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const handleExpired = (event) => {
      const currentToken = localStorage.getItem('codesphere_token');
      const failedToken = event.detail?.token;

      if (!currentToken || (failedToken && failedToken !== currentToken)) return;

      logout();
      setSessionNotice({
        message: 'Your sign-in is no longer valid. Please sign in again to continue.',
      });
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [logout]);

  // Refresh the saved user from the server on load and after sign-in, so
  // changes (staff roles, photo, username, profile details) show up without
  // signing in again. /auth/me has account data; /users/profile adds the
  // developer profile. Both are merged into the saved user.
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    const merge = (data) => {
      if (cancelled || !data?.user) return;
      setUser((current) => {
        if (!current) return current;
        const next = { ...current, ...data.user };
        localStorage.setItem('codesphere_user', JSON.stringify(next));
        return next;
      });
    };
    apiRequest('/auth/me').then(merge).catch(() => {});
    apiRequest('/users/profile').then(merge).catch((error) => {
      console.error('Failed to refresh user profile:', error.message);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function sendOtp(email) {
    return apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async function verifyOtp(email, otp) {
    return apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async function forgotPassword(email) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async function verifyResetOtp(email, otp) {
    return apiRequest('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async function resetPassword(email, password) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async function login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('codesphere_token', data.token);
    localStorage.setItem('codesphere_user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
    setSessionNotice(null);

    return data.user;
  }

  async function register(
    name,
    email,
    password,
    collegeName,
    yearOfStudy,
    graduationYear
  ) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        collegeName,
        yearOfStudy,
        graduationYear,
      }),
    });

    localStorage.setItem('codesphere_token', data.token);
    localStorage.setItem('codesphere_user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
    setSessionNotice(null);

    return data.user;
  }

  // Merge fields into the signed-in user (and the saved copy).
  function updateUser(patch) {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      localStorage.setItem('codesphere_user', JSON.stringify(next));
      return next;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        sendOtp,
        verifyOtp,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
        updateUser,
        logout,
      }}
    >
      {children}
      <SessionExpiredModal
        open={Boolean(sessionNotice)}
        message={sessionNotice?.message}
        onClose={closeSessionNotice}
        onSignIn={goToSignIn}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}