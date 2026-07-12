"""
Pruebas del control de acceso por roles (RBAC).
Regla de oro: el Técnico solo ve y opera lo asignado a él.
"""
import pytest

from apps.maintenance.models import Mantenimiento
from apps.workorders.models import OrdenTrabajo

pytestmark = pytest.mark.django_db


def crear_orden(equipo, tipo_orden, tecnico, admin):
    return OrdenTrabajo.objects.create(
        tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
        estatus="ASIGNADA", descripcion_problema="Falla de prueba", creado_por=admin,
    )


class TestOrdenesRBAC:
    def test_tecnico_no_ve_ordenes_ajenas(self, cliente_tecnico, equipo, tipo_orden, otro_tecnico, admin):
        crear_orden(equipo, tipo_orden, otro_tecnico, admin)
        respuesta = cliente_tecnico.get("/api/ordenes-trabajo/")
        assert respuesta.status_code == 200
        assert respuesta.data["count"] == 0

    def test_tecnico_no_accede_orden_ajena_por_id(self, cliente_tecnico, equipo, tipo_orden, otro_tecnico, admin):
        orden = crear_orden(equipo, tipo_orden, otro_tecnico, admin)
        respuesta = cliente_tecnico.get(f"/api/ordenes-trabajo/{orden.id}/")
        assert respuesta.status_code == 404  # el queryset filtrado la oculta

    def test_tecnico_si_ve_sus_ordenes(self, cliente_tecnico, tecnico, equipo, tipo_orden, admin):
        crear_orden(equipo, tipo_orden, tecnico, admin)
        respuesta = cliente_tecnico.get("/api/ordenes-trabajo/")
        assert respuesta.data["count"] == 1

    def test_tecnico_no_puede_crear_ordenes(self, cliente_tecnico, equipo, tipo_orden):
        respuesta = cliente_tecnico.post(
            "/api/ordenes-trabajo/",
            {"tipo": tipo_orden.id, "equipo": equipo.id, "descripcion_problema": "x"},
        )
        assert respuesta.status_code == 403

    def test_tecnico_no_puede_reasignar_su_orden(self, cliente_tecnico, tecnico, otro_tecnico, equipo, tipo_orden, admin):
        orden = crear_orden(equipo, tipo_orden, tecnico, admin)
        respuesta = cliente_tecnico.patch(
            f"/api/ordenes-trabajo/{orden.id}/", {"tecnico_asignado": otro_tecnico.id}
        )
        assert respuesta.status_code == 400  # campo no permitido para el rol

    def test_admin_ve_todas_las_ordenes(self, cliente_admin, equipo, tipo_orden, tecnico, otro_tecnico, admin):
        crear_orden(equipo, tipo_orden, tecnico, admin)
        crear_orden(equipo, tipo_orden, otro_tecnico, admin)
        respuesta = cliente_admin.get("/api/ordenes-trabajo/")
        assert respuesta.data["count"] == 2


class TestMantenimientosRBAC:
    def test_tecnico_solo_ve_los_suyos(self, cliente_tecnico, tecnico, otro_tecnico, equipo, admin):
        Mantenimiento.objects.create(
            equipo=equipo, tipo="PREVENTIVO", tecnico_asignado=otro_tecnico,
            fecha_programada="2026-08-01T10:00:00Z", creado_por=admin,
        )
        Mantenimiento.objects.create(
            equipo=equipo, tipo="CORRECTIVO", tecnico_asignado=tecnico,
            fecha_programada="2026-08-02T10:00:00Z", creado_por=admin,
        )
        respuesta = cliente_tecnico.get("/api/mantenimientos/")
        assert respuesta.data["count"] == 1
        assert respuesta.data["results"][0]["tipo"] == "CORRECTIVO"

    def test_tecnico_actualiza_solo_campos_permitidos(self, cliente_tecnico, tecnico, equipo, admin):
        m = Mantenimiento.objects.create(
            equipo=equipo, tipo="PREVENTIVO", tecnico_asignado=tecnico,
            fecha_programada="2026-08-01T10:00:00Z", creado_por=admin,
        )
        ok = cliente_tecnico.patch(
            f"/api/mantenimientos/{m.id}/",
            {"estatus": "EN_PROCESO", "observaciones_tecnico": "iniciado"},
        )
        assert ok.status_code == 200
        mal = cliente_tecnico.patch(f"/api/mantenimientos/{m.id}/", {"tipo": "CORRECTIVO"})
        assert mal.status_code == 400


class TestCatalogosRBAC:
    def test_tecnico_puede_crear_equipos(self, cliente_tecnico, modelo, area):
        respuesta = cliente_tecnico.post(
            "/api/equipos/",
            {"numero_serie": "TEST-0099", "modelo": modelo.id, "ubicacion_actual": area.id},
        )
        assert respuesta.status_code == 201

    def test_tecnico_no_puede_borrar_equipos(self, cliente_tecnico, equipo):
        respuesta = cliente_tecnico.delete(f"/api/equipos/{equipo.id}/")
        assert respuesta.status_code == 403

    def test_tecnico_no_puede_subir_documentos(self, cliente_tecnico):
        respuesta = cliente_tecnico.post("/api/documentos/", {"titulo": "x", "tipo": "MANUAL"})
        assert respuesta.status_code == 403

    def test_tecnico_no_gestiona_usuarios(self, cliente_tecnico):
        respuesta = cliente_tecnico.get("/api/auth/usuarios/")
        assert respuesta.status_code == 403

    def test_tecnico_no_ve_dashboard(self, cliente_tecnico):
        respuesta = cliente_tecnico.get("/api/dashboard/resumen/")
        assert respuesta.status_code == 403

    def test_anonimo_rechazado(self, db):
        from rest_framework.test import APIClient

        respuesta = APIClient().get("/api/equipos/")
        assert respuesta.status_code == 401
