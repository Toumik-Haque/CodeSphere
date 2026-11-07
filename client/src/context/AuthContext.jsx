import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { apiRequest } from '../lib/api';

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

  // Refresh the saved user from the server once per page load, so changes
  // such as newly granted staff roles show up without signing in again.
  useEffect(() => {
    if (!localStorage.getItem('codesphere_token')) return undefined;
    let cancelled = false;
    apiRequest('/auth/me')
      .then((data) => {
        if (cancelled || !data?.user) return;
        localStorage.setItem('codesphere_user', JSON.stringify(data.user));
        setUser((current) => (current ? { ...current, ...data.user } : current));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

    return data.user;
  }

  async function register(
    name,
    email,
    password,
    collegeName,
    yearOfStudy
  ) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        collegeName,
        yearOfStudy,
      }),
    });

    localStorage.setItem('codesphere_token', data.token);
    localStorage.setItem('codesphere_user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);

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

  function logout() {
    localStorage.removeItem('codesphere_token');
    localStorage.removeItem('codesphere_user');

    setToken(null);
    setUser(null);
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
        logout,
        updateUser,
      }}
    >
      {children}
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