import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth.service';
import {
  IconBook,
  IconCalendar,
  IconDashboard,
  IconKey,
  IconLogout,
  IconMenu,
  IconPrinter,
  IconUsers,
  IconWrench,
  IconX,
} from './icons';
import { Modal } from './Modal';
import { NotificationBell } from './NotificationBell';

function itemClase({ isActive }: { isActive: boolean }) {
  const base =
    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all duration-200';
  return isActive
    ? `${base} bg-ink text-white shadow-pop`
    : `${base} text-[#3a3a3c] hover:bg-black/[0.05]`;
}

export function Layout() {
  const { usuario, esAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Cambio de contraseña
  const [modalPassword, setModalPassword] = useState(false);
  const [claves, setClaves] = useState({ actual: '', nueva: '', confirmar: '' });
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [exitoClave, setExitoClave] = useState(false);
  const [guardandoClave, setGuardandoClave] = useState(false);

  // Cierra el menú móvil al navegar
  useEffect(() => setMenuAbierto(false), [location.pathname]);

  const salir = () => {
    logout();
    navigate('/login');
  };

  const cambiarClave = async (e: FormEvent) => {
    e.preventDefault();
    setErrorClave(null);
    setExitoClave(false);
    if (claves.nueva !== claves.confirmar) {
      setErrorClave('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setGuardandoClave(true);
    try {
      await authService.cambiarPassword(claves.actual, claves.nueva);
      setExitoClave(true);
      setClaves({ actual: '', nueva: '', confirmar: '' });
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = detalle && Object.values(detalle)[0]?.[0];
      setErrorClave(primerError ?? 'No se pudo cambiar la contraseña.');
    } finally {
      setGuardandoClave(false);
    }
  };

  const iniciales = (usuario?.nombre_completo ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Barra superior móvil */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-black/[0.06] bg-white/70 px-4 backdrop-blur-2xl lg:hidden">
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          className="rounded-full p-2 text-ink transition-colors hover:bg-black/[0.05]"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <p className="text-[15px] font-semibold tracking-tight text-ink">
          KYOCERA<span className="text-kyocera-500">.</span>
        </p>
        <NotificationBell />
      </header>

      {/* Fondo oscurecido del menú móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Barra lateral: vidrio esmerilado (drawer en móvil) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-black/[0.06] bg-white/90 px-4 py-7 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 lg:bg-white/70 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-9 flex items-start justify-between px-2">
          <div>
            <p className="text-[17px] font-semibold tracking-tight text-ink">
              KYOCERA<span className="text-kyocera-500">.</span>
            </p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-silver">
              Mantenimiento
            </p>
          </div>
          <button
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            className="rounded-full p-1.5 text-silver hover:bg-black/[0.05] lg:hidden"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {esAdmin && (
            <NavLink to="/" end className={itemClase}>
              <IconDashboard className="h-[18px] w-[18px]" /> Resumen
            </NavLink>
          )}
          <NavLink to="/calendario" className={itemClase}>
            <IconCalendar className="h-[18px] w-[18px]" /> Calendario
          </NavLink>
          <NavLink to="/ordenes" className={itemClase}>
            <IconWrench className="h-[18px] w-[18px]" /> Órdenes
          </NavLink>
          <NavLink to="/documentos" className={itemClase}>
            <IconBook className="h-[18px] w-[18px]" /> Repositorio
          </NavLink>
          <NavLink to="/equipos" className={itemClase}>
            <IconPrinter className="h-[18px] w-[18px]" /> Equipos
          </NavLink>
          {esAdmin && (
            <NavLink to="/administracion" className={itemClase}>
              <IconUsers className="h-[18px] w-[18px]" /> Administración
            </NavLink>
          )}
        </nav>

        {/* Perfil + acciones */}
        <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-white/80 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
            {iniciales}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">
              {usuario?.nombre_completo}
            </p>
            <p className="text-[11px] text-silver">
              {usuario?.rol === 'ADMIN' ? 'Administrador' : 'Técnico'}
            </p>
          </div>
          <button
            onClick={() => {
              setModalPassword(true);
              setErrorClave(null);
              setExitoClave(false);
            }}
            title="Cambiar contraseña"
            className="rounded-full p-2 text-silver transition-colors hover:bg-black/[0.05] hover:text-ink"
          >
            <IconKey className="h-[16px] w-[16px]" />
          </button>
          <button
            onClick={salir}
            title="Cerrar sesión"
            className="rounded-full p-2 text-silver transition-colors hover:bg-black/[0.05] hover:text-ink"
          >
            <IconLogout className="h-[16px] w-[16px]" />
          </button>
        </div>
      </aside>

      {/* Campana flotante (escritorio) */}
      <div className="fixed right-8 top-7 z-20 hidden lg:block">
        <NotificationBell />
      </div>

      {/* Contenido con transición por ruta */}
      <main className="px-4 pb-10 pt-20 lg:ml-64 lg:px-12 lg:pt-10">
        <div key={location.pathname} className="mx-auto max-w-6xl animate-fade-up">
          <Outlet />
        </div>
      </main>

      {/* Modal: cambiar contraseña */}
      <Modal
        titulo="Cambiar contraseña"
        abierto={modalPassword}
        onCerrar={() => setModalPassword(false)}
        ancho="max-w-md"
      >
        <form onSubmit={cambiarClave} className="space-y-4">
          <div>
            <label htmlFor="p-actual" className="label-field">Contraseña actual</label>
            <input
              id="p-actual"
              type="password"
              required
              autoComplete="current-password"
              value={claves.actual}
              onChange={(e) => setClaves((c) => ({ ...c, actual: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="p-nueva" className="label-field">
              Nueva contraseña (mínimo 10 caracteres)
            </label>
            <input
              id="p-nueva"
              type="password"
              required
              autoComplete="new-password"
              value={claves.nueva}
              onChange={(e) => setClaves((c) => ({ ...c, nueva: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="p-confirmar" className="label-field">Confirmar nueva contraseña</label>
            <input
              id="p-confirmar"
              type="password"
              required
              autoComplete="new-password"
              value={claves.confirmar}
              onChange={(e) => setClaves((c) => ({ ...c, confirmar: e.target.value }))}
              className="input-field"
            />
          </div>

          {errorClave && (
            <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {errorClave}
            </p>
          )}
          {exitoClave && (
            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-700">
              Contraseña actualizada correctamente.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalPassword(false)} className="btn-ghost">
              Cerrar
            </button>
            <button type="submit" disabled={guardandoClave} className="btn-primary">
              {guardandoClave ? 'Guardando…' : 'Actualizar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
