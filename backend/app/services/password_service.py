# backend/app/services/password_service.py
from passlib.context import CryptContext

# Use bcrypt for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)



def get_password_hash(password: str) -> str:
    """Hashes a plain-text password."""
    return pwd_context.hash(password)