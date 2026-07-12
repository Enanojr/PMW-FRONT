"""
Cambio de modelo de negocio: no hay sucursales propias — se da servicio a
CLIENTES (arrendamiento / póliza de soporte) y hay equipos propios.

- Sucursal → Cliente (rename: conserva los datos existentes).
- Área ahora cuelga de Cliente.
- Equipo.esquema: ARRENDAMIENTO | POLIZA | PROPIO.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("equipment", "0003_historicalequipo_lecturacontador"),
    ]

    operations = [
        # --- Sucursal → Cliente ---
        migrations.RenameModel(old_name="Sucursal", new_name="Cliente"),
        migrations.AlterModelTable(name="cliente", table="clientes"),
        migrations.AlterModelOptions(
            name="cliente",
            options={
                "ordering": ["nombre"],
                "verbose_name": "Cliente",
                "verbose_name_plural": "Clientes",
            },
        ),
        migrations.AddField(
            model_name="cliente",
            name="contacto",
            field=models.CharField(blank=True, help_text="Persona de contacto.", max_length=120),
        ),
        migrations.AddField(
            model_name="cliente",
            name="telefono",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="cliente",
            name="email",
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AlterField(
            model_name="cliente",
            name="activa",
            field=models.BooleanField(default=True, verbose_name="activo"),
        ),
        # --- Área: ahora pertenece a un cliente ---
        migrations.RemoveConstraint(model_name="area", name="uniq_area_por_sucursal"),
        migrations.RenameField(model_name="area", old_name="sucursal", new_name="cliente"),
        migrations.AddConstraint(
            model_name="area",
            constraint=models.UniqueConstraint(
                fields=("cliente", "nombre"), name="uniq_area_por_cliente"
            ),
        ),
        migrations.AlterModelOptions(
            name="area",
            options={
                "ordering": ["cliente__nombre", "nombre"],
                "verbose_name": "Ubicación",
                "verbose_name_plural": "Ubicaciones",
            },
        ),
        # --- Esquema comercial del equipo ---
        migrations.AddField(
            model_name="equipo",
            name="esquema",
            field=models.CharField(
                choices=[
                    ("ARRENDAMIENTO", "Arrendamiento"),
                    ("POLIZA", "Póliza de soporte"),
                    ("PROPIO", "Propio"),
                ],
                db_index=True,
                default="ARRENDAMIENTO",
                help_text="Modalidad comercial: arrendamiento, póliza de soporte o equipo propio.",
                max_length=14,
            ),
        ),
        migrations.AddField(
            model_name="historicalequipo",
            name="esquema",
            field=models.CharField(
                choices=[
                    ("ARRENDAMIENTO", "Arrendamiento"),
                    ("POLIZA", "Póliza de soporte"),
                    ("PROPIO", "Propio"),
                ],
                db_index=True,
                default="ARRENDAMIENTO",
                help_text="Modalidad comercial: arrendamiento, póliza de soporte o equipo propio.",
                max_length=14,
            ),
        ),
    ]
