"""
Module: manager.common.notify
Description: In-app notification plus optional email for events the admin triggers
             (A-006, D-010).

In-app goes through notifications.services.push_notification (row in the current
transaction, WebSocket after commit). Email is rendered after commit and sent on a
two-thread pool so an admin locking an account with many orders is not kept waiting.
Set EMAIL_ASYNC = False (tests) to send inline.

When the platform's single notify() entry point lands in notifications/services.py,
this module should delegate to it.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.db import transaction
from django.template.loader import render_to_string

from notifications.services import push_notification

logger = logging.getLogger(__name__)

EMAIL_TIMEOUT_SECONDS = 10
_EMAIL_POOL = ThreadPoolExecutor(max_workers=2, thread_name_prefix='email')


def _send(*, to: str, subject: str, text: str, html: str) -> None:
    try:
        connection = get_connection(timeout=getattr(settings, 'EMAIL_TIMEOUT', EMAIL_TIMEOUT_SECONDS))
        send_mail(subject, text, None, [to], html_message=html, connection=connection)
    except Exception:
        # Email is the secondary channel: the in-app notification is already saved.
        logger.exception('Failed to send "%s" email to user', subject)


def _render_and_queue(*, to: str, subject: str, template: str, context: dict) -> None:
    text = render_to_string(f'manager/emails/{template}.txt', context)
    html = render_to_string(f'manager/emails/{template}.html', context)
    if getattr(settings, 'EMAIL_ASYNC', True):
        _EMAIL_POOL.submit(_send, to=to, subject=subject, text=text, html=html)
    else:
        _send(to=to, subject=subject, text=text, html=html)


def notify_user(
    *,
    recipient,
    type: str,
    title: str,
    message: str,
    target_url: str | None = None,
    email_template: str | None = None,
    email_context: dict | None = None,
) -> None:
    """Call inside the business transaction: nothing leaves the process unless it commits."""
    push_notification(user_id=recipient.pk, type=type, title=title, message=message, target_url=target_url)
    if email_template and recipient.email:
        transaction.on_commit(partial(
            _render_and_queue, to=recipient.email, subject=title, template=email_template,
            context={'title': title, 'message': message, **(email_context or {})},
        ))
