import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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

  useEffect(() => {
  async function fetchCurrentUser() {
    if (!token) return;

    try {
      const data = await apiRequest('/users/profile');

      if (data.user) {
        setUser(data.user);

        localStorage.setItem(
          'codesphere_user',
          JSON.stringify(data.user)
        );
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error.message);
    }
  }

  fetchCurrentUser();
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