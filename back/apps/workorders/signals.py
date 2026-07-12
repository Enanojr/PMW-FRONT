"""
Señales de notificación para órdenes de trabajo:
- Asignación de una orden a un técnico → notifica al técnico.
- Cambio de estatus → notifica a técnico y administradores.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.notifications.services import notificar_asignacion, notificar_cambio_estatus

from .models import OrdenTrabajo


@receiver(pre_save, sender=OrdenTrabajo)
def detectar_cambios(sender, instance: OrdenTrabajo, **kwargs):
    if instance.pk:
        previo = sender.objects.filter(pk=instance.pk).first()
        instance._estatus_previo = previo.estatus if previo else None
        instance._tecnico_previo_id = previo.tecnico_asignado_id if previo else None
    else:
        instance._estatus_previo = None
        instance._tecnico_previo_id = None


@receiver(post_save, sender=OrdenTrabajo)
def archivar_hoja_servicio(sender, instance: OrdenTrabajo, created, **kwargs):
    """Al cerrar la orden se genera la hoja de servicio PDF y se archiva
    en el repositorio documental (una sola vez por orden)."""
    if created or instance.estatus != "CERRADA" or instance._estatus_previo == "CERRADA":
        return
    from django.core.files.base import ContentFile

    from apps.documents.models import Documento

    from .pdf import generar_hoja_servicio

    if Documento.objects.filter(orden_trabajo=instance, tipo="REPORTE").exists():
        return
    pdf = generar_hoja_servicio(instance)
    documento = Documento(
        titulo=f"Hoja de servicio {instance.folio}",
        tipo="REPORTE",
        descripcion=f"Generada automáticamente al cerrar la orden {instance.folio}.",
        equipo=instance.equipo,
        modelo_equipo=instance.equipo.modelo.nombre,
        orden_trabajo=instance,
        backend_almacenamiento="LOCAL",
        tamano_bytes=len(pdf),
        subido_por=instance.tecnico_asignado,
    )
    documento.archivo.save(f"hoja_servicio_{instance.folio}.pdf", ContentFile(pdf), save=True)


@receiver(post_save, sender=OrdenTrabajo)
def notificar_orden(sender, instance: OrdenTrabajo, created, **kwargs):
    tecnico_nuevo = (
        instance.tecnico_asignado_id
        and instance.tecnico_asignado_id != instance._tecnico_previo_id
    )
    if tecnico_nuevo:
        notificar_asignacion(
            destinatario=instance.tecnico_asignado,
            titulo="Nueva orden de trabajo asignada",
            mensaje=f"Se te asignó la orden {instance.folio} "
                    f"({instance.tipo.nombre}) del equipo {instance.equipo}.",
            objeto=instance,
        )
    elif not created and instance.estatus != instance._estatus_previo:
        notificar_cambio_estatus(
            objeto=instance,
            titulo="Cambio de estatus de orden de trabajo",
            mensaje=f"La orden {instance.folio} cambió a '{instance.get_estatus_display()}'.",
            tecnico=instance.tecnico_asignado,
        )
