"""
Tareas Celery de notificación. Punto único para integrar email (SMTP),
push o mensajería (Teams/Slack/WhatsApp) sin tocar la lógica de negocio.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_notificacion_externa(self, notificacion_id: int):
    from django.conf import settings
    from django.core.mail import send_mail

    from .models import Notificacion

    notificacion = Notificacion.objects.select_related("destinatario").filter(pk=notificacion_id).first()
    if notificacion is None:
        return

    correo = notificacion.destinatario.email
    if not correo:
        logger.info(
            "Notificación #%s para %s sin correo registrado; solo notificación interna.",
            notificacion.pk, notificacion.destinatario.username,
        )
        return

    try:
        send_mail(
            subject=f"[Kyocera Mantenimiento] {notificacion.titulo}",
            message=notificacion.mensaje,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[correo],
            fail_silently=False,
        )
        logger.info("Notificación #%s enviada a %s", notificacion.pk, correo)
    except Exception as exc:  # SMTP caído: reintenta con backoff
        logger.warning("Fallo al enviar notificación #%s: %s", notificacion.pk, exc)
        raise self.retry(exc=exc)
