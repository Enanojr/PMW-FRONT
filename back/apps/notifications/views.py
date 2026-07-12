from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notificacion
from .serializers import NotificacionSerializer


class NotificacionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Cada usuario solo ve sus propias notificaciones (puede marcarlas leídas)."""

    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["leida", "tipo"]

    def get_queryset(self):
        return Notificacion.objects.filter(destinatario=self.request.user)

    @action(detail=False, methods=["post"], url_path="marcar-todas-leidas")
    def marcar_todas_leidas(self, request):
        actualizadas = self.get_queryset().filter(leida=False).update(leida=True)
        return Response({"actualizadas": actualizadas})
