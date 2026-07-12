"""
Abstracción de almacenamiento documental.

Hoy sirve archivos locales; mañana, con solo cambiar la variable de entorno
DOCUMENT_STORAGE_BACKEND=alfresco y las credenciales, los documentos pesados
se resuelven contra el ECM sin tocar vistas ni serializers.
"""
from abc import ABC, abstractmethod

from django.conf import settings


class BackendDocumental(ABC):
    @abstractmethod
    def url_descarga(self, documento) -> str:
        """URL desde la que el cliente puede leer el PDF."""


class BackendLocal(BackendDocumental):
    def url_descarga(self, documento) -> str:
        if documento.archivo:
            return documento.archivo.url
        return ""


class BackendAlfresco(BackendDocumental):
    """
    Esqueleto de integración con Alfresco (API REST de Content Services).
    Implementar autenticación por ticket y descarga vía
    `/alfresco/api/-default-/public/alfresco/versions/1/nodes/{nodeId}/content`.
    """

    def url_descarga(self, documento) -> str:
        base = settings.ALFRESCO_BASE_URL.rstrip("/")
        if not (base and documento.referencia_externa):
            return ""
        return (
            f"{base}/alfresco/api/-default-/public/alfresco/versions/1/"
            f"nodes/{documento.referencia_externa}/content"
        )


def obtener_backend(documento) -> BackendDocumental:
    if documento.backend_almacenamiento == "ALFRESCO":
        return BackendAlfresco()
    return BackendLocal()
