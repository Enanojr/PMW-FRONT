import { useEffect, useState, type FormEvent } from 'react';
import { IconDoc, IconPlus, IconUpload, IconX } from '../components/icons';
import { Paginacion } from '../components/Paginacion';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import {
  documentosService,
  equiposService,
  ordenesService,
  refaccionesService,
  tiposOrdenService,
  usuariosService,
} from '../services/recursos.service';
import type {
  Documento,
  Equipo,
  EstatusOrden,
  OrdenTrabajo,
  Prioridad,
  Refaccion,
  TipoOrden,
  Usuario,
} from '../types';
import { formatearBytes, formatearFechaHora } from '../utils/formato';

interface RefaccionUsada {
  refaccion: number;
  cantidad: number;
}

const ESTATUS: { valor: EstatusOrden | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'ABIERTA', etiqueta: 'Abiertas' },
  { valor: 'ASIGNADA', etiqueta: 'Asignadas' },
  { valor: 'EN_PROCESO', etiqueta: 'En proceso' },
  { valor: 'CERRADA', etiqueta: 'Cerradas' },
  { valor: 'CANCELADA', etiqueta: 'Canceladas' },
];

const PRIORIDADES: { valor: Prioridad; etiqueta: string }[] = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'URGENTE', etiqueta: 'Urgente' },
];

interface FormularioOrden {
  tipo: string;
  equipo: string;
  tecnico_asignado: string;
  prioridad: Prioridad;
  descripcion_problema: string;
}

const FORM_VACIO: FormularioOrden = {
  tipo: '',
  equipo: '',
  tecnico_asignado: '',
  prioridad: 'MEDIA',
  descripcion_problema: '',
};

/**
 * Órdenes de trabajo.
 * - Admin: ve todas y puede crear nuevas órdenes asignando técnico.
 * - Técnico: solo ve las suyas (el backend filtra) y reporta avance.
 */
export function Ordenes() {
  const { esAdmin, esTecnico } = useAuth();
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [estatus, setEstatus] = useState<EstatusOrden | ''>('');
  const [expandida, setExpandida] = useState<number | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);

  // Registro de avance (diagnóstico / trabajo realizado / refacciones)
  const [avance, setAvance] = useState({ diagnostico: '', trabajo_realizado: '' });
  const [refaccionesUsadas, setRefaccionesUsadas] = useState<RefaccionUsada[]>([]);
  const [catalogoRefacciones, setCatalogoRefacciones] = useState<Refaccion[]>([]);
  const [nuevaRefaccion, setNuevaRefaccion] = useState({ refaccion: '', cantidad: '1' });
  const [guardandoAvance, setGuardandoAvance] = useState(false);
  const [avanceGuardado, setAvanceGuardado] = useState(false);
  const [errorAvance, setErrorAvance] = useState<string | null>(null);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  // Evidencias y documentos de la orden expandida
  const [documentosOrden, setDocumentosOrden] = useState<Documento[]>([]);
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);

  // Edición / eliminación (Admin)
  const [editandoOrden, setEditandoOrden] = useState(false);
  const [edicion, setEdicion] = useState({ prioridad: 'MEDIA' as Prioridad, tecnico_asignado: '', descripcion_problema: '' });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Estado del formulario de nueva orden (solo Admin)
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<FormularioOrden>(FORM_VACIO);
  const [tipos, setTipos] = useState<TipoOrden[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = () => {
    ordenesService
      .listar({ estatus: estatus || undefined, page: pagina })
      .then((r) => {
        setOrdenes(r.results);
        setTotal(r.count);
      })
      .catch(() => setOrdenes([]));
  };

  useEffect(cargar, [estatus, pagina]);
  useEffect(() => setPagina(1), [estatus]);

  // Catálogos del formulario, solo cuando el Admin lo abre por primera vez
  useEffect(() => {
    if (!esAdmin || !mostrarForm || tipos.length > 0) return;
    Promise.all([
      tiposOrdenService.listar(),
      equiposService.listar({ page_size: 200 }),
      usuariosService.tecnicos(),
    ])
      .then(([t, eq, tec]) => {
        setTipos(t.results);
        setEquipos(eq.results);
        setTecnicos(tec);
      })
      .catch(() => setError('No se pudieron cargar los catálogos. Verifica que existan tipos de orden.'));
  }, [esAdmin, mostrarForm, tipos.length]);

  const cambiar = (campo: keyof FormularioOrden, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const crearOrden = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    setCreando(true);
    try {
      const creada = await ordenesService.crear({
        tipo: Number(form.tipo),
        equipo: Number(form.equipo),
        tecnico_asignado: form.tecnico_asignado ? Number(form.tecnico_asignado) : null,
        prioridad: form.prioridad,
        estatus: form.tecnico_asignado ? 'ASIGNADA' : 'ABIERTA',
        descripcion_problema: form.descripcion_problema.trim(),
      });
      setExito(`Orden ${creada.folio} creada correctamente.`);
      setForm(FORM_VACIO);
      setMostrarForm(false);
      cargar();
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = detalle && Object.values(detalle)[0]?.[0];
      setError(primerError ?? 'No se pudo crear la orden. Revisa los datos.');
    } finally {
      setCreando(false);
    }
  };

  const cargarDocumentos = (ordenId: number) => {
    documentosService
      .listar({ orden_trabajo: ordenId, page_size: 200 })
      .then((r) => setDocumentosOrden(r.results))
      .catch(() => setDocumentosOrden([]));
  };

  const expandir = (orden: OrdenTrabajo) => {
    const abrir = expandida !== orden.id;
    setExpandida(abrir ? orden.id : null);
    setAvanceGuardado(false);
    setErrorAvance(null);
    setEditandoOrden(false);
    setConfirmandoEliminar(false);
    setArchivoEvidencia(null);
    setDocumentosOrden([]);
    if (abrir) {
      setAvance({
        diagnostico: orden.diagnostico,
        trabajo_realizado: orden.trabajo_realizado,
      });
      setEdicion({
        prioridad: orden.prioridad,
        tecnico_asignado: orden.tecnico_asignado ? String(orden.tecnico_asignado) : '',
        descripcion_problema: orden.descripcion_problema,
      });
      setRefaccionesUsadas(
        orden.refacciones_utilizadas.map((r) => ({ refaccion: r.refaccion, cantidad: r.cantidad })),
      );
      cargarDocumentos(orden.id);
      if (catalogoRefacciones.length === 0) {
        refaccionesService
          .listar()
          .then((r) => setCatalogoRefacciones(r.results))
          .catch(() => setCatalogoRefacciones([]));
      }
      if (esAdmin && tecnicos.length === 0) {
        usuariosService.tecnicos().then(setTecnicos).catch(() => setTecnicos([]));
      }
    }
  };

  const subirEvidencia = async (orden: OrdenTrabajo) => {
    if (!archivoEvidencia) return;
    setSubiendoEvidencia(true);
    setErrorAvance(null);
    try {
      await ordenesService.subirEvidencia(orden.id, archivoEvidencia);
      setArchivoEvidencia(null);
      cargarDocumentos(orden.id);
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = detalle && Object.values(detalle)[0]?.[0];
      setErrorAvance(primerError ?? 'No se pudo subir la evidencia.');
    } finally {
      setSubiendoEvidencia(false);
    }
  };

  const guardarEdicion = async (orden: OrdenTrabajo) => {
    setGuardandoEdicion(true);
    setErrorAvance(null);
    try {
      await ordenesService.actualizar(orden.id, {
        prioridad: edicion.prioridad,
        tecnico_asignado: edicion.tecnico_asignado ? Number(edicion.tecnico_asignado) : null,
        descripcion_problema: edicion.descripcion_problema.trim(),
      });
      setEditandoOrden(false);
      cargar();
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = detalle && Object.values(detalle)[0]?.[0];
      setErrorAvance(primerError ?? 'No se pudo guardar la edición.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarOrden = async (orden: OrdenTrabajo) => {
    setEliminando(true);
    setErrorAvance(null);
    try {
      await ordenesService.eliminar(orden.id);
      setExpandida(null);
      setConfirmandoEliminar(false);
      cargar();
    } catch {
      setErrorAvance('No se pudo eliminar la orden.');
    } finally {
      setEliminando(false);
    }
  };

  const agregarRefaccion = () => {
    const id = Number(nuevaRefaccion.refaccion);
    const cantidad = Math.max(1, Number(nuevaRefaccion.cantidad) || 1);
    if (!id || refaccionesUsadas.some((r) => r.refaccion === id)) return;
    setRefaccionesUsadas((prev) => [...prev, { refaccion: id, cantidad }]);
    setNuevaRefaccion({ refaccion: '', cantidad: '1' });
  };

  const nombreRefaccion = (id: number) => {
    const r = catalogoRefacciones.find((x) => x.id === id);
    return r ? `${r.codigo} — ${r.nombre}` : `Refacción #${id}`;
  };

  const guardarAvance = async (orden: OrdenTrabajo) => {
    setGuardandoAvance(true);
    setAvanceGuardado(false);
    setErrorAvance(null);
    try {
      await ordenesService.actualizar(orden.id, {
        diagnostico: avance.diagnostico.trim(),
        trabajo_realizado: avance.trabajo_realizado.trim(),
        // El backend repone el stock previo y descuenta esta lista completa
        refacciones_utilizadas: refaccionesUsadas as never,
      });
      setAvanceGuardado(true);
      cargar();
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> | string[] } }).response?.data;
      const primerError = Array.isArray(detalle)
        ? detalle[0]
        : detalle && Object.values(detalle)[0]?.[0];
      setErrorAvance(String(primerError ?? 'No se pudo guardar el avance.'));
    } finally {
      setGuardandoAvance(false);
    }
  };

  const avanzarEstatus = async (orden: OrdenTrabajo) => {
    const siguiente: Partial<Record<EstatusOrden, EstatusOrden>> = {
      ASIGNADA: 'EN_PROCESO',
      EN_PROCESO: 'CERRADA',
    };
    const nuevo = siguiente[orden.estatus];
    if (!nuevo) return;
    setGuardando(orden.id);
    try {
      await ordenesService.actualizar(orden.id, {
        estatus: nuevo,
        ...(nuevo === 'CERRADA' ? { fecha_cierre: new Date().toISOString() } : {}),
      });
      cargar();
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title">Órdenes de trabajo</h2>
          <p className="page-subtitle">
            {esTecnico ? 'Órdenes asignadas a ti' : 'Todas las órdenes de la operación'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={estatus}
            onChange={(e) => setEstatus(e.target.value as EstatusOrden | '')}
            className="input-field w-auto"
          >
            {ESTATUS.map((e) => (
              <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
            ))}
          </select>
          {esAdmin && (
            <button
              onClick={() => {
                setMostrarForm((v) => !v);
                setError(null);
                setExito(null);
              }}
              className={mostrarForm ? 'btn-ghost' : 'btn-primary'}
            >
              {mostrarForm ? 'Cancelar' : (<><IconPlus className="h-4 w-4" /> Nueva orden</>)}
            </button>
          )}
        </div>
      </header>

      {exito && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{exito}</p>
      )}

      {/* Formulario de nueva orden (solo Admin) */}
      {esAdmin && mostrarForm && (
        <form onSubmit={crearOrden} className="card animate-fade-up p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">
            Nueva orden de trabajo
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="tipo" className="label-field">Tipo de orden *</label>
              <select
                id="tipo"
                required
                value={form.tipo}
                onChange={(e) => cambiar('tipo', e.target.value)}
                className="input-field"
              >
                <option value="">Selecciona…</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
              {tipos.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No hay tipos de orden. Créalos en el Django Admin (Tipos de orden).
                </p>
              )}
            </div>
            <div>
              <label htmlFor="equipo" className="label-field">Equipo *</label>
              <select
                id="equipo"
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
              <label htmlFor="tecnico" className="label-field">Técnico asignado</label>
              <select
                id="tecnico"
                value={form.tecnico_asignado}
                onChange={(e) => cambiar('tecnico_asignado', e.target.value)}
                className="input-field"
              >
                <option value="">Sin asignar (queda Abierta)</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prioridad" className="label-field">Prioridad</label>
              <select
                id="prioridad"
                value={form.prioridad}
                onChange={(e) => cambiar('prioridad', e.target.value)}
                className="input-field"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="problema" className="label-field">Descripción del problema *</label>
              <textarea
                id="problema"
                required
                rows={3}
                value={form.descripcion_problema}
                onChange={(e) => cambiar('descripcion_problema', e.target.value)}
                placeholder="Describe la falla reportada o el trabajo a realizar…"
                className="input-field resize-none"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={creando} className="btn-primary mt-5">
            {creando ? 'Creando…' : 'Crear orden'}
          </button>
        </form>
      )}

      <ul className="space-y-3">
        {ordenes.map((o) => (
          <li key={o.id} className="card overflow-hidden transition-shadow hover:shadow-pop">
            <button
              onClick={() => expandir(o)}
              className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-medium text-silver">{o.folio}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {o.equipo_detalle.modelo_nombre} · {o.equipo_detalle.numero_serie}
                  </p>
                  <p className="mt-0.5 text-xs text-silver">
                    {o.tipo_detalle.nombre} · {formatearFechaHora(o.creado_en)}
                    {o.tecnico_detalle && ` · ${o.tecnico_detalle.nombre_completo}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge codigo={o.prioridad} etiqueta={o.prioridad_display} />
                <StatusBadge codigo={o.estatus} etiqueta={o.estatus_display} />
              </div>
            </button>

            {expandida === o.id && (
              <div className="animate-fade-up space-y-4 border-t border-black/[0.05] p-5 text-sm">
                {/* Herramientas del Administrador */}
                {esAdmin && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditandoOrden((v) => !v);
                        setConfirmandoEliminar(false);
                      }}
                      className="btn-ghost !px-4 !py-1.5 !text-xs"
                    >
                      {editandoOrden ? 'Cancelar edición' : 'Editar orden'}
                    </button>
                    {confirmandoEliminar ? (
                      <>
                        <button
                          onClick={() => eliminarOrden(o)}
                          disabled={eliminando}
                          className="btn-accent !px-4 !py-1.5 !text-xs"
                        >
                          {eliminando ? 'Eliminando…' : '¿Confirmar eliminación?'}
                        </button>
                        <button
                          onClick={() => setConfirmandoEliminar(false)}
                          className="btn-ghost !px-4 !py-1.5 !text-xs"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmandoEliminar(true)}
                        className="btn-ghost !px-4 !py-1.5 !text-xs !text-kyocera-600"
                      >
                        Eliminar orden
                      </button>
                    )}
                  </div>
                )}

                {/* Edición de la orden (Admin) */}
                {esAdmin && editandoOrden && (
                  <div className="animate-fade-up rounded-xl border border-black/[0.06] p-4">
                    <p className="text-[13px] font-semibold text-ink">Editar orden</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="label-field" htmlFor={`ed-prio-${o.id}`}>Prioridad</label>
                        <select
                          id={`ed-prio-${o.id}`}
                          value={edicion.prioridad}
                          onChange={(e) =>
                            setEdicion((ed) => ({ ...ed, prioridad: e.target.value as Prioridad }))
                          }
                          className="input-field"
                        >
                          {PRIORIDADES.map((p) => (
                            <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label-field" htmlFor={`ed-tec-${o.id}`}>Técnico asignado</label>
                        <select
                          id={`ed-tec-${o.id}`}
                          value={edicion.tecnico_asignado}
                          onChange={(e) =>
                            setEdicion((ed) => ({ ...ed, tecnico_asignado: e.target.value }))
                          }
                          className="input-field"
                        >
                          <option value="">Sin asignar</option>
                          {tecnicos.map((t) => (
                            <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="label-field" htmlFor={`ed-desc-${o.id}`}>
                          Descripción del problema
                        </label>
                        <textarea
                          id={`ed-desc-${o.id}`}
                          rows={2}
                          value={edicion.descripcion_problema}
                          onChange={(e) =>
                            setEdicion((ed) => ({ ...ed, descripcion_problema: e.target.value }))
                          }
                          className="input-field resize-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => guardarEdicion(o)}
                      disabled={guardandoEdicion}
                      className="btn-primary mt-3 !px-4 !py-2 !text-xs"
                    >
                      {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-silver">
                    Problema reportado
                  </p>
                  <p className="mt-1 text-[#3a3a3c]">{o.descripcion_problema}</p>
                </div>
                {/* Avance: editable mientras la orden está activa */}
                {['ASIGNADA', 'EN_PROCESO'].includes(o.estatus) ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="label-field" htmlFor={`diag-${o.id}`}>Diagnóstico</label>
                      <textarea
                        id={`diag-${o.id}`}
                        rows={3}
                        value={avance.diagnostico}
                        onChange={(e) =>
                          setAvance((a) => ({ ...a, diagnostico: e.target.value }))
                        }
                        placeholder="Diagnóstico del problema…"
                        className="input-field resize-none"
                      />
                    </div>
                    <div>
                      <label className="label-field" htmlFor={`trab-${o.id}`}>Trabajo realizado</label>
                      <textarea
                        id={`trab-${o.id}`}
                        rows={3}
                        value={avance.trabajo_realizado}
                        onChange={(e) =>
                          setAvance((a) => ({ ...a, trabajo_realizado: e.target.value }))
                        }
                        placeholder="Actividades realizadas…"
                        className="input-field resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {o.diagnostico && (
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-silver">
                          Diagnóstico
                        </p>
                        <p className="mt-1 text-[#3a3a3c]">{o.diagnostico}</p>
                      </div>
                    )}
                    {o.trabajo_realizado && (
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-silver">
                          Trabajo realizado
                        </p>
                        <p className="mt-1 text-[#3a3a3c]">{o.trabajo_realizado}</p>
                      </div>
                    )}
                  </>
                )}
                {/* Refacciones: editables mientras la orden está activa */}
                {['ASIGNADA', 'EN_PROCESO'].includes(o.estatus) ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-silver">
                      Refacciones utilizadas
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {refaccionesUsadas.map((r) => (
                        <li
                          key={r.refaccion}
                          className="flex items-center justify-between gap-2 rounded-lg bg-black/[0.03] px-3 py-2 text-[13px]"
                        >
                          <span className="text-[#3a3a3c]">
                            {nombreRefaccion(r.refaccion)} × {r.cantidad}
                          </span>
                          <button
                            onClick={() =>
                              setRefaccionesUsadas((prev) =>
                                prev.filter((x) => x.refaccion !== r.refaccion),
                              )
                            }
                            aria-label="Quitar refacción"
                            className="rounded-full p-1 text-silver hover:bg-black/[0.06] hover:text-ink"
                          >
                            <IconX className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                      {refaccionesUsadas.length === 0 && (
                        <li className="text-xs text-silver">Sin refacciones registradas</li>
                      )}
                    </ul>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <select
                        value={nuevaRefaccion.refaccion}
                        onChange={(e) =>
                          setNuevaRefaccion((n) => ({ ...n, refaccion: e.target.value }))
                        }
                        className="input-field !w-auto min-w-52 flex-1 !py-2 !text-xs"
                      >
                        <option value="">Agregar refacción…</option>
                        {catalogoRefacciones
                          .filter((r) => !refaccionesUsadas.some((u) => u.refaccion === r.id))
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.codigo} — {r.nombre} (stock: {r.existencias})
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={nuevaRefaccion.cantidad}
                        onChange={(e) =>
                          setNuevaRefaccion((n) => ({ ...n, cantidad: e.target.value }))
                        }
                        className="input-field !w-20 !py-2 !text-xs"
                        aria-label="Cantidad"
                      />
                      <button
                        onClick={agregarRefaccion}
                        disabled={!nuevaRefaccion.refaccion}
                        className="btn-ghost !px-3 !py-2 !text-xs"
                      >
                        <IconPlus className="h-3.5 w-3.5" /> Agregar
                      </button>
                    </div>
                  </div>
                ) : (
                  o.refacciones_utilizadas.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-silver">
                        Refacciones
                      </p>
                      <ul className="mt-1 list-inside list-disc text-[#3a3a3c]">
                        {o.refacciones_utilizadas.map((r) => (
                          <li key={r.id}>
                            {r.refaccion_detalle.nombre} × {r.cantidad}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}

                {/* Evidencias y documentos de la orden */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-silver">
                    Evidencias y documentos
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {documentosOrden.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-black/[0.03] px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-[13px] text-[#3a3a3c]">
                          <IconDoc className="h-4 w-4 shrink-0 text-silver" />
                          <span className="truncate">{d.titulo}</span>
                          <span className="shrink-0 text-[11px] text-silver">
                            {formatearBytes(d.tamano_bytes)}
                          </span>
                        </span>
                        {d.url_descarga && (
                          <a
                            href={d.url_descarga}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-semibold text-kyocera-600 transition-colors hover:text-kyocera-700"
                          >
                            Ver / Descargar
                          </a>
                        )}
                      </li>
                    ))}
                    {documentosOrden.length === 0 && (
                      <li className="text-xs text-silver">Sin evidencias ni documentos</li>
                    )}
                  </ul>

                  {/* Subida de evidencia mientras la orden está activa */}
                  {['ASIGNADA', 'EN_PROCESO'].includes(o.estatus) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setArchivoEvidencia(e.target.files?.[0] ?? null)}
                        className="input-field !w-auto flex-1 !py-2 !text-xs file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1 file:text-[11px] file:font-semibold file:text-white"
                        aria-label="Archivo de evidencia (foto o PDF)"
                      />
                      <button
                        onClick={() => subirEvidencia(o)}
                        disabled={subiendoEvidencia || !archivoEvidencia}
                        className="btn-ghost !px-3 !py-2 !text-xs"
                      >
                        <IconUpload className="h-3.5 w-3.5" />
                        {subiendoEvidencia ? 'Subiendo…' : 'Subir evidencia'}
                      </button>
                    </div>
                  )}
                </div>

                {errorAvance && (
                  <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
                    {errorAvance}
                  </p>
                )}
                {['ASIGNADA', 'EN_PROCESO'].includes(o.estatus) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => guardarAvance(o)}
                      disabled={guardandoAvance}
                      className="btn-ghost !px-4 !py-2 !text-xs"
                    >
                      {guardandoAvance ? 'Guardando…' : 'Guardar avance'}
                    </button>
                    <button
                      onClick={() => avanzarEstatus(o)}
                      disabled={guardando === o.id}
                      className="btn-primary !px-4 !py-2 !text-xs"
                    >
                      {guardando === o.id
                        ? 'Guardando…'
                        : o.estatus === 'ASIGNADA'
                          ? 'Iniciar trabajo'
                          : 'Cerrar orden'}
                    </button>
                    {avanceGuardado && (
                      <span className="text-xs font-medium text-emerald-600">✓ Avance guardado</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
        {ordenes.length === 0 && (
          <li className="rounded-2xl border border-dashed border-black/10 py-12 text-center text-sm text-silver">
            Sin órdenes con el filtro seleccionado
          </li>
        )}
      </ul>

      <Paginacion count={total} pagina={pagina} onCambiar={setPagina} />
    </div>
  );
}
