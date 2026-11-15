import pytest
from app.crypto import encrypt_credential, decrypt_credential

def test_encrypt_decrypt_roundtrip():
    secret = "Bearer my-super-secret-token-12345"
    encrypted = encrypt_credential(secret)
    assert encrypted is not None
    assert encrypted.startswith("enc:v1:")
    assert encrypted != secret

    decrypted = decrypt_credential(encrypted)
    assert decrypted == secret

def test_idempotent_encryption():
    secret = "Bearer token"
    enc1 = encrypt_credential(secret)
    enc2 = encrypt_credential(enc1)
    assert enc1 == enc2

def test_legacy_plaintext_backward_compatibility():
    legacy = "Bearer unencrypted-legacy-token"
    assert decrypt_credential(legacy) == legacy

def test_empty_none_handling():
    assert encrypt_credential(None) is None
    assert encrypt_credential("") == ""
    assert decrypt_credential(None) is None
    assert decrypt_credential("") == ""

