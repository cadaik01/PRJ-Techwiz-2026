import logging
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template import TemplateDoesNotExist
from django.template.loader import render_to_string

from notifications.messages import NOTIFICATION_SPECS, render_notification
from notifications.models import Notification

logger = logging.getLogger("marketlink")

# Bulk admin actions send one email per order; the pool keeps them off the request thread.
_email_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="marketlink-email")

DEFAULT_FRONTEND_URL = "http://localhost:5173"


def notify(*, recipient: Any, event_type: str, context: dict[str, Any]) -> Notification:
    title, message, target_url = render_notification(event_type, context)
    notification = Notification.objects.create(
        recipient=recipient,
        type=event_type,
        title=title,
        message=message,
        target_url=target_url,
    )
    transaction.on_commit(partial(_push_realtime, recipient.pk, _serialize(notification)))

    template = NOTIFICATION_SPECS[event_type].email_template
    if template and recipient.email:
        email_context = {
            **context,
            "title": title,
            "message": message,
            "action_url": _absolute_url(target_url),
            "recipient_email": recipient.email,
        }
        transaction.on_commit(partial(_send_email, recipient.email, title, template, email_context))
    return notification


def _serialize(notification: Notification) -> dict[str, Any]:
    return {
        "id": notification.pk,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "target_url": notification.target_url,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
    }


def _push_realtime(user_id: int, payload: dict[str, Any]) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}", {"type": "notify", "data": payload}
        )
    except Exception:  # noqa: BLE001 - the row is already saved; the bell reloads it later
        logger.exception("WebSocket push failed for user %s", user_id)


def _absolute_url(path: str | None) -> str | None:
    if not path:
        return None
    base = getattr(settings, "FRONTEND_URL", DEFAULT_FRONTEND_URL).rstrip("/")
    return f"{base}{path}"


def _send_email(to_email: str, subject: str, template: str, context: dict[str, Any]) -> None:
    try:
        text_body = render_to_string(f"emails/{template}.txt", context)
        html_body = render_to_string(f"emails/{template}.html", context)
    except TemplateDoesNotExist:
        # This runs in an on_commit callback, so an exception here would surface as a 500 on a
        # request that already succeeded. Email is the secondary channel; the in-app
        # notification has been delivered either way.
        logger.exception("No email template named %r; skipping mail to %s", template, to_email)
        return
    email = EmailMultiAlternatives(
        subject=f"[MarketLink] {subject}",
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    email.attach_alternative(html_body, "text/html")
    if getattr(settings, "EMAIL_ASYNC", True):
        _email_pool.submit(_deliver, email)
    else:
        _deliver(email)


def _deliver(email: EmailMultiAlternatives) -> None:
    try:
        email.send(fail_silently=False)
    except Exception:  # noqa: BLE001 - email is a secondary channel; in-app already delivered
        logger.exception("Email delivery failed to %s", email.to)
