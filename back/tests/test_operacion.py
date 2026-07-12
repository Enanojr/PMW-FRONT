"""
Pruebas de la lógica de negocio: folios, stock de refacciones,
notificaciones por señales, hoja de servicio PDF, lecturas y recurrentes.
"""
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.documents.models import Documento
from apps.maintenance.models import Mantenimiento, PlanMantenimiento
from apps.maintenance.tasks import generar_pendientes
from apps.notifications.models import Notificacion
from apps.workorders.models import OrdenTrabajo, Refaccion

pytestmark = pytest.mark.django_db


class TestOrdenes:
    def test_folio_autogenerado_consecutivo(self, equipo, tipo_orden, admin):
        o1 = OrdenTrabajo.objects.create(tipo=tipo_orden, equipo=equipo, descripcion_problema="a", creado_por=admin)
        o2 = OrdenTrabajo.objects.create(tipo=tipo_orden, equipo=equipo, descripcion_problema="b", creado_por=admin)
        assert o1.folio.startswith("OT-")
        assert o1.folio != o2.folio

    def test_refacciones_descuentan_stock(self, cliente_admin, equipo, tipo_orden, tecnico, refaccion):
        respuesta = cliente_admin.post(
            "/api/ordenes-trabajo/",
            {
                "tipo": tipo_orden.id,
                "equipo": equipo.id,
                "tecnico_asignado": tecnico.id,
                "descripcion_problema": "Cambio de tóner",
                "refacciones_utilizadas": [{"refaccion": refaccion.id, "cantidad": 2}],
            },
            format="json",
        )
        assert respuesta.status_code == 201, respuesta.data
        refaccion.refresh_from_db()
        assert refaccion.existencias == 3

    def test_stock_insuficiente_rechazado(self, cliente_admin, equipo, tipo_orden, refaccion):
        respuesta = cliente_admin.post(
            "/api/ordenes-trabajo/",
            {
                "tipo": tipo_orden.id,
                "equipo": equipo.id,
                "descripcion_problema": "x",
                "refacciones_utilizadas": [{"refaccion": refaccion.id, "cantidad": 99}],
            },
            format="json",
        )
        assert respuesta.status_code == 400
        refaccion.refresh_from_db()
        assert refaccion.existencias == 5  # intacto

    def test_cerrar_orden_genera_hoja_de_servicio(self, equipo, tipo_orden, tecnico, admin):
        orden = OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
            estatus="EN_PROCESO", descripcion_problema="Falla", creado_por=admin,
        )
        orden.estatus = "CERRADA"
        orden.fecha_cierre = timezone.now()
        orden.save()
        documento = Documento.objects.filter(orden_trabajo=orden, tipo="REPORTE").first()
        assert documento is not None
        assert documento.archivo.name.endswith(".pdf")
        assert documento.tamano_bytes > 0

    def test_asignacion_notifica_al_tecnico(self, equipo, tipo_orden, tecnico, admin):
        OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
            descripcion_problema="x", creado_por=admin,
        )
        assert Notificacion.objects.filter(destinatario=tecnico, tipo="ASIGNACION").exists()

    def test_cambio_estatus_notifica_al_admin(self, equipo, tipo_orden, tecnico, admin):
        orden = OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
            estatus="ASIGNADA", descripcion_problema="x", creado_por=admin,
        )
        Notificacion.objects.all().delete()
        orden.estatus = "EN_PROCESO"
        orden.save()
        assert Notificacion.objects.filter(destinatario=admin, tipo="CAMBIO_ESTATUS").exists()


class TestEdicionYEvidencias:
    def test_admin_edita_orden(self, cliente_admin, equipo, tipo_orden, tecnico, otro_tecnico, admin):
        orden = OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
            estatus="ASIGNADA", prioridad="MEDIA", descripcion_problema="x", creado_por=admin,
        )
        respuesta = cliente_admin.patch(
            f"/api/ordenes-trabajo/{orden.id}/",
            {"prioridad": "URGENTE", "tecnico_asignado": otro_tecnico.id},
        )
        assert respuesta.status_code == 200
        orden.refresh_from_db()
        assert orden.prioridad == "URGENTE"
        assert orden.tecnico_asignado_id == otro_tecnico.id

    def test_admin_elimina_orden_y_repone_stock(self, cliente_admin, equipo, tipo_orden, tecnico, refaccion):
        creacion = cliente_admin.post(
            "/api/ordenes-trabajo/",
            {
                "tipo": tipo_orden.id, "equipo": equipo.id,
                "tecnico_asignado": tecnico.id, "descripcion_problema": "x",
                "refacciones_utilizadas": [{"refaccion": refaccion.id, "cantidad": 3}],
            },
            format="json",
        )
        assert creacion.status_code == 201
        refaccion.refresh_from_db()
        assert refaccion.existencias == 2
        respuesta = cliente_admin.delete(f"/api/ordenes-trabajo/{creacion.data['id']}/")
        assert respuesta.status_code == 204
        refaccion.refresh_from_db()
        assert refaccion.existencias == 5  # stock repuesto

    def test_tecnico_no_elimina_ordenes(self, cliente_tecnico, tecnico, equipo, tipo_orden, admin):
        orden = OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
            descripcion_problema="x", creado_por=admin,
        )
        respuesta = cliente_tecnico.delete(f"/api/ordenes-trabajo/{orden.id}/")
        assert respuesta.status_code == 403

    def test_tecnico_sube_evidencia_a_su_orden(self, cliente_tecnico, tecnico, equipo, tipo_orden, admin):
        from django.core.files.uploadedfile import SimpleUploadedFile

        orden = OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
            estatus="EN_PROCESO", descripcion_problema="x", creado_por=admin,
        )
        foto = SimpleUploadedFile("evidencia.jpg", b"contenido-imagen", content_type="image/jpeg")
        respuesta = cliente_tecnico.post(
            f"/api/ordenes-trabajo/{orden.id}/evidencias/",
            {"archivo": foto, "descripcion": "Foto del equipo reparado"},
            format="multipart",
        )
        assert respuesta.status_code == 201, respuesta.data
        assert Documento.objects.filter(orden_trabajo=orden, tipo="EVIDENCIA").exists()

    def test_tecnico_no_sube_evidencia_a_orden_ajena(self, cliente_tecnico, otro_tecnico, equipo, tipo_orden, admin):
        from django.core.files.uploadedfile import SimpleUploadedFile

        orden = OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=otro_tecnico,
            descripcion_problema="x", creado_por=admin,
        )
        foto = SimpleUploadedFile("evidencia.jpg", b"x", content_type="image/jpeg")
        respuesta = cliente_tecnico.post(
            f"/api/ordenes-trabajo/{orden.id}/evidencias/", {"archivo": foto}, format="multipart",
        )
        assert respuesta.status_code == 404  # el queryset filtrado la oculta

    def test_evidencia_extension_invalida_rechazada(self, cliente_tecnico, tecnico, equipo, tipo_orden, admin):
        from django.core.files.uploadedfile import SimpleUploadedFile

        orden = OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
            descripcion_problema="x", creado_por=admin,
        )
        ejecutable = SimpleUploadedFile("virus.exe", b"x", content_type="application/octet-stream")
        respuesta = cliente_tecnico.post(
            f"/api/ordenes-trabajo/{orden.id}/evidencias/", {"archivo": ejecutable}, format="multipart",
        )
        assert respuesta.status_code == 400

    def test_admin_edita_numero_de_serie(self, cliente_admin, equipo):
        respuesta = cliente_admin.patch(f"/api/equipos/{equipo.id}/", {"numero_serie": "NUEVO-9999"})
        assert respuesta.status_code == 200
        equipo.refresh_from_db()
        assert equipo.numero_serie == "NUEVO-9999"

    def test_numero_de_serie_duplicado_rechazado(self, cliente_admin, equipo, modelo, area):
        from apps.equipment.models import Equipo

        Equipo.objects.create(numero_serie="OCUPADO-1", modelo=modelo, ubicacion_actual=area)
        respuesta = cliente_admin.patch(f"/api/equipos/{equipo.id}/", {"numero_serie": "OCUPADO-1"})
        assert respuesta.status_code == 400

    def test_admin_elimina_equipo_sin_historial(self, cliente_admin, equipo):
        respuesta = cliente_admin.delete(f"/api/equipos/{equipo.id}/")
        assert respuesta.status_code == 204

    def test_equipo_con_ordenes_no_se_elimina(self, cliente_admin, equipo, tipo_orden, tecnico, admin):
        OrdenTrabajo.objects.create(
            tipo=tipo_orden, equipo=equipo, tecnico_asignado=tecnico,
            descripcion_problema="x", creado_por=admin,
        )
        respuesta = cliente_admin.delete(f"/api/equipos/{equipo.id}/")
        assert respuesta.status_code == 400
        assert "Dado de baja" in respuesta.data["detail"]

    def test_admin_cambia_esquema_de_equipo(self, cliente_admin, equipo):
        respuesta = cliente_admin.patch(f"/api/equipos/{equipo.id}/", {"esquema": "POLIZA"})
        assert respuesta.status_code == 200
        equipo.refresh_from_db()
        assert equipo.esquema == "POLIZA"

    def test_tecnico_no_cambia_esquema(self, cliente_tecnico, equipo):
        respuesta = cliente_tecnico.patch(f"/api/equipos/{equipo.id}/", {"esquema": "POLIZA"})
        assert respuesta.status_code == 403


class TestLecturas:
    def test_registrar_lectura_actualiza_contador(self, cliente_tecnico, equipo):
        respuesta = cliente_tecnico.post(f"/api/equipos/{equipo.id}/lecturas/", {"lectura": 1500})
        assert respuesta.status_code == 201
        equipo.refresh_from_db()
        assert equipo.contador_paginas == 1500

    def test_lectura_no_puede_retroceder(self, cliente_tecnico, equipo):
        cliente_tecnico.post(f"/api/equipos/{equipo.id}/lecturas/", {"lectura": 1500})
        respuesta = cliente_tecnico.post(f"/api/equipos/{equipo.id}/lecturas/", {"lectura": 900})
        assert respuesta.status_code == 400


class TestPlanesRecurrentes:
    def test_plan_vencido_genera_mantenimiento_y_avanza(self, equipo, tecnico, admin):
        plan = PlanMantenimiento.objects.create(
            equipo=equipo, tecnico_asignado=tecnico, tipo="PREVENTIVO",
            frecuencia_dias=90, proxima_fecha=timezone.now() - timedelta(days=1),
            creado_por=admin,
        )
        generados = generar_pendientes()
        assert generados == 1
        assert Mantenimiento.objects.filter(equipo=equipo, tecnico_asignado=tecnico).exists()
        plan.refresh_from_db()
        assert plan.proxima_fecha > timezone.now()

    def test_plan_futuro_no_genera(self, equipo, tecnico, admin):
        PlanMantenimiento.objects.create(
            equipo=equipo, tecnico_asignado=tecnico, tipo="PREVENTIVO",
            frecuencia_dias=90, proxima_fecha=timezone.now() + timedelta(days=30),
            creado_por=admin,
        )
        assert generar_pendientes() == 0

    def test_solo_admin_gestiona_planes(self, cliente_tecnico):
        respuesta = cliente_tecnico.get("/api/planes-mantenimiento/")
        assert respuesta.status_code == 403


class TestPassword:
    def test_cambio_password_correcto(self, cliente_tecnico, tecnico):
        respuesta = cliente_tecnico.post(
            "/api/auth/usuarios/cambiar-password/",
            {"password_actual": "ClaveSegura.2026", "password_nueva": "OtraClave.Fuerte.99"},
        )
        assert respuesta.status_code == 200
        tecnico.refresh_from_db()
        assert tecnico.check_password("OtraClave.Fuerte.99")

    def test_password_actual_incorrecta_rechazada(self, cliente_tecnico):
        respuesta = cliente_tecnico.post(
            "/api/auth/usuarios/cambiar-password/",
            {"password_actual": "equivocada", "password_nueva": "OtraClave.Fuerte.99"},
        )
        assert respuesta.status_code == 400

    def test_password_debil_rechazada(self, cliente_tecnico):
        respuesta = cliente_tecnico.post(
            "/api/auth/usuarios/cambiar-password/",
            {"password_actual": "ClaveSegura.2026", "password_nueva": "123"},
        )
        assert respuesta.status_code == 400
