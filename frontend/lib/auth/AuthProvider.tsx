'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import keycloak from './keycloak';

interface UserInfo {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  userInfo: UserInfo | null;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (!keycloak || typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    keycloak
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256',
      })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);
        setToken(keycloak.token || null);
        
        if (authenticated) {
          keycloak.loadUserInfo().then((info) => {
            setUserInfo(info);
          });
        }
        
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Keycloak init error:', error);
        setIsLoading(false);
      });

    // Token refresh
    keycloak.onTokenExpired = () => {
      keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (refreshed) {
            setToken(keycloak.token || null);
          }
        })
        .catch(() => {
          console.error('Failed to refresh token');
          logout();
        });
    };
  }, []);

  const login = () => {
    if (keycloak) {
      keycloak.login();
    }
  };

  const logout = () => {
    if (keycloak) {
      keycloak.logout();
    }
  };

  const hasRole = (role: string): boolean => {
    return keycloak ? keycloak.hasRealmRole(role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        userInfo,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
