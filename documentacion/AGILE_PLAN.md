# Plan Agile — Plataforma de Mantenimiento Kyocera

Estructura lista para darse de alta en Jira / Azure DevOps / GitHub Projects.
Estimaciones en story points (Fibonacci). Sprints sugeridos de 2 semanas.

**Roles**: PO (Product Owner), SM (Scrum Master), Dev Backend, Dev Frontend, QA.

**Definition of Done (DoD) global**: código revisado en PR, pruebas unitarias
pasando, migraciones aplicadas sin conflicto, documentación de API actualizada,
validado por QA en ambiente de staging.

---

## ÉPICA 1 — Fundación técnica e infraestructura

> Como equipo de desarrollo necesitamos la base técnica del proyecto para
> construir funcionalidad sobre un entorno reproducible y seguro.

| ID | Historia de usuario | Criterios de aceptación | Pts |
|---|---|---|---|
| E1-H1 | Como desarrollador quiero el proyecto Django configurado con PostgreSQL y variables de entorno para trabajar en un entorno reproducible. | `manage.py migrate` corre limpio contra PostgreSQL; secretos fuera del código (`.env`); README con pasos de instalación. | 3 |
| E1-H2 | Como desarrollador quiero el proyecto React+TS con Vite, Tailwind y estructura modular para desarrollar UI de forma consistente. | `npm run dev` levanta la app; carpetas `components/pages/hooks/services/utils/types`; `tsc` sin errores en modo strict. | 3 |
| E1-H3 | Como DevOps quiero pipelines de CI (lint + tests) para detectar regresiones en cada PR. | Pipeline corre en cada PR; falla si lint o tests fallan. | 5 |
| E1-H4 | Como DBA quiero el modelo ER documentado e índices definidos para garantizar rendimiento y crecimiento. | `BD/MODELO_ER.md` y `BD/schema.sql` aprobados en revisión de arquitectura. | 2 |

## ÉPICA 2 — Autenticación y control de acceso (RBAC)

> Como organización necesitamos que solo usuarios autorizados accedan, con
> permisos distintos para Administrador y Técnico.

| ID | Historia de usuario | Criterios de aceptación | Pts |
|---|---|---|---|
| E2-H1 | Como usuario quiero iniciar sesión con usuario y contraseña para acceder a la plataforma. | Login emite JWT (access+refresh) con el rol embebido; credenciales inválidas → 401 con mensaje claro. | 3 |
| E2-H2 | Como usuario quiero que mi sesión se renueve automáticamente para no ser interrumpido mientras trabajo. | Interceptor renueva el access ante 401 y reintenta la petición; si el refresh falla, redirige a login. | 5 |
| E2-H3 | Como Administrador quiero crear/editar/desactivar usuarios con rol Admin o Técnico para gestionar mi equipo. | CRUD de usuarios solo para rol ADMIN; contraseñas validadas y hasheadas; un Técnico recibe 403 al intentarlo. | 5 |
| E2-H4 | Como Técnico quiero ver solo mis trabajos asignados para enfocarme en mi operación. | Listados de mantenimientos/órdenes filtrados por técnico en el queryset; acceso directo por ID ajeno → 404/403. | 5 |
| E2-H5 | Como usuario quiero que la navegación muestre solo las vistas de mi rol para no ver opciones inaccesibles. | Rutas protegidas por rol en React; el Técnico no ve Dashboard ni Equipos. | 3 |

## ÉPICA 3 — Gestión de equipos y ubicaciones

> Como Administrador necesito el inventario de equipos Kyocera con su
> ubicación e historial para controlar los activos.

| ID | Historia de usuario | Criterios de aceptación | Pts |
|---|---|---|---|
| E3-H1 | Como Administrador quiero administrar el catálogo de sucursales y áreas para ubicar los equipos. | CRUD de sucursales/áreas; no se puede borrar una con equipos asignados (PROTECT). | 3 |
| E3-H2 | Como Administrador quiero registrar equipos con número de serie único, modelo y estado para tener el inventario completo. | Serie duplicada rechazada con mensaje claro; estados: Operativo / En mantenimiento / Fuera de servicio / Baja. | 3 |
| E3-H3 | Como Administrador quiero reubicar un equipo dejando historial para conocer su trazabilidad. | Acción "mover" registra origen, destino, motivo, usuario y fecha; historial visible en el detalle del equipo. | 5 |
| E3-H4 | Como Administrador quiero buscar y filtrar equipos por serie, modelo, estado y sucursal para localizarlos rápido. | Búsqueda con debounce en UI; filtros combinables; respuesta paginada. | 3 |

## ÉPICA 4 — Mantenimientos y calendario

> Como Administrador necesito programar mantenimientos preventivos y
> correctivos y asignarlos a técnicos; como Técnico necesito consultarlos y
> reportar avance.

| ID | Historia de usuario | Criterios de aceptación | Pts |
|---|---|---|---|
| E4-H1 | Como Administrador quiero programar un mantenimiento (preventivo/correctivo) asignando técnico y fecha para planear la operación. | Solo usuarios rol TECNICO son asignables; validación de fechas; queda en estatus Programado. | 5 |
| E4-H2 | Como Técnico quiero ver mi calendario mensual de servicios para organizar mi ruta de trabajo. | Vista mensual con eventos del técnico autenticado; navegación entre meses; detalle por día. | 5 |
| E4-H3 | Como Administrador quiero ver el calendario global con filtro por técnico para balancear la carga. | Vista global; filtro por técnico; distinción visual preventivo/correctivo. | 3 |
| E4-H4 | Como Técnico quiero actualizar el estatus y registrar observaciones de mis mantenimientos para reportar avance. | Técnico solo edita estatus, fechas reales y observaciones; el resto de campos → error de validación. | 3 |
| E4-H5 | Como interesado quiero recibir una notificación cuando un mantenimiento cambie de estatus o se me asigne para reaccionar a tiempo. | Notificación interna creada por señal; visible en la campana del usuario; envío externo encolado en Celery. | 5 |

## ÉPICA 5 — Órdenes de trabajo

> Como operación necesitamos documentar cada intervención: problema,
> diagnóstico, trabajo realizado y refacciones utilizadas.

| ID | Historia de usuario | Criterios de aceptación | Pts |
|---|---|---|---|
| E5-H1 | Como Administrador quiero crear órdenes de trabajo tipificadas con folio automático para documentar cada servicio. | Folio `OT-######` autogenerado y único; tipo desde catálogo; prioridad Baja/Media/Alta/Urgente. | 5 |
| E5-H2 | Como Administrador quiero asignar una orden a un técnico para distribuir el trabajo. | Al asignar, el técnico recibe notificación; la orden pasa a estatus Asignada. | 3 |
| E5-H3 | Como Técnico quiero registrar diagnóstico, trabajo realizado y refacciones para cerrar la orden con evidencia. | Refacciones descuentan existencias validando stock; cierre registra fecha; orden cerrada ya no es editable por el técnico. | 8 |
| E5-H4 | Como Administrador quiero consultar el histórico de órdenes por equipo para conocer su comportamiento. | Filtro por equipo/estatus/prioridad; listado paginado sin consultas N+1 (verificado con debug toolbar). | 3 |

## ÉPICA 6 — Repositorio documental

> Como operación necesitamos manuales y reportes escaneados centralizados,
> preparados para migrar a un ECM (Alfresco).

| ID | Historia de usuario | Criterios de aceptación | Pts |
|---|---|---|---|
| E6-H1 | Como Administrador quiero subir manuales y reportes en PDF con metadatos para centralizar la documentación. | Solo PDF aceptado; metadatos: título, tipo, modelo/equipo, versión; tamaño registrado. | 5 |
| E6-H2 | Como Técnico quiero buscar y leer manuales desde la plataforma para consultar procedimientos en sitio. | Búsqueda por título/modelo con debounce; visor PDF embebido; Técnico no puede subir/borrar (403). | 5 |
| E6-H3 | Como arquitecto quiero que el almacenamiento sea conmutable (local/Alfresco) para migrar documentos pesados al ECM sin reescritura. | Cambiar backend vía variable de entorno no rompe la API; documento ALFRESCO resuelve URL del ECM. | 8 |

## ÉPICA 7 — Dashboard y reportes gerenciales

> Como Administrador necesito visibilidad del estado general de la operación.

| ID | Historia de usuario | Criterios de aceptación | Pts |
|---|---|---|---|
| E7-H1 | Como Administrador quiero un dashboard con indicadores (equipos por estado, órdenes abiertas, próximos servicios) para decidir con datos. | Tarjetas de KPIs, próximos mantenimientos y órdenes recientes; carga < 2s. | 5 |
| E7-H2 | Como Administrador quiero exportar reportes de servicios por periodo para informar a dirección. *(backlog)* | Exportación CSV/PDF con filtros de fecha. | 5 |

---

## Roadmap sugerido

| Sprint | Objetivo | Historias |
|---|---|---|
| Sprint 1 | Fundación + autenticación | E1-H1, E1-H2, E1-H4, E2-H1, E2-H2 |
| Sprint 2 | RBAC completo + equipos | E2-H3, E2-H4, E2-H5, E3-H1, E3-H2 |
| Sprint 3 | Mantenimientos + calendario | E3-H3, E3-H4, E4-H1, E4-H2, E4-H3 |
| Sprint 4 | Órdenes de trabajo + notificaciones | E4-H4, E4-H5, E5-H1, E5-H2, E5-H3 |
| Sprint 5 | Repositorio documental + dashboard | E5-H4, E6-H1, E6-H2, E7-H1 |
| Sprint 6 | ECM, reportes y hardening | E6-H3, E7-H2, E1-H3, deuda técnica |

**Velocidad estimada**: ~20 pts/sprint (equipo de 3 devs).

## Riesgos identificados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Retraso en definición del contrato con Alfresco | Medio | Abstracción de storage ya implementada; el ECM entra sin reescritura. |
| Volumen de PDFs escaneados en disco local | Alto | Límite de tamaño por archivo + migración temprana a ECM (E6-H3). |
| Técnicos en campo sin conectividad | Medio | Backlog: modo offline / PWA en fase 2. |
| Crecimiento de historial y notificaciones | Bajo | Índices compuestos ya creados; particionado planificado (ver `BD/MODELO_ER.md`). |
