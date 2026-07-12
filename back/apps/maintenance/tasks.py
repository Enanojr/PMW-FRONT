"""
Generación automática de mantenimientos a partir de los planes recurrentes.
La ejecuta Celery Beat a diario; también puede lanzarse manualmente con
`python manage.py generar_recurrentes`.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


def generar_pendientes() -> int:
    """Crea los mantenimientos de todos los planes vencidos. Devuelve cuántos generó."""
    from .models import Mantenimiento, PlanMantenimiento

    ahora = timezone.now()
    generados = 0
    planes = PlanMantenimiento.objects.filter(activo=True, proxima_fecha__lte=ahora).select_related(
        "equipo", "tecnico_asignado"
    )
    for plan in planes:
        Mantenimiento.objects.create(
            equipo=plan.equipo,
            tipo=plan.tipo,
            tecnico_asignado=plan.tecnico_asignado,
            fecha_programada=plan.proxima_fecha,
            descripcion=plan.descripcion or f"Servicio recurrente (cada {plan.frecuencia_dias} días).",
            creado_por=plan.creado_por,
        )
        # Avanza la próxima fecha hasta quedar en el futuro (por si hubo rezago)
        while plan.proxima_fecha <= ahora:
            plan.proxima_fecha += timedelta(days=plan.frecuencia_dias)
        plan.save(update_fields=["proxima_fecha", "actualizado_en"])
        generados += 1
        logger.info("Plan %s generó mantenimiento para %s", plan.pk, plan.equipo)
    return generados


@shared_task
def generar_mantenimientos_recurrentes():
    return generar_pendientes()
