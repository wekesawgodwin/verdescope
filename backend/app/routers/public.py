from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..deps import log
from ..models import Assignment, Event, Inquiry, PageView, Post, Service, TeamMember
from ..schemas import AssignmentOut, EventOut, InquiryIn, PostOut, ServiceOut, TeamOut, TrackIn
from .common import PUBLIC_KEYS, site_settings

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/site")
def site(db: Session = Depends(get_db)):
    """Everything the public pages need in one request (cacheable by the service worker)."""
    s = site_settings(db)
    return {
        "settings": {k: s[k] for k in PUBLIC_KEYS},
        "services": [ServiceOut.model_validate(x) for x in db.scalars(select(Service).order_by(Service.sort_order))],
        "team": [TeamOut.model_validate(x) for x in db.scalars(select(TeamMember).order_by(TeamMember.sort_order))],
        "assignments": [AssignmentOut.model_validate(x) for x in db.scalars(select(Assignment).order_by(Assignment.year.desc(), Assignment.id))],
    }


@router.get("/posts", response_model=list[PostOut])
def posts(category: str | None = None, q: str | None = None, limit: int = Query(50, le=100), db: Session = Depends(get_db)):
    stmt = select(Post).where(Post.status == "published").order_by(Post.date.desc())
    if category:
        stmt = stmt.where(Post.category == category)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Post.title.ilike(like), Post.excerpt.ilike(like), Post.body.ilike(like)))
    return db.scalars(stmt.limit(limit)).all()


@router.get("/posts/{slug}", response_model=PostOut)
def post(slug: str, db: Session = Depends(get_db)):
    p = db.scalar(select(Post).where(Post.slug == slug, Post.status == "published"))
    if not p:
        raise HTTPException(404, "Article not found")
    return p


@router.get("/events", response_model=list[EventOut])
def events(db: Session = Depends(get_db)):
    return db.scalars(select(Event).options(selectinload(Event.media)).order_by(Event.date.desc())).all()


@router.post("/inquiries", status_code=status.HTTP_201_CREATED)
def submit_inquiry(data: InquiryIn, db: Session = Depends(get_db)):
    if data.website:  # honeypot tripped: pretend success, store nothing
        return {"ok": True}
    q = Inquiry(name=data.name, email=data.email, phone=data.phone, org=data.org, service=data.service or "General inquiry",
                subject=data.subject or "Website inquiry", message=data.message, source="website")
    db.add(q)
    log(db, data.name, f"Sent an inquiry: “{q.subject}”")
    db.commit()
    return {"ok": True, "id": q.id}


@router.post("/track", status_code=status.HTTP_204_NO_CONTENT)
def track(data: TrackIn, db: Session = Depends(get_db)):
    today = date.today()
    row = db.get(PageView, (today, data.page))
    if row:
        row.count += 1
    else:
        db.add(PageView(day=today, page=data.page, count=1))
    db.commit()
