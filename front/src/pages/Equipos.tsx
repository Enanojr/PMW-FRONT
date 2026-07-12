import { useEffect, useState, type FormEvent } from 'react';
import { IconPlus, IconSearch } from '../components/icons';
import { Modal } from '../components/Modal';
import { Paginacion } from '../components/Paginacion';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { areasService, equiposService, modelosEquipoService } from '../services/recursos.service';
import type {
  Area,
  Equipo,
  EquipoDetalle,
  EsquemaEquipo,
  EstadoEquipo,
  LecturaContador,
  ModeloEquipo,
} from '../types';
import { formatearFecha, formatearFechaHora } from '../utils/formato';

interface FormularioEquipo {
  numero_serie: string;
  modelo: string;
  esquema: EsquemaEquipo;
  descripcion: string;
  ubicacion_actual: string;
  fecha_instalacion: string;
}

const FORM_VACIO: FormularioEquipo = {
  numero_serie: '',
  modelo: '',
  esquema: 'ARRENDAMIENTO',
  descripcion: '',
  ubicacion_actual: '',
  fecha_instalacion: '',
};

const ESQUEMAS: { valor: EsquemaEquipo; etiqueta: string }[] = [
  { valor: 'ARRENDAMIENTO', etiqueta: 'Arrendamiento' },
  { valor: 'POLIZA', etiqueta: 'Póliza de soporte' },
  { valor: 'PROPIO', etiqueta: 'Propio' },
];

const ESTADOS_EQUIPO: { valor: EstadoEquipo; etiqueta: string }[] = [
  { valor: 'OPERATIVO', etiqueta: 'Operativo' },
  { valor: 'EN_MANTENIMIENTO', etiqueta: 'En mantenimiento' },
  { valor: 'FUERA_DE_SERVICIO', etiqueta: 'Fuera de servicio' },
  { valor: 'BAJA', etiqueta: 'Dado de baja' },
];

/** Inventario de equipos. Admin y Técnico pueden consultar y dar de alta. */
export function Equipos() {
  const { esAdmin } = useAuth();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [modelos, setModelos] = useState<ModeloEquipo[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<FormularioEquipo>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Alta rápida de un modelo que no está en el catálogo
  const [mostrarNuevoModelo, setMostrarNuevoModelo] = useState(false);
  const [nuevoModelo, setNuevoModelo] = useState('');
  const [creandoModelo, setCreandoModelo] = useState(false);

  // Detalle del equipo (modal)
  const [detalle, setDetalle] = useState<EquipoDetalle | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [mover, setMover] = useState({ area: '', motivo: '' });
  const [moviendo, setMoviendo] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Lecturas de contador
  const [lecturas, setLecturas] = useState<LecturaContador[]>([]);
  const [nuevaLectura, setNuevaLectura] = useState('');
  const [guardandoLectura, setGuardandoLectura] = useState(false);

  // Edición de número de serie y eliminación (Admin)
  const [serieEditada, setSerieEditada] = useState('');
  const [guardandoSerie, setGuardandoSerie] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminandoEquipo, setEliminandoEquipo] = useState(false);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  const cargar = () => {
    equiposService
      .listar({ search: busqueda || undefined, page: pagina })
      .then((r) => {
        setEquipos(r.results);
        setTotal(r.count);
      })
      .catch(() => setEquipos([]));
  };

  useEffect(() => {
    const timeout = setTimeout(cargar, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, pagina]);

  useEffect(() => setPagina(1), [busqueda]);

  useEffect(() => {
    areasService.listar().then((r) => setAreas(r.results)).catch(() => setAreas([]));
    modelosEquipoService.listar().then((r) => setModelos(r.results)).catch(() => setModelos([]));
  }, []);

  const cambiar = (campo: keyof FormularioEquipo, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const crearModelo = async () => {
    const nombre = nuevoModelo.trim();
    if (!nombre) return;
    setCreandoModelo(true);
    setError(null);
    try {
      const creado = await modelosEquipoService.crear({ nombre });
      setModelos((m) => [...m, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      cambiar('modelo', String(creado.id));
      setNuevoModelo('');
      setMostrarNuevoModelo(false);
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = detalle && Object.values(detalle)[0]?.[0];
      setError(primerError ?? 'No se pudo crear el modelo.');
    } finally {
      setCreandoModelo(false);
    }
  };

  const abrirDetalle = async (id: number) => {
    setErrorDetalle(null);
    setMover({ area: '', motivo: '' });
    setNuevaLectura('');
    setLecturas([]);
    setConfirmandoEliminar(false);
    setModalDetalle(true);
    try {
      const d = await equiposService.detalle(id);
      setDetalle(d);
      setSerieEditada(d.numero_serie);
      setLecturas(await equiposService.lecturas(id));
    } catch {
      setErrorDetalle('No se pudo cargar el detalle del equipo.');
    }
  };

  const guardarSerie = async (e: FormEvent) => {
    e.preventDefault();
    if (!detalle || !serieEditada.trim()) return;
    setGuardandoSerie(true);
    setErrorDetalle(null);
    try {
      await equiposService.actualizar(detalle.id, { numero_serie: serieEditada.trim() });
      setDetalle(await equiposService.detalle(detalle.id));
      cargar();
    } catch (err: unknown) {
      const datos = (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = datos && Object.values(datos)[0]?.[0];
      setErrorDetalle(primerError ?? 'No se pudo actualizar el número de serie.');
    } finally {
      setGuardandoSerie(false);
    }
  };

  const eliminarEquipo = async () => {
    if (!detalle) return;
    setEliminandoEquipo(true);
    setErrorDetalle(null);
    try {
      await equiposService.eliminar(detalle.id);
      setModalDetalle(false);
      setDetalle(null);
      cargar();
      setExito('Equipo eliminado correctamente.');
    } catch (err: unknown) {
      const datos = (err as { response?: { data?: { detail?: string } } }).response?.data;
      setErrorDetalle(datos?.detail ?? 'No se pudo eliminar el equipo.');
      setConfirmandoEliminar(false);
    } finally {
      setEliminandoEquipo(false);
    }
  };

  const registrarLectura = async (e: FormEvent) => {
    e.preventDefault();
    if (!detalle || !nuevaLectura) return;
    setGuardandoLectura(true);
    setErrorDetalle(null);
    try {
      await equiposService.registrarLectura(detalle.id, Number(nuevaLectura), '');
      setNuevaLectura('');
      setLecturas(await equiposService.lecturas(detalle.id));
      setDetalle(await equiposService.detalle(detalle.id));
      cargar();
    } catch (err: unknown) {
      const datos = (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = datos && Object.values(datos)[0]?.[0];
      setErrorDetalle(primerError ?? 'No se pudo registrar la lectura.');
    } finally {
      setGuardandoLectura(false);
    }
  };

  const reubicar = async (e: FormEvent) => {
    e.preventDefault();
    if (!detalle) return;
    setMoviendo(true);
    setErrorDetalle(null);
    try {
      const actualizado = await equiposService.mover(
        detalle.id,
        Number(mover.area),
        mover.motivo.trim(),
      );
      setDetalle(actualizado);
      setMover({ area: '', motivo: '' });
      cargar();
    } catch {
      setErrorDetalle('No se pudo reubicar el equipo.');
    } finally {
      setMoviendo(false);
    }
  };

  const cambiarEstado = async (estado: EstadoEquipo) => {
    if (!detalle) return;
    setCambiandoEstado(true);
    setErrorDetalle(null);
    try {
      await equiposService.actualizar(detalle.id, { estado });
      setDetalle(await equiposService.detalle(detalle.id));
      cargar();
    } catch {
      setErrorDetalle('No se pudo actualizar el estado.');
    } finally {
      setCambiandoEstado(false);
    }
  };

  const cambiarEsquema = async (esquema: EsquemaEquipo) => {
    if (!detalle) return;
    setCambiandoEstado(true);
    setErrorDetalle(null);
    try {
      await equiposService.actualizar(detalle.id, { esquema });
      setDetalle(await equiposService.detalle(detalle.id));
      cargar();
    } catch {
      setErrorDetalle('No se pudo actualizar el esquema.');
    } finally {
      setCambiandoEstado(false);
    }
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    setGuardando(true);
    try {
      const creado = await equiposService.crear({
        numero_serie: form.numero_serie.trim(),
        modelo: Number(form.modelo),
        esquema: form.esquema,
        descripcion: form.descripcion.trim(),
        ubicacion_actual: form.ubicacion_actual ? Number(form.ubicacion_actual) : null,
        fecha_instalacion: form.fecha_instalacion || null,
      });
      setExito(`Equipo ${creado.numero_serie} registrado correctamente.`);
      setForm(FORM_VACIO);
      setMostrarForm(false);
      cargar();
    } catch (err: unknown) {
      const detalle =
        (err as { response?: { data?: Record<string, string[]> } }).response?.data;
      const primerError = detalle && Object.values(detalle)[0]?.[0];
      setError(primerError ?? 'No se pudo registrar el equipo. Revisa los datos.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="page-title">Equipos</h2>
          <p className="page-subtitle">Inventario y ubicación actual</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-silver" />
            <input
              type="search"
              placeholder="Buscar serie o modelo…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-field w-64 !pl-10"
            />
          </div>
          <button
            onClick={() => {
              setMostrarForm((v) => !v);
              setError(null);
              setExito(null);
            }}
            className={mostrarForm ? 'btn-ghost' : 'btn-primary'}
          >
            {mostrarForm ? 'Cancelar' : (<><IconPlus className="h-4 w-4" /> Agregar equipo</>)}
          </button>
        </div>
      </header>

      {exito && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{exito}</p>
      )}

      {/* Formulario de alta */}
      {mostrarForm && (
        <form onSubmit={guardar} className="card animate-fade-up p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">Nuevo equipo</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label htmlFor="numero_serie" className="label-field">Número de serie *</label>
              <input
                id="numero_serie"
                required
                value={form.numero_serie}
                onChange={(e) => cambiar('numero_serie', e.target.value)}
                placeholder="Ej. KYO-2026-00123"
                className="input-field"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="modelo" className="block text-[13px] font-medium text-silver">
                  Modelo *
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarNuevoModelo((v) => !v)}
                  className="text-xs font-semibold text-kyocera-600 transition-colors hover:text-kyocera-700"
                >
                  {mostrarNuevoModelo ? 'Usar catálogo' : '+ Nuevo modelo'}
                </button>
              </div>
              {mostrarNuevoModelo ? (
                <div className="flex gap-2">
                  <input
                    value={nuevoModelo}
                    onChange={(e) => setNuevoModelo(e.target.value)}
                    placeholder="Ej. TASKalfa 3554ci"
                    className="input-field"
                  />
                  <button
                    type="button"
                    onClick={crearModelo}
                    disabled={creandoModelo || !nuevoModelo.trim()}
                    className="btn-primary shrink-0 !px-4 !text-xs"
                  >
                    {creandoModelo ? '…' : 'Agregar'}
                  </button>
                </div>
              ) : (
                <select
                  id="modelo"
                  required
                  value={form.modelo}
                  onChange={(e) => cambiar('modelo', e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecciona del catálogo…</option>
                  {modelos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}{m.familia ? ` (${m.familia})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="esquema" className="label-field">Esquema *</label>
              <select
                id="esquema"
                value={form.esquema}
                onChange={(e) => cambiar('esquema', e.target.value)}
                className="input-field"
              >
                {ESQUEMAS.map((s) => (
                  <option key={s.valor} value={s.valor}>{s.etiqueta}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ubicacion" className="label-field">Ubicación (cliente / área)</label>
              <select
                id="ubicacion"
                value={form.ubicacion_actual}
                onChange={(e) => cambiar('ubicacion_actual', e.target.value)}
                className="input-field"
              >
                <option value="">Sin asignar</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.cliente_nombre} / {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fecha_instalacion" className="label-field">Fecha de instalación</label>
              <input
                id="fecha_instalacion"
                type="date"
                value={form.fecha_instalacion}
                onChange={(e) => cambiar('fecha_instalacion', e.target.value)}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="descripcion" className="label-field">Descripción</label>
              <input
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => cambiar('descripcion', e.target.value)}
                placeholder="Notas del equipo (opcional)"
                className="input-field"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={guardando} className="btn-primary mt-5">
            {guardando ? 'Guardando…' : 'Registrar equipo'}
          </button>
        </form>
      )}

      {/* Tabla de inventario */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05] text-left text-[11px] font-medium uppercase tracking-wide text-silver">
              <th className="px-5 py-3.5">No. de serie</th>
              <th className="px-5 py-3.5">Modelo</th>
              <th className="px-5 py-3.5">Cliente / Ubicación</th>
              <th className="px-5 py-3.5">Esquema</th>
              <th className="px-5 py-3.5">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {equipos.map((e) => (
              <tr
                key={e.id}
                onClick={() => abrirDetalle(e.id)}
                className="cursor-pointer transition-colors hover:bg-black/[0.02]"
              >
                <td className="px-5 py-3.5 font-mono text-xs text-silver">{e.numero_serie}</td>
                <td className="px-5 py-3.5 font-medium text-ink">{e.modelo_nombre}</td>
                <td className="px-5 py-3.5 text-[#3a3a3c]">
                  {e.ubicacion_detalle
                    ? `${e.ubicacion_detalle.cliente_nombre} / ${e.ubicacion_detalle.nombre}`
                    : 'Sin asignar'}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge codigo={e.esquema} etiqueta={e.esquema_display} />
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge codigo={e.estado} etiqueta={e.estado_display} />
                </td>
              </tr>
            ))}
            {equipos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-silver">
                  Sin equipos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion count={total} pagina={pagina} onCambiar={setPagina} />

      {/* Modal: detalle del equipo */}
      <Modal
        titulo={detalle ? `${detalle.modelo_nombre} · ${detalle.numero_serie}` : 'Equipo'}
        abierto={modalDetalle}
        onCerrar={() => {
          setModalDetalle(false);
          setDetalle(null);
        }}
      >
        {!detalle ? (
          <p className="py-8 text-center text-sm text-silver">
            {errorDetalle ?? 'Cargando…'}
          </p>
        ) : (
          <div className="space-y-6">
            {/* Ficha */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-silver">Estado</p>
                <div className="mt-1.5">
                  <StatusBadge codigo={detalle.estado} etiqueta={detalle.estado_display} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-silver">Esquema</p>
                <div className="mt-1.5">
                  <StatusBadge codigo={detalle.esquema} etiqueta={detalle.esquema_display} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-silver">
                  Cliente / Ubicación
                </p>
                <p className="mt-1.5 text-sm text-ink">
                  {detalle.ubicacion_detalle
                    ? `${detalle.ubicacion_detalle.cliente_nombre} / ${detalle.ubicacion_detalle.nombre}`
                    : 'Sin asignar'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-silver">Instalación</p>
                <p className="mt-1.5 text-sm text-ink">{formatearFecha(detalle.fecha_instalacion)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-silver">Contador</p>
                <p className="mt-1.5 text-sm text-ink">
                  {detalle.contador_paginas.toLocaleString('es-MX')} pág.
                </p>
              </div>
            </div>

            {detalle.descripcion && (
              <p className="rounded-xl bg-black/[0.03] p-3.5 text-sm text-[#3a3a3c]">
                {detalle.descripcion}
              </p>
            )}

            {/* Acciones del Administrador */}
            {esAdmin && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <form onSubmit={guardarSerie} className="rounded-xl border border-black/[0.06] p-4">
                  <p className="text-[13px] font-semibold text-ink">Editar número de serie</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      required
                      value={serieEditada}
                      onChange={(e) => setSerieEditada(e.target.value)}
                      className="input-field font-mono !text-xs"
                      aria-label="Número de serie"
                    />
                    <button
                      type="submit"
                      disabled={guardandoSerie || serieEditada.trim() === detalle.numero_serie}
                      className="btn-primary shrink-0 !px-4 !text-xs"
                    >
                      {guardandoSerie ? '…' : 'Guardar'}
                    </button>
                  </div>
                </form>
                <div className="rounded-xl border border-black/[0.06] p-4">
                  <p className="text-[13px] font-semibold text-ink">Cambiar estado</p>
                  <select
                    value={detalle.estado}
                    disabled={cambiandoEstado}
                    onChange={(e) => cambiarEstado(e.target.value as EstadoEquipo)}
                    className="input-field mt-3"
                  >
                    {ESTADOS_EQUIPO.map((s) => (
                      <option key={s.valor} value={s.valor}>{s.etiqueta}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl border border-black/[0.06] p-4">
                  <p className="text-[13px] font-semibold text-ink">Cambiar esquema comercial</p>
                  <select
                    value={detalle.esquema}
                    disabled={cambiandoEstado}
                    onChange={(e) => cambiarEsquema(e.target.value as EsquemaEquipo)}
                    className="input-field mt-3"
                  >
                    {ESQUEMAS.map((s) => (
                      <option key={s.valor} value={s.valor}>{s.etiqueta}</option>
                    ))}
                  </select>
                </div>
                <form onSubmit={reubicar} className="rounded-xl border border-black/[0.06] p-4">
                  <p className="text-[13px] font-semibold text-ink">Reubicar equipo</p>
                  <div className="mt-3 space-y-2">
                    <select
                      required
                      value={mover.area}
                      onChange={(e) => setMover((m) => ({ ...m, area: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Área destino *</option>
                      {areas
                        .filter((a) => a.id !== detalle.ubicacion_actual)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.cliente_nombre} / {a.nombre}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        placeholder="Motivo"
                        value={mover.motivo}
                        onChange={(e) => setMover((m) => ({ ...m, motivo: e.target.value }))}
                        className="input-field"
                      />
                      <button
                        type="submit"
                        disabled={moviendo || !mover.area}
                        className="btn-primary shrink-0 !px-4 !text-xs"
                      >
                        {moviendo ? '…' : 'Mover'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {errorDetalle && (
              <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
                {errorDetalle}
              </p>
            )}

            {/* Lecturas de contador */}
            <div className="rounded-xl border border-black/[0.06] p-4">
              <p className="text-[13px] font-semibold text-ink">Lecturas del contador</p>
              <form onSubmit={registrarLectura} className="mt-3 flex gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder={`Última: ${detalle.contador_paginas.toLocaleString('es-MX')}`}
                  value={nuevaLectura}
                  onChange={(e) => setNuevaLectura(e.target.value)}
                  className="input-field"
                  aria-label="Nueva lectura"
                />
                <button
                  type="submit"
                  disabled={guardandoLectura || !nuevaLectura}
                  className="btn-primary shrink-0 !px-4 !text-xs"
                >
                  {guardandoLectura ? '…' : 'Registrar'}
                </button>
              </form>
              <ul className="mt-3 space-y-1.5">
                {lecturas.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex justify-between text-xs">
                    <span className="font-medium text-ink">
                      {l.lectura.toLocaleString('es-MX')} pág.
                    </span>
                    <span className="text-silver">
                      {formatearFechaHora(l.fecha)}
                      {l.registrado_por_nombre && ` · ${l.registrado_por_nombre}`}
                    </span>
                  </li>
                ))}
                {lecturas.length === 0 && (
                  <li className="text-xs text-silver">Sin lecturas registradas</li>
                )}
              </ul>
            </div>

            {/* Historial de ubicaciones */}
            <div>
              <p className="text-[13px] font-semibold text-ink">Historial de ubicaciones</p>
              <ul className="mt-3 space-y-2">
                {detalle.historial_ubicaciones.map((h) => (
                  <li key={h.id} className="flex items-start gap-3 rounded-xl bg-black/[0.02] p-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-silver" />
                    <div className="min-w-0 text-xs">
                      <p className="font-medium text-ink">
                        {h.area_origen_detalle
                          ? `${h.area_origen_detalle.cliente_nombre} / ${h.area_origen_detalle.nombre}`
                          : 'Origen inicial'}
                        {' → '}
                        {h.area_destino_detalle.cliente_nombre} / {h.area_destino_detalle.nombre}
                      </p>
                      <p className="mt-0.5 text-silver">
                        {formatearFechaHora(h.fecha_movimiento)}
                        {h.registrado_por_nombre && ` · ${h.registrado_por_nombre}`}
                        {h.motivo && ` · ${h.motivo}`}
                      </p>
                    </div>
                  </li>
                ))}
                {detalle.historial_ubicaciones.length === 0 && (
                  <li className="py-4 text-center text-xs text-silver">
                    Sin movimientos registrados
                  </li>
                )}
              </ul>
            </div>

            {/* Eliminar equipo (Admin) */}
            {esAdmin && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.05] pt-4">
                {confirmandoEliminar ? (
                  <>
                    <span className="text-xs text-silver">
                      Esta acción no se puede deshacer.
                    </span>
                    <button
                      onClick={eliminarEquipo}
                      disabled={eliminandoEquipo}
                      className="btn-accent !px-4 !py-2 !text-xs"
                    >
                      {eliminandoEquipo ? 'Eliminando…' : '¿Confirmar eliminación?'}
                    </button>
                    <button
                      onClick={() => setConfirmandoEliminar(false)}
                      className="btn-ghost !px-4 !py-2 !text-xs"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmandoEliminar(true)}
                    className="btn-ghost !px-4 !py-2 !text-xs !text-kyocera-600"
                  >
                    Eliminar equipo
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
