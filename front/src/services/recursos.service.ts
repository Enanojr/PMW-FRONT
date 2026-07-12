import type {
  Area,
  Cliente,
  DashboardResumen,
  Documento,
  Equipo,
  EquipoDetalle,
  LecturaContador,
  Mantenimiento,
  ModeloEquipo,
  Notificacion,
  OrdenTrabajo,
  Paginado,
  PlanMantenimiento,
  Refaccion,
  TipoOrden,
  Usuario,
} from '../types';
import { api } from './api';

type Filtros = Record<string, string | number | boolean | undefined>;

function limpiarFiltros(filtros?: Filtros) {
  if (!filtros) return undefined;
  return Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''),
  );
}

export const equiposService = {
  listar: async (filtros?: Filtros) =>
    (await api.get<Paginado<Equipo>>('/equipos/', { params: limpiarFiltros(filtros) })).data,
  detalle: async (id: number) => (await api.get<EquipoDetalle>(`/equipos/${id}/`)).data,
  crear: async (datos: Partial<Equipo>) => (await api.post<Equipo>('/equipos/', datos)).data,
  actualizar: async (id: number, cambios: Partial<Equipo>) =>
    (await api.patch<Equipo>(`/equipos/${id}/`, cambios)).data,
  mover: async (id: number, area_destino: number, motivo: string) =>
    (await api.post<EquipoDetalle>(`/equipos/${id}/mover/`, { area_destino, motivo })).data,
  eliminar: async (id: number) => {
    await api.delete(`/equipos/${id}/`);
  },
  lecturas: async (id: number) =>
    (await api.get<LecturaContador[]>(`/equipos/${id}/lecturas/`)).data,
  registrarLectura: async (id: number, lectura: number, comentario: string) =>
    (await api.post<LecturaContador>(`/equipos/${id}/lecturas/`, { lectura, comentario })).data,
};

export const refaccionesService = {
  listar: async (filtros?: Filtros) =>
    (await api.get<Paginado<Refaccion>>('/refacciones/', {
      params: { page_size: 200, ...limpiarFiltros(filtros) },
    })).data,
  crear: async (datos: Partial<Refaccion>) =>
    (await api.post<Refaccion>('/refacciones/', datos)).data,
  actualizar: async (id: number, cambios: Partial<Refaccion>) =>
    (await api.patch<Refaccion>(`/refacciones/${id}/`, cambios)).data,
};

export const planesService = {
  listar: async () =>
    (await api.get<Paginado<PlanMantenimiento>>('/planes-mantenimiento/', {
      params: { page_size: 200 },
    })).data,
  crear: async (datos: Partial<PlanMantenimiento>) =>
    (await api.post<PlanMantenimiento>('/planes-mantenimiento/', datos)).data,
  actualizar: async (id: number, cambios: Partial<PlanMantenimiento>) =>
    (await api.patch<PlanMantenimiento>(`/planes-mantenimiento/${id}/`, cambios)).data,
};

export const clientesService = {
  listar: async () =>
    (await api.get<Paginado<Cliente>>('/clientes/', { params: { page_size: 200 } })).data,
  crear: async (datos: Partial<Cliente>) =>
    (await api.post<Cliente>('/clientes/', datos)).data,
  actualizar: async (id: number, cambios: Partial<Cliente>) =>
    (await api.patch<Cliente>(`/clientes/${id}/`, cambios)).data,
};

export const reportesService = {
  resumen: async () => (await api.get<DashboardResumen>('/dashboard/resumen/')).data,
};

export const modelosEquipoService = {
  listar: async () =>
    (await api.get<Paginado<ModeloEquipo>>('/modelos-equipo/', { params: { activo: true, page_size: 200 } })).data,
  crear: async (datos: Partial<ModeloEquipo>) =>
    (await api.post<ModeloEquipo>('/modelos-equipo/', datos)).data,
};

export const areasService = {
  listar: async () =>
    (await api.get<Paginado<Area>>('/areas/', { params: { page_size: 200 } })).data,
  crear: async (datos: Partial<Area>) => (await api.post<Area>('/areas/', datos)).data,
  actualizar: async (id: number, cambios: Partial<Area>) =>
    (await api.patch<Area>(`/areas/${id}/`, cambios)).data,
};

export const tiposOrdenService = {
  listar: async () =>
    (await api.get<Paginado<TipoOrden>>('/tipos-orden/', { params: { activo: true, page_size: 200 } })).data,
};

export const mantenimientosService = {
  listar: async (filtros?: Filtros) =>
    (await api.get<Paginado<Mantenimiento>>('/mantenimientos/', { params: limpiarFiltros(filtros) })).data,
  actualizar: async (id: number, cambios: Partial<Mantenimiento>) =>
    (await api.patch<Mantenimiento>(`/mantenimientos/${id}/`, cambios)).data,
  crear: async (datos: Partial<Mantenimiento>) =>
    (await api.post<Mantenimiento>('/mantenimientos/', datos)).data,
};

export const ordenesService = {
  listar: async (filtros?: Filtros) =>
    (await api.get<Paginado<OrdenTrabajo>>('/ordenes-trabajo/', { params: limpiarFiltros(filtros) })).data,
  detalle: async (id: number) => (await api.get<OrdenTrabajo>(`/ordenes-trabajo/${id}/`)).data,
  crear: async (datos: Partial<OrdenTrabajo>) =>
    (await api.post<OrdenTrabajo>('/ordenes-trabajo/', datos)).data,
  actualizar: async (id: number, cambios: Partial<OrdenTrabajo>) =>
    (await api.patch<OrdenTrabajo>(`/ordenes-trabajo/${id}/`, cambios)).data,
  eliminar: async (id: number) => {
    await api.delete(`/ordenes-trabajo/${id}/`);
  },
  /** Sube una evidencia (foto o PDF) ligada a la orden. */
  subirEvidencia: async (id: number, archivo: File, descripcion = '') => {
    const datos = new FormData();
    datos.append('archivo', archivo);
    datos.append('descripcion', descripcion);
    return (await api.post<Documento>(`/ordenes-trabajo/${id}/evidencias/`, datos)).data;
  },
};

export const documentosService = {
  listar: async (filtros?: Filtros) =>
    (await api.get<Paginado<Documento>>('/documentos/', { params: limpiarFiltros(filtros) })).data,
  /** Sube un PDF con sus metadatos (multipart/form-data). */
  crear: async (datos: FormData) =>
    (await api.post<Documento>('/documentos/', datos)).data,
};

export const notificacionesService = {
  listar: async () => (await api.get<Paginado<Notificacion>>('/notificaciones/')).data,
  marcarLeida: async (id: number) =>
    (await api.patch<Notificacion>(`/notificaciones/${id}/`, { leida: true })).data,
  marcarTodasLeidas: async () =>
    (await api.post<{ actualizadas: number }>('/notificaciones/marcar-todas-leidas/')).data,
};

export interface NuevoUsuario {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  rol: 'ADMIN' | 'TECNICO';
  telefono: string;
  password: string;
}

export const usuariosService = {
  tecnicos: async () => (await api.get<Usuario[]>('/auth/usuarios/tecnicos/')).data,
  listar: async () =>
    (await api.get<Paginado<Usuario>>('/auth/usuarios/', { params: { page_size: 200 } })).data,
  crear: async (datos: NuevoUsuario) =>
    (await api.post<Usuario>('/auth/usuarios/', datos)).data,
  /** PATCH parcial: si `password` va vacío, no se cambia. */
  actualizar: async (id: number, cambios: Partial<NuevoUsuario> & { is_active?: boolean }) =>
    (await api.patch<Usuario>(`/auth/usuarios/${id}/`, cambios)).data,
};
