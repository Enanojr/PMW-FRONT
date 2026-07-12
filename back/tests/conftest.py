import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Usuario
from apps.equipment.models import Area, Cliente, Equipo, ModeloEquipo
from apps.workorders.models import Refaccion, TipoOrden


@pytest.fixture
def admin(db):
    return Usuario.objects.create_user(
        "admin_test", "admin@test.com", "ClaveSegura.2026", rol="ADMIN",
        first_name="Ana", last_name="Admin",
    )


@pytest.fixture
def tecnico(db):
    return Usuario.objects.create_user(
        "tecnico_test", "tecnico@test.com", "ClaveSegura.2026", rol="TECNICO",
        first_name="Tomás", last_name="Técnico",
    )


@pytest.fixture
def otro_tecnico(db):
    return Usuario.objects.create_user(
        "tecnico2_test", "tecnico2@test.com", "ClaveSegura.2026", rol="TECNICO",
        first_name="Otro", last_name="Técnico",
    )


@pytest.fixture
def cliente_admin(admin):
    cliente = APIClient()
    cliente.force_authenticate(user=admin)
    return cliente


@pytest.fixture
def cliente_tecnico(tecnico):
    cliente = APIClient()
    cliente.force_authenticate(user=tecnico)
    return cliente


@pytest.fixture
def area(db):
    cliente = Cliente.objects.create(nombre="Cliente Test", ciudad="CDMX")
    return Area.objects.create(cliente=cliente, nombre="Área Test")


@pytest.fixture
def modelo(db):
    return ModeloEquipo.objects.create(nombre="TASKalfa Test", familia="TASKalfa")


@pytest.fixture
def equipo(db, area, modelo):
    return Equipo.objects.create(
        numero_serie="TEST-0001", modelo=modelo, ubicacion_actual=area
    )


@pytest.fixture
def tipo_orden(db):
    return TipoOrden.objects.create(nombre="Reparación Test")


@pytest.fixture
def refaccion(db):
    return Refaccion.objects.create(codigo="TK-TEST", nombre="Tóner de prueba", existencias=5)
