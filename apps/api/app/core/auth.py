from datetime import datetime, timedelta
from jose import jwt
from fastapi import HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .config import settings
from ..db.session import get_session
from .. import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login", auto_error=False)

class CurrentUser(BaseModel):
    username: str
    role: str = "user"
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=8)
    to_encode.update({"exp": expire})
    encoded = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_session)
) -> CurrentUser:
    """Get current authenticated user from JWT token"""
    # Try to get token from cookie first, then fall back to Authorization header
    if not token:
        token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("username")
        user_id: str = payload.get("user_id")
        
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        # Fetch user from database to get current role and status
        if user_id:
            result = await db.execute(
                select(models.User).where(models.User.id == user_id)
            )
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return CurrentUser(
                    username=user.username,
                    role=user.role,
                    user_id=str(user.id),
                    tenant_id=user.tenant_id
                )
        
        # Fallback to token data (for backward compatibility with old tokens)
        role: str = payload.get("role", "user")
        # Try to get tenant_id from token if available
        tenant_id: Optional[str] = payload.get("tenant_id")
        return CurrentUser(username=username, role=role, user_id=user_id, tenant_id=tenant_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

