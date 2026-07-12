from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Notificacion(models.Model):
    """
    Notificación interna. La relación genérica permite apuntar tanto a un
    Mantenimiento como a una OrdenTrabajo sin duplicar tablas.
    """

    class Tipo(models.TextChoices):
        ASIGNACION = "ASIGNACION", "Asignación de trabajo"
        CAMBIO_ESTATUS = "CAMBIO_ESTATUS", "Cambio de estatus"
        SISTEMA = "SISTEMA", "Sistema"

    destinatario = models.ForeignKey(
        "accounts.Usuario", on_delete=models.CASCADE, related_name="notificaciones"
    )
    tipo = models.CharField(max_length=15, choices=Tipo.choices, db_index=True)
    titulo = models.CharField(max_length=150)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False, db_index=True)
    # Objeto relacionado (Mantenimiento u OrdenTrabajo)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    objeto = GenericForeignKey("content_type", "object_id")
    creado_en = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notificaciones"
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["destinatario", "leida", "-creado_en"]),
        ]

    def __str__(self) -> str:
        return f"{self.titulo} → {self.destinatario}"
