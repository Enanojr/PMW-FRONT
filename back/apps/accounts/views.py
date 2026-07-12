from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .permissions import EsAdministrador
from .serializers import (
    CambiarPasswordSerializer,
    TokenConRolSerializer,
    UsuarioCrearSerializer,
    UsuarioSerializer,
)


class LoginView(TokenObtainPairView):
    serializer_class = TokenConRolSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    Gestión de usuarios. CRUD exclusivo del Administrador,
    excepto `/usuarios/yo/` que devuelve el perfil propio.
    """

    queryset = Usuario.objects.all().order_by("username")
    permission_classes = [EsAdministrador]
    filterset_fields = ["rol", "is_active"]
    search_fields = ["username", "first_name", "last_name", "email"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UsuarioCrearSerializer
        return UsuarioSerializer

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated], url_path="yo")
    def yo(self, request):
        """Perfil del usuario autenticado (Admin o Técnico)."""
        return Response(UsuarioSerializer(request.user).data)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="cambiar-password",
    )
    def cambiar_password(self, request):
        """Cualquier usuario autenticado cambia su propia contraseña."""
        serializer = CambiarPasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Contraseña actualizada correctamente."})

    @action(detail=False, methods=["get"], permission_classes=[EsAdministrador], url_path="tecnicos")
    def tecnicos(self, request):
        """Listado de técnicos activos, para asignación de trabajos."""
        tecnicos = self.queryset.filter(rol=Usuario.Rol.TECNICO, is_active=True)
        return Response(UsuarioSerializer(tecnicos, many=True).data)
