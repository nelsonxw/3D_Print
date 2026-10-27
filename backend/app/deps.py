from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Job, User
from app.security import decode_user_id

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    user_id = decode_user_id(credentials.credentials)
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise unauthorized
    return user


def get_owned_job(job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Job:
    job = db.get(Job, job_id)
    if job is None or job.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return job
