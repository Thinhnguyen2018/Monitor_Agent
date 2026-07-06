import os, base64
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
import models
from database import get_db

AUTH_DISABLED = os.getenv("AUTH_DISABLED", "").lower() in ("1", "true", "yes")
DEV_ORG_ID = 1  # used when AUTH_DISABLED=true

# ── JWT verification (Clerk) ──────────────────────────────────

def _get_jwks_url() -> str:
    pk = os.getenv("CLERK_PUBLISHABLE_KEY", "")
    if not pk:
        return os.getenv("CLERK_JWKS_URL", "")
    try:
        prefix = "pk_test_" if "pk_test_" in pk else "pk_live_"
        encoded = pk.replace(prefix, "")
        padded = encoded + "=" * (-len(encoded) % 4)
        decoded = base64.b64decode(padded).decode().rstrip("$")
        return f"https://{decoded}/.well-known/jwks.json"
    except Exception:
        return os.getenv("CLERK_JWKS_URL", "")

_jwks_client = None

def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        url = _get_jwks_url()
        if url:
            from jwt import PyJWKClient
            _jwks_client = PyJWKClient(url, cache_keys=True)
    return _jwks_client

def _verify_token(token: str) -> dict:
    import jwt as pyjwt
    client = _get_jwks_client()
    if not client:
        raise HTTPException(status_code=500, detail="CLERK_PUBLISHABLE_KEY not configured")
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        return pyjwt.decode(token, signing_key.key, algorithms=["RS256"])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

# ── Dependencies ──────────────────────────────────────────────

async def get_current_user_id(authorization: str | None = Header(None)) -> str:
    if AUTH_DISABLED:
        return "dev_user"
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.split(" ", 1)[1]
    payload = _verify_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub claim")
    return user_id

async def get_current_org(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> models.Organization:
    if AUTH_DISABLED:
        # Ensure a dev org exists
        org = db.query(models.Organization).filter(models.Organization.id == DEV_ORG_ID).first()
        if not org:
            org = models.Organization(
                id=DEV_ORG_ID,
                name="Dev Workspace",
                slug="dev",
                owner_clerk_user_id="dev_user",
            )
            db.add(org)
            db.commit()
            db.refresh(org)
        return org

    # Find user's org
    member = db.query(models.OrgMember).filter(
        models.OrgMember.clerk_user_id == user_id
    ).first()

    if not member:
        # Auto-create org on first login
        slug = user_id.replace("user_", "")[:30]
        org = models.Organization(
            name="My Workspace",
            slug=slug,
            owner_clerk_user_id=user_id,
        )
        db.add(org)
        db.flush()
        member = models.OrgMember(org_id=org.id, clerk_user_id=user_id, role="owner")
        db.add(member)
        db.commit()
        db.refresh(org)
        return org

    return db.query(models.Organization).filter(
        models.Organization.id == member.org_id
    ).first()
