"""Optional JWT validation for Keycloak-issued tokens.

For development purposes authentication is not enforced by default.
Set the KEYCLOAK_ISSUER_URI environment variable and use the
``get_current_user`` dependency in routes that should be protected.

SECURITY NOTE: The current implementation decodes the JWT without verifying
the signature (``get_unverified_claims``). This is intentional for the dev
environment so the service can start without a running Keycloak instance.
Before going to production, replace this with full JWKS-based verification
by fetching public keys from the Keycloak JWKS endpoint.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings  # noqa: F401  (imported for future use)

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[dict]:
    """Extract claims from a JWT bearer token (development mode — no signature check).

    Returns the decoded payload when a token is present,
    ``None`` when no token is provided.

    Raises:
        HTTPException: 401 when the token cannot be decoded at all.

    .. warning::
        Signature is NOT verified in this implementation. For production,
        use a proper JWKS-backed verifier.
    """
    if credentials is None:
        return None

    token = credentials.credentials

    try:
        from jose import JWTError, jwt  # type: ignore

        payload: dict = jwt.get_unverified_claims(token)
        return payload
    except (JWTError, Exception) as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
