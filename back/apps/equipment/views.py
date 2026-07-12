from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from apps.accounts.permissions import EsAdminOSoloLectura, EsAdminOTecnicoLecturaYAlta

from .models import Area, Cliente, Equipo, LecturaContador, ModeloEquipo
from .serializers import (
    AreaSerializer,
    ClienteSerializer,
    EquipoDetalleSerializer,
    EquipoSerializer,
    LecturaContadorSerializer,
    ModeloEquipoSerializer,
    MoverEquipoSerializer,
)


class ModeloEquipoViewSet(viewsets.ModelViewSet):
    """
    Catálogo de modelos Kyocera. Admin: CRUD; Técnico: consulta y alta
    (para registrar en campo un modelo que aún no existe en el catálogo).
    """

    queryset = ModeloEquipo.objects.all()
    serializer_class = ModeloEquipoSerializer
    permission_classes = [EsAdminOTecnicoLecturaYAlta]
    filterset_fields = ["activo", "familia", "tipo", "es_color"]
    search_fields = ["nombre", "familia"]
    ordering_fields = ["nombre", "familia", "creado_en"]


class ClienteViewSet(viewsets.ModelViewSet):
    """CRUD de clientes. Técnicos: solo lectura."""

    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [EsAdminOSoloLectura]
    filterset_fields = ["activa", "ciudad"]
    search_fields = ["nombre", "contacto", "ciudad"]


class AreaViewSet(viewsets.ModelViewSet):
    """CRUD de ubicaciones dentro de un cliente. Técnicos: solo lectura."""

    queryset = Area.objects.select_related("cliente")
    serializer_class = AreaSerializer
    permission_classes = [EsAdminOSoloLectura]
    filterset_fields = ["cliente"]
    search_fields = ["nombre"]


class EquipoViewSet(viewsets.ModelViewSet):
    """
    CRUD de equipos Kyocera. El Técnico puede consultar y dar de alta
    equipos encontrados en campo, pero no editarlos ni eliminarlos.
    `select_related`/`prefetch_related` evitan consultas N+1.
    """

    permission_classes = [EsAdminOTecnicoLecturaYAlta]
    filterset_fields = [
        "estado", "esquema", "modelo", "modelo__familia",
        "ubicacion_actual", "ubicacion_actual__cliente",
    ]
    search_fields = ["numero_serie", "modelo__nombre", "ubicacion_actual__cliente__nombre"]
    ordering_fields = ["numero_serie", "actualizado_en"]

    def get_queryset(self):
        qs = Equipo.objects.select_related("modelo", "ubicacion_actual__cliente")
        if self.action == "retrieve":
            qs = qs.prefetch_related(
                "historial_ubicaciones__area_origen__cliente",
                "historial_ubicaciones__area_destino__cliente",
                "historial_ubicaciones__registrado_por",
            )
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EquipoDetalleSerializer
        return EquipoSerializer

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar solo aplica a equipos sin historial operativo; los FKs
        PROTECT de mantenimientos y órdenes garantizan la trazabilidad.
        """
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": "No se puede eliminar: el equipo tiene mantenimientos u "
                    "órdenes de trabajo asociados. Cámbialo a 'Dado de baja' para "
                    "conservar su historial."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get", "post"], url_path="lecturas")
    def lecturas(self, request, pk=None):
        """
        GET: últimas 20 lecturas del contador.
        POST: registra una lectura (Admin o Técnico) y actualiza el contador
        del equipo. Valida que la lectura no retroceda.
        """
        equipo = self.get_object()
        if request.method == "GET":
            ultimas = equipo.lecturas.select_related("registrado_por")[:20]
            return Response(LecturaContadorSerializer(ultimas, many=True).data)

        serializer = LecturaContadorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lectura = LecturaContador(
            equipo=equipo,
            registrado_por=request.user,
            **serializer.validated_data,
        )
        try:
            lectura.full_clean()  # valida monotonía contra la última lectura
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict)
        lectura.save()
        Equipo.objects.filter(pk=equipo.pk).update(contador_paginas=lectura.lectura)
        return Response(
            LecturaContadorSerializer(lectura).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], url_path="mover")
    def mover(self, request, pk=None):
        """Reubica el equipo y registra el movimiento en el historial (solo Admin)."""
        if not request.user.es_administrador:
            return Response(
                {"detail": "Solo el Administrador puede reubicar equipos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        equipo = self.get_object()
        serializer = MoverEquipoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        equipo.mover_a(
            area=serializer.validated_data["area_destino"],
            motivo=serializer.validated_data["motivo"],
            usuario=request.user,
        )
        return Response(EquipoDetalleSerializer(equipo).data)
