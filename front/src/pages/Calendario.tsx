import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { IconChevronLeft, IconChevronRight, IconPlus } from '../components/icons';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { equiposService, mantenimientosService, usuariosService } from '../services/recursos.service';
import type { Equipo, Mantenimiento, TipoMantenimiento, Usuario } from '../types';
import { aFechaISO } from '../utils/formato';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface FormularioServicio {
  equipo: string;
  tecnico_asignado: string;
  tipo: TipoMantenimiento;
  fecha: string;
  descripcion: string;
}

const FORM_VACIO: FormularioServicio = {
  equipo: '',
  tecnico_asignado: '',
  tipo: 'PREVENTIVO',
  fecha: '',
  descripcion: '',
};

/**
 * Vista de calendario mensual.
 * - Admin: vista global, filtro por técnico y programación de servicios.
 * - Técnico: sus mantenimientos (el backend filtra) con acciones de avance.
 */
export function Calendario() {
  const { esAdmin } = useAuth();
  const [cursor, setCursor] = useState(() => new Date());
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('');
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  // Programación (Admin)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState<FormularioServicio>(FORM_VACIO);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avance (Técnico o Admin)
  const [completandoId, setCompletandoId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [accionando, setAccionando] = useState<number | null>(null);

  const anio = cursor.getFullYear();
  const mes = cursor.getMonth();

  useEffect(() => {
    if (esAdmin) {
      usuariosService.tecnicos().then(setTecnicos).catch(() => setTecnicos([]));
    }
  }, [esAdmin]);

  const recargarMes = useCallback(() => {
    const desde = aFechaISO(new Date(anio, mes, 1));
    const hasta = aFechaISO(new Date(anio, mes + 1, 0));
    mantenimientosService
      .listar({ desde, hasta, tecnico_asignado: tecnicoFiltro || undefined, page_size: 200 })
      .then((r) => setMantenimientos(r.results))
      .catch(() => setMantenimientos([]));
  }, [anio, mes, tecnicoFiltro]);

  useEffect(recargarMes, [recargarMes]);

  // Catálogos del formulario al abrir el modal
  useEffect(() => {
    if (!modalAbierto || equipos.length > 0) return;
    equiposService
      .listar({ page_size: 200 })
      .then((r) => setEquipos(r.results))
      .catch(() => setEquipos([]));
  }, [modalAbierto, equipos.length]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Mantenimiento[]>();
    for (const m of mantenimientos) {
      const clave = aFechaISO(new Date(m.fecha_programada));
      mapa.set(clave, [...(mapa.get(clave) ?? []), m]);
    }
    return mapa;
  }, [mantenimientos]);

  const celdas = useMemo(() => {
    const primerDia = new Date(anio, mes, 1);
    const offset = (primerDia.getDay() + 6) % 7;
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const resultado: (Date | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= diasEnMes; d++) resultado.push(new Date(anio, mes, d));
    return resultado;
  }, [anio, mes]);

  const eventosDia = diaSeleccionado ? porDia.get(diaSeleccionado) ?? [] : [];
  const hoy = aFechaISO(new Date());

  const cambiar = (campo: keyof FormularioServicio, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const programar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await mantenimientosService.crear({
        equipo: Number(form.equipo),
        tecnico_asignado: Number(form.tecnico_asignado),
        tipo: form.tipo,
        fecha_programada: new Date(form.fecha).toISOString(),
        descripcion: form.descripcion.trim(),
      });
      setModalAbierto(false);
      setForm(FORM_VACIO);
      recargarMes();
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = detalle && Object.values(detalle)[0]?.[0];
      setError(primerError ?? 'No se pudo programar el servicio.');
    } finally {
      setGuardando(false);
    }
  };

  const iniciar = async (m: Mantenimiento) => {
    setAccionando(m.id);
    try {
      await mantenimientosService.actualizar(m.id, {
        estatus: 'EN_PROCESO',
        fecha_inicio_real: new Date().toISOString(),
      });
      recargarMes();
    } finally {
      setAccionando(null);
    }
  };

  const completar = async (m: Mantenimiento) => {
    setAccionando(m.id);
    try {
      await mantenimientosService.actualizar(m.id, {
        estatus: 'COMPLETADO',
        fecha_fin_real: new Date().toISOString(),
        observaciones_tecnico: observaciones.trim(),
      });
      setCompletandoId(null);
      setObservaciones('');
      recargarMes();
    } finally {
      setAccionando(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title">Calendario</h2>
          <p className="page-subtitle">
            {esAdmin ? 'Vista global de mantenimientos' : 'Tus mantenimientos asignados'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {esAdmin && (
            <>
              <select
                value={tecnicoFiltro}
                onChange={(e) => setTecnicoFiltro(e.target.value)}
                className="input-field w-auto"
              >
                <option value="">Todos los técnicos</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                ))}
              </select>
              <button onClick={() => setModalAbierto(true)} className="btn-primary">
                <IconPlus className="h-4 w-4" /> Programar servicio
              </button>
            </>
          )}
          <button
            onClick={() => setCursor(new Date(anio, mes - 1, 1))}
            className="btn-ghost !px-2.5"
            aria-label="Mes anterior"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-[15px] font-semibold tracking-tight text-ink">
            {MESES[mes]} {anio}
          </span>
          <button
            onClick={() => setCursor(new Date(anio, mes + 1, 1))}
            className="btn-ghost !px-2.5"
            aria-label="Mes siguiente"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Rejilla del mes */}
        <section className="card p-5 xl:col-span-2">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-silver">
            {DIAS.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((fecha, i) => {
              if (!fecha) return <div key={`v-${i}`} />;
              const clave = aFechaISO(fecha);
              const eventos = porDia.get(clave) ?? [];
              const seleccionado = diaSeleccionado === clave;
              return (
                <button
                  key={clave}
                  onClick={() => setDiaSeleccionado(clave)}
                  className={`min-h-20 rounded-xl p-1.5 text-left transition-all duration-200 ${
                    seleccionado
                      ? 'bg-black/[0.05] ring-1 ring-black/15'
                      : 'hover:bg-black/[0.03]'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                      clave === hoy ? 'bg-kyocera-600 text-white' : 'text-[#3a3a3c]'
                    }`}
                  >
                    {fecha.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {eventos.slice(0, 2).map((m) => (
                      <p
                        key={m.id}
                        className={`flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-[10px] font-medium ${
                          m.tipo === 'PREVENTIVO'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        <span
                          className={`h-1 w-1 shrink-0 rounded-full ${
                            m.tipo === 'PREVENTIVO' ? 'bg-sky-500' : 'bg-amber-500'
                          }`}
                        />
                        {m.equipo_detalle.numero_serie}
                      </p>
                    ))}
                    {eventos.length > 2 && (
                      <p className="px-1 text-[10px] text-silver">+{eventos.length - 2} más</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-4 flex gap-5 border-t border-black/[0.05] pt-4 text-[11px] text-silver">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Preventivo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Correctivo
            </span>
          </div>
        </section>

        {/* Detalle del día */}
        <section className="card p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">
            {diaSeleccionado ? `Servicios del ${diaSeleccionado}` : 'Selecciona un día'}
          </h3>
          <ul className="mt-4 space-y-3">
            {eventosDia.map((m) => (
              <li key={m.id} className="rounded-xl border border-black/[0.06] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {m.equipo_detalle.modelo_nombre} · {m.equipo_detalle.numero_serie}
                  </p>
                  <StatusBadge codigo={m.estatus} etiqueta={m.estatus_display} />
                </div>
                <p className="mt-1 text-xs text-silver">
                  {m.tipo_display} · Técnico: {m.tecnico_detalle.nombre_completo}
                </p>
                {m.descripcion && (
                  <p className="mt-2 text-xs text-[#3a3a3c]">{m.descripcion}</p>
                )}
                {m.observaciones_tecnico && (
                  <p className="mt-2 rounded-lg bg-black/[0.03] p-2 text-xs text-[#3a3a3c]">
                    <span className="font-medium">Observaciones:</span> {m.observaciones_tecnico}
                  </p>
                )}

                {/* Acciones de avance */}
                {['PROGRAMADO', 'REPROGRAMADO'].includes(m.estatus) && (
                  <button
                    onClick={() => iniciar(m)}
                    disabled={accionando === m.id}
                    className="btn-primary mt-3 !px-4 !py-1.5 !text-xs"
                  >
                    {accionando === m.id ? 'Guardando…' : 'Iniciar servicio'}
                  </button>
                )}
                {m.estatus === 'EN_PROCESO' && completandoId !== m.id && (
                  <button
                    onClick={() => {
                      setCompletandoId(m.id);
                      setObservaciones('');
                    }}
                    className="btn-primary mt-3 !px-4 !py-1.5 !text-xs"
                  >
                    Completar servicio
                  </button>
                )}
                {completandoId === m.id && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={2}
                      autoFocus
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones del servicio…"
                      className="input-field resize-none !text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => completar(m)}
                        disabled={accionando === m.id}
                        className="btn-primary !px-4 !py-1.5 !text-xs"
                      >
                        {accionando === m.id ? 'Guardando…' : 'Confirmar'}
                      </button>
                      <button
                        onClick={() => setCompletandoId(null)}
                        className="btn-ghost !px-4 !py-1.5 !text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {diaSeleccionado && eventosDia.length === 0 && (
              <li className="py-6 text-center text-sm text-silver">Sin servicios este día</li>
            )}
          </ul>
        </section>
      </div>

      {/* Modal: programar servicio (Admin) */}
      <Modal
        titulo="Programar servicio"
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
      >
        <form onSubmit={programar} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="s-equipo" className="label-field">Equipo *</label>
              <select
                id="s-equipo"
                required
                value={form.equipo}
                onChange={(e) => cambiar('equipo', e.target.value)}
                className="input-field"
              >
                <option value="">Selecciona…</option>
                {equipos.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.modelo_nombre} · {eq.numero_serie}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="s-tecnico" className="label-field">Técnico *</label>
              <select
                id="s-tecnico"
                required
                value={form.tecnico_asignado}
                onChange={(e) => cambiar('tecnico_asignado', e.target.value)}
                className="input-field"
              >
                <option value="">Selecciona…</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Tipo *</label>
              <div className="inline-flex w-full rounded-full bg-black/[0.05] p-1">
                {(['PREVENTIVO', 'CORRECTIVO'] as TipoMantenimiento[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => cambiar('tipo', t)}
                    className={`flex-1 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                      form.tipo === t ? 'bg-white text-ink shadow-card' : 'text-silver hover:text-ink'
                    }`}
                  >
                    {t === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="s-fecha" className="label-field">Fecha y hora *</label>
              <input
                id="s-fecha"
                type="datetime-local"
                required
                value={form.fecha}
                onChange={(e) => cambiar('fecha', e.target.value)}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="s-descripcion" className="label-field">Descripción</label>
              <textarea
                id="s-descripcion"
                rows={3}
                value={form.descripcion}
                onChange={(e) => cambiar('descripcion', e.target.value)}
                placeholder="Detalle del servicio a realizar…"
                className="input-field resize-none"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalAbierto(false)} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Programando…' : 'Programar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
