import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'campushub-token';
const USER_KEY = 'campushub-user';

export const roleHome = {
  ADMIN: '/dashboard/admin',
  FACULTY_ADVISOR: '/dashboard/advisor',
  CLUB_EXECUTIVE: '/dashboard/executive',
  STUDENT: '/dashboard/student',
};

export const getRoleHome = (role) => roleHome[role] || '/';

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    let active = true;
    let restoreVersion = 0;

    async function restoreSession() {
      const version = ++restoreVersion;
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = await api('/auth/me');
        if (!result?.user || !roleHome[result.user.role]) {
          throw new Error('The server returned an invalid session');
        }
        if (active && version === restoreVersion && localStorage.getItem(TOKEN_KEY) === token) {
          localStorage.setItem(USER_KEY, JSON.stringify(result.user));
          setUser(result.user);
        }
      } catch (error) {
        if (active && version === restoreVersion && localStorage.getItem(TOKEN_KEY) === token && error.status === 401) {
          clearStoredSession();
        }
        if (active && version === restoreVersion) setUser(null);
      } finally {
        if (active && version === restoreVersion) setIsLoading(false);
      }
    }

    function handleStorage(event) {
      if (!event.key || event.key === TOKEN_KEY || event.key === USER_KEY) restoreSession();
    }

    function handleUnauthorized(event) {
      if (localStorage.getItem(TOKEN_KEY) !== event.detail?.token) return;
      clearStoredSession();
      setUser(null);
      setIsLoading(false);
    }

    restoreSession();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('campushub:unauthorized', handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('campushub:unauthorized', handleUnauthorized);
    };
  }, []);

  async function authenticate(path, values) {
    const result = await api(path, { method: 'POST', body: values });
    if (!result.token || !result.user || !roleHome[result.user.role]) {
      throw new Error('The server returned an invalid session');
    }
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
    setIsLoading(false);
    return result.user;
  }

  function logout() {
    clearStoredSession();
    setUser(null);
    setIsLoading(false);
  }

  const value = useMemo(() => ({
    user,
    isLoading,
    login: (values) => authenticate('/auth/login', values),
    register: (values) => authenticate('/auth/register', values),
    logout,
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
