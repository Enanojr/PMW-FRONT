from rest_framework import serializers

from .models import Area, Cliente, Equipo, HistorialUbicacion, LecturaContador, ModeloEquipo


class LecturaContadorSerializer(serializers.ModelSerializer):
    registrado_por_nombre = serializers.CharField(
        source="registrado_por.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = LecturaContador
        fields = ["id", "equipo", "lectura", "comentario", "registrado_por", "registrado_por_nombre", "fecha"]
        read_only_fields = ["equipo", "registrado_por", "fecha"]


class ModeloEquipoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    total_equipos = serializers.IntegerField(source="equipos.count", read_only=True)

    class Meta:
        model = ModeloEquipo
        fields = [
            "id", "nombre", "familia", "tipo", "tipo_display",
            "es_color", "descripcion", "activo", "total_equipos", "creado_en",
        ]

    def validate_nombre(self, valor: str) -> str:
        valor = valor.strip()
        existente = ModeloEquipo.objects.filter(nombre__iexact=valor)
        if self.instance:
            existente = existente.exclude(pk=self.instance.pk)
        if existente.exists():
            raise serializers.ValidationError("Ya existe un modelo con ese nombre.")
        return valor


class ClienteSerializer(serializers.ModelSerializer):
    total_equipos = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = [
            "id", "nombre", "contacto", "telefono", "email",
            "direccion", "ciudad", "activa", "total_equipos", "creado_en",
        ]

    def get_total_equipos(self, obj) -> int:
        return Equipo.objects.filter(ubicacion_actual__cliente=obj).count()


class AreaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)

    class Meta:
        model = Area
        fields = ["id", "cliente", "cliente_nombre", "nombre", "piso", "creado_en"]


class HistorialUbicacionSerializer(serializers.ModelSerializer):
    area_origen_detalle = AreaSerializer(source="area_origen", read_only=True)
    area_destino_detalle = AreaSerializer(source="area_destino", read_only=True)
    registrado_por_nombre = serializers.CharField(
        source="registrado_por.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = HistorialUbicacion
        fields = [
            "id", "equipo", "area_origen", "area_origen_detalle",
            "area_destino", "area_destino_detalle", "motivo",
            "registrado_por", "registrado_por_nombre", "fecha_movimiento",
        ]
        read_only_fields = ["registrado_por", "fecha_movimiento"]


class EquipoSerializer(serializers.ModelSerializer):
    ubicacion_detalle = AreaSerializer(source="ubicacion_actual", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    esquema_display = serializers.CharField(source="get_esquema_display", read_only=True)
    modelo_nombre = serializers.CharField(source="modelo.nombre", read_only=True)
    modelo_detalle = ModeloEquipoSerializer(source="modelo", read_only=True)

    class Meta:
        model = Equipo
        fields = [
            "id", "numero_serie", "modelo", "modelo_nombre", "modelo_detalle",
            "descripcion", "estado", "estado_display", "esquema", "esquema_display",
            "ubicacion_actual", "ubicacion_detalle", "fecha_instalacion",
            "contador_paginas", "creado_en", "actualizado_en",
        ]


class EquipoDetalleSerializer(EquipoSerializer):
    historial_ubicaciones = HistorialUbicacionSerializer(many=True, read_only=True)

    class Meta(EquipoSerializer.Meta):
        fields = EquipoSerializer.Meta.fields + ["historial_ubicaciones"]


class MoverEquipoSerializer(serializers.Serializer):
    area_destino = serializers.PrimaryKeyRelatedField(queryset=Area.objects.all())
    motivo = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
