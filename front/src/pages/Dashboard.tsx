import { useEffect, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import {
  mantenimientosService,
  ordenesService,
  reportesService,
} from '../services/recursos.service';
import type {
  DashboardResumen,
  EsquemaEquipo,
  EstadoEquipo,
  Mantenimiento,
  OrdenTrabajo,
} from '../types';
import { formatearFechaHora } from '../utils/formato';

const ESTADOS: { clave: EstadoEquipo; etiqueta: string; color: string }[] = [
  { clave: 'OPERATIVO', etiqueta: 'Operativos', color: 'bg-emerald-500' },
  { clave: 'EN_MANTENIMIENTO', etiqueta: 'En mantenimiento', color: 'bg-amber-500' },
  { clave: 'FUERA_DE_SERVICIO', etiqueta: 'Fuera de servicio', color: 'bg-red-500' },
  { clave: 'BAJA', etiqueta: 'Dados de baja', color: 'bg-slate-400' },
];

const ESQUEMAS: { clave: EsquemaEquipo; etiqueta: string; color: string }[] = [
  { clave: 'ARRENDAMIENTO', etiqueta: 'Arrendamiento', color: 'bg-indigo-500' },
  { clave: 'POLIZA', etiqueta: 'Póliza de soporte', color: 'bg-sky-500' },
  { clave: 'PROPIO', etiqueta: 'Propios', color: 'bg-slate-500' },
];

/** Dashboard gerencial (solo Administrador): estatus general de la operación. */
export function Dashboard() {
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      reportesService.resumen(),
      mantenimientosService.listar({ ordering: 'fecha_programada' }),
      ordenesService.listar({ ordering: '-creado_en' }),
    ])
      .then(([res, mant, ord]) => {
        setResumen(res);
        setMantenimientos(mant.results);
        setOrdenes(ord.results);
      })
      .catch(() => setError('No se pudo cargar la información del dashboard.'));
  }, []);

  const totalEquipos = resumen?.equipos.total ?? 0;

  const tarjetas = [
    { etiqueta: 'Equipos registrados', valor: totalEquipos },
    { etiqueta: 'Órdenes abiertas', valor: resumen?.ordenes.abiertas ?? 0 },
    { etiqueta: 'Servicios próximos 7 días', valor: resumen?.mantenimientos.proximos_7_dias ?? 0 },
    { etiqueta: 'Técnicos activos', valor: resumen?.tecnicos_activos ?? 0 },
  ];

  const secundarias = [
    { etiqueta: 'Mantenimientos en proceso', valor: resumen?.mantenimientos.en_proceso ?? 0 },
    { etiqueta: 'Completados este mes', valor: resumen?.mantenimientos.completados_mes ?? 0 },
    { etiqueta: 'Órdenes cerradas este mes', valor: resumen?.ordenes.cerradas_mes ?? 0 },
    { etiqueta: 'Documentos en repositorio', valor: resumen?.documentos ?? 0 },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h2 className="page-title">Resumen</h2>
        <p className="page-subtitle">Estado general de los equipos y servicios</p>
      </header>

      {error && (
        <p className="rounded-xl bg-kyocera-50 px-4 py-3 text-sm text-kyocera-700">{error}</p>
      )}

      {/* Indicadores principales */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((t) => (
          <article key={t.etiqueta} className="card p-6">
            <p className="text-[13px] font-medium text-silver">{t.etiqueta}</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-ink">{t.valor}</p>
          </article>
        ))}
      </section>

      {/* Distribución de equipos por estado */}
      <section className="card p-6">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">
          Parque de equipos por estado
        </h3>
        {totalEquipos > 0 ? (
          <>
            <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full">
              {ESTADOS.map(({ clave, color }) => {
                const cantidad = resumen?.equipos.por_estado[clave] ?? 0;
                if (cantidad === 0) return null;
                return (
                  <div
                    key={clave}
                    className={`${color} transition-all duration-500`}
                    style={{ width: `${(cantidad / totalEquipos) * 100}%` }}
                  />
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {ESTADOS.map(({ clave, etiqueta, color }) => (
                <span key={clave} className="inline-flex items-center gap-1.5 text-[13px] text-[#3a3a3c]">
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  {etiqueta}
                  <span className="font-semibold text-ink">
                    {resumen?.equipos.por_estado[clave] ?? 0}
                  </span>
                </span>
              ))}
            </div>

            {/* Distribución por esquema comercial */}
            <div className="mt-6 border-t border-black/[0.05] pt-5">
              <p className="text-[13px] font-medium text-silver">Por esquema comercial</p>
              <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
                {ESQUEMAS.map(({ clave, color }) => {
                  const cantidad = resumen?.equipos.por_esquema[clave] ?? 0;
                  if (cantidad === 0) return null;
                  return (
                    <div
                      key={clave}
                      className={`${color} transition-all duration-500`}
                      style={{ width: `${(cantidad / totalEquipos) * 100}%` }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {ESQUEMAS.map(({ clave, etiqueta, color }) => (
                  <span key={clave} className="inline-flex items-center gap-1.5 text-[13px] text-[#3a3a3c]">
                    <span className={`h-2 w-2 rounded-full ${color}`} />
                    {etiqueta}
                    <span className="font-semibold text-ink">
                      {resumen?.equipos.por_esquema[clave] ?? 0}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-silver">Aún no hay equipos registrados</p>
        )}
      </section>

      {/* Indicadores secundarios */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {secundarias.map((t) => (
          <article key={t.etiqueta} className="card p-5">
            <p className="text-2xl font-semibold tracking-tight text-ink">{t.valor}</p>
            <p className="mt-1 text-xs text-silver">{t.etiqueta}</p>
          </article>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Próximos mantenimientos */}
        <section className="card p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">
            Próximos mantenimientos
          </h3>
          <ul className="mt-4 divide-y divide-black/[0.04]">
            {mantenimientos.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {m.equipo_detalle.modelo_nombre} · {m.equipo_detalle.numero_serie}
                  </p>
                  <p className="mt-0.5 text-xs text-silver">
                    {m.tipo_display} · {m.tecnico_detalle.nombre_completo} ·{' '}
                    {formatearFechaHora(m.fecha_programada)}
                  </p>
                </div>
                <StatusBadge codigo={m.estatus} etiqueta={m.estatus_display} />
              </li>
            ))}
            {mantenimientos.length === 0 && (
              <li className="py-8 text-center text-sm text-silver">
                Sin mantenimientos programados
              </li>
            )}
          </ul>
        </section>

        {/* Órdenes recientes */}
        <section className="card p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">
            Órdenes de trabajo recientes
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-silver">
                  <th className="pb-2.5 pr-3">Folio</th>
                  <th className="pb-2.5 pr-3">Equipo</th>
                  <th className="pb-2.5 pr-3">Prioridad</th>
                  <th className="pb-2.5">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {ordenes.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-3 font-mono text-xs text-silver">{o.folio}</td>
                    <td className="py-3 pr-3 font-medium text-ink">
                      {o.equipo_detalle.numero_serie}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge codigo={o.prioridad} etiqueta={o.prioridad_display} />
                    </td>
                    <td className="py-3">
                      <StatusBadge codigo={o.estatus} etiqueta={o.estatus_display} />
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-silver">
                      Sin órdenes registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
