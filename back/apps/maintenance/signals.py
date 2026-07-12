"""
Señales de notificación:
- Cambio de estatus de un mantenimiento → notifica al técnico y a los admins.
- Asignación de un mantenimiento a un técnico → notifica al técnico.
El envío real (email/push) se delega a Celery para no bloquear la petición.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.notifications.services import notificar_asignacion, notificar_cambio_estatus

from .models import Mantenimiento


@receiver(pre_save, sender=Mantenimiento)
def detectar_cambios(sender, instance: Mantenimiento, **kwargs):
    """Guarda el estado previo para compararlo en post_save."""
    if instance.pk:
        previo = sender.objects.filter(pk=instance.pk).first()
        instance._estatus_previo = previo.estatus if previo else None
        instance._tecnico_previo_id = previo.tecnico_asignado_id if previo else None
    else:
        instance._estatus_previo = None
        instance._tecnico_previo_id = None


def _formatear_fecha(fecha) -> str:
    """La fecha puede llegar como str (creación directa con cadena ISO)."""
    if hasattr(fecha, "strftime"):
        return fecha.strftime("%d/%m/%Y %H:%M")
    return str(fecha)


@receiver(post_save, sender=Mantenimiento)
def notificar_mantenimiento(sender, instance: Mantenimiento, created, **kwargs):
    if created or instance.tecnico_asignado_id != instance._tecnico_previo_id:
        notificar_asignacion(
            destinatario=instance.tecnico_asignado,
            titulo="Nuevo mantenimiento asignado",
            mensaje=f"Se te asignó el mantenimiento {instance.get_tipo_display().lower()} "
                    f"del equipo {instance.equipo} programado para "
                    f"{_formatear_fecha(instance.fecha_programada)}.",
            objeto=instance,
        )
    elif instance.estatus != instance._estatus_previo:
        notificar_cambio_estatus(
            objeto=instance,
            titulo="Cambio de estatus de mantenimiento",
            mensaje=f"El mantenimiento del equipo {instance.equipo} cambió a "
                    f"'{instance.get_estatus_display()}'.",
            tecnico=instance.tecnico_asignado,
        )
