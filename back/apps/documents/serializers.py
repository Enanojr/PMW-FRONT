from rest_framework import serializers

from .models import Documento
from .storage import obtener_backend


class DocumentoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    url_descarga = serializers.SerializerMethodField()
    subido_por_nombre = serializers.CharField(
        source="subido_por.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = Documento
        fields = [
            "id", "titulo", "tipo", "tipo_display", "descripcion",
            "equipo", "modelo_equipo", "orden_trabajo",
            "backend_almacenamiento", "archivo", "referencia_externa",
            "url_descarga", "tamano_bytes", "version",
            "subido_por", "subido_por_nombre", "creado_en",
        ]
        read_only_fields = ["subido_por", "tamano_bytes", "creado_en"]

    def get_url_descarga(self, obj) -> str:
        return obtener_backend(obj).url_descarga(obj)

    def validate(self, attrs):
        backend = attrs.get("backend_almacenamiento", getattr(self.instance, "backend_almacenamiento", "LOCAL"))
        archivo = attrs.get("archivo", getattr(self.instance, "archivo", None))
        referencia = attrs.get("referencia_externa", getattr(self.instance, "referencia_externa", ""))
        if backend == "LOCAL" and not archivo:
            raise serializers.ValidationError({"archivo": "Se requiere un PDF para el backend local."})
        if backend == "ALFRESCO" and not referencia:
            raise serializers.ValidationError(
                {"referencia_externa": "Se requiere la referencia del nodo en Alfresco."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["subido_por"] = self.context["request"].user
        archivo = validated_data.get("archivo")
        if archivo:
            validated_data["tamano_bytes"] = archivo.size
        return super().create(validated_data)
