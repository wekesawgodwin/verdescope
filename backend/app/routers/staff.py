"""Staff directory for the portal (managers and admins only).
Staff are deliberately not exposed by any /api/public endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import log, staff
from ..models import TeamMember, User
from ..schemas import StaffIn, StaffOut

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=list[StaffOut])
def list_staff(db: Session = Depends(get_db), _: User = Depends(staff)):
    return db.scalars(select(TeamMember).order_by(TeamMember.sort_order, TeamMember.id)).all()


@router.post("", response_model=StaffOut, status_code=201)
def create_staff(data: StaffIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    m = TeamMember(**data.model_dump())
    db.add(m)
    log(db, user.name, f"Added staff member {m.name}")
    db.commit()
    return m


@router.put("/{mid}", response_model=StaffOut)
def update_staff(mid: int, data: StaffIn, db: Session = Depends(get_db), user: User = Depends(staff)):
    m = db.get(TeamMember, mid)
    if not m:
        raise HTTPException(404, "Staff member not found")
    for k, v in data.model_dump().items():
        setattr(m, k, v)
    log(db, user.name, f"Updated staff member {m.name}")
    db.commit()
    return m


@router.delete("/{mid}", status_code=204)
def delete_staff(mid: int, db: Session = Depends(get_db), user: User = Depends(staff)):
    m = db.get(TeamMember, mid)
    if not m:
        raise HTTPException(404, "Staff member not found")
    db.delete(m)
    log(db, user.name, f"Removed staff member {m.name}")
    db.commit()
