from django.contrib import admin

from .models import Documento


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "tipo", "modelo_equipo", "backend_almacenamiento", "creado_en")
    list_filter = ("tipo", "backend_almacenamiento")
    search_fields = ("titulo", "modelo_equipo")
