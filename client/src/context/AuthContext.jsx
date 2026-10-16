import React, {
  createContext,
  useContext,
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

  async function register(name, email, password) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
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
      value={{ user, token, login, register, logout }}
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