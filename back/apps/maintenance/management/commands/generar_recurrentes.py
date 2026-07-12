from django.core.management.base import BaseCommand

from apps.maintenance.tasks import generar_pendientes


class Command(BaseCommand):
    help = "Genera los mantenimientos de los planes recurrentes vencidos."

    def handle(self, *args, **options):
        generados = generar_pendientes()
        self.stdout.write(self.style.SUCCESS(f"Mantenimientos generados: {generados}"))
