import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import admin_only, log
from ..models import Activity, Document, Event, Inquiry, OutboundEmail, Post, Project, Service, SiteSettings, User
from ..schemas import ActivityOut, DocumentOut, EventOut, InquiryOut, PostOut, ProjectIn, ProjectOut, ServiceOut, UserCreate, UserOut, UserUpdate
from ..security import hash_password
from .common import DEFAULT_SETTINGS, site_settings
from .content import save_limited

router = APIRouter(tags=["admin"])


# ---------- Users ----------
@router.get("/users", response_model=list[UserOut])
def users(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return db.scalars(select(User).order_by(User.role, User.name)).all()


def _email_taken(db: Session, email: str, exclude: int | None = None) -> bool:
    stmt = select(User.id).where(func.lower(User.email) == email.lower())
    if exclude:
        stmt = stmt.where(User.id != exclude)
    return db.scalar(stmt) is not None


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    if _email_taken(db, data.email):
        raise HTTPException(409, "A user with this email already exists.")
    u = User(name=data.name, email=data.email.lower(), role=data.role, org=data.org, password_hash=hash_password(data.password), active=True)
    db.add(u)
    log(db, admin.name, f"Created user {u.name} ({u.role})")
    db.commit()
    return u


@router.put("/users/{uid}", response_model=UserOut)
def update_user(uid: int, data: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if _email_taken(db, data.email, exclude=uid):
        raise HTTPException(409, "A user with this email already exists.")
    if u.id == admin.id and (data.role != "admin" or not data.active):
        raise HTTPException(400, "You cannot remove your own admin access.")
    u.name, u.email, u.role, u.org, u.active = data.name, data.email.lower(), data.role, data.org, data.active
    if data.password:
        if len(data.password) < 6:
            raise HTTPException(422, "Password must be at least 6 characters.")
        u.password_hash = hash_password(data.password)
    log(db, admin.name, f"Updated user {u.name}")
    db.commit()
    return u


@router.delete("/users/{uid}", status_code=204)
def delete_user(uid: int, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.id == admin.id:
        raise HTTPException(400, "You cannot delete your own account.")
    db.delete(u)
    log(db, admin.name, f"Deleted user {u.name}")
    db.commit()


# ---------- Stakeholder projects ----------
@router.get("/projects", response_model=list[ProjectOut])
def projects(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return db.scalars(select(Project).order_by(Project.org, Project.due)).all()


@router.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(data: ProjectIn, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    p = Project(**data.model_dump())
    db.add(p)
    log(db, admin.name, f"Created project “{p.title}”")
    db.commit()
    return p


@router.put("/projects/{pid}", response_model=ProjectOut)
def update_project(pid: int, data: ProjectIn, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(404, "Project not found")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    log(db, admin.name, f"Updated project “{p.title}” ({p.progress}%)")
    db.commit()
    return p


@router.delete("/projects/{pid}", status_code=204)
def delete_project(pid: int, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(404, "Project not found")
    db.delete(p)
    log(db, admin.name, f"Deleted project “{p.title}”")
    db.commit()


# ---------- Documents ----------
@router.get("/documents", response_model=list[DocumentOut])
def documents(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return db.scalars(select(Document).order_by(Document.created_at.desc())).all()


@router.post("/documents", response_model=DocumentOut, status_code=201)
def upload_document(project_id: int = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    s = get_settings()
    dest_dir = Path(s.upload_dir) / "private" / "documents"
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^\w.\- ]+", "_", file.filename or "document")[:150]
    dest = dest_dir / f"{uuid.uuid4().hex}_{safe}"
    size = save_limited(file, dest, s.max_upload_mb)
    d = Document(project_id=p.id, org=p.org, name=file.filename or safe, size=size,
                 content_type=file.content_type or "application/octet-stream", stored_path=str(dest.relative_to(s.upload_dir)))
    db.add(d)
    log(db, admin.name, f"Shared {d.name} with {p.org}")
    db.commit()
    return d


@router.delete("/documents/{did}", status_code=204)
def delete_document(did: int, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    d = db.get(Document, did)
    if not d:
        raise HTTPException(404, "Document not found")
    if d.stored_path:
        (Path(get_settings().upload_dir) / d.stored_path).unlink(missing_ok=True)
    db.delete(d)
    log(db, admin.name, f"Removed document {d.name}")
    db.commit()


# ---------- Settings ----------
@router.get("/settings")
def get_site_settings(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    s = get_settings()
    return {**site_settings(db), "_email_provider": s.email_provider or "", "_mail_from_env": s.mail_from or ""}


@router.put("/settings")
def put_site_settings(data: dict, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    clean = {k: data[k] for k in DEFAULT_SETTINGS if k in data}
    row = db.get(SiteSettings, 1)
    if row:
        row.data = {**row.data, **clean}
    else:
        db.add(SiteSettings(id=1, data=clean))
    log(db, admin.name, "Updated site settings")
    db.commit()
    return site_settings(db)


# ---------- Activity & export ----------
@router.get("/activity", response_model=list[ActivityOut])
def activity(limit: int = 300, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return db.scalars(select(Activity).order_by(Activity.created_at.desc()).limit(min(limit, 1000))).all()


@router.get("/admin/export")
def export(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    log(db, admin.name, "Exported data")
    db.commit()
    data = {
        "settings": site_settings(db),
        "services": [ServiceOut.model_validate(x).model_dump(mode="json") for x in db.scalars(select(Service))],
        "posts": [PostOut.model_validate(x).model_dump(mode="json") for x in db.scalars(select(Post))],
        "events": [EventOut.model_validate(x).model_dump(mode="json") for x in db.scalars(select(Event))],
        "inquiries": [InquiryOut.model_validate(x).model_dump(mode="json") for x in db.scalars(select(Inquiry))],
        "sent": [{"to": e.to_email, "subject": e.subject, "body": e.body, "date": e.created_at.isoformat()} for e in db.scalars(select(OutboundEmail))],
        "users": [UserOut.model_validate(x).model_dump(mode="json") for x in db.scalars(select(User))],
        "projects": [ProjectOut.model_validate(x).model_dump(mode="json") for x in db.scalars(select(Project))],
    }
    return JSONResponse(data, headers={"Content-Disposition": "attachment; filename=verdescope-export.json"})
