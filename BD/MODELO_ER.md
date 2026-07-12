# Modelo Entidad-Relación — Plataforma de Mantenimiento Kyocera

> Fuente de verdad: modelos Django en `back/apps/*/models.py`. Las migraciones
> generan este esquema en PostgreSQL. `BD/schema.sql` es el DDL de referencia.

## Diagrama (Mermaid)

```mermaid
erDiagram
    USUARIOS ||--o{ MANTENIMIENTOS : "tecnico_asignado"
    USUARIOS ||--o{ ORDENES_TRABAJO : "tecnico_asignado"
    USUARIOS ||--o{ NOTIFICACIONES : "destinatario"
    USUARIOS ||--o{ DOCUMENTOS : "subido_por"
    USUARIOS ||--o{ HISTORIAL_UBICACIONES : "registrado_por"

    SUCURSALES ||--o{ AREAS : "contiene"
    AREAS ||--o{ EQUIPOS : "ubicacion_actual"
    AREAS ||--o{ HISTORIAL_UBICACIONES : "origen/destino"

    EQUIPOS ||--o{ HISTORIAL_UBICACIONES : "movimientos"
    EQUIPOS ||--o{ MANTENIMIENTOS : "recibe"
    EQUIPOS ||--o{ ORDENES_TRABAJO : "genera"
    EQUIPOS ||--o{ DOCUMENTOS : "manuales"

    MANTENIMIENTOS ||--o{ ORDENES_TRABAJO : "deriva en"

    TIPOS_ORDEN ||--o{ ORDENES_TRABAJO : "clasifica"
    ORDENES_TRABAJO ||--o{ REFACCIONES_UTILIZADAS : "consume"
    REFACCIONES ||--o{ REFACCIONES_UTILIZADAS : "detalle"
    ORDENES_TRABAJO ||--o{ DOCUMENTOS : "reportes"

    USUARIOS {
        bigint id PK
        varchar username UK
        varchar rol "ADMIN | TECNICO"
        boolean is_active
    }
    SUCURSALES {
        bigint id PK
        varchar nombre UK
        varchar ciudad
    }
    AREAS {
        bigint id PK
        bigint sucursal_id FK
        varchar nombre "UK con sucursal"
    }
    EQUIPOS {
        bigint id PK
        varchar numero_serie UK
        varchar modelo
        varchar estado
        bigint ubicacion_actual_id FK
    }
    HISTORIAL_UBICACIONES {
        bigint id PK
        bigint equipo_id FK
        bigint area_origen_id FK
        bigint area_destino_id FK
        timestamptz fecha_movimiento
    }
    MANTENIMIENTOS {
        bigint id PK
        bigint equipo_id FK
        bigint tecnico_asignado_id FK
        varchar tipo "PREVENTIVO | CORRECTIVO"
        varchar estatus
        timestamptz fecha_programada
    }
    TIPOS_ORDEN {
        bigint id PK
        varchar nombre UK
    }
    ORDENES_TRABAJO {
        bigint id PK
        varchar folio UK
        bigint tipo_id FK
        bigint equipo_id FK
        bigint tecnico_asignado_id FK
        varchar estatus
        varchar prioridad
    }
    REFACCIONES {
        bigint id PK
        varchar codigo UK
        int existencias
    }
    REFACCIONES_UTILIZADAS {
        bigint id PK
        bigint orden_id FK
        bigint refaccion_id FK
        int cantidad
    }
    DOCUMENTOS {
        bigint id PK
        varchar titulo
        varchar tipo "MANUAL | REPORTE | GUIA | OTRO"
        varchar backend_almacenamiento "LOCAL | ALFRESCO"
        varchar referencia_externa "nodeRef ECM"
    }
    NOTIFICACIONES {
        bigint id PK
        bigint destinatario_id FK
        varchar tipo
        boolean leida
    }
```

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `BIGINT IDENTITY` en todas las PK | Crecimiento a millones de registros sin migración de tipo. |
| `ON DELETE RESTRICT/PROTECT` en FKs de negocio | Nunca se pierde trazabilidad de equipos, técnicos ni catálogos. |
| Historial de ubicaciones en tabla propia | El equipo guarda solo la ubicación actual; la bitácora crece sin inflar `equipos`. |
| Índices compuestos `(tecnico, fecha)` y `(tecnico, estatus)` | Son las consultas dominantes: calendario por técnico y "mis órdenes". |
| `TIMESTAMPTZ` en todos los timestamps | Operación multi-sucursal / multi-zona horaria sin ambigüedad. |
| Documentos = solo metadatos + backend conmutables (`LOCAL`/`ALFRESCO`) | Los PDFs pesados migran al ECM sin cambiar el esquema ni la API. |
| Notificaciones con relación genérica (content_type + object_id) | Una sola tabla notifica mantenimientos, órdenes y eventos futuros. |
| `CHECK` constraints espejo de los `choices` de Django | Integridad garantizada aun si otro sistema escribe directo a la BD. |

## Estrategia de crecimiento

- **Particionado futuro**: `historial_ubicaciones`, `notificaciones` y
  `ordenes_trabajo` son candidatas a particionado por rango de fecha
  (`PARTITION BY RANGE (creado_en)`) cuando superen ~10M de filas.
- **Réplicas de lectura**: el dashboard y los reportes pueden apuntar a una
  réplica; la app ya separa lecturas pesadas (listados paginados) de escrituras.
- **`CONN_MAX_AGE` + statement_timeout** configurados en Django para
  estabilidad bajo carga.
