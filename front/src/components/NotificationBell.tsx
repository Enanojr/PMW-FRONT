import { useCallback, useEffect, useRef, useState } from 'react';
import { notificacionesService } from '../services/recursos.service';
import type { Notificacion } from '../types';
import { formatearFechaHora } from '../utils/formato';
import { IconBell } from './icons';

/**
 * Campana de notificaciones: badge con no-leídas, panel flotante,
 * marcar leída al hacer clic y sondeo cada 60 s.
 */
export function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(() => {
    notificacionesService
      .listar()
      .then((r) => setNotificaciones(r.results))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 60_000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  // Cierra el panel al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [abierto]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const marcarLeida = async (n: Notificacion) => {
    if (n.leida) return;
    setNotificaciones((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)),
    );
    try {
      await notificacionesService.marcarLeida(n.id);
    } catch {
      cargar();
    }
  };

  const marcarTodas = async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    try {
      await notificacionesService.marcarTodasLeidas();
    } catch {
      cargar();
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white/80 text-ink shadow-card backdrop-blur-xl transition-all duration-200 hover:shadow-pop active:scale-95"
      >
        <IconBell className="h-[18px] w-[18px]" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-kyocera-600 px-1 text-[9px] font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="card absolute right-0 top-12 z-40 w-96 animate-fade-up overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-3.5">
            <p className="text-[14px] font-semibold tracking-tight text-ink">Notificaciones</p>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodas}
                className="text-xs font-semibold text-kyocera-600 transition-colors hover:text-kyocera-700"
              >
                Marcar todas leídas
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notificaciones.slice(0, 15).map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => marcarLeida(n)}
                  className={`flex w-full gap-3 px-5 py-3.5 text-left transition-colors hover:bg-black/[0.02] ${
                    n.leida ? 'opacity-60' : ''
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.leida ? 'bg-transparent' : 'bg-kyocera-500'
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      {n.titulo}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[#3a3a3c]">
                      {n.mensaje}
                    </span>
                    <span className="mt-1 block text-[11px] text-silver">
                      {formatearFechaHora(n.creado_en)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {notificaciones.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-silver">
                Sin notificaciones
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
