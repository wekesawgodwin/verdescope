from sqlalchemy.orm import Session

from ..models import SiteSettings

DEFAULT_SETTINGS = {
    "company_name": "Verde-Scope Africa Limited",
    "tagline": "Sustainable Solutions. Resilient Ecosystems. Thriving Communities.",
    "phone1": "+254 725 318 476",
    "phone2": "+254 733 450 975",
    "public_email": "verdescopeafricaltd@gmail.com",
    "mail_from": "info@verdescope.co.ke",
    "mail_signature": "Kind regards,\nVerde-Scope Africa Limited\n5th Floor, One Africa Place, Westlands, Nairobi\n+254 725 318 476 | +254 733 450 975",
    "address": "5th Floor, One Africa Place, Chiromo Road / Rhapta Road junction, Westlands, Nairobi",
    "postal": "P.O. Box 451-00610, Nairobi, Kenya",
    "maintenance": False,
}

PUBLIC_KEYS = ("company_name", "tagline", "phone1", "phone2", "public_email", "address", "postal", "maintenance")


def site_settings(db: Session) -> dict:
    row = db.get(SiteSettings, 1)
    return {**DEFAULT_SETTINGS, **(row.data if row else {})}
