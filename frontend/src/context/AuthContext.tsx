import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserTravelPreferences, AuthSession } from '@safar-saarthi/shared';
import { getApiBaseUrl } from '../config/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, preferences?: UserTravelPreferences) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (preferences: UserTravelPreferences) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'safar_saarthi_jwt_token';
const API_BASE = getApiBaseUrl();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
        }
      } else if (res.status === 401) {
        // Expired token
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } catch {
      // Offline fallback: keep token but set null user until reconnection
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Login failed. Please check your credentials.');
    }

    const session: AuthSession = json.data;
    localStorage.setItem(TOKEN_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    preferences?: UserTravelPreferences
  ) => {
    const res = await fetch(`${API_BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, preferences }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Registration failed.');
    }

    const session: AuthSession = json.data;
    localStorage.setItem(TOKEN_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/v1/auth/logout`, { method: 'POST' });
    } catch {
      // Ignore
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const updatePreferences = async (preferences: UserTravelPreferences) => {
    if (!token) return;

    const res = await fetch(`${API_BASE}/v1/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(preferences),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update travel preferences');
    }

    setUser(json.data);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        logout,
        updatePreferences,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
