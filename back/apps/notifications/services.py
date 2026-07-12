"""
Capa de servicio de notificaciones.

Las señales de maintenance/workorders llaman aquí; este módulo persiste la
notificación interna y encola el envío externo (email/push) vía Celery.
"""
from django.contrib.contenttypes.models import ContentType

from .models import Notificacion
from .tasks import enviar_notificacion_externa


def _crear(destinatario, tipo, titulo, mensaje, objeto=None):
    if destinatario is None:
        return None
    notificacion = Notificacion.objects.create(
        destinatario=destinatario,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        content_type=ContentType.objects.get_for_model(objeto) if objeto else None,
        object_id=objeto.pk if objeto else None,
    )
    # Envío externo asíncrono; nunca debe tumbar la transacción principal.
    try:
        enviar_notificacion_externa.delay(notificacion.pk)
    except Exception:  # broker caído: la notificación interna ya quedó guardada
        pass
    return notificacion


def notificar_asignacion(destinatario, titulo, mensaje, objeto=None):
    return _crear(destinatario, Notificacion.Tipo.ASIGNACION, titulo, mensaje, objeto)


def notificar_cambio_estatus(objeto, titulo, mensaje, tecnico=None):
    """Notifica al técnico involucrado y a todos los administradores activos."""
    from apps.accounts.models import Usuario

    creadas = []
    if tecnico is not None:
        creadas.append(_crear(tecnico, Notificacion.Tipo.CAMBIO_ESTATUS, titulo, mensaje, objeto))
    admins = Usuario.objects.filter(rol=Usuario.Rol.ADMINISTRADOR, is_active=True)
    for admin in admins:
        if tecnico is None or admin.pk != tecnico.pk:
            creadas.append(_crear(admin, Notificacion.Tipo.CAMBIO_ESTATUS, titulo, mensaje, objeto))
    return creadas
