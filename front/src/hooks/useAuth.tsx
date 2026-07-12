import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '../services/auth.service';
import type { Usuario } from '../types';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  esAdmin: boolean;
  esTecnico: boolean;
  login: (username: string, password: string) => Promise<Usuario>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Rehidrata la sesión al recargar la página
  useEffect(() => {
    if (!authService.tieneSesion()) {
      setCargando(false);
      return;
    }
    authService
      .perfil()
      .then(setUsuario)
      .catch(() => authService.logout())
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await authService.login(username, password);
    setUsuario(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUsuario(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      cargando,
      esAdmin: usuario?.rol === 'ADMIN',
      esTecnico: usuario?.rol === 'TECNICO',
      login,
      logout,
    }),
    [usuario, cargando, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
