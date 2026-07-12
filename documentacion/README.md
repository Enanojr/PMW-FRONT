# Plataforma de Mantenimiento de Equipos Kyocera

Sistema web para administrar el mantenimiento de equipos Kyocera: inventario,
calendario de servicios preventivos/correctivos, órdenes de trabajo con
refacciones y repositorio documental (manuales y reportes PDF), con control de
acceso por roles (Administrador / Técnico).

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `back/` | Backend Django REST Framework + PostgreSQL |
| `front/` | Frontend React + TypeScript + Vite + Tailwind CSS |
| `BD/` | DDL de referencia (`schema.sql`) y modelo ER (`MODELO_ER.md`) |
| `documentacion/` | Este README y el plan Agile (`AGILE_PLAN.md`) |

## Stack

- **Base de datos**: PostgreSQL 15+
- **Backend**: Python 3.11+ · Django 5 · Django REST Framework · SimpleJWT · Celery
- **Frontend**: React 18 · TypeScript (strict) · Vite · Tailwind CSS · Axios
- **Autenticación**: JWT con refresh rotativo y RBAC (Administrador / Técnico)

---

## 1. Requisitos previos

- Python 3.11 o superior
- Node.js 18 o superior
- PostgreSQL 15 o superior (corriendo en `localhost:5432` por defecto)
- Redis (opcional, solo para notificaciones asíncronas con Celery)

## 2. Base de datos

```sql
-- En psql como superusuario:
CREATE DATABASE kyocera_mantenimiento;
CREATE USER kyocera_app WITH PASSWORD 'tu_password_segura';
GRANT ALL PRIVILEGES ON DATABASE kyocera_mantenimiento TO kyocera_app;
```

> El esquema lo crean las migraciones de Django. `BD/schema.sql` es solo
> documentación de referencia para DBAs.

## 3. Backend (Django)

```bash
cd back
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt

# Variables de entorno
copy .env.example .env      # Windows (cp en Linux/Mac)
# Editar .env con tus credenciales de PostgreSQL

# Migraciones y superusuario
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser   # asignarle rol ADMIN desde el admin o shell

# Levantar el servidor
python manage.py runserver          # http://localhost:8000
```

**Asignar rol Administrador al superusuario:**

```bash
python manage.py shell -c "from apps.accounts.models import Usuario; u=Usuario.objects.get(username='TU_USUARIO'); u.rol='ADMIN'; u.save()"
```

**Celery (opcional, notificaciones externas):**

```bash
celery -A config worker -l info
# Sin Redis en desarrollo: poner CELERY_TASK_ALWAYS_EAGER=True en .env
```

### Variables de entorno del backend (`back/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SECRET_KEY` | Clave secreta de Django | *(generar una aleatoria)* |
| `DEBUG` | Modo debug | `True` (solo desarrollo) |
| `DB_NAME` | Base de datos | `kyocera_mantenimiento` |
| `DB_USER` / `DB_PASSWORD` | Credenciales PostgreSQL | `kyocera_app` / `...` |
| `DB_HOST` / `DB_PORT` | Servidor PostgreSQL | `localhost` / `5432` |
| `CORS_ALLOWED_ORIGINS` | Origen del frontend | `http://localhost:5173` |
| `CELERY_BROKER_URL` | Broker Redis | `redis://localhost:6379/0` |
| `DOCUMENT_STORAGE_BACKEND` | `local` o `alfresco` | `local` |
| `ALFRESCO_BASE_URL` | URL del ECM (futuro) | `https://ecm.empresa.com` |

## 4. Frontend (React)

```bash
cd front
npm install
copy .env.example .env      # opcional; el proxy de Vite ya apunta a :8000
npm run dev                 # http://localhost:5173
```

## 5. URLs útiles

| URL | Descripción |
|---|---|
| `http://localhost:5173` | Aplicación web |
| `http://localhost:8000/api/docs/` | Documentación Swagger de la API |
| `http://localhost:8000/admin/` | Django Admin |

## 6. Roles y permisos (RBAC)

| Recurso | Administrador | Técnico |
|---|---|---|
| Usuarios | CRUD | Solo su perfil (`/usuarios/yo/`) |
| Sucursales / Áreas / Equipos | CRUD | Solo lectura |
| Mantenimientos | CRUD global | Lee/actualiza **solo los suyos** (estatus, fechas reales, observaciones) |
| Órdenes de trabajo | CRUD global | Lee/actualiza **solo las suyas** (estatus, diagnóstico, refacciones) |
| Repositorio documental | CRUD | Solo lectura |
| Notificaciones | Las propias | Las propias |

La autoridad del RBAC vive en el backend (`back/apps/accounts/permissions.py`);
el frontend solo oculta vistas según el rol.

## 7. Seguridad implementada

- JWT con access de 30 min, refresh rotativo con blacklist.
- Validación de contraseñas (longitud mínima 10, no comunes).
- Throttling de API (30/min anónimo, 300/min autenticado).
- Filtrado de queryset por rol: un técnico **no puede** consultar trabajos ajenos ni por ID directo.
- Validación de campos editables por rol en serializers.
- Solo PDF en el repositorio documental (`FileExtensionValidator`).
- Cabeceras de seguridad y HSTS activados automáticamente con `DEBUG=False`.

## 8. Integración futura con Alfresco (ECM)

El modelo `Documento` guarda **metadatos** y delega el binario a un backend
conmutables (`back/apps/documents/storage.py`). Para migrar a Alfresco:

1. Configurar `DOCUMENT_STORAGE_BACKEND=alfresco` y las credenciales en `.env`.
2. Registrar documentos con `backend_almacenamiento=ALFRESCO` y su `referencia_externa` (nodeRef).
3. Completar la autenticación por ticket en `BackendAlfresco` (esqueleto ya incluido).

Ni la API ni el frontend requieren cambios.
