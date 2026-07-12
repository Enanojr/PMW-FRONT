from django.apps import AppConfig


class WorkordersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.workorders"
    verbose_name = "Órdenes de Trabajo"

    def ready(self):
        from . import signals  # noqa: F401
