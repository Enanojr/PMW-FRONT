import { useEffect, useState, type FormEvent } from 'react';
import { IconPencil, IconPlus } from '../components/icons';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import {
  areasService,
  clientesService,
  equiposService,
  planesService,
  refaccionesService,
  usuariosService,
  type NuevoUsuario,
} from '../services/recursos.service';
import type {
  Area,
  Cliente,
  Equipo,
  PlanMantenimiento,
  Refaccion,
  TipoMantenimiento,
  Usuario,
} from '../types';
import { formatearFechaHora } from '../utils/formato';

type Seccion = 'usuarios' | 'organizacion' | 'refacciones' | 'planes';

function extraerError(err: unknown): string | null {
  const detalle = (err as { response?: { data?: Record<string, string[] | string> } }).response?.data;
  if (!detalle) return null;
  const primero = Object.values(detalle)[0];
  return Array.isArray(primero) ? primero[0] ?? null : String(primero);
}

const USUARIO_VACIO: NuevoUsuario = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  rol: 'TECNICO',
  telefono: '',
  password: '',
};

/** Administración (solo Admin): usuarios del sistema y catálogo de ubicaciones. */
export function Administracion() {
  const [seccion, setSeccion] = useState<Seccion>('usuarios');

  return (
    <div className="space-y-8">
      <header>
        <h2 className="page-title">Administración</h2>
        <p className="page-subtitle">Usuarios, clientes, refacciones y planes de servicio</p>
      </header>

      {/* Control segmentado */}
      <div className="inline-flex flex-wrap rounded-full bg-black/[0.05] p-1">
        {(
          [
            ['usuarios', 'Usuarios'],
            ['organizacion', 'Clientes y ubicaciones'],
            ['refacciones', 'Refacciones'],
            ['planes', 'Planes recurrentes'],
          ] as [Seccion, string][]
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            onClick={() => setSeccion(valor)}
            className={`rounded-full px-5 py-1.5 text-[13px] font-medium transition-all duration-200 ${
              seccion === valor ? 'bg-white text-ink shadow-card' : 'text-silver hover:text-ink'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {seccion === 'usuarios' && <SeccionUsuarios />}
      {seccion === 'organizacion' && <SeccionOrganizacion />}
      {seccion === 'refacciones' && <SeccionRefacciones />}
      {seccion === 'planes' && <SeccionPlanes />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------
interface EdicionUsuario {
  first_name: string;
  last_name: string;
  email: string;
  telefono: string;
  rol: 'ADMIN' | 'TECNICO';
  is_active: boolean;
  password: string;
}

function SeccionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<NuevoUsuario>(USUARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Edición (modal)
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [formEd, setFormEd] = useState<EdicionUsuario | null>(null);
  const [guardandoEd, setGuardandoEd] = useState(false);
  const [errorEd, setErrorEd] = useState<string | null>(null);

  const cargar = () => {
    usuariosService.listar().then((r) => setUsuarios(r.results)).catch(() => setUsuarios([]));
  };

  useEffect(cargar, []);

  const abrirEdicion = (u: Usuario) => {
    setEditando(u);
    setErrorEd(null);
    setFormEd({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      telefono: u.telefono,
      rol: u.rol,
      is_active: u.is_active,
      password: '',
    });
  };

  const guardarEdicion = async (e: FormEvent) => {
    e.preventDefault();
    if (!editando || !formEd) return;
    setGuardandoEd(true);
    setErrorEd(null);
    try {
      const cambios: Parameters<typeof usuariosService.actualizar>[1] = {
        first_name: formEd.first_name.trim(),
        last_name: formEd.last_name.trim(),
        email: formEd.email.trim(),
        telefono: formEd.telefono.trim(),
        rol: formEd.rol,
        is_active: formEd.is_active,
      };
      if (formEd.password.trim()) cambios.password = formEd.password;
      await usuariosService.actualizar(editando.id, cambios);
      setExito(`Usuario ${editando.username} actualizado correctamente.`);
      setEditando(null);
      cargar();
    } catch (err) {
      setErrorEd(extraerError(err) ?? 'No se pudo actualizar el usuario.');
    } finally {
      setGuardandoEd(false);
    }
  };

  const cambiar = (campo: keyof NuevoUsuario, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    setGuardando(true);
    try {
      const creado = await usuariosService.crear({
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
      });
      setExito(`Usuario ${creado.username} creado correctamente.`);
      setForm(USUARIO_VACIO);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(extraerError(err) ?? 'No se pudo crear el usuario. Revisa los datos.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setMostrarForm((v) => !v);
            setError(null);
            setExito(null);
          }}
          className={mostrarForm ? 'btn-ghost' : 'btn-primary'}
        >
          {mostrarForm ? 'Cancelar' : (<><IconPlus className="h-4 w-4" /> Nuevo usuario</>)}
        </button>
      </div>

      {exito && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{exito}</p>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} className="card animate-fade-up p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">Nuevo usuario</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label htmlFor="u-nombre" className="label-field">Nombre *</label>
              <input id="u-nombre" required value={form.first_name}
                onChange={(e) => cambiar('first_name', e.target.value)} className="input-field" />
            </div>
            <div>
              <label htmlFor="u-apellido" className="label-field">Apellidos *</label>
              <input id="u-apellido" required value={form.last_name}
                onChange={(e) => cambiar('last_name', e.target.value)} className="input-field" />
            </div>
            <div>
              <label htmlFor="u-usuario" className="label-field">Usuario *</label>
              <input id="u-usuario" required autoComplete="off" value={form.username}
                onChange={(e) => cambiar('username', e.target.value)} className="input-field" />
            </div>
            <div>
              <label htmlFor="u-email" className="label-field">Correo</label>
              <input id="u-email" type="email" value={form.email}
                onChange={(e) => cambiar('email', e.target.value)} className="input-field" />
            </div>
            <div>
              <label htmlFor="u-telefono" className="label-field">Teléfono</label>
              <input id="u-telefono" value={form.telefono}
                onChange={(e) => cambiar('telefono', e.target.value)} className="input-field" />
            </div>
            <div>
              <label htmlFor="u-rol" className="label-field">Rol *</label>
              <select id="u-rol" value={form.rol}
                onChange={(e) => cambiar('rol', e.target.value)} className="input-field">
                <option value="TECNICO">Técnico</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="u-password" className="label-field">
                Contraseña * (mínimo 10 caracteres, no común)
              </label>
              <input id="u-password" type="password" required autoComplete="new-password"
                value={form.password}
                onChange={(e) => cambiar('password', e.target.value)} className="input-field" />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={guardando} className="btn-primary mt-5">
            {guardando ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05] text-left text-[11px] font-medium uppercase tracking-wide text-silver">
              <th className="px-5 py-3.5">Nombre</th>
              <th className="px-5 py-3.5">Usuario</th>
              <th className="px-5 py-3.5">Correo</th>
              <th className="px-5 py-3.5">Rol</th>
              <th className="px-5 py-3.5">Estado</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {usuarios.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-black/[0.02]">
                <td className="px-5 py-3.5 font-medium text-ink">{u.nombre_completo}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-silver">{u.username}</td>
                <td className="px-5 py-3.5 text-[#3a3a3c]">{u.email || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#3a3a3c]">
                    {u.rol === 'ADMIN' ? 'Administrador' : 'Técnico'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#3a3a3c]">
                    <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => abrirEdicion(u)}
                    title={`Editar a ${u.username}`}
                    className="rounded-full p-2 text-silver transition-colors hover:bg-black/[0.05] hover:text-ink"
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: editar usuario */}
      <Modal
        titulo={editando ? `Editar usuario · ${editando.username}` : 'Editar usuario'}
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
      >
        {formEd && (
          <form onSubmit={guardarEdicion} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="eu-nombre" className="label-field">Nombre *</label>
                <input id="eu-nombre" required value={formEd.first_name}
                  onChange={(e) => setFormEd((f) => f && { ...f, first_name: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label htmlFor="eu-apellido" className="label-field">Apellidos *</label>
                <input id="eu-apellido" required value={formEd.last_name}
                  onChange={(e) => setFormEd((f) => f && { ...f, last_name: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label htmlFor="eu-email" className="label-field">Correo</label>
                <input id="eu-email" type="email" value={formEd.email}
                  onChange={(e) => setFormEd((f) => f && { ...f, email: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label htmlFor="eu-telefono" className="label-field">Teléfono</label>
                <input id="eu-telefono" value={formEd.telefono}
                  onChange={(e) => setFormEd((f) => f && { ...f, telefono: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label htmlFor="eu-rol" className="label-field">Rol</label>
                <select id="eu-rol" value={formEd.rol}
                  onChange={(e) => setFormEd((f) => f && { ...f, rol: e.target.value as 'ADMIN' | 'TECNICO' })}
                  className="input-field">
                  <option value="TECNICO">Técnico</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div>
                <label htmlFor="eu-activo" className="label-field">Estado de la cuenta</label>
                <select id="eu-activo" value={formEd.is_active ? '1' : '0'}
                  onChange={(e) => setFormEd((f) => f && { ...f, is_active: e.target.value === '1' })}
                  className="input-field">
                  <option value="1">Activo</option>
                  <option value="0">Inactivo (sin acceso)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="eu-password" className="label-field">
                  Nueva contraseña (dejar vacío para no cambiarla)
                </label>
                <input id="eu-password" type="password" autoComplete="new-password"
                  value={formEd.password}
                  onChange={(e) => setFormEd((f) => f && { ...f, password: e.target.value })}
                  className="input-field" />
              </div>
            </div>

            {errorEd && (
              <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
                {errorEd}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditando(null)} className="btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={guardandoEd} className="btn-primary">
                {guardandoEd ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Refacciones (inventario)
// ---------------------------------------------------------------------------
function SeccionRefacciones() {
  const [refacciones, setRefacciones] = useState<Refaccion[]>([]);
  const [nueva, setNueva] = useState({ codigo: '', nombre: '', modelo_compatible: '', existencias: '0' });
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [stockEditado, setStockEditado] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edición completa (modal)
  const [refEd, setRefEd] = useState<Refaccion | null>(null);
  const [formRefEd, setFormRefEd] = useState({ codigo: '', nombre: '', modelo_compatible: '', existencias: '0' });
  const [guardandoEd, setGuardandoEd] = useState(false);
  const [errorEd, setErrorEd] = useState<string | null>(null);

  const cargar = () => {
    refaccionesService.listar().then((r) => setRefacciones(r.results)).catch(() => setRefacciones([]));
  };

  useEffect(cargar, []);

  const abrirEdicion = (r: Refaccion) => {
    setRefEd(r);
    setErrorEd(null);
    setFormRefEd({
      codigo: r.codigo,
      nombre: r.nombre,
      modelo_compatible: r.modelo_compatible,
      existencias: String(r.existencias),
    });
  };

  const guardarEdicion = async (e: FormEvent) => {
    e.preventDefault();
    if (!refEd) return;
    setGuardandoEd(true);
    setErrorEd(null);
    try {
      await refaccionesService.actualizar(refEd.id, {
        codigo: formRefEd.codigo.trim(),
        nombre: formRefEd.nombre.trim(),
        modelo_compatible: formRefEd.modelo_compatible.trim(),
        existencias: Number(formRefEd.existencias) || 0,
      });
      setRefEd(null);
      cargar();
    } catch (err) {
      setErrorEd(extraerError(err) ?? 'No se pudo actualizar la refacción.');
    } finally {
      setGuardandoEd(false);
    }
  };

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await refaccionesService.crear({
        codigo: nueva.codigo.trim(),
        nombre: nueva.nombre.trim(),
        modelo_compatible: nueva.modelo_compatible.trim(),
        existencias: Number(nueva.existencias) || 0,
      });
      setNueva({ codigo: '', nombre: '', modelo_compatible: '', existencias: '0' });
      cargar();
    } catch (err) {
      setError(extraerError(err) ?? 'No se pudo crear la refacción.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarStock = async (r: Refaccion) => {
    try {
      await refaccionesService.actualizar(r.id, { existencias: Number(stockEditado) || 0 });
      setEditando(null);
      cargar();
    } catch (err) {
      setError(extraerError(err) ?? 'No se pudo actualizar el stock.');
    }
  };

  return (
    <div className="animate-fade-up space-y-5">
      {error && (
        <p role="alert" className="rounded-xl bg-kyocera-50 px-4 py-3 text-sm text-kyocera-700">
          {error}
        </p>
      )}

      <form onSubmit={crear} className="card p-6">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">Nueva refacción</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <input required placeholder="Código *" value={nueva.codigo}
            onChange={(e) => setNueva((n) => ({ ...n, codigo: e.target.value }))} className="input-field" />
          <input required placeholder="Nombre *" value={nueva.nombre}
            onChange={(e) => setNueva((n) => ({ ...n, nombre: e.target.value }))}
            className="input-field md:col-span-2" />
          <input placeholder="Modelo compatible" value={nueva.modelo_compatible}
            onChange={(e) => setNueva((n) => ({ ...n, modelo_compatible: e.target.value }))} className="input-field" />
          <div className="flex gap-2">
            <input type="number" min={0} placeholder="Stock" value={nueva.existencias}
              onChange={(e) => setNueva((n) => ({ ...n, existencias: e.target.value }))}
              className="input-field" aria-label="Existencias" />
            <button type="submit" disabled={guardando} className="btn-primary shrink-0 !px-4">
              <IconPlus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05] text-left text-[11px] font-medium uppercase tracking-wide text-silver">
              <th className="px-5 py-3.5">Código</th>
              <th className="px-5 py-3.5">Nombre</th>
              <th className="px-5 py-3.5">Modelo compatible</th>
              <th className="px-5 py-3.5">Existencias</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {refacciones.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-black/[0.02]">
                <td className="px-5 py-3.5 font-mono text-xs text-silver">{r.codigo}</td>
                <td className="px-5 py-3.5 font-medium text-ink">{r.nombre}</td>
                <td className="px-5 py-3.5 text-[#3a3a3c]">{r.modelo_compatible || '—'}</td>
                <td className="px-5 py-3.5">
                  {editando === r.id ? (
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={stockEditado}
                        onChange={(e) => setStockEditado(e.target.value)}
                        className="input-field !w-24 !py-1.5 !text-xs"
                        autoFocus
                      />
                      <button onClick={() => guardarStock(r)} className="btn-primary !px-3 !py-1.5 !text-xs">
                        OK
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setEditando(r.id);
                        setStockEditado(String(r.existencias));
                      }}
                      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors hover:bg-black/[0.06] ${
                        r.existencias === 0 ? 'text-kyocera-600' : 'text-ink'
                      }`}
                      title="Clic para editar stock"
                    >
                      {r.existencias} en stock
                    </button>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => abrirEdicion(r)}
                    title={`Editar ${r.codigo}`}
                    className="rounded-full p-2 text-silver transition-colors hover:bg-black/[0.05] hover:text-ink"
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {refacciones.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-silver">
                  Sin refacciones registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: editar refacción */}
      <Modal
        titulo={refEd ? `Editar refacción · ${refEd.codigo}` : 'Editar refacción'}
        abierto={refEd !== null}
        onCerrar={() => setRefEd(null)}
        ancho="max-w-md"
      >
        <form onSubmit={guardarEdicion} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="er-codigo" className="label-field">Código *</label>
              <input id="er-codigo" required value={formRefEd.codigo}
                onChange={(e) => setFormRefEd((f) => ({ ...f, codigo: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="er-stock" className="label-field">Existencias</label>
              <input id="er-stock" type="number" min={0} value={formRefEd.existencias}
                onChange={(e) => setFormRefEd((f) => ({ ...f, existencias: e.target.value }))}
                className="input-field" />
            </div>
            <div className="col-span-2">
              <label htmlFor="er-nombre" className="label-field">Nombre *</label>
              <input id="er-nombre" required value={formRefEd.nombre}
                onChange={(e) => setFormRefEd((f) => ({ ...f, nombre: e.target.value }))}
                className="input-field" />
            </div>
            <div className="col-span-2">
              <label htmlFor="er-modelo" className="label-field">Modelo compatible</label>
              <input id="er-modelo" value={formRefEd.modelo_compatible}
                onChange={(e) => setFormRefEd((f) => ({ ...f, modelo_compatible: e.target.value }))}
                className="input-field" />
            </div>
          </div>

          {errorEd && (
            <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {errorEd}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRefEd(null)} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={guardandoEd} className="btn-primary">
              {guardandoEd ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planes de mantenimiento recurrente
// ---------------------------------------------------------------------------
function SeccionPlanes() {
  const [planes, setPlanes] = useState<PlanMantenimiento[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [nuevo, setNuevo] = useState({
    equipo: '', tecnico_asignado: '', tipo: 'PREVENTIVO' as TipoMantenimiento,
    frecuencia_dias: '90', proxima_fecha: '', descripcion: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    planesService.listar().then((r) => setPlanes(r.results)).catch(() => setPlanes([]));
  };

  useEffect(() => {
    cargar();
    equiposService.listar({ page_size: 200 }).then((r) => setEquipos(r.results)).catch(() => setEquipos([]));
    usuariosService.tecnicos().then(setTecnicos).catch(() => setTecnicos([]));
  }, []);

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await planesService.crear({
        equipo: Number(nuevo.equipo),
        tecnico_asignado: Number(nuevo.tecnico_asignado),
        tipo: nuevo.tipo,
        frecuencia_dias: Number(nuevo.frecuencia_dias),
        proxima_fecha: new Date(nuevo.proxima_fecha).toISOString(),
        descripcion: nuevo.descripcion.trim(),
      });
      setNuevo({
        equipo: '', tecnico_asignado: '', tipo: 'PREVENTIVO',
        frecuencia_dias: '90', proxima_fecha: '', descripcion: '',
      });
      cargar();
    } catch (err) {
      setError(extraerError(err) ?? 'No se pudo crear el plan.');
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (plan: PlanMantenimiento) => {
    try {
      await planesService.actualizar(plan.id, { activo: !plan.activo });
      cargar();
    } catch (err) {
      setError(extraerError(err) ?? 'No se pudo actualizar el plan.');
    }
  };

  return (
    <div className="animate-fade-up space-y-5">
      <p className="rounded-xl bg-black/[0.03] px-4 py-3 text-[13px] text-[#3a3a3c]">
        Cada plan genera automáticamente un mantenimiento al llegar su próxima fecha
        (tarea diaria de Celery Beat o <code className="font-mono text-xs">python manage.py generar_recurrentes</code>).
      </p>

      {error && (
        <p role="alert" className="rounded-xl bg-kyocera-50 px-4 py-3 text-sm text-kyocera-700">
          {error}
        </p>
      )}

      <form onSubmit={crear} className="card p-6">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">Nuevo plan recurrente</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <select required value={nuevo.equipo}
            onChange={(e) => setNuevo((n) => ({ ...n, equipo: e.target.value }))} className="input-field">
            <option value="">Equipo *</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.modelo_nombre} · {eq.numero_serie}</option>
            ))}
          </select>
          <select required value={nuevo.tecnico_asignado}
            onChange={(e) => setNuevo((n) => ({ ...n, tecnico_asignado: e.target.value }))} className="input-field">
            <option value="">Técnico *</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre_completo}</option>
            ))}
          </select>
          <select value={nuevo.tipo}
            onChange={(e) => setNuevo((n) => ({ ...n, tipo: e.target.value as TipoMantenimiento }))}
            className="input-field">
            <option value="PREVENTIVO">Preventivo</option>
            <option value="CORRECTIVO">Correctivo</option>
          </select>
          <div>
            <label className="label-field" htmlFor="pl-frec">Frecuencia (días) *</label>
            <input id="pl-frec" type="number" min={1} required value={nuevo.frecuencia_dias}
              onChange={(e) => setNuevo((n) => ({ ...n, frecuencia_dias: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label-field" htmlFor="pl-fecha">Primera fecha *</label>
            <input id="pl-fecha" type="datetime-local" required value={nuevo.proxima_fecha}
              onChange={(e) => setNuevo((n) => ({ ...n, proxima_fecha: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label-field" htmlFor="pl-desc">Descripción</label>
            <input id="pl-desc" value={nuevo.descripcion}
              onChange={(e) => setNuevo((n) => ({ ...n, descripcion: e.target.value }))} className="input-field" />
          </div>
        </div>
        <button type="submit" disabled={guardando} className="btn-primary mt-4">
          {guardando ? 'Creando…' : 'Crear plan'}
        </button>
      </form>

      <ul className="space-y-3">
        {planes.map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {p.equipo_detalle.modelo_nombre} · {p.equipo_detalle.numero_serie}
              </p>
              <p className="mt-0.5 text-xs text-silver">
                {p.tipo_display} cada {p.frecuencia_dias} días · {p.tecnico_detalle.nombre_completo} ·
                próximo: {formatearFechaHora(p.proxima_fecha)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge
                codigo={p.activo ? 'OPERATIVO' : 'BAJA'}
                etiqueta={p.activo ? 'Activo' : 'Pausado'}
              />
              <button onClick={() => alternarActivo(p)} className="btn-ghost !px-4 !py-1.5 !text-xs">
                {p.activo ? 'Pausar' : 'Reanudar'}
              </button>
            </div>
          </li>
        ))}
        {planes.length === 0 && (
          <li className="rounded-2xl border border-dashed border-black/10 py-10 text-center text-sm text-silver">
            Sin planes recurrentes
          </li>
        )}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clientes y ubicaciones
// ---------------------------------------------------------------------------
function SeccionOrganizacion() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Formularios
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '', contacto: '', telefono: '', ciudad: '', direccion: '',
  });
  const [nuevaArea, setNuevaArea] = useState({ cliente: '', nombre: '', piso: '' });
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [guardandoArea, setGuardandoArea] = useState(false);

  // Edición (modales)
  const [clienteEd, setClienteEd] = useState<Cliente | null>(null);
  const [formCliEd, setFormCliEd] = useState({
    nombre: '', contacto: '', telefono: '', ciudad: '', direccion: '', activa: true,
  });
  const [areaEd, setAreaEd] = useState<Area | null>(null);
  const [formAreaEd, setFormAreaEd] = useState({ cliente: '', nombre: '', piso: '' });
  const [guardandoEd, setGuardandoEd] = useState(false);
  const [errorEd, setErrorEd] = useState<string | null>(null);

  const cargar = () => {
    clientesService.listar().then((r) => setClientes(r.results)).catch(() => setClientes([]));
    areasService.listar().then((r) => setAreas(r.results)).catch(() => setAreas([]));
  };

  useEffect(cargar, []);

  const abrirEdicionCliente = (c: Cliente) => {
    setClienteEd(c);
    setErrorEd(null);
    setFormCliEd({
      nombre: c.nombre, contacto: c.contacto, telefono: c.telefono,
      ciudad: c.ciudad, direccion: c.direccion, activa: c.activa,
    });
  };

  const guardarCliente = async (e: FormEvent) => {
    e.preventDefault();
    if (!clienteEd) return;
    setGuardandoEd(true);
    setErrorEd(null);
    try {
      await clientesService.actualizar(clienteEd.id, {
        nombre: formCliEd.nombre.trim(),
        contacto: formCliEd.contacto.trim(),
        telefono: formCliEd.telefono.trim(),
        ciudad: formCliEd.ciudad.trim(),
        direccion: formCliEd.direccion.trim(),
        activa: formCliEd.activa,
      });
      setClienteEd(null);
      cargar();
    } catch (err) {
      setErrorEd(extraerError(err) ?? 'No se pudo actualizar el cliente.');
    } finally {
      setGuardandoEd(false);
    }
  };

  const abrirEdicionArea = (a: Area) => {
    setAreaEd(a);
    setErrorEd(null);
    setFormAreaEd({ cliente: String(a.cliente), nombre: a.nombre, piso: a.piso });
  };

  const guardarArea = async (e: FormEvent) => {
    e.preventDefault();
    if (!areaEd) return;
    setGuardandoEd(true);
    setErrorEd(null);
    try {
      await areasService.actualizar(areaEd.id, {
        cliente: Number(formAreaEd.cliente),
        nombre: formAreaEd.nombre.trim(),
        piso: formAreaEd.piso.trim(),
      });
      setAreaEd(null);
      cargar();
    } catch (err) {
      setErrorEd(extraerError(err) ?? 'No se pudo actualizar la ubicación.');
    } finally {
      setGuardandoEd(false);
    }
  };

  const crearCliente = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardandoCliente(true);
    try {
      await clientesService.crear({
        nombre: nuevoCliente.nombre.trim(),
        contacto: nuevoCliente.contacto.trim(),
        telefono: nuevoCliente.telefono.trim(),
        ciudad: nuevoCliente.ciudad.trim(),
        direccion: nuevoCliente.direccion.trim(),
      });
      setNuevoCliente({ nombre: '', contacto: '', telefono: '', ciudad: '', direccion: '' });
      cargar();
    } catch (err) {
      setError(extraerError(err) ?? 'No se pudo crear el cliente.');
    } finally {
      setGuardandoCliente(false);
    }
  };

  const crearArea = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardandoArea(true);
    try {
      await areasService.crear({
        cliente: Number(nuevaArea.cliente),
        nombre: nuevaArea.nombre.trim(),
        piso: nuevaArea.piso.trim(),
      });
      setNuevaArea({ cliente: '', nombre: '', piso: '' });
      cargar();
    } catch (err) {
      setError(extraerError(err) ?? 'No se pudo crear la ubicación.');
    } finally {
      setGuardandoArea(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-5">
      <p className="rounded-xl bg-black/[0.03] px-4 py-3 text-[13px] text-[#3a3a3c]">
        Registra aquí a los clientes con equipos en arrendamiento o póliza de soporte.
        Los equipos propios de la oficina se agrupan bajo el cliente interno
        &ldquo;Oficina propia&rdquo;.
      </p>

      {error && (
        <p role="alert" className="rounded-xl bg-kyocera-50 px-4 py-3 text-sm text-kyocera-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Clientes */}
        <section className="card p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">Clientes</h3>

          <form onSubmit={crearCliente} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="Razón social / nombre *"
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente((s) => ({ ...s, nombre: e.target.value }))}
                className="input-field"
              />
              <input
                placeholder="Persona de contacto"
                value={nuevoCliente.contacto}
                onChange={(e) => setNuevoCliente((s) => ({ ...s, contacto: e.target.value }))}
                className="input-field"
              />
              <input
                placeholder="Teléfono"
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente((s) => ({ ...s, telefono: e.target.value }))}
                className="input-field"
              />
              <input
                placeholder="Ciudad"
                value={nuevoCliente.ciudad}
                onChange={(e) => setNuevoCliente((s) => ({ ...s, ciudad: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="flex gap-3">
              <input
                placeholder="Dirección"
                value={nuevoCliente.direccion}
                onChange={(e) => setNuevoCliente((s) => ({ ...s, direccion: e.target.value }))}
                className="input-field"
              />
              <button type="submit" disabled={guardandoCliente} className="btn-primary shrink-0 !px-4">
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
          </form>

          <ul className="mt-5 divide-y divide-black/[0.04]">
            {clientes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    {c.nombre}
                    {!c.activa && (
                      <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium text-silver">
                        Inactivo
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-silver">
                    {[c.contacto, c.telefono, c.ciudad].filter(Boolean).join(' · ') || 'Sin datos'}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-silver">
                  {c.total_equipos} equipos · {areas.filter((a) => a.cliente === c.id).length} ubicaciones
                  <button
                    onClick={() => abrirEdicionCliente(c)}
                    title={`Editar ${c.nombre}`}
                    className="ml-1 rounded-full p-2 text-silver transition-colors hover:bg-black/[0.05] hover:text-ink"
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
            {clientes.length === 0 && (
              <li className="py-6 text-center text-sm text-silver">Sin clientes registrados</li>
            )}
          </ul>
        </section>

        {/* Ubicaciones */}
        <section className="card p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">
            Ubicaciones dentro del cliente
          </h3>

          <form onSubmit={crearArea} className="mt-4 space-y-3">
            <select
              required
              value={nuevaArea.cliente}
              onChange={(e) => setNuevaArea((a) => ({ ...a, cliente: e.target.value }))}
              className="input-field"
            >
              <option value="">Cliente *</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <input
                required
                placeholder="Nombre de la ubicación *"
                value={nuevaArea.nombre}
                onChange={(e) => setNuevaArea((a) => ({ ...a, nombre: e.target.value }))}
                className="input-field"
              />
              <input
                placeholder="Piso"
                value={nuevaArea.piso}
                onChange={(e) => setNuevaArea((a) => ({ ...a, piso: e.target.value }))}
                className="input-field !w-24"
              />
              <button type="submit" disabled={guardandoArea} className="btn-primary shrink-0 !px-4">
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
          </form>

          <ul className="mt-5 divide-y divide-black/[0.04]">
            {areas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{a.nombre}</p>
                  <p className="text-xs text-silver">
                    {a.cliente_nombre}{a.piso ? ` · Piso ${a.piso}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => abrirEdicionArea(a)}
                  title={`Editar ${a.nombre}`}
                  className="shrink-0 rounded-full p-2 text-silver transition-colors hover:bg-black/[0.05] hover:text-ink"
                >
                  <IconPencil className="h-4 w-4" />
                </button>
              </li>
            ))}
            {areas.length === 0 && (
              <li className="py-6 text-center text-sm text-silver">Sin ubicaciones registradas</li>
            )}
          </ul>
        </section>
      </div>

      {/* Modal: editar cliente */}
      <Modal
        titulo={clienteEd ? `Editar cliente · ${clienteEd.nombre}` : 'Editar cliente'}
        abierto={clienteEd !== null}
        onCerrar={() => setClienteEd(null)}
      >
        <form onSubmit={guardarCliente} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="ec-nombre" className="label-field">Razón social / nombre *</label>
              <input id="ec-nombre" required value={formCliEd.nombre}
                onChange={(e) => setFormCliEd((f) => ({ ...f, nombre: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="ec-contacto" className="label-field">Persona de contacto</label>
              <input id="ec-contacto" value={formCliEd.contacto}
                onChange={(e) => setFormCliEd((f) => ({ ...f, contacto: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="ec-telefono" className="label-field">Teléfono</label>
              <input id="ec-telefono" value={formCliEd.telefono}
                onChange={(e) => setFormCliEd((f) => ({ ...f, telefono: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="ec-ciudad" className="label-field">Ciudad</label>
              <input id="ec-ciudad" value={formCliEd.ciudad}
                onChange={(e) => setFormCliEd((f) => ({ ...f, ciudad: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="ec-direccion" className="label-field">Dirección</label>
              <input id="ec-direccion" value={formCliEd.direccion}
                onChange={(e) => setFormCliEd((f) => ({ ...f, direccion: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="ec-activo" className="label-field">Estado</label>
              <select id="ec-activo" value={formCliEd.activa ? '1' : '0'}
                onChange={(e) => setFormCliEd((f) => ({ ...f, activa: e.target.value === '1' }))}
                className="input-field">
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          </div>

          {errorEd && (
            <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {errorEd}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setClienteEd(null)} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={guardandoEd} className="btn-primary">
              {guardandoEd ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: editar ubicación */}
      <Modal
        titulo={areaEd ? `Editar ubicación · ${areaEd.nombre}` : 'Editar ubicación'}
        abierto={areaEd !== null}
        onCerrar={() => setAreaEd(null)}
        ancho="max-w-md"
      >
        <form onSubmit={guardarArea} className="space-y-4">
          <div>
            <label htmlFor="ea-cliente" className="label-field">Cliente *</label>
            <select id="ea-cliente" required value={formAreaEd.cliente}
              onChange={(e) => setFormAreaEd((f) => ({ ...f, cliente: e.target.value }))}
              className="input-field">
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="ea-nombre" className="label-field">Nombre *</label>
              <input id="ea-nombre" required value={formAreaEd.nombre}
                onChange={(e) => setFormAreaEd((f) => ({ ...f, nombre: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label htmlFor="ea-piso" className="label-field">Piso</label>
              <input id="ea-piso" value={formAreaEd.piso}
                onChange={(e) => setFormAreaEd((f) => ({ ...f, piso: e.target.value }))}
                className="input-field !w-24" />
            </div>
          </div>

          {errorEd && (
            <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
              {errorEd}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAreaEd(null)} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={guardandoEd} className="btn-primary">
              {guardandoEd ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
