from django.contrib import admin

from .models import Notificacion


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("titulo", "destinatario", "tipo", "leida", "creado_en")
    list_filter = ("tipo", "leida")
    list_select_related = ("destinatario",)
