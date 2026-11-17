import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('campushub-user') || 'null'); }
    catch { return null; }
  });

  async function authenticate(path, values) {
    const result = await api(path, { method: 'POST', body: values });
    localStorage.setItem('campushub-token', result.token);
    localStorage.setItem('campushub-user', JSON.stringify(result.user));
    setUser(result.user);
    return result.user;
  }

  function logout() {
    localStorage.removeItem('campushub-token');
    localStorage.removeItem('campushub-user');
    setUser(null);
  }

  const value = useMemo(() => ({
    user,
    login: (values) => authenticate('/auth/login', values),
    register: (values) => authenticate('/auth/register', values),
    logout,
  }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
