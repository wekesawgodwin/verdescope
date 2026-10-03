from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..db import get_db
from ..deps import current_user, log, staff, stakeholder_only
from ..models import Activity, Announcement, Document, Event, Inquiry, Media, PageView, Post, Project, User
from ..schemas import ActivityOut, AnnouncementOut, DocumentOut, EmailOut, InquiryOut, ProjectOut, StakeholderMessageIn

router = APIRouter(tags=["portal"])


# ---------- Staff dashboard ----------
def _month_starts(n: int) -> list[date]:
    t = date.today().replace(day=1)
    out = []
    for i in range(n - 1, -1, -1):
        y, m = t.year, t.month - i
        while m <= 0:
            m += 12
            y -= 1
        out.append(date(y, m, 1))
    return out


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(staff)):
    months = _month_starts(12)
    rows = db.execute(select(PageView.day, PageView.count).where(PageView.day >= months[0])).all()
    totals = {m: 0 for m in months}
    for day, count in rows:
        totals[day.replace(day=1)] += count
    count = lambda model, *w: db.scalar(select(func.count()).select_from(model).where(*w))  # noqa: E731
    by_service = db.execute(select(Inquiry.service, func.count()).group_by(Inquiry.service).order_by(func.count().desc())).all()
    latest = db.scalars(select(Inquiry).where(Inquiry.folder == "inbox").order_by(Inquiry.created_at.desc()).limit(5)).all()
    projects = db.scalars(select(Project)).all()
    return {
        "visits": [{"month": m.strftime("%b"), "year": m.year, "value": totals[m]} for m in months],
        "inquiries": {"open": count(Inquiry, Inquiry.folder == "inbox", Inquiry.status.in_(["new", "in-progress"])),
                      "unread": count(Inquiry, Inquiry.folder == "inbox", Inquiry.read.is_(False)), "total": count(Inquiry)},
        "posts": {"published": count(Post, Post.status == "published"), "drafts": count(Post, Post.status != "published")},
        "gallery": {"events": count(Event), "media": count(Media)},
        "users": {"active": count(User, User.active.is_(True)), "stakeholders": count(User, User.role == "stakeholder")},
        "projects": {"count": len(projects), "avg_progress": round(sum(p.progress for p in projects) / len(projects)) if projects else 0},
        "by_service": [{"label": s or "General", "value": c} for s, c in by_service],
        "latest": [InquiryOut.model_validate(x) for x in latest],
        "activity": [ActivityOut.model_validate(x) for x in db.scalars(select(Activity).order_by(Activity.created_at.desc()).limit(7))] if user.role == "admin" else [],
    }


# ---------- Stakeholder ----------
@router.get("/me/overview")
def overview(db: Session = Depends(get_db), user: User = Depends(stakeholder_only)):
    return {
        "projects": [ProjectOut.model_validate(p) for p in db.scalars(select(Project).where(Project.org == user.org).order_by(Project.due))],
        "documents": [DocumentOut.model_validate(d) for d in db.scalars(select(Document).where(Document.org == user.org).order_by(Document.created_at.desc()))],
        "announcements": [AnnouncementOut.model_validate(a) for a in db.scalars(select(Announcement).order_by(Announcement.date.desc()).limit(5))],
        "messages": db.scalar(select(func.count()).select_from(Inquiry).where(Inquiry.user_id == user.id)),
        "answered": db.scalar(select(func.count()).select_from(Inquiry).where(Inquiry.user_id == user.id, Inquiry.status.in_(["replied", "closed"]))),
    }


@router.get("/me/messages")
def my_messages(db: Session = Depends(get_db), user: User = Depends(stakeholder_only)):
    msgs = db.scalars(select(Inquiry).options(selectinload(Inquiry.replies)).where(Inquiry.user_id == user.id).order_by(Inquiry.created_at.desc())).all()
    return [{**InquiryOut.model_validate(m).model_dump(), "replies": [EmailOut.model_validate(r) for r in m.replies]} for m in msgs]


@router.post("/me/messages", status_code=201)
def send_message(data: StakeholderMessageIn, db: Session = Depends(get_db), user: User = Depends(stakeholder_only)):
    q = Inquiry(source="stakeholder", name=user.org or user.name, email=user.email, org=user.org, service="Project update",
                subject=f"[{data.project}] {data.subject}", message=data.message, user_id=user.id)
    db.add(q)
    log(db, user.name, f"Sent a message: “{q.subject}”")
    db.commit()
    return {"ok": True, "id": q.id}


# ---------- Document download (stakeholder: own org only) ----------
@router.get("/documents/{did}/download")
def download(did: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = db.get(Document, did)
    if not d or (user.role == "stakeholder" and d.org != user.org) or user.role == "manager":
        raise HTTPException(404, "Document not found")
    log(db, user.name, f"Downloaded {d.name}")
    db.commit()
    path = Path(get_settings().upload_dir) / d.stored_path if d.stored_path else None
    if path and path.is_file():
        return FileResponse(path, media_type=d.content_type, filename=d.name)
    # Seeded demo documents have no file behind them
    return PlainTextResponse(
        f"{d.name}\n\nShared with: {d.org}\n\nThis is a placeholder for a demo document. Files uploaded by an administrator are served here.",
        headers={"Content-Disposition": f'attachment; filename="{Path(d.name).stem} (placeholder).txt"'},
    )
