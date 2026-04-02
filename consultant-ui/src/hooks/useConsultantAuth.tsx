import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, getConsultantToken, setConsultantToken } from '../lib/api';

export interface ConsultantUser {
  id: string;
  full_name: string;
  mobile: string;
  verification_tier: string;
  application_status: string;
  credit_score: number;
  active_contracts_count: number;
  assigned_leads_count: number;
}

type Ctx = {
  user: ConsultantUser | null;
  loading: boolean;
  setSession: (token: string, user: ConsultantUser) => void;
  logout: () => void;
  refresh: () => Promise<void>;
};

const ConsultantAuthContext = createContext<Ctx | null>(null);

export function ConsultantAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ConsultantUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = getConsultantToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get<ConsultantUser>('/consultant/me');
      setUser(res.data);
    } catch {
      setUser(null);
      setConsultantToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSession = useCallback((token: string, u: ConsultantUser) => {
    setConsultantToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setConsultantToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, setSession, logout, refresh }),
    [user, loading, setSession, logout, refresh]
  );

  return <ConsultantAuthContext.Provider value={value}>{children}</ConsultantAuthContext.Provider>;
}

export function useConsultantAuth() {
  const c = useContext(ConsultantAuthContext);
  if (!c) throw new Error('useConsultantAuth outside provider');
  return c;
}
