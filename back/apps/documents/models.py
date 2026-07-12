from django.core.validators import FileExtensionValidator
from django.db import models


def ruta_documento(instance, filename):
    return f"documentos/{instance.tipo.lower()}/{filename}"


class Documento(models.Model):
    """
    Metadatos de manuales y reportes escaneados.

    El binario puede vivir en almacenamiento local (campo `archivo`) o en un
    ECM externo como Alfresco (campos `backend_almacenamiento` + `referencia_externa`).
    La capa de servicio (`storage.py`) resuelve de dónde servir el archivo, de
    modo que migrar a Alfresco no requiere cambios en la API ni en el frontend.
    """

    class Tipo(models.TextChoices):
        MANUAL = "MANUAL", "Manual de equipo"
        REPORTE = "REPORTE", "Reporte escaneado"
        GUIA = "GUIA", "Guía rápida"
        EVIDENCIA = "EVIDENCIA", "Evidencia de trabajo"
        OTRO = "OTRO", "Otro"

    class Backend(models.TextChoices):
        LOCAL = "LOCAL", "Almacenamiento local"
        ALFRESCO = "ALFRESCO", "Alfresco ECM"

    titulo = models.CharField(max_length=200, db_index=True)
    tipo = models.CharField(max_length=10, choices=Tipo.choices, db_index=True)
    descripcion = models.TextField(blank=True)
    equipo = models.ForeignKey(
        "equipment.Equipo", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="documentos",
    )
    modelo_equipo = models.CharField(
        max_length=80, blank=True, db_index=True,
        help_text="Modelo Kyocera al que aplica el manual (si no está ligado a un equipo específico).",
    )
    orden_trabajo = models.ForeignKey(
        "workorders.OrdenTrabajo", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="documentos",
    )
    # --- Almacenamiento ---
    backend_almacenamiento = models.CharField(
        max_length=10, choices=Backend.choices, default=Backend.LOCAL
    )
    archivo = models.FileField(
        upload_to=ruta_documento,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(["pdf", "jpg", "jpeg", "png"])],
        help_text="PDF o imagen (evidencias) en almacenamiento local (backend LOCAL).",
    )
    referencia_externa = models.CharField(
        max_length=255, blank=True,
        help_text="nodeRef/ID del documento en el ECM (backend ALFRESCO).",
    )
    tamano_bytes = models.PositiveBigIntegerField(default=0)
    version = models.CharField(max_length=20, default="1.0")
    subido_por = models.ForeignKey(
        "accounts.Usuario", on_delete=models.SET_NULL, null=True,
        related_name="documentos_subidos",
    )
    creado_en = models.DateTimeField(auto_now_add=True, db_index=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "documentos"
        verbose_name = "Documento"
        verbose_name_plural = "Documentos"
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["tipo", "modelo_equipo"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_tipo_display()}: {self.titulo}"
