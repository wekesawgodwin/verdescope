from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import current_user, log
from ..models import User
from ..schemas import LoginIn, PasswordChange, ProfileUpdate, TokenOut, UserOut
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password.")
    if not user.active:
        raise HTTPException(403, "This account has been deactivated. Contact the administrator.")
    user.last_login = datetime.now(UTC)
    log(db, user.name, "Signed in")
    db.commit()
    return {"token": create_token(user.id, user.role), "user": user}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.name = data.name
    db.commit()
    return user


@router.post("/password", status_code=204)
def change_password(data: PasswordChange, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current, user.password_hash):
        raise HTTPException(400, "Current password is incorrect.")
    user.password_hash = hash_password(data.new)
    log(db, user.name, "Changed password")
    db.commit()
