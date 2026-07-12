from django.db import models
from simple_history.models import HistoricalRecords


class TipoOrden(models.Model):
    """Catálogo de tipos de orden (instalación, reparación, revisión, retiro...)."""

    nombre = models.CharField(max_length=80, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "tipos_orden"
        verbose_name = "Tipo de orden"
        verbose_name_plural = "Tipos de orden"
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class Refaccion(models.Model):
    """Catálogo de refacciones/consumibles Kyocera."""

    codigo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=150)
    modelo_compatible = models.CharField(max_length=120, blank=True)
    existencias = models.PositiveIntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "refacciones"
        verbose_name = "Refacción"
        verbose_name_plural = "Refacciones"
        ordering = ["codigo"]

    def __str__(self) -> str:
        return f"{self.codigo} · {self.nombre}"


class OrdenTrabajo(models.Model):
    """Orden de trabajo sobre un equipo, atendida por un técnico."""

    class Estatus(models.TextChoices):
        ABIERTA = "ABIERTA", "Abierta"
        ASIGNADA = "ASIGNADA", "Asignada"
        EN_PROCESO = "EN_PROCESO", "En proceso"
        CERRADA = "CERRADA", "Cerrada"
        CANCELADA = "CANCELADA", "Cancelada"

    class Prioridad(models.TextChoices):
        BAJA = "BAJA", "Baja"
        MEDIA = "MEDIA", "Media"
        ALTA = "ALTA", "Alta"
        URGENTE = "URGENTE", "Urgente"

    folio = models.CharField(max_length=20, unique=True, editable=False)
    tipo = models.ForeignKey(TipoOrden, on_delete=models.PROTECT, related_name="ordenes")
    equipo = models.ForeignKey(
        "equipment.Equipo", on_delete=models.PROTECT, related_name="ordenes_trabajo"
    )
    tecnico_asignado = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.PROTECT,
        related_name="ordenes_asignadas",
        null=True,
        blank=True,
        limit_choices_to={"rol": "TECNICO"},
    )
    mantenimiento = models.ForeignKey(
        "maintenance.Mantenimiento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes_trabajo",
    )
    estatus = models.CharField(
        max_length=12, choices=Estatus.choices, default=Estatus.ABIERTA, db_index=True
    )
    prioridad = models.CharField(
        max_length=8, choices=Prioridad.choices, default=Prioridad.MEDIA, db_index=True
    )
    descripcion_problema = models.TextField()
    diagnostico = models.TextField(blank=True)
    trabajo_realizado = models.TextField(blank=True)
    refacciones = models.ManyToManyField(
        Refaccion, through="RefaccionUtilizada", related_name="ordenes", blank=True
    )
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    creado_por = models.ForeignKey(
        "accounts.Usuario", on_delete=models.SET_NULL, null=True,
        related_name="ordenes_creadas",
    )
    creado_en = models.DateTimeField(auto_now_add=True, db_index=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    historial = HistoricalRecords(table_name="auditoria_ordenes_trabajo", m2m_fields=[])

    class Meta:
        db_table = "ordenes_trabajo"
        verbose_name = "Orden de trabajo"
        verbose_name_plural = "Órdenes de trabajo"
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["tecnico_asignado", "estatus"]),
            models.Index(fields=["equipo", "-creado_en"]),
        ]

    def save(self, *args, **kwargs):
        if not self.folio:
            ultimo = OrdenTrabajo.objects.order_by("-id").values_list("id", flat=True).first() or 0
            self.folio = f"OT-{ultimo + 1:06d}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.folio} · {self.equipo}"


class RefaccionUtilizada(models.Model):
    """Detalle de refacciones consumidas por una orden de trabajo."""

    orden = models.ForeignKey(
        OrdenTrabajo, on_delete=models.CASCADE, related_name="refacciones_utilizadas"
    )
    refaccion = models.ForeignKey(Refaccion, on_delete=models.PROTECT, related_name="usos")
    cantidad = models.PositiveIntegerField(default=1)
    comentario = models.CharField(max_length=255, blank=True)
    registrado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "refacciones_utilizadas"
        verbose_name = "Refacción utilizada"
        verbose_name_plural = "Refacciones utilizadas"
        constraints = [
            models.UniqueConstraint(fields=["orden", "refaccion"], name="uniq_refaccion_por_orden"),
        ]

    def __str__(self) -> str:
        return f"{self.refaccion.codigo} x{self.cantidad} ({self.orden.folio})"
