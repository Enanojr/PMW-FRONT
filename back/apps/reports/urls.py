from django.urls import path

from .views import ResumenDashboardView

urlpatterns = [
    path("dashboard/resumen/", ResumenDashboardView.as_view(), name="dashboard-resumen"),
]
