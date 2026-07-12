from rest_framework import serializers

from .models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Notificacion
        fields = ["id", "tipo", "tipo_display", "titulo", "mensaje", "leida", "creado_en"]
        read_only_fields = ["tipo", "titulo", "mensaje", "creado_en"]
