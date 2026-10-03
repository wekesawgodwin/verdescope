"""Outbound email for the company mailbox.

EMAIL_PROVIDER=smtp   -> any SMTP server (Google Workspace, Microsoft 365, Zoho...)
EMAIL_PROVIDER=resend -> Resend HTTPS API (works on Railway plans where SMTP ports are blocked)
EMAIL_PROVIDER unset  -> emails are stored in the portal but not delivered
"""
import json
import logging
import smtplib
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr

from .config import get_settings

log = logging.getLogger("verdescope.mail")


def send_email(*, to: str, to_name: str, subject: str, body: str, from_name: str, reply_to: str | None) -> tuple[bool, str]:
    """Returns (delivered, error_message)."""
    s = get_settings()
    sender = s.mail_from or reply_to
    provider = (s.email_provider or "").lower()
    if not provider:
        return False, "Email delivery is not configured (set EMAIL_PROVIDER)."
    if not sender:
        return False, "MAIL_FROM is not set."
    try:
        if provider == "smtp":
            if not s.smtp_host:
                return False, "SMTP_HOST is not set."
            msg = EmailMessage()
            msg["From"] = formataddr((from_name, sender))
            msg["To"] = formataddr((to_name, to)) if to_name else to
            msg["Subject"] = subject
            if reply_to:
                msg["Reply-To"] = reply_to
            msg.set_content(body)
            smtp_cls = smtplib.SMTP_SSL if s.smtp_port == 465 else smtplib.SMTP
            with smtp_cls(s.smtp_host, s.smtp_port, timeout=20) as smtp:
                if s.smtp_starttls and s.smtp_port != 465:
                    smtp.starttls()
                if s.smtp_user:
                    smtp.login(s.smtp_user, s.smtp_password or "")
                smtp.send_message(msg)
            return True, ""
        if provider == "resend":
            if not s.resend_api_key:
                return False, "RESEND_API_KEY is not set."
            payload = {"from": formataddr((from_name, sender)), "to": [to], "subject": subject, "text": body}
            if reply_to:
                payload["reply_to"] = reply_to
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode(),
                headers={"Authorization": f"Bearer {s.resend_api_key}", "Content-Type": "application/json", "User-Agent": "verdescope/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as r:
                if r.status >= 300:
                    return False, f"Resend error {r.status}"
            return True, ""
        return False, f"Unknown EMAIL_PROVIDER '{provider}'."
    except Exception as e:  # noqa: BLE001 - surface any delivery failure to the UI
        log.warning("Email to %s failed: %s", to, e)
        return False, str(e)[:500]
