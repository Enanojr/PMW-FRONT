from django.contrib import admin

from .models import OrdenTrabajo, Refaccion, RefaccionUtilizada, TipoOrden


class RefaccionUtilizadaInline(admin.TabularInline):
    model = RefaccionUtilizada
    extra = 0


@admin.register(TipoOrden)
class TipoOrdenAdmin(admin.ModelAdmin):
    list_display = ("nombre", "activo")


@admin.register(Refaccion)
class RefaccionAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "modelo_compatible", "existencias")
    search_fields = ("codigo", "nombre")


@admin.register(OrdenTrabajo)
class OrdenTrabajoAdmin(admin.ModelAdmin):
    list_display = ("folio", "tipo", "equipo", "tecnico_asignado", "estatus", "prioridad")
    list_filter = ("estatus", "prioridad", "tipo")
    list_select_related = ("tipo", "equipo", "tecnico_asignado")
    search_fields = ("folio", "equipo__numero_serie")
    inlines = [RefaccionUtilizadaInline]
