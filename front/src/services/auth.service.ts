import type { LoginResponse, Usuario } from '../types';
import { api, tokenStorage } from './api';

export const authService = {
  async login(username: string, password: string): Promise<Usuario> {
    const { data } = await api.post<LoginResponse>('/auth/login/', { username, password });
    tokenStorage.set(data.access, data.refresh);
    return data.usuario;
  },

  async perfil(): Promise<Usuario> {
    const { data } = await api.get<Usuario>('/auth/usuarios/yo/');
    return data;
  },

  async cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
    await api.post('/auth/usuarios/cambiar-password/', {
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    });
  },

  logout(): void {
    tokenStorage.clear();
  },

  tieneSesion(): boolean {
    return Boolean(tokenStorage.getRefresh());
  },
};
