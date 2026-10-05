from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, JSONType

ROLES = ("admin", "manager", "stakeholder")
INQUIRY_STATUSES = ("new", "in-progress", "replied", "closed")


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), index=True)
    org: Mapped[str] = mapped_column(String(200), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SiteSettings(Base):
    """Singleton row (id=1) holding editable company/contact settings."""
    __tablename__ = "site_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    data: Mapped[dict] = mapped_column(JSONType, default=dict)


class Service(Base):
    __tablename__ = "services"
    id: Mapped[int] = mapped_column(primary_key=True)
    num: Mapped[str] = mapped_column(String(4))
    icon: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text)
    items: Mapped[list] = mapped_column(JSONType, default=list)
    image: Mapped[str] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class TeamMember(Base):
    """Internal staff directory for the portal. Never returned by public endpoints."""
    __tablename__ = "team_members"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(300))
    bio: Mapped[str] = mapped_column(Text, default="")
    years: Mapped[str] = mapped_column(String(20), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Expertise(Base):
    """Technical expertise the firm offers, grouped by sector (no individual staff are published)."""
    __tablename__ = "expertise"
    id: Mapped[int] = mapped_column(primary_key=True)
    sector: Mapped[str] = mapped_column(String(200))
    icon: Mapped[str] = mapped_column(String(40))
    summary: Mapped[str] = mapped_column(Text, default="")
    disciplines: Mapped[list] = mapped_column(JSONType, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Assignment(Base):
    __tablename__ = "assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    client: Mapped[str] = mapped_column(String(300))
    year: Mapped[int] = mapped_column(Integer, index=True)
    location: Mapped[str] = mapped_column(String(120))
    type: Mapped[str] = mapped_column(String(40))


class Post(TimestampMixin, Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    category: Mapped[str] = mapped_column(String(100), index=True)
    author: Mapped[str] = mapped_column(String(200))
    date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    image: Mapped[str] = mapped_column(String(500), default="")
    excerpt: Mapped[str] = mapped_column(Text, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Event(TimestampMixin, Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    date: Mapped[date] = mapped_column(Date, index=True)
    location: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, default="")
    sample: Mapped[bool] = mapped_column(Boolean, default=False)
    media: Mapped[list["Media"]] = relationship(back_populates="event", cascade="all, delete-orphan", order_by="Media.sort_order")


class Media(Base):
    __tablename__ = "media"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(10))  # image | video
    src: Mapped[str] = mapped_column(String(500))
    poster: Mapped[str] = mapped_column(String(500), default="")
    caption: Mapped[str] = mapped_column(String(300), default="")
    credit: Mapped[str] = mapped_column(String(200), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    event: Mapped[Event] = relationship(back_populates="media")


class Inquiry(TimestampMixin, Base):
    __tablename__ = "inquiries"
    id: Mapped[int] = mapped_column(primary_key=True)
    folder: Mapped[str] = mapped_column(String(20), default="inbox", index=True)  # inbox | archived
    source: Mapped[str] = mapped_column(String(20), default="website")  # website | stakeholder
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(50), default="")
    org: Mapped[str] = mapped_column(String(200), default="")
    service: Mapped[str] = mapped_column(String(200), default="General")
    subject: Mapped[str] = mapped_column(String(300))
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="new")
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    replies: Mapped[list["OutboundEmail"]] = relationship(back_populates="inquiry", order_by="OutboundEmail.created_at")


class OutboundEmail(TimestampMixin, Base):
    """Every email sent from the company mailbox: replies (inquiry_id set) and new messages."""
    __tablename__ = "outbound_emails"
    id: Mapped[int] = mapped_column(primary_key=True)
    inquiry_id: Mapped[int | None] = mapped_column(ForeignKey("inquiries.id", ondelete="SET NULL"), index=True)
    from_email: Mapped[str] = mapped_column(String(255))
    to_email: Mapped[str] = mapped_column(String(255))
    to_name: Mapped[str] = mapped_column(String(200), default="")
    subject: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)
    sent_by: Mapped[str] = mapped_column(String(200), default="")
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    error: Mapped[str] = mapped_column(Text, default="")
    inquiry: Mapped[Inquiry | None] = relationship(back_populates="replies")


class Project(TimestampMixin, Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    org: Mapped[str] = mapped_column(String(200), index=True)
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(40), default="Planning")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    start: Mapped[date | None] = mapped_column(Date)
    due: Mapped[date | None] = mapped_column(Date)
    lead: Mapped[str] = mapped_column(String(200), default="")
    milestones: Mapped[list] = mapped_column(JSONType, default=list)  # [{"t": str, "done": bool}]


class Document(TimestampMixin, Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    org: Mapped[str] = mapped_column(String(200), index=True)
    name: Mapped[str] = mapped_column(String(300))
    size: Mapped[int] = mapped_column(Integer, default=0)
    content_type: Mapped[str] = mapped_column(String(120), default="application/octet-stream")
    stored_path: Mapped[str] = mapped_column(String(500), default="")


class Announcement(TimestampMixin, Base):
    __tablename__ = "announcements"
    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)


class Activity(TimestampMixin, Base):
    __tablename__ = "activity"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_name: Mapped[str] = mapped_column(String(200))
    action: Mapped[str] = mapped_column(Text)


class PageView(Base):
    """Daily page-view counters (one row per day+page)."""
    __tablename__ = "page_views"
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    page: Mapped[str] = mapped_column(String(60), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
