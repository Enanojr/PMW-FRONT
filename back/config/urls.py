from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.static import serve as serve_media
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Autenticación JWT
    path("api/auth/", include("apps.accounts.urls")),
    # Módulos de negocio
    path("api/", include("apps.equipment.urls")),
    path("api/", include("apps.maintenance.urls")),
    path("api/", include("apps.workorders.urls")),
    path("api/", include("apps.documents.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.reports.urls")),
    # Documentación OpenAPI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# Django sirve /media/ tanto en desarrollo como en el despliegue de demo
# (Render free no incluye almacenamiento de objetos). xframe_options_exempt
# permite que el visor PDF del frontend —en otro dominio— lo embeba en un
# iframe; el resto del sitio conserva X-Frame-Options: SAMEORIGIN.
urlpatterns += [
    re_path(
        r"^media/(?P<path>.*)$",
        xframe_options_exempt(serve_media),
        {"document_root": settings.MEDIA_ROOT},
    ),
]
