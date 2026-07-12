"""
Indicadores agregados para el dashboard gerencial.
Consultas de agregación puras (COUNT/GROUP BY): exactas y baratas,
a diferencia de contar sobre una página de resultados.
"""
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Usuario
from apps.accounts.permissions import EsAdministrador
from apps.documents.models import Documento
from apps.equipment.models import Equipo
from apps.maintenance.models import Mantenimiento
from apps.workorders.models import OrdenTrabajo

ORDENES_ACTIVAS = ("ABIERTA", "ASIGNADA", "EN_PROCESO")


class ResumenDashboardView(APIView):
    """GET /api/dashboard/resumen/ — solo Administrador."""

    permission_classes = [EsAdministrador]

    def get(self, request):
        ahora = timezone.now()
        en_7_dias = ahora + timedelta(days=7)
        inicio_mes = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        equipos_por_estado = {
            fila["estado"]: fila["c"]
            for fila in Equipo.objects.values("estado").annotate(c=Count("id"))
        }
        equipos_por_esquema = {
            fila["esquema"]: fila["c"]
            for fila in Equipo.objects.values("esquema").annotate(c=Count("id"))
        }
        ordenes_por_prioridad = {
            fila["prioridad"]: fila["c"]
            for fila in OrdenTrabajo.objects.filter(estatus__in=ORDENES_ACTIVAS)
            .values("prioridad")
            .annotate(c=Count("id"))
        }

        return Response({
            "equipos": {
                "total": Equipo.objects.count(),
                "por_estado": equipos_por_estado,
                "por_esquema": equipos_por_esquema,
            },
            "ordenes": {
                "abiertas": OrdenTrabajo.objects.filter(estatus__in=ORDENES_ACTIVAS).count(),
                "por_prioridad": ordenes_por_prioridad,
                "cerradas_mes": OrdenTrabajo.objects.filter(
                    estatus="CERRADA", fecha_cierre__gte=inicio_mes
                ).count(),
            },
            "mantenimientos": {
                "proximos_7_dias": Mantenimiento.objects.filter(
                    estatus__in=("PROGRAMADO", "REPROGRAMADO"),
                    fecha_programada__range=(ahora, en_7_dias),
                ).count(),
                "en_proceso": Mantenimiento.objects.filter(estatus="EN_PROCESO").count(),
                "completados_mes": Mantenimiento.objects.filter(
                    estatus="COMPLETADO", fecha_fin_real__gte=inicio_mes
                ).count(),
            },
            "tecnicos_activos": Usuario.objects.filter(rol="TECNICO", is_active=True).count(),
            "documentos": Documento.objects.count(),
        })
