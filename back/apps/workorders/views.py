from pathlib import Path

from django.db.models import F
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import EsAdminOSoloLectura, EsAdminOTecnicoAsignado

from .models import OrdenTrabajo, Refaccion, TipoOrden
from .serializers import OrdenTrabajoSerializer, RefaccionSerializer, TipoOrdenSerializer

EXTENSIONES_EVIDENCIA = {".pdf", ".jpg", ".jpeg", ".png"}


class TipoOrdenViewSet(viewsets.ModelViewSet):
    """Catálogo de tipos de orden. Técnicos: solo lectura."""

    queryset = TipoOrden.objects.all()
    serializer_class = TipoOrdenSerializer
    permission_classes = [EsAdminOSoloLectura]
    filterset_fields = ["activo"]


class RefaccionViewSet(viewsets.ModelViewSet):
    """Catálogo de refacciones. Técnicos: solo lectura."""

    queryset = Refaccion.objects.all()
    serializer_class = RefaccionSerializer
    permission_classes = [EsAdminOSoloLectura]
    search_fields = ["codigo", "nombre", "modelo_compatible"]


class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    """
    Órdenes de trabajo.
    - Administrador: CRUD total (incluye editar y eliminar órdenes).
    - Técnico: lectura/actualización solo de las órdenes asignadas a él,
      y subida de evidencias de trabajo a esas órdenes.
    """

    serializer_class = OrdenTrabajoSerializer
    permission_classes = [EsAdminOTecnicoAsignado]
    filterset_fields = ["estatus", "prioridad", "tipo", "tecnico_asignado", "equipo"]
    search_fields = ["folio", "descripcion_problema", "equipo__numero_serie"]
    ordering_fields = ["creado_en", "prioridad", "estatus"]

    def get_queryset(self):
        qs = OrdenTrabajo.objects.select_related(
            "tipo",
            "equipo__modelo",
            "equipo__ubicacion_actual__cliente",
            "tecnico_asignado",
            "creado_por",
        ).prefetch_related("refacciones_utilizadas__refaccion")
        user = self.request.user
        if user.es_tecnico:
            qs = qs.filter(tecnico_asignado=user)
        return qs

    def get_permissions(self):
        # La subida de evidencias la hace también el Técnico (POST); el acceso
        # a órdenes ajenas queda bloqueado por el queryset filtrado (404).
        if self.action == "evidencias":
            return [IsAuthenticated()]
        return super().get_permissions()

    def perform_destroy(self, instance):
        """Al eliminar una orden se repone el stock de las refacciones usadas."""
        for uso in instance.refacciones_utilizadas.select_related("refaccion"):
            Refaccion.objects.filter(pk=uso.refaccion_id).update(
                existencias=F("existencias") + uso.cantidad
            )
        instance.delete()

    @action(
        detail=True,
        methods=["post"],
        url_path="evidencias",
        parser_classes=[MultiPartParser, FormParser],
    )
    def evidencias(self, request, pk=None):
        """
        Sube una evidencia de trabajo (foto o PDF) ligada a la orden.
        Queda archivada en el repositorio documental como tipo EVIDENCIA.
        """
        from apps.documents.models import Documento
        from apps.documents.serializers import DocumentoSerializer

        orden = self.get_object()
        archivo = request.FILES.get("archivo")
        if archivo is None:
            return Response(
                {"archivo": ["Adjunta una foto (JPG/PNG) o un PDF."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        extension = Path(archivo.name).suffix.lower()
        if extension not in EXTENSIONES_EVIDENCIA:
            return Response(
                {"archivo": [f"Extensión no permitida ({extension}). Usa PDF, JPG o PNG."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        documento = Documento(
            titulo=f"Evidencia {orden.folio}: {archivo.name}"[:200],
            tipo=Documento.Tipo.EVIDENCIA,
            descripcion=request.data.get("descripcion", ""),
            equipo=orden.equipo,
            modelo_equipo=orden.equipo.modelo.nombre,
            orden_trabajo=orden,
            backend_almacenamiento="LOCAL",
            tamano_bytes=archivo.size,
            subido_por=request.user,
        )
        documento.archivo.save(archivo.name, archivo, save=True)
        return Response(
            DocumentoSerializer(documento, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
