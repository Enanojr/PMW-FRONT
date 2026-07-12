"""
Crea el usuario Administrador inicial a partir de variables de entorno.
Pensado para el primer despliegue en Render (se llama desde build.sh).
Es idempotente: si el usuario ya existe, no lo duplica ni cambia su contraseña.

Variables de entorno:
  ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
"""
import os

from django.core.management.base import BaseCommand

from apps.accounts.models import Usuario


class Command(BaseCommand):
    help = "Crea el administrador inicial desde ADMIN_USERNAME/EMAIL/PASSWORD."

    def handle(self, *args, **options):
        username = os.environ.get("ADMIN_USERNAME")
        password = os.environ.get("ADMIN_PASSWORD")
        email = os.environ.get("ADMIN_EMAIL", "")

        if not username or not password:
            self.stdout.write(
                "ADMIN_USERNAME / ADMIN_PASSWORD no definidos; se omite la creación."
            )
            return

        if Usuario.objects.filter(username=username).exists():
            self.stdout.write(f"El usuario '{username}' ya existe; sin cambios.")
            return

        Usuario.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            rol=Usuario.Rol.ADMINISTRADOR,
            first_name="Administrador",
        )
        self.stdout.write(self.style.SUCCESS(f"Administrador '{username}' creado."))
