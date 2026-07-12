"""
Convierte Equipo.modelo de texto libre a FK contra el catálogo ModeloEquipo.
La tabla equipos está vacía al momento de esta migración, por lo que el
reemplazo del campo es directo (sin migración de datos).
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("equipment", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ModeloEquipo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=80, unique=True)),
                ("familia", models.CharField(blank=True, help_text="Línea de producto: TASKalfa, ECOSYS, FS…", max_length=40)),
                ("tipo", models.CharField(choices=[("MFP", "Multifuncional"), ("IMPRESORA", "Impresora"), ("OTRO", "Otro")], default="MFP", max_length=10)),
                ("es_color", models.BooleanField(default=False)),
                ("descripcion", models.CharField(blank=True, max_length=255)),
                ("activo", models.BooleanField(default=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Modelo de equipo",
                "verbose_name_plural": "Modelos de equipo",
                "db_table": "modelos_equipo",
                "ordering": ["nombre"],
            },
        ),
        migrations.RemoveIndex(
            model_name="equipo",
            name="equipos_estado_65cad2_idx",
        ),
        migrations.RemoveField(
            model_name="equipo",
            name="modelo",
        ),
        migrations.AddField(
            model_name="equipo",
            name="modelo",
            # La tabla equipos está vacía: se puede agregar NOT NULL sin default.
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="equipos",
                to="equipment.modeloequipo",
            ),
        ),
        migrations.AddIndex(
            model_name="equipo",
            index=models.Index(fields=["estado", "modelo"], name="idx_equipos_estado_modelo"),
        ),
    ]
