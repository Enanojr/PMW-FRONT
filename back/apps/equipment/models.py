from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from simple_history.models import HistoricalRecords


class Cliente(models.Model):
    """
    Cliente al que se le da servicio: empresas con equipos en arrendamiento
    o con póliza de soporte. Los equipos propios de la oficina se agrupan
    bajo un cliente interno (ej. "Oficina propia").
    """

    nombre = models.CharField(max_length=120, unique=True)
    contacto = models.CharField(max_length=120, blank=True, help_text="Persona de contacto.")
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=255, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    activa = models.BooleanField(default=True, verbose_name="activo")
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "clientes"
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class Area(models.Model):
    """Ubicación o departamento dentro de las instalaciones de un cliente."""

    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="areas")
    nombre = models.CharField(max_length=120)
    piso = models.CharField(max_length=30, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "areas"
        verbose_name = "Ubicación"
        verbose_name_plural = "Ubicaciones"
        constraints = [
            models.UniqueConstraint(fields=["cliente", "nombre"], name="uniq_area_por_cliente"),
        ]
        ordering = ["cliente__nombre", "nombre"]

    def __str__(self) -> str:
        return f"{self.cliente.nombre} / {self.nombre}"


class ModeloEquipo(models.Model):
    """
    Catálogo de modelos Kyocera (TASKalfa, ECOSYS, FS...).
    Kyocera no expone una API pública de catálogo, por lo que este registro
    es la fuente de verdad local; puede alimentarse a mano o, en el futuro,
    sincronizarse desde KFS/SNMP.
    """

    class Tipo(models.TextChoices):
        MULTIFUNCIONAL = "MFP", "Multifuncional"
        IMPRESORA = "IMPRESORA", "Impresora"
        OTRO = "OTRO", "Otro"

    nombre = models.CharField(max_length=80, unique=True)
    familia = models.CharField(
        max_length=40, blank=True, help_text="Línea de producto: TASKalfa, ECOSYS, FS…"
    )
    tipo = models.CharField(max_length=10, choices=Tipo.choices, default=Tipo.MULTIFUNCIONAL)
    es_color = models.BooleanField(default=False)
    descripcion = models.CharField(max_length=255, blank=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "modelos_equipo"
        verbose_name = "Modelo de equipo"
        verbose_name_plural = "Modelos de equipo"
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class Equipo(models.Model):
    """Equipo Kyocera (impresora / multifuncional) bajo contrato de mantenimiento."""

    class Estado(models.TextChoices):
        OPERATIVO = "OPERATIVO", "Operativo"
        EN_MANTENIMIENTO = "EN_MANTENIMIENTO", "En mantenimiento"
        FUERA_DE_SERVICIO = "FUERA_DE_SERVICIO", "Fuera de servicio"
        BAJA = "BAJA", "Dado de baja"

    class Esquema(models.TextChoices):
        ARRENDAMIENTO = "ARRENDAMIENTO", "Arrendamiento"
        POLIZA = "POLIZA", "Póliza de soporte"
        PROPIO = "PROPIO", "Propio"

    numero_serie = models.CharField(
        max_length=50,
        unique=True,
        validators=[RegexValidator(r"^[A-Za-z0-9\-]+$", "Solo letras, números y guiones.")],
    )
    modelo = models.ForeignKey(ModeloEquipo, on_delete=models.PROTECT, related_name="equipos")
    descripcion = models.TextField(blank=True)
    estado = models.CharField(
        max_length=20, choices=Estado.choices, default=Estado.OPERATIVO, db_index=True
    )
    esquema = models.CharField(
        max_length=14,
        choices=Esquema.choices,
        default=Esquema.ARRENDAMIENTO,
        db_index=True,
        help_text="Modalidad comercial: arrendamiento, póliza de soporte o equipo propio.",
    )
    ubicacion_actual = models.ForeignKey(
        Area, on_delete=models.PROTECT, related_name="equipos", null=True, blank=True
    )
    fecha_instalacion = models.DateField(null=True, blank=True)
    contador_paginas = models.PositiveIntegerField(default=0)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    historial = HistoricalRecords(table_name="auditoria_equipos")

    class Meta:
        db_table = "equipos"
        verbose_name = "Equipo"
        verbose_name_plural = "Equipos"
        indexes = [
            models.Index(fields=["estado", "modelo"], name="idx_equipos_estado_modelo"),
            models.Index(fields=["ubicacion_actual"]),
        ]
        ordering = ["numero_serie"]

    def __str__(self) -> str:
        return f"{self.modelo.nombre} · {self.numero_serie}"

    def mover_a(self, area: Area, motivo: str = "", usuario=None):
        """Mueve el equipo a otra área dejando rastro en el historial."""
        HistorialUbicacion.objects.create(
            equipo=self,
            area_origen=self.ubicacion_actual,
            area_destino=area,
            motivo=motivo,
            registrado_por=usuario,
        )
        self.ubicacion_actual = area
        self.save(update_fields=["ubicacion_actual", "actualizado_en"])


class LecturaContador(models.Model):
    """
    Lectura periódica del contador de páginas de un equipo.
    Base para facturación por página y para detectar uso anómalo.
    """

    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="lecturas")
    lectura = models.PositiveIntegerField()
    registrado_por = models.ForeignKey(
        "accounts.Usuario", on_delete=models.SET_NULL, null=True,
        related_name="lecturas_registradas",
    )
    comentario = models.CharField(max_length=255, blank=True)
    fecha = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "lecturas_contador"
        verbose_name = "Lectura de contador"
        verbose_name_plural = "Lecturas de contador"
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["equipo", "-fecha"]),
        ]

    def clean(self):
        ultima = (
            LecturaContador.objects.filter(equipo=self.equipo)
            .exclude(pk=self.pk)
            .order_by("-fecha")
            .first()
        )
        if ultima and self.lectura < ultima.lectura:
            raise ValidationError(
                {"lectura": f"La lectura no puede ser menor a la última registrada ({ultima.lectura})."}
            )

    def __str__(self) -> str:
        return f"{self.equipo.numero_serie}: {self.lectura} pág."


class HistorialUbicacion(models.Model):
    """Bitácora de movimientos de un equipo entre ubicaciones de clientes."""

    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="historial_ubicaciones")
    area_origen = models.ForeignKey(
        Area, on_delete=models.SET_NULL, null=True, blank=True, related_name="salidas_equipo"
    )
    area_destino = models.ForeignKey(Area, on_delete=models.PROTECT, related_name="entradas_equipo")
    motivo = models.CharField(max_length=255, blank=True)
    registrado_por = models.ForeignKey(
        "accounts.Usuario", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="movimientos_registrados",
    )
    fecha_movimiento = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "historial_ubicaciones"
        verbose_name = "Historial de ubicación"
        verbose_name_plural = "Historial de ubicaciones"
        ordering = ["-fecha_movimiento"]
        indexes = [
            models.Index(fields=["equipo", "-fecha_movimiento"]),
        ]

    def __str__(self) -> str:
        return f"{self.equipo.numero_serie} → {self.area_destino}"
