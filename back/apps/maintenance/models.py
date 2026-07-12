from django.core.exceptions import ValidationError
from django.db import models
from simple_history.models import HistoricalRecords


class Mantenimiento(models.Model):
    """Servicio de mantenimiento programado sobre un equipo Kyocera."""

    class Tipo(models.TextChoices):
        PREVENTIVO = "PREVENTIVO", "Preventivo"
        CORRECTIVO = "CORRECTIVO", "Correctivo"

    class Estatus(models.TextChoices):
        PROGRAMADO = "PROGRAMADO", "Programado"
        EN_PROCESO = "EN_PROCESO", "En proceso"
        COMPLETADO = "COMPLETADO", "Completado"
        CANCELADO = "CANCELADO", "Cancelado"
        REPROGRAMADO = "REPROGRAMADO", "Reprogramado"

    equipo = models.ForeignKey(
        "equipment.Equipo", on_delete=models.PROTECT, related_name="mantenimientos"
    )
    tipo = models.CharField(max_length=12, choices=Tipo.choices, db_index=True)
    estatus = models.CharField(
        max_length=14, choices=Estatus.choices, default=Estatus.PROGRAMADO, db_index=True
    )
    tecnico_asignado = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.PROTECT,
        related_name="mantenimientos_asignados",
        limit_choices_to={"rol": "TECNICO"},
    )
    fecha_programada = models.DateTimeField(db_index=True)
    fecha_inicio_real = models.DateTimeField(null=True, blank=True)
    fecha_fin_real = models.DateTimeField(null=True, blank=True)
    descripcion = models.TextField(blank=True)
    observaciones_tecnico = models.TextField(blank=True)
    creado_por = models.ForeignKey(
        "accounts.Usuario", on_delete=models.SET_NULL, null=True,
        related_name="mantenimientos_creados",
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    historial = HistoricalRecords(table_name="auditoria_mantenimientos")

    class Meta:
        db_table = "mantenimientos"
        verbose_name = "Mantenimiento"
        verbose_name_plural = "Mantenimientos"
        ordering = ["fecha_programada"]
        indexes = [
            # Consulta principal del calendario: por técnico y rango de fechas
            models.Index(fields=["tecnico_asignado", "fecha_programada"]),
            models.Index(fields=["estatus", "fecha_programada"]),
            models.Index(fields=["equipo", "-fecha_programada"]),
        ]

    def clean(self):
        if self.fecha_fin_real and self.fecha_inicio_real and self.fecha_fin_real < self.fecha_inicio_real:
            raise ValidationError("La fecha de fin no puede ser anterior a la de inicio.")
        if self.tecnico_asignado_id and self.tecnico_asignado.rol != "TECNICO":
            raise ValidationError({"tecnico_asignado": "El usuario asignado debe tener rol Técnico."})

    def __str__(self) -> str:
        return f"{self.get_tipo_display()} · {self.equipo} · {self.fecha_programada:%d/%m/%Y}"


class PlanMantenimiento(models.Model):
    """
    Plan de mantenimiento recurrente: cada `frecuencia_dias` se genera
    automáticamente un Mantenimiento (tarea Celery Beat diaria o
    `python manage.py generar_recurrentes`).
    """

    equipo = models.ForeignKey(
        "equipment.Equipo", on_delete=models.CASCADE, related_name="planes_mantenimiento"
    )
    tecnico_asignado = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.PROTECT,
        related_name="planes_asignados",
        limit_choices_to={"rol": "TECNICO"},
    )
    tipo = models.CharField(
        max_length=12, choices=Mantenimiento.Tipo.choices,
        default=Mantenimiento.Tipo.PREVENTIVO,
    )
    frecuencia_dias = models.PositiveIntegerField(
        help_text="Cada cuántos días se genera el servicio (ej. 90 = trimestral)."
    )
    proxima_fecha = models.DateTimeField(db_index=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True, db_index=True)
    creado_por = models.ForeignKey(
        "accounts.Usuario", on_delete=models.SET_NULL, null=True,
        related_name="planes_creados",
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "planes_mantenimiento"
        verbose_name = "Plan de mantenimiento"
        verbose_name_plural = "Planes de mantenimiento"
        ordering = ["proxima_fecha"]

    def clean(self):
        if self.frecuencia_dias == 0:
            raise ValidationError({"frecuencia_dias": "La frecuencia debe ser mayor a cero."})

    def __str__(self) -> str:
        return f"Plan {self.get_tipo_display().lower()} · {self.equipo} · cada {self.frecuencia_dias} días"
