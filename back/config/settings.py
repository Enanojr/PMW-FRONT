"""
Configuración del proyecto: Plataforma de Mantenimiento de Equipos Kyocera.
"""
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# Render inyecta automáticamente el dominio público del servicio.
RENDER_EXTERNAL_HOSTNAME = config("RENDER_EXTERNAL_HOSTNAME", default="")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Orígenes de confianza para CSRF (login del admin y formularios sobre HTTPS).
CSRF_TRUSTED_ORIGINS = [
    o for o in config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv()) if o
]
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")

# ---------------------------------------------------------------------------
# Aplicaciones
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "simple_history",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.equipment",
    "apps.maintenance",
    "apps.workorders",
    "apps.documents",
    "apps.notifications",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise sirve los estáticos del admin en producción (justo tras Security).
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Auditoría: asocia cada cambio histórico con el usuario que lo hizo
    "simple_history.middleware.HistoryRequestMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# Base de datos: PostgreSQL
# ---------------------------------------------------------------------------
# En producción se usa DATABASE_URL (Neon, Render, etc.); en local se cae a las
# variables DB_* del .env, así el desarrollo sigue igual.
DATABASE_URL = config("DATABASE_URL", default="")
if DATABASE_URL:
    _db = dj_database_url.parse(DATABASE_URL, conn_max_age=0)
    # Neon usa un pooler (PgBouncer en modo transacción): se desactivan los
    # cursores del lado del servidor para evitar errores de conexión.
    _db["DISABLE_SERVER_SIDE_CURSORS"] = True
    DATABASES = {"default": _db}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME", default="kyocera_mantenimiento"),
            "USER": config("DB_USER", default="postgres"),
            "PASSWORD": config("DB_PASSWORD", default=""),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="5432"),
            # Conexiones persistentes solo en producción; el autoreload del
            # servidor de desarrollo las acumula y agota el max_connections.
            "CONN_MAX_AGE": 0 if DEBUG else 60,
            "OPTIONS": {
                # Evita transacciones colgadas en despliegues distribuidos
                "options": "-c statement_timeout=30000",
            },
        }
    }

# Modelo de usuario personalizado con roles (Administrador / Técnico)
AUTH_USER_MODEL = "accounts.Usuario"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "config.pagination.PaginacionEstandar",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/min",
        "user": "300/min",
        "login": "10/min",  # anti fuerza bruta en el login
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API - Mantenimiento de Equipos Kyocera",
    "DESCRIPTION": "Plataforma de administración de mantenimiento de equipos Kyocera.",
    "VERSION": "1.0.0",
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS", default="http://localhost:5173", cast=Csv()
)

# ---------------------------------------------------------------------------
# Celery (notificaciones asíncronas)
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default="redis://localhost:6379/1")
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = "America/Mexico_City"
# En desarrollo (DEBUG) las tareas corren en línea: no se requiere Redis y
# las señales no se bloquean intentando conectar al broker.
CELERY_TASK_ALWAYS_EAGER = config("CELERY_TASK_ALWAYS_EAGER", default=DEBUG, cast=bool)

# Mantenimientos recurrentes: Celery Beat genera cada madrugada los servicios
# cuyos planes ya vencieron. (En desarrollo: python manage.py generar_recurrentes)
CELERY_BEAT_SCHEDULE = {
    "generar-mantenimientos-recurrentes": {
        "task": "apps.maintenance.tasks.generar_mantenimientos_recurrentes",
        "schedule": 60 * 60 * 24,  # cada 24 h
    },
}

# ---------------------------------------------------------------------------
# Correo (notificaciones externas)
# ---------------------------------------------------------------------------
# En desarrollo los correos se imprimen en consola; en producción configurar SMTP.
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend" if DEBUG
    else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="mantenimiento@kyocera.local")

# ---------------------------------------------------------------------------
# Repositorio documental (preparado para ECM / Alfresco)
# ---------------------------------------------------------------------------
DOCUMENT_STORAGE_BACKEND = config("DOCUMENT_STORAGE_BACKEND", default="local")  # local | alfresco
ALFRESCO_BASE_URL = config("ALFRESCO_BASE_URL", default="")
ALFRESCO_USER = config("ALFRESCO_USER", default="")
ALFRESCO_PASSWORD = config("ALFRESCO_PASSWORD", default="")

# ---------------------------------------------------------------------------
# Internacionalización / archivos
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "es-mx"
TIME_ZONE = "America/Mexico_City"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# WhiteNoise: comprime y cachea los estáticos servidos por Django (admin).
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "SAMEORIGIN"  # permite el visor PDF embebido del propio sitio

# ---------------------------------------------------------------------------
# Seguridad adicional (activa en producción con DEBUG=False)
# ---------------------------------------------------------------------------
if not DEBUG:
    # Render/Vercel terminan el TLS en su proxy: sin esto, SECURE_SSL_REDIRECT
    # provoca un bucle de redirección infinito.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
