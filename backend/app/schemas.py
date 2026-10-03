from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth & users ----------
Role = Literal["admin", "manager", "stakeholder"]


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORM):
    id: int
    name: str
    email: str
    role: Role
    org: str
    active: bool
    last_login: datetime | None


class TokenOut(BaseModel):
    token: str
    user: UserOut


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    role: Role
    org: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    role: Role
    org: str = Field(min_length=1, max_length=200)
    active: bool = True
    password: str | None = None


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class PasswordChange(BaseModel):
    current: str
    new: str = Field(min_length=6)


# ---------- Content ----------
class ServiceIn(BaseModel):
    title: str
    summary: str
    items: list[str]
    image: str


class ServiceOut(ORM):
    id: int
    num: str
    icon: str
    title: str
    summary: str
    items: list[str]
    image: str


class TeamOut(ORM):
    id: int
    name: str
    role: str
    bio: str
    years: str


class AssignmentOut(ORM):
    id: int
    title: str
    client: str
    year: int
    location: str
    type: str


class PostIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    category: str = Field(min_length=1, max_length=100)
    author: str = ""
    date: date
    status: Literal["draft", "published"] = "draft"
    image: str = ""
    excerpt: str = ""
    body: str = ""


class PostOut(ORM):
    id: int
    slug: str
    title: str
    category: str
    author: str
    date: date
    status: str
    image: str
    excerpt: str
    body: str


class MediaIO(ORM):
    type: Literal["image", "video"]
    src: str
    poster: str = ""
    caption: str = ""
    credit: str = ""


class EventIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    date: date
    location: str
    category: str
    description: str = ""
    sample: bool = False
    media: list[MediaIO] = []


class EventOut(ORM):
    id: int
    title: str
    date: date
    location: str
    category: str
    description: str
    sample: bool
    media: list[MediaIO]


class AnnouncementOut(ORM):
    id: int
    date: date
    title: str
    body: str


# ---------- Inquiries & mail ----------
class InquiryIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str = Field("", max_length=50)
    org: str = Field("", max_length=200)
    service: str = Field("", max_length=200)
    subject: str = Field("", max_length=300)
    message: str = Field(min_length=1, max_length=10000)
    website: str = ""  # honeypot: real users never fill this


class EmailOut(ORM):
    id: int
    inquiry_id: int | None
    from_email: str
    to_email: str
    to_name: str
    subject: str
    body: str
    sent_by: str
    delivered: bool
    error: str
    created_at: datetime


class InquiryOut(ORM):
    id: int
    folder: str
    source: str
    name: str
    email: str
    phone: str
    org: str
    service: str
    subject: str
    message: str
    read: bool
    status: str
    created_at: datetime


class InquiryDetail(InquiryOut):
    replies: list[EmailOut]


class InquiryPatch(BaseModel):
    status: Literal["new", "in-progress", "replied", "closed"] | None = None
    folder: Literal["inbox", "archived"] | None = None
    read: bool | None = None


class ReplyIn(BaseModel):
    body: str = Field(min_length=1)


class ComposeIn(BaseModel):
    to: EmailStr
    to_name: str = ""
    subject: str = Field(min_length=1, max_length=300)
    body: str = Field(min_length=1)


class StakeholderMessageIn(BaseModel):
    project: str = "General"
    subject: str = Field(min_length=1, max_length=250)
    message: str = Field(min_length=1, max_length=10000)


# ---------- Projects & documents ----------
class Milestone(BaseModel):
    t: str
    done: bool = False


class ProjectIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    org: str
    status: str = "Planning"
    progress: int = Field(0, ge=0, le=100)
    start: date | None = None
    due: date | None = None
    lead: str = ""
    milestones: list[Milestone] = []


class ProjectOut(ORM):
    id: int
    title: str
    org: str
    status: str
    progress: int
    start: date | None
    due: date | None
    lead: str
    milestones: list[Milestone]


class DocumentOut(ORM):
    id: int
    project_id: int | None
    org: str
    name: str
    size: int
    created_at: datetime


class ActivityOut(ORM):
    id: int
    user_name: str
    action: str
    created_at: datetime


class TrackIn(BaseModel):
    page: str = Field(max_length=60)
