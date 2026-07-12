from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """
    Usuario personalizado con exactamente dos roles: Administrador y Técnico.
    El rol gobierna todo el control de acceso (RBAC) de la plataforma.
    """

    class Rol(models.TextChoices):
        ADMINISTRADOR = "ADMIN", "Administrador"
        TECNICO = "TECNICO", "Técnico"

    rol = models.CharField(
        max_length=10,
        choices=Rol.choices,
        default=Rol.TECNICO,
        db_index=True,
        help_text="Rol que determina los permisos del usuario.",
    )
    telefono = models.CharField(max_length=20, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "usuarios"
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        indexes = [
            models.Index(fields=["rol", "is_active"]),
        ]

    @property
    def es_administrador(self) -> bool:
        return self.rol == self.Rol.ADMINISTRADOR

    @property
    def es_tecnico(self) -> bool:
        return self.rol == self.Rol.TECNICO

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_rol_display()})"
