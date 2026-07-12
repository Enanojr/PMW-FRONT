"""
Permisos RBAC centralizados.

Reglas de negocio:
- Administrador: acceso total (CRUD) a todos los endpoints.
- Técnico: lectura/escritura únicamente sobre mantenimientos y órdenes de
  trabajo asignados a él; solo lectura sobre el repositorio documental.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class EsAdministrador(BasePermission):
    """Permite el acceso únicamente a usuarios con rol Administrador."""

    message = "Se requiere rol de Administrador."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.es_administrador
        )


class EsAdminOTecnicoAsignado(BasePermission):
    """
    Admin: acceso total.
    Técnico: solo puede ver/editar objetos cuyo campo `tecnico_asignado`
    (o `tecnico`) sea él mismo. No puede crear ni eliminar registros.
    """

    message = "Solo puedes operar sobre trabajos asignados a ti."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.es_administrador:
            return True
        # El técnico no crea ni elimina; solo lista/consulta/actualiza lo suyo.
        return request.method not in ("POST", "DELETE")

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.es_administrador:
            return True
        tecnico = getattr(obj, "tecnico_asignado", None) or getattr(obj, "tecnico", None)
        return tecnico_id_igual(tecnico, user)


class EsAdminOTecnicoLecturaYAlta(BasePermission):
    """
    Admin: CRUD completo.
    Técnico: lectura y alta (POST) de registros; no puede editarlos ni eliminarlos.
    """

    message = "Como Técnico solo puedes consultar y dar de alta registros."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.es_administrador:
            return True
        return request.method in SAFE_METHODS or request.method == "POST"


class EsAdminOSoloLectura(BasePermission):
    """Admin: CRUD completo. Técnico: solo métodos de lectura (GET/HEAD/OPTIONS)."""

    message = "Solo lectura para el rol Técnico."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.es_administrador:
            return True
        return request.method in SAFE_METHODS


def tecnico_id_igual(tecnico, user) -> bool:
    if tecnico is None:
        return False
    return getattr(tecnico, "pk", tecnico) == user.pk
