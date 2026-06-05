import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { api } from '@/lib/api';

type AppRole = 'employee' | 'agent' | 'manager' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  department_id: string | null;
  group_id: string | null;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  totpEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; requires2FA?: boolean; tempToken?: string }>;
  verify2FA: (tempToken: string, code: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeProfile = (p: any): Profile | null => p ? {
    id: p.id,
    user_id: p.userId || p.user_id,
    email: p.email,
    name: p.name,
    avatar_url: p.avatarUrl || p.avatar_url,
    department_id: p.departmentId || p.department_id,
    group_id: p.groupId || p.group_id,
  } : null;

  const refreshProfile = async () => {
    const { user: u, profile: p } = await api.getMe();
    if (u) {
      setUser(u);
      setRole((u.role as AppRole) ?? 'employee');
    }
    setProfile(normalizeProfile(p));
  };

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then(({ user: u, profile: p }) => {
          setUser(u);
          setProfile(normalizeProfile(p));
          setRole((u.role as AppRole) ?? 'employee');
        })
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await api.login(email, password);

      if (result.requires2FA) {
        return { error: null, requires2FA: true, tempToken: result.tempToken };
      }

      api.setToken(result.token!);
      setUser(result.user!);
      setRole((result.user!.role as AppRole) ?? 'employee');

      // Fetch profile
      try {
        const { profile: p } = await api.getMe();
        if (p) {
          setProfile(normalizeProfile(p));
        }
      } catch {}

      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message) };
    }
  };

  const verify2FA = async (tempToken: string, code: string) => {
    try {
      const result = await api.verify2FA(tempToken, code);
      api.setToken(result.token);
      setUser(result.user);
      setRole((result.user.role as AppRole) ?? 'employee');

      try {
        const { profile: p } = await api.getMe();
        if (p) {
          setProfile(normalizeProfile(p));
        }
      } catch {}

      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message) };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await api.register(email, password, name);
      api.setToken(result.token);
      setUser(result.user);
      setRole((result.user.role as AppRole) ?? 'employee');
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message) };
    }
  };

  const signOut = async () => {
    api.setToken(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, refreshProfile, signIn, verify2FA, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
