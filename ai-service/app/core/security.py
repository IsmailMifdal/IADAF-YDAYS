"""Trust boundary between the frontend and this service.

End-user authentication lives in the frontend (Auth.js). For every call it
signs a short-lived HS256 JWT with ``INTERNAL_JWT_SECRET``:

* ``iss=iadaf-frontend``, ``aud=iadaf-backend``, 60-second expiry;
* ``sub`` — the signed-in account id, absent for an anonymous visitor;
* ``scope`` — an extra right such as ``account:erase``, only ever set by the
  frontend server itself, never on a call relayed from the browser.

The gateway already rejects calls without a valid token; checking it again
here means reaching port 8086 directly gets nowhere either.
"""

from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings

ISSUER = "iadaf-frontend"
AUDIENCE = "iadaf-backend"
ERASE_SCOPE = "account:erase"

# HS256 needs a 256-bit key.
MIN_SECRET_BYTES = 32


def check_secret() -> None:
    """Refuse to start with a missing or guessable signing key."""
    if len(settings.internal_jwt_secret.encode()) < MIN_SECRET_BYTES:
        raise RuntimeError("INTERNAL_JWT_SECRET is missing or shorter than 32 bytes")


async def frontend_claims(authorization: Optional[str] = Header(default=None)) -> dict:
    """Verified claims of the caller's token; 401 if absent or invalid."""
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing token.")
    try:
        return jwt.decode(
            token,
            settings.internal_jwt_secret,
            algorithms=["HS256"],  # never let the token pick its algorithm
            issuer=ISSUER,
            audience=AUDIENCE,
            leeway=60,
            options={"require": ["exp", "iss", "aud"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token.") from None


async def current_user_id(claims: dict = Depends(frontend_claims)) -> Optional[str]:
    """The signed-in account id, or None for an anonymous visitor."""
    return claims.get("sub") or None


def require_erase_right(user_id: str, claims: dict) -> None:
    """Erasure needs the dedicated scope, for that very account."""
    if claims.get("scope") != ERASE_SCOPE or claims.get("sub") != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden.")
