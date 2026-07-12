from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Usuario


class TokenConRolSerializer(TokenObtainPairSerializer):
    """Incluye el rol dentro del token y en la respuesta de login."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["rol"] = user.rol
        token["nombre"] = user.get_full_name() or user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["usuario"] = UsuarioSerializer(self.user).data
        return data


class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "nombre_completo", "rol", "telefono", "is_active", "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]

    def get_nombre_completo(self, obj) -> str:
        return obj.get_full_name() or obj.username


class CambiarPasswordSerializer(serializers.Serializer):
    """Cambio de contraseña del propio usuario autenticado."""

    password_actual = serializers.CharField(write_only=True)
    password_nueva = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_password_actual(self, valor):
        usuario = self.context["request"].user
        if not usuario.check_password(valor):
            raise serializers.ValidationError("La contraseña actual es incorrecta.")
        return valor

    def save(self, **kwargs):
        usuario = self.context["request"].user
        usuario.set_password(self.validated_data["password_nueva"])
        usuario.save(update_fields=["password"])
        return usuario


class UsuarioCrearSerializer(serializers.ModelSerializer):
    """Alta de usuarios (solo Administrador). Valida la contraseña con las
    políticas de Django antes de hashearla."""

    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "rol", "telefono", "password", "is_active",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        usuario = super().update(instance, validated_data)
        if password:
            usuario.set_password(password)
            usuario.save(update_fields=["password"])
        return usuario
