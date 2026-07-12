from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AreaViewSet, ClienteViewSet, EquipoViewSet, ModeloEquipoViewSet

router = DefaultRouter()
router.register(r"clientes", ClienteViewSet, basename="cliente")
router.register(r"areas", AreaViewSet, basename="area")
router.register(r"modelos-equipo", ModeloEquipoViewSet, basename="modelo-equipo")
router.register(r"equipos", EquipoViewSet, basename="equipo")

urlpatterns = [path("", include(router.urls))]
