from rest_framework import serializers

from apps.accounts.serializers import UsuarioSerializer
from apps.equipment.serializers import EquipoSerializer

from .models import Mantenimiento, PlanMantenimiento


class PlanMantenimientoSerializer(serializers.ModelSerializer):
    equipo_detalle = EquipoSerializer(source="equipo", read_only=True)
    tecnico_detalle = UsuarioSerializer(source="tecnico_asignado", read_only=True)
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = PlanMantenimiento
        fields = [
            "id", "equipo", "equipo_detalle", "tecnico_asignado", "tecnico_detalle",
            "tipo", "tipo_display", "frecuencia_dias", "proxima_fecha",
            "descripcion", "activo", "creado_en",
        ]
        read_only_fields = ["creado_en"]

    def validate_frecuencia_dias(self, valor):
        if valor < 1:
            raise serializers.ValidationError("La frecuencia debe ser de al menos 1 día.")
        return valor

    def create(self, validated_data):
        validated_data["creado_por"] = self.context["request"].user
        return super().create(validated_data)


class MantenimientoSerializer(serializers.ModelSerializer):
    equipo_detalle = EquipoSerializer(source="equipo", read_only=True)
    tecnico_detalle = UsuarioSerializer(source="tecnico_asignado", read_only=True)
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    estatus_display = serializers.CharField(source="get_estatus_display", read_only=True)

    class Meta:
        model = Mantenimiento
        fields = [
            "id", "equipo", "equipo_detalle", "tipo", "tipo_display",
            "estatus", "estatus_display", "tecnico_asignado", "tecnico_detalle",
            "fecha_programada", "fecha_inicio_real", "fecha_fin_real",
            "descripcion", "observaciones_tecnico",
            "creado_por", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["creado_por", "creado_en", "actualizado_en"]

    def validate(self, attrs):
        """El Técnico solo puede modificar estatus, fechas reales y observaciones."""
        request = self.context.get("request")
        if request and request.user.es_tecnico and self.instance is not None:
            campos_permitidos = {
                "estatus", "fecha_inicio_real", "fecha_fin_real", "observaciones_tecnico",
            }
            campos_no_permitidos = set(attrs.keys()) - campos_permitidos
            if campos_no_permitidos:
                raise serializers.ValidationError(
                    f"Como Técnico solo puedes actualizar: {', '.join(sorted(campos_permitidos))}."
                )
        return attrs

    def create(self, validated_data):
        validated_data["creado_por"] = self.context["request"].user
        return super().create(validated_data)
