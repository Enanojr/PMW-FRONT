"""
Hoja de servicio en PDF (reportlab). Se genera al cerrar una orden y se
archiva automáticamente en el repositorio documental.
"""
from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas

TINTA = colors.HexColor("#1d1d1f")
GRIS = colors.HexColor("#86868b")
ROJO = colors.HexColor("#c8102e")


def _parrafo(c: Canvas, texto: str, x: float, y: float, ancho_max: int = 95) -> float:
    """Dibuja texto multilínea simple; devuelve la nueva coordenada y."""
    import textwrap

    for linea in textwrap.wrap(texto or "—", width=ancho_max):
        c.drawString(x, y, linea)
        y -= 5 * mm
    return y


def generar_hoja_servicio(orden) -> bytes:
    buffer = BytesIO()
    c = Canvas(buffer, pagesize=letter)
    ancho, alto = letter
    margen = 20 * mm
    y = alto - margen

    # Encabezado
    c.setFillColor(TINTA)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margen, y, "KYOCERA")
    c.setFillColor(ROJO)
    c.drawString(margen + 33 * mm, y, "·")
    c.setFillColor(GRIS)
    c.setFont("Helvetica", 10)
    c.drawString(margen + 36 * mm, y, "Plataforma de Mantenimiento")
    c.setFillColor(TINTA)
    c.setFont("Helvetica-Bold", 13)
    c.drawRightString(ancho - margen, y, f"HOJA DE SERVICIO {orden.folio}")
    y -= 6 * mm
    c.setStrokeColor(colors.HexColor("#e5e5e5"))
    c.line(margen, y, ancho - margen, y)
    y -= 10 * mm

    # Datos generales
    c.setFont("Helvetica", 9)
    c.setFillColor(GRIS)
    filas = [
        ("Equipo", f"{orden.equipo.modelo.nombre} · Serie {orden.equipo.numero_serie}"),
        ("Esquema", orden.equipo.get_esquema_display()),
        (
            "Cliente / Ubicación",
            f"{orden.equipo.ubicacion_actual.cliente.nombre} / {orden.equipo.ubicacion_actual.nombre}"
            if orden.equipo.ubicacion_actual else "Sin asignar",
        ),
        ("Tipo de orden", orden.tipo.nombre),
        ("Prioridad", orden.get_prioridad_display()),
        (
            "Técnico",
            orden.tecnico_asignado.get_full_name() if orden.tecnico_asignado else "Sin asignar",
        ),
        ("Fecha de apertura", timezone.localtime(orden.creado_en).strftime("%d/%m/%Y %H:%M")),
        (
            "Fecha de cierre",
            timezone.localtime(orden.fecha_cierre).strftime("%d/%m/%Y %H:%M")
            if orden.fecha_cierre else "—",
        ),
    ]
    for etiqueta, valor in filas:
        c.setFillColor(GRIS)
        c.drawString(margen, y, etiqueta.upper())
        c.setFillColor(TINTA)
        c.drawString(margen + 45 * mm, y, valor)
        y -= 6 * mm
    y -= 4 * mm

    # Secciones de texto
    for titulo, contenido in [
        ("PROBLEMA REPORTADO", orden.descripcion_problema),
        ("DIAGNÓSTICO", orden.diagnostico),
        ("TRABAJO REALIZADO", orden.trabajo_realizado),
    ]:
        c.setFillColor(GRIS)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(margen, y, titulo)
        y -= 5.5 * mm
        c.setFillColor(TINTA)
        c.setFont("Helvetica", 9)
        y = _parrafo(c, contenido, margen, y)
        y -= 5 * mm

    # Refacciones utilizadas
    c.setFillColor(GRIS)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margen, y, "REFACCIONES UTILIZADAS")
    y -= 5.5 * mm
    c.setFont("Helvetica", 9)
    usos = list(orden.refacciones_utilizadas.select_related("refaccion"))
    if usos:
        for uso in usos:
            c.setFillColor(TINTA)
            c.drawString(margen, y, f"• {uso.refaccion.codigo} — {uso.refaccion.nombre}")
            c.drawRightString(ancho - margen, y, f"x{uso.cantidad}")
            y -= 5.5 * mm
    else:
        c.setFillColor(TINTA)
        c.drawString(margen, y, "Sin refacciones")
        y -= 5.5 * mm

    # Firmas
    y = max(y - 25 * mm, 40 * mm)
    for x_firma, titulo in [
        (margen, "Firma del técnico"),
        (ancho / 2 + 10 * mm, "Firma de conformidad del cliente"),
    ]:
        c.setStrokeColor(GRIS)
        c.line(x_firma, y, x_firma + 60 * mm, y)
        c.setFillColor(GRIS)
        c.setFont("Helvetica", 8)
        c.drawString(x_firma, y - 5 * mm, titulo)

    # Pie
    c.setFont("Helvetica", 7)
    c.setFillColor(GRIS)
    c.drawString(
        margen, 15 * mm,
        f"Documento generado automáticamente el {timezone.localtime().strftime('%d/%m/%Y %H:%M')} · Plataforma de Mantenimiento Kyocera",
    )

    c.showPage()
    c.save()
    return buffer.getvalue()
