from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MantenimientoViewSet, PlanMantenimientoViewSet

router = DefaultRouter()
router.register(r"mantenimientos", MantenimientoViewSet, basename="mantenimiento")
router.register(r"planes-mantenimiento", PlanMantenimientoViewSet, basename="plan-mantenimiento")

urlpatterns = [path("", include(router.urls))]
