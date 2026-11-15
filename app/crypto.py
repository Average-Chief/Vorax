"""Symmetric encryption utilities for sensitive data at rest (upstream agent credentials)."""

import base64
import hashlib
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

logger = logging.getLogger(__name__)

_fernet_instance: Optional[Fernet] = None

def _get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    raw_key = settings.CREDENTIAL_ENCRYPTION_KEY
    if raw_key:
        try:
            _fernet_instance = Fernet(raw_key.encode() if isinstance(raw_key, str) else raw_key)
            return _fernet_instance
        except Exception as e:
            logger.warning("Invalid CREDENTIAL_ENCRYPTION_KEY provided; falling back to derived key: %s", e)

    # Derive deterministic Fernet key using SHA-256 of ADMIN_KEY + static salt
    seed = (settings.ADMIN_KEY or "a2a-gateway-default-seed").encode("utf-8") + b":credential-encryption-salt"
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(seed).digest())
    _fernet_instance = Fernet(derived_key)
    return _fernet_instance

def encrypt_credential(plaintext: Optional[str]) -> Optional[str]:
    """Encrypts an upstream credential string using Fernet.
    
    Returns token formatted with prefix 'enc:v1:<fernet_token>'.
    """
    if not plaintext:
        return plaintext
    
    # Don't re-encrypt if already encrypted
    if plaintext.startswith("enc:v1:"):
        return plaintext

    f = _get_fernet()
    token = f.encrypt(plaintext.encode("utf-8")).decode("ascii")
    return f"enc:v1:{token}"

def decrypt_credential(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypts an encrypted upstream credential string.
    
    If ciphertext does not start with 'enc:v1:', it is treated as a legacy plaintext
    credential and returned verbatim for backward compatibility.
    """
    if not ciphertext:
        return ciphertext

    if not ciphertext.startswith("enc:v1:"):
        # Legacy plaintext credential
        return ciphertext

    token = ciphertext[len("enc:v1:"):]
    f = _get_fernet()
    try:
        decrypted = f.decrypt(token.encode("ascii")).decode("utf-8")
        return decrypted
    except InvalidToken:
        logger.error("Failed to decrypt upstream credential: Invalid token or mismatched encryption key")
        return None
    except Exception as e:
        logger.error("Unexpected error decrypting upstream credential: %s", e)
        return None

