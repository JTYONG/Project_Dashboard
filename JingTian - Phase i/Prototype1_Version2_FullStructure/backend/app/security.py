"""EVA SQUARE — password hashing + bearer session tokens.

Deliberately dependency-free (stdlib `hashlib`/`secrets` only) so the basis
version has zero native-build dependencies. Before a real web deployment,
swap `hash_password`/`verify_password` for a vetted library (passlib/argon2)
and consider short-lived JWTs with refresh instead of the long-lived opaque
bearer tokens used here — both are drop-in replacements for these two
functions and the Session model, nothing else in the app needs to change.
"""
import hashlib
import hmac
import secrets
import datetime as dt

PBKDF2_ITERATIONS = 260_000
SESSION_TTL_DAYS = 30


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, iterations, salt, hex_digest = stored_hash.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(digest.hex(), hex_digest)
    except Exception:
        return False


def new_session_token() -> str:
    return secrets.token_hex(32)


def session_expiry() -> dt.datetime:
    return dt.datetime.utcnow() + dt.timedelta(days=SESSION_TTL_DAYS)
