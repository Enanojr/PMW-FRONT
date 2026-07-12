from django.contrib import admin

from .models import Area, Cliente, Equipo, HistorialUbicacion, LecturaContador, ModeloEquipo


@admin.register(LecturaContador)
class LecturaContadorAdmin(admin.ModelAdmin):
    list_display = ("equipo", "lectura", "registrado_por", "fecha")
    list_select_related = ("equipo", "registrado_por")


@admin.register(ModeloEquipo)
class ModeloEquipoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "familia", "tipo", "es_color", "activo")
    list_filter = ("familia", "tipo", "activo")
    search_fields = ("nombre",)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nombre", "contacto", "telefono", "ciudad", "activa")
    search_fields = ("nombre", "contacto", "ciudad")


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "cliente", "piso")
    list_filter = ("cliente",)


@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ("numero_serie", "modelo", "esquema", "estado", "ubicacion_actual")
    list_filter = ("estado", "esquema", "modelo__familia")
    list_select_related = ("modelo", "ubicacion_actual")
    search_fields = ("numero_serie", "modelo__nombre")


@admin.register(HistorialUbicacion)
class HistorialUbicacionAdmin(admin.ModelAdmin):
    list_display = ("equipo", "area_origen", "area_destino", "fecha_movimiento")
    list_select_related = ("equipo", "area_origen", "area_destino")
