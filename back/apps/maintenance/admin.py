from django.contrib import admin

from .models import Mantenimiento, PlanMantenimiento


@admin.register(PlanMantenimiento)
class PlanMantenimientoAdmin(admin.ModelAdmin):
    list_display = ("equipo", "tipo", "frecuencia_dias", "proxima_fecha", "tecnico_asignado", "activo")
    list_filter = ("tipo", "activo")
    list_select_related = ("equipo", "tecnico_asignado")


@admin.register(Mantenimiento)
class MantenimientoAdmin(admin.ModelAdmin):
    list_display = ("equipo", "tipo", "estatus", "tecnico_asignado", "fecha_programada")
    list_filter = ("tipo", "estatus")
    list_select_related = ("equipo", "tecnico_asignado")
    date_hierarchy = "fecha_programada"
