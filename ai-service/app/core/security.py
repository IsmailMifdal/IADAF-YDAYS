"""Trust boundary between the frontend and this service.

End-user authentication lives in the frontend (Auth.js). The frontend proxies
calls server-side and, for a signed-in user, adds two headers:

* ``X-Internal-Token`` — the secret shared through ``INTERNAL_API_TOKEN``;
* ``X-User-Id`` — the account id taken from the verified session.

``X-User-Id`` is only honoured alongside a valid token: the gateway is
reachable directly, so anyone could otherwise claim to be any user.
"""

import hmac
from typing import Optional

from fastapi import Header, HTTPException, status

from app.core.config import settings


def _token_is_valid(token: Optional[str]) -> bool:
    expected = settings.internal_api_token
    # An unset secret must never match an absent header.
    if not expected or not token:
        return False
    return hmac.compare_digest(token.encode(), expected.encode())


async def trusted_user_id(
    x_internal_token: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Optional[str]:
    """Return the caller's account id if the frontend vouched for it, else None."""
    if x_user_id and _token_is_valid(x_internal_token):
        return x_user_id
    return None


async def require_internal_caller(
    x_internal_token: Optional[str] = Header(default=None),
) -> None:
    """Reject any call that does not come from the frontend server."""
    if not settings.internal_api_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="INTERNAL_API_TOKEN is not configured.",
        )
    if not _token_is_valid(x_internal_token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
