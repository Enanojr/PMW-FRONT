import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Rol } from '../types';

interface Props {
  /** Roles con acceso a la ruta. Sin especificar = cualquier usuario autenticado. */
  roles?: Rol[];
}

/**
 * Ruta protegida por autenticación y rol (RBAC en el cliente).
 * La autoridad final siempre es el backend; esto solo controla la UI.
 */
export function ProtectedRoute({ roles }: Props) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Cargando sesión…
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" state={{ desde: location.pathname }} replace />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
