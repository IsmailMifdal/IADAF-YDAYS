"""Security placeholder — authentication has been removed.

Keycloak / JWT validation was previously configured here.
This module is kept as a no-op so existing imports don't break.
"""

from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[dict]:
    """No-op user extraction — always returns None (authentication disabled)."""
    return None
