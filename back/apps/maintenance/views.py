from rest_framework import viewsets

from apps.accounts.permissions import EsAdministrador, EsAdminOTecnicoAsignado

from .models import Mantenimiento, PlanMantenimiento
from .serializers import MantenimientoSerializer, PlanMantenimientoSerializer


class PlanMantenimientoViewSet(viewsets.ModelViewSet):
    """Planes de mantenimiento recurrente (solo Administrador)."""

    serializer_class = PlanMantenimientoSerializer
    permission_classes = [EsAdministrador]
    filterset_fields = ["activo", "tipo", "equipo", "tecnico_asignado"]
    ordering_fields = ["proxima_fecha", "frecuencia_dias"]

    def get_queryset(self):
        return PlanMantenimiento.objects.select_related(
            "equipo__modelo",
            "equipo__ubicacion_actual__cliente",
            "tecnico_asignado",
        )


class MantenimientoViewSet(viewsets.ModelViewSet):
    """
    Calendario de mantenimientos.
    - Administrador: CRUD total y vista global.
    - Técnico: solo ve y actualiza los mantenimientos asignados a él.
    """

    serializer_class = MantenimientoSerializer
    permission_classes = [EsAdminOTecnicoAsignado]
    filterset_fields = ["tipo", "estatus", "tecnico_asignado", "equipo"]
    search_fields = ["descripcion", "equipo__numero_serie", "equipo__modelo__nombre"]
    ordering_fields = ["fecha_programada", "estatus"]

    def get_queryset(self):
        qs = Mantenimiento.objects.select_related(
            "equipo__modelo",
            "equipo__ubicacion_actual__cliente",
            "tecnico_asignado",
            "creado_por",
        )
        user = self.request.user
        if user.es_tecnico:
            qs = qs.filter(tecnico_asignado=user)

        # Filtros de calendario: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
        desde = self.request.query_params.get("desde")
        hasta = self.request.query_params.get("hasta")
        if desde:
            qs = qs.filter(fecha_programada__date__gte=desde)
        if hasta:
            qs = qs.filter(fecha_programada__date__lte=hasta)
        return qs
