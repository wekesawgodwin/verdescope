from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..db import get_db
from ..deps import log, staff
from ..mailer import send_email
from ..models import Inquiry, OutboundEmail, User
from ..schemas import ComposeIn, EmailOut, InquiryDetail, InquiryOut, InquiryPatch, ReplyIn
from .common import site_settings

router = APIRouter(prefix="/mail", tags=["mail"])


@router.get("/config")
def config(db: Session = Depends(get_db), _: User = Depends(staff)):
    """What the mail client needs: send-as address, signature and whether delivery is configured."""
    s, env = site_settings(db), get_settings()
    return {"company_name": s["company_name"], "mail_from": s["mail_from"], "mail_signature": s["mail_signature"],
            "_email_provider": env.email_provider or "", "_mail_from_env": env.mail_from or ""}


@router.get("/counts")
def counts(db: Session = Depends(get_db), _: User = Depends(staff)):
    def c(*where):
        return db.scalar(select(func.count()).select_from(Inquiry).where(*where))
    return {
        "inbox": c(Inquiry.folder == "inbox"),
        "unread": c(Inquiry.folder == "inbox", Inquiry.read.is_(False)),
        "archived": c(Inquiry.folder == "archived"),
        "sent": db.scalar(select(func.count()).select_from(OutboundEmail)),
    }


@router.get("/inquiries", response_model=list[InquiryOut])
def inquiries(folder: Literal["inbox", "unread", "archived"] = "inbox", q: str | None = None,
              db: Session = Depends(get_db), _: User = Depends(staff)):
    stmt = select(Inquiry).order_by(Inquiry.created_at.desc())
    if folder == "unread":
        stmt = stmt.where(Inquiry.folder == "inbox", Inquiry.read.is_(False))
    else:
        stmt = stmt.where(Inquiry.folder == folder)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Inquiry.name.ilike(like), Inquiry.email.ilike(like), Inquiry.subject.ilike(like), Inquiry.message.ilike(like), Inquiry.org.ilike(like)))
    return db.scalars(stmt.limit(500)).all()


@router.get("/inquiries/{iid}", response_model=InquiryDetail)
def inquiry(iid: int, db: Session = Depends(get_db), _: User = Depends(staff)):
    q = db.scalar(select(Inquiry).options(selectinload(Inquiry.replies)).where(Inquiry.id == iid))
    if not q:
        raise HTTPException(404, "Message not found")
    if not q.read:
        q.read = True
        db.commit()
    return q


@router.patch("/inquiries/{iid}", response_model=InquiryOut)
def patch_inquiry(iid: int, data: InquiryPatch, db: Session = Depends(get_db), user: User = Depends(staff)):
    q = db.get(Inquiry, iid)
    if not q:
        raise HTTPException(404, "Message not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(q, k, v)
    if data.status:
        log(db, user.name, f"Marked “{q.subject}” as {data.status}")
    if data.folder:
        log(db, user.name, f"{'Archived' if data.folder == 'archived' else 'Restored'} “{q.subject}”")
    db.commit()
    return q


@router.delete("/inquiries/{iid}", status_code=204)
def delete_inquiry(iid: int, db: Session = Depends(get_db), user: User = Depends(staff)):
    q = db.get(Inquiry, iid)
    if not q:
        raise HTTPException(404, "Message not found")
    db.delete(q)
    log(db, user.name, f"Deleted inquiry “{q.subject}”")
    db.commit()


def _send(db: Session, user: User, *, to: str, to_name: str, subject: str, body: str, inquiry_id: int | None) -> OutboundEmail:
    s = site_settings(db)
    delivered, error = send_email(to=to, to_name=to_name, subject=subject, body=body, from_name=s["company_name"], reply_to=s["mail_from"])
    e = OutboundEmail(inquiry_id=inquiry_id, from_email=s["mail_from"], to_email=to, to_name=to_name, subject=subject, body=body,
                      sent_by=user.name, delivered=delivered, error=error)
    db.add(e)
    return e


@router.post("/inquiries/{iid}/reply", response_model=EmailOut)
def reply(iid: int, data: ReplyIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    q = db.get(Inquiry, iid)
    if not q:
        raise HTTPException(404, "Message not found")
    subject = q.subject if q.subject.lower().startswith("re:") else f"Re: {q.subject}"
    e = _send(db, user, to=q.email, to_name=q.name, subject=subject, body=data.body, inquiry_id=q.id)
    q.status, q.read = "replied", True
    log(db, user.name, f"Replied to {q.name}" + ("" if e.delivered else " (not delivered)"))
    db.commit()
    return e


@router.post("/send", response_model=EmailOut)
def compose(data: ComposeIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    e = _send(db, user, to=data.to, to_name=data.to_name, subject=data.subject, body=data.body, inquiry_id=None)
    log(db, user.name, f"Sent email “{data.subject}” to {data.to}")
    db.commit()
    return e


@router.get("/sent", response_model=list[EmailOut])
def sent(q: str | None = None, db: Session = Depends(get_db), _: User = Depends(staff)):
    stmt = select(OutboundEmail).order_by(OutboundEmail.created_at.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(OutboundEmail.to_email.ilike(like), OutboundEmail.subject.ilike(like), OutboundEmail.body.ilike(like)))
    return db.scalars(stmt.limit(500)).all()
