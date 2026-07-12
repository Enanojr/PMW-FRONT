from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser

from apps.accounts.permissions import EsAdminOSoloLectura

from .models import Documento
from .serializers import DocumentoSerializer


class DocumentoViewSet(viewsets.ModelViewSet):
    """
    Repositorio documental (manuales y reportes en PDF).
    - Administrador: CRUD total (sube manuales y reportes).
    - Técnico: solo lectura (consulta y descarga).
    """

    serializer_class = DocumentoSerializer
    permission_classes = [EsAdminOSoloLectura]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ["tipo", "modelo_equipo", "equipo", "orden_trabajo"]
    search_fields = ["titulo", "descripcion", "modelo_equipo"]
    ordering_fields = ["creado_en", "titulo"]

    def get_queryset(self):
        return Documento.objects.select_related(
            "equipo", "orden_trabajo", "subido_por"
        )
