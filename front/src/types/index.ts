// ---------------------------------------------------------------------------
// Tipos compartidos de la plataforma (espejo de los modelos del backend)
// ---------------------------------------------------------------------------

export type Rol = 'ADMIN' | 'TECNICO';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nombre_completo: string;
  rol: Rol;
  telefono: string;
  is_active: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  usuario: Usuario;
}

export interface Cliente {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  activa: boolean;
  total_equipos: number;
}

export interface Area {
  id: number;
  cliente: number;
  cliente_nombre: string;
  nombre: string;
  piso: string;
}

export type EstadoEquipo = 'OPERATIVO' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO' | 'BAJA';

/** Modalidad comercial del equipo */
export type EsquemaEquipo = 'ARRENDAMIENTO' | 'POLIZA' | 'PROPIO';

export type TipoModeloEquipo = 'MFP' | 'IMPRESORA' | 'OTRO';

export interface ModeloEquipo {
  id: number;
  nombre: string;
  familia: string;
  tipo: TipoModeloEquipo;
  tipo_display: string;
  es_color: boolean;
  descripcion: string;
  activo: boolean;
  total_equipos: number;
}

export interface Equipo {
  id: number;
  numero_serie: string;
  /** FK al catálogo de modelos */
  modelo: number;
  modelo_nombre: string;
  modelo_detalle: ModeloEquipo | null;
  descripcion: string;
  estado: EstadoEquipo;
  estado_display: string;
  esquema: EsquemaEquipo;
  esquema_display: string;
  ubicacion_actual: number | null;
  ubicacion_detalle: Area | null;
  fecha_instalacion: string | null;
  contador_paginas: number;
}

export type TipoMantenimiento = 'PREVENTIVO' | 'CORRECTIVO';
export type EstatusMantenimiento =
  | 'PROGRAMADO'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'REPROGRAMADO';

export interface Mantenimiento {
  id: number;
  equipo: number;
  equipo_detalle: Equipo;
  tipo: TipoMantenimiento;
  tipo_display: string;
  estatus: EstatusMantenimiento;
  estatus_display: string;
  tecnico_asignado: number;
  tecnico_detalle: Usuario;
  fecha_programada: string;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  descripcion: string;
  observaciones_tecnico: string;
}

export type EstatusOrden = 'ABIERTA' | 'ASIGNADA' | 'EN_PROCESO' | 'CERRADA' | 'CANCELADA';
export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface TipoOrden {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface Refaccion {
  id: number;
  codigo: string;
  nombre: string;
  modelo_compatible: string;
  existencias: number;
}

export interface RefaccionUtilizada {
  id: number;
  refaccion: number;
  refaccion_detalle: { id: number; codigo: string; nombre: string };
  cantidad: number;
  comentario: string;
}

export interface OrdenTrabajo {
  id: number;
  folio: string;
  tipo: number;
  tipo_detalle: TipoOrden;
  equipo: number;
  equipo_detalle: Equipo;
  tecnico_asignado: number | null;
  tecnico_detalle: Usuario | null;
  estatus: EstatusOrden;
  estatus_display: string;
  prioridad: Prioridad;
  prioridad_display: string;
  descripcion_problema: string;
  diagnostico: string;
  trabajo_realizado: string;
  refacciones_utilizadas: RefaccionUtilizada[];
  fecha_cierre: string | null;
  creado_en: string;
}

export type TipoDocumento = 'MANUAL' | 'REPORTE' | 'GUIA' | 'EVIDENCIA' | 'OTRO';

export interface Documento {
  id: number;
  titulo: string;
  tipo: TipoDocumento;
  tipo_display: string;
  descripcion: string;
  modelo_equipo: string;
  url_descarga: string;
  tamano_bytes: number;
  version: string;
  creado_en: string;
}

export interface Notificacion {
  id: number;
  tipo: string;
  tipo_display: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creado_en: string;
}

export interface HistorialUbicacion {
  id: number;
  area_origen_detalle: Area | null;
  area_destino_detalle: Area;
  motivo: string;
  registrado_por_nombre: string;
  fecha_movimiento: string;
}

export interface EquipoDetalle extends Equipo {
  historial_ubicaciones: HistorialUbicacion[];
}

export interface PlanMantenimiento {
  id: number;
  equipo: number;
  equipo_detalle: Equipo;
  tecnico_asignado: number;
  tecnico_detalle: Usuario;
  tipo: TipoMantenimiento;
  tipo_display: string;
  frecuencia_dias: number;
  proxima_fecha: string;
  descripcion: string;
  activo: boolean;
}

export interface LecturaContador {
  id: number;
  lectura: number;
  comentario: string;
  registrado_por_nombre: string;
  fecha: string;
}

export interface DashboardResumen {
  equipos: {
    total: number;
    por_estado: Partial<Record<EstadoEquipo, number>>;
    por_esquema: Partial<Record<EsquemaEquipo, number>>;
  };
  ordenes: {
    abiertas: number;
    por_prioridad: Partial<Record<Prioridad, number>>;
    cerradas_mes: number;
  };
  mantenimientos: {
    proximos_7_dias: number;
    en_proceso: number;
    completados_mes: number;
  };
  tecnicos_activos: number;
  documentos: number;
}

/** Respuesta paginada estándar de DRF */
export interface Paginado<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
