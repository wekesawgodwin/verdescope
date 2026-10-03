import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..db import get_db
from ..deps import log, staff
from ..models import Event, Media, Post, Service, User
from ..schemas import EventIn, EventOut, PostIn, PostOut, ServiceIn, ServiceOut

router = APIRouter(tags=["content"])


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:70] or "post"


# ---------- Posts ----------
@router.get("/posts", response_model=list[PostOut])
def list_posts(db: Session = Depends(get_db), _: User = Depends(staff)):
    return db.scalars(select(Post).order_by(Post.date.desc())).all()


@router.post("/posts", response_model=PostOut, status_code=201)
def create_post(data: PostIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    base, slug, n = slugify(data.title), slugify(data.title), 2
    while db.scalar(select(Post.id).where(Post.slug == slug)):
        slug = f"{base}-{n}"
        n += 1
    p = Post(slug=slug, **data.model_dump())
    p.author = p.author or user.name
    db.add(p)
    log(db, user.name, f"Created post “{p.title}”" + (" (published)" if p.status == "published" else ""))
    db.commit()
    return p


@router.put("/posts/{pid}", response_model=PostOut)
def update_post(pid: int, data: PostIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    p = db.get(Post, pid) or _404("Post")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    log(db, user.name, f"Updated post “{p.title}”")
    db.commit()
    return p


@router.delete("/posts/{pid}", status_code=204)
def delete_post(pid: int, db: Session = Depends(get_db), user: User = Depends(staff)):
    p = db.get(Post, pid) or _404("Post")
    db.delete(p)
    log(db, user.name, f"Deleted post “{p.title}”")
    db.commit()


# ---------- Gallery events ----------
@router.get("/events", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), _: User = Depends(staff)):
    return db.scalars(select(Event).options(selectinload(Event.media)).order_by(Event.date.desc())).all()


def _apply_event(ev: Event, data: EventIn) -> None:
    for k in ("title", "date", "location", "category", "description", "sample"):
        setattr(ev, k, getattr(data, k))
    ev.media = [Media(sort_order=i, **m.model_dump()) for i, m in enumerate(data.media)]


@router.post("/events", response_model=EventOut, status_code=201)
def create_event(data: EventIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    ev = Event()
    _apply_event(ev, data)
    db.add(ev)
    log(db, user.name, f"Created gallery event “{ev.title}”")
    db.commit()
    return ev


@router.put("/events/{eid}", response_model=EventOut)
def update_event(eid: int, data: EventIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    ev = db.get(Event, eid) or _404("Event")
    _apply_event(ev, data)
    log(db, user.name, f"Updated gallery event “{ev.title}”")
    db.commit()
    return ev


@router.delete("/events/{eid}", status_code=204)
def delete_event(eid: int, db: Session = Depends(get_db), user: User = Depends(staff)):
    ev = db.get(Event, eid) or _404("Event")
    db.delete(ev)
    log(db, user.name, f"Deleted gallery event “{ev.title}”")
    db.commit()


# ---------- Services ----------
@router.get("/services", response_model=list[ServiceOut])
def list_services(db: Session = Depends(get_db), _: User = Depends(staff)):
    return db.scalars(select(Service).order_by(Service.sort_order)).all()


@router.put("/services/{sid}", response_model=ServiceOut)
def update_service(sid: int, data: ServiceIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    s = db.get(Service, sid) or _404("Service")
    s.title, s.summary, s.image = data.title, data.summary, data.image
    s.items = [i.strip() for i in data.items if i.strip()]
    log(db, user.name, f"Updated service “{s.title}”")
    db.commit()
    return s


# ---------- Uploads ----------
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}


@router.post("/uploads")
def upload(file: UploadFile = File(...), _: User = Depends(staff)):
    s = get_settings()
    root = Path(s.upload_dir) / "public"
    if file.content_type in IMAGE_TYPES:
        dest_dir = root / "images"
        dest_dir.mkdir(parents=True, exist_ok=True)
        name = f"{uuid.uuid4().hex}.jpg"
        try:
            im = ImageOps.exif_transpose(Image.open(file.file))
        except Exception:
            raise HTTPException(400, "That file is not a valid image.") from None
        im.thumbnail((1800, 1800))
        im.convert("RGB").save(dest_dir / name, "JPEG", quality=82, optimize=True, progressive=True)
        return {"type": "image", "url": f"/uploads/images/{name}"}
    if file.content_type in VIDEO_TYPES:
        dest_dir = root / "videos"
        dest_dir.mkdir(parents=True, exist_ok=True)
        ext = {"video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov"}[file.content_type]
        name = f"{uuid.uuid4().hex}.{ext}"
        save_limited(file, dest_dir / name, s.max_upload_mb)
        return {"type": "video", "url": f"/uploads/videos/{name}"}
    raise HTTPException(415, "Upload a JPG, PNG, WebP image or an MP4/WebM video.")


def save_limited(file: UploadFile, dest: Path, max_mb: int) -> int:
    limit, written = max_mb * 1024 * 1024, 0
    with dest.open("wb") as out:
        while chunk := file.file.read(1024 * 1024):
            written += len(chunk)
            if written > limit:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(413, f"File is larger than {max_mb} MB.")
            out.write(chunk)
    return written


@router.get("/uploads/library")
def library(db: Session = Depends(get_db), _: User = Depends(staff)):
    """Images already used on the site, for reuse in the cover-image picker."""
    urls: list[str] = []
    for u in [*db.scalars(select(Service.image)), *db.scalars(select(Post.image)), *db.scalars(select(Media.src).where(Media.type == "image"))]:
        if u and u not in urls:
            urls.append(u)
    return urls


def _404(what: str):
    raise HTTPException(404, f"{what} not found")

