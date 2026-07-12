from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from apps.accounts.serializers import UsuarioSerializer
from apps.equipment.serializers import EquipoSerializer

from .models import OrdenTrabajo, Refaccion, RefaccionUtilizada, TipoOrden


class TipoOrdenSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoOrden
        fields = ["id", "nombre", "descripcion", "activo"]


class RefaccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refaccion
        fields = ["id", "codigo", "nombre", "modelo_compatible", "existencias"]


class RefaccionUtilizadaSerializer(serializers.ModelSerializer):
    refaccion_detalle = RefaccionSerializer(source="refaccion", read_only=True)

    class Meta:
        model = RefaccionUtilizada
        fields = ["id", "refaccion", "refaccion_detalle", "cantidad", "comentario"]

    def validate(self, attrs):
        refaccion = attrs.get("refaccion")
        cantidad = attrs.get("cantidad", 1)
        if refaccion and cantidad > refaccion.existencias:
            raise serializers.ValidationError(
                f"Existencias insuficientes de {refaccion.codigo} "
                f"(disponibles: {refaccion.existencias})."
            )
        return attrs


class OrdenTrabajoSerializer(serializers.ModelSerializer):
    equipo_detalle = EquipoSerializer(source="equipo", read_only=True)
    tecnico_detalle = UsuarioSerializer(source="tecnico_asignado", read_only=True)
    tipo_detalle = TipoOrdenSerializer(source="tipo", read_only=True)
    estatus_display = serializers.CharField(source="get_estatus_display", read_only=True)
    prioridad_display = serializers.CharField(source="get_prioridad_display", read_only=True)
    refacciones_utilizadas = RefaccionUtilizadaSerializer(many=True, required=False)

    class Meta:
        model = OrdenTrabajo
        fields = [
            "id", "folio", "tipo", "tipo_detalle", "equipo", "equipo_detalle",
            "tecnico_asignado", "tecnico_detalle", "mantenimiento",
            "estatus", "estatus_display", "prioridad", "prioridad_display",
            "descripcion_problema", "diagnostico", "trabajo_realizado",
            "refacciones_utilizadas", "fecha_cierre",
            "creado_por", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["folio", "creado_por", "creado_en", "actualizado_en"]

    def validate(self, attrs):
        """El Técnico solo puede modificar el avance de la orden, no reasignarla."""
        request = self.context.get("request")
        if request and request.user.es_tecnico and self.instance is not None:
            campos_permitidos = {
                "estatus", "diagnostico", "trabajo_realizado",
                "refacciones_utilizadas", "fecha_cierre",
            }
            campos_no_permitidos = set(attrs.keys()) - campos_permitidos
            if campos_no_permitidos:
                raise serializers.ValidationError(
                    f"Como Técnico solo puedes actualizar: {', '.join(sorted(campos_permitidos))}."
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        refacciones = validated_data.pop("refacciones_utilizadas", [])
        validated_data["creado_por"] = self.context["request"].user
        orden = super().create(validated_data)
        self._guardar_refacciones(orden, refacciones)
        return orden

    @transaction.atomic
    def update(self, instance, validated_data):
        refacciones = validated_data.pop("refacciones_utilizadas", None)
        orden = super().update(instance, validated_data)
        if refacciones is not None:
            # Reponer existencias de lo previamente registrado y regrabar
            for uso in orden.refacciones_utilizadas.select_related("refaccion"):
                Refaccion.objects.filter(pk=uso.refaccion_id).update(
                    existencias=F("existencias") + uso.cantidad
                )
            orden.refacciones_utilizadas.all().delete()
            self._guardar_refacciones(orden, refacciones)
        return orden

    def _guardar_refacciones(self, orden, refacciones):
        for item in refacciones:
            RefaccionUtilizada.objects.create(orden=orden, **item)
            Refaccion.objects.filter(pk=item["refaccion"].pk).update(
                existencias=F("existencias") - item.get("cantidad", 1)
            )
