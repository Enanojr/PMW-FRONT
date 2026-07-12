from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OrdenTrabajoViewSet, RefaccionViewSet, TipoOrdenViewSet

router = DefaultRouter()
router.register(r"tipos-orden", TipoOrdenViewSet, basename="tipo-orden")
router.register(r"refacciones", RefaccionViewSet, basename="refaccion")
router.register(r"ordenes-trabajo", OrdenTrabajoViewSet, basename="orden-trabajo")

urlpatterns = [path("", include(router.urls))]
