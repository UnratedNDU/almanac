//! Key derivation and authenticated encryption primitives.
//!
//! Sealed blob layout: `nonce (24 bytes) || ciphertext || tag (16 bytes)`.

use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::{
    aead::{Aead, Generate, KeyInit},
    XChaCha20Poly1305, XNonce,
};
use data_encoding::BASE32_NOPAD;
use zeroize::{Zeroize, ZeroizeOnDrop};

pub const KEY_LEN: usize = 32;
pub const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 24;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum CryptoError {
    #[error("key derivation failed")]
    Kdf,
    #[error("wrong key or corrupted data")]
    Decrypt,
    #[error("invalid recovery key")]
    BadRecoveryKey,
}

/// Argon2id cost parameters. They are stored with the account so every device derives the same keys.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KdfParams {
    pub m_kib: u32,
    pub t: u32,
    pub p: u32,
}

impl Default for KdfParams {
    fn default() -> Self {
        Self { m_kib: 65_536, t: 3, p: 1 }
    }
}

/// Both keys come from one Argon2id run: `kek` wraps the data key locally, `auth` proves identity to the server.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct PasswordKeys {
    pub kek: [u8; KEY_LEN],
    pub auth: [u8; KEY_LEN],
}

pub fn new_salt() -> [u8; SALT_LEN] {
    random_bytes()
}

pub fn random_key() -> [u8; KEY_LEN] {
    random_bytes()
}

fn random_bytes<const N: usize>() -> [u8; N] {
    let mut out = [0u8; N];
    getrandom::fill(&mut out).expect("OS random generator unavailable");
    out
}

pub fn derive_password_keys(
    password: &str,
    salt: &[u8; SALT_LEN],
    params: &KdfParams,
) -> Result<PasswordKeys, CryptoError> {
    let argon_params = Params::new(params.m_kib, params.t, params.p, Some(2 * KEY_LEN))
        .map_err(|_| CryptoError::Kdf)?;
    let mut out = [0u8; 2 * KEY_LEN];
    Argon2::new(Algorithm::Argon2id, Version::V0x13, argon_params)
        .hash_password_into(password.as_bytes(), salt, &mut out)
        .map_err(|_| CryptoError::Kdf)?;
    let mut keys = PasswordKeys { kek: [0; KEY_LEN], auth: [0; KEY_LEN] };
    keys.kek.copy_from_slice(&out[..KEY_LEN]);
    keys.auth.copy_from_slice(&out[KEY_LEN..]);
    out.zeroize();
    Ok(keys)
}

fn cipher(key: &[u8; KEY_LEN]) -> XChaCha20Poly1305 {
    XChaCha20Poly1305::new(key.into())
}

pub fn seal(key: &[u8; KEY_LEN], plaintext: &[u8]) -> Vec<u8> {
    let nonce = XNonce::generate();
    let mut blob = nonce.as_slice().to_vec();
    blob.extend(
        cipher(key)
            .encrypt(&nonce, plaintext)
            .expect("encrypting an in-memory buffer cannot fail"),
    );
    blob
}

pub fn open(key: &[u8; KEY_LEN], blob: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if blob.len() < NONCE_LEN {
        return Err(CryptoError::Decrypt);
    }
    let (nonce, ciphertext) = blob.split_at(NONCE_LEN);
    let nonce = XNonce::try_from(nonce).map_err(|_| CryptoError::Decrypt)?;
    cipher(key).decrypt(&nonce, ciphertext).map_err(|_| CryptoError::Decrypt)
}

/// Base32 in groups of four separated by dashes, e.g. `ABCD-EFGH-...`.
pub fn format_recovery_key(key: &[u8; KEY_LEN]) -> String {
    let b32 = BASE32_NOPAD.encode(key);
    b32.as_bytes()
        .chunks(4)
        .map(|group| std::str::from_utf8(group).expect("base32 is ascii"))
        .collect::<Vec<_>>()
        .join("-")
}

/// Accepts lowercase, dashes and spaces.
pub fn parse_recovery_key(s: &str) -> Result<[u8; KEY_LEN], CryptoError> {
    let clean: String = s
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '-')
        .collect::<String>()
        .to_uppercase();
    let bytes = BASE32_NOPAD.decode(clean.as_bytes()).map_err(|_| CryptoError::BadRecoveryKey)?;
    bytes.try_into().map_err(|_| CryptoError::BadRecoveryKey)
}
#[cfg(test)]
mod tests {
    use super::*;

    const FAST: KdfParams = KdfParams { m_kib: 8, t: 1, p: 1 };

    #[test]
    fn seal_open_roundtrip() {
        let key = random_key();
        let blob = seal(&key, b"hello calendar");
        assert_eq!(open(&key, &blob).unwrap(), b"hello calendar");
    }

    #[test]
    fn open_wrong_key_fails() {
        let blob = seal(&random_key(), b"secret");
        assert_eq!(open(&random_key(), &blob), Err(CryptoError::Decrypt));
    }

    #[test]
    fn open_tampered_blob_fails() {
        let key = random_key();
        let mut blob = seal(&key, b"secret");
        let last = blob.len() - 1;
        blob[last] ^= 1;
        assert_eq!(open(&key, &blob), Err(CryptoError::Decrypt));
    }

    #[test]
    fn open_truncated_blob_fails() {
        assert_eq!(open(&random_key(), &[1, 2, 3]), Err(CryptoError::Decrypt));
    }

    #[test]
    fn seal_uses_fresh_nonce() {
        let key = random_key();
        assert_ne!(seal(&key, b"same"), seal(&key, b"same"));
    }

    #[test]
    fn derive_is_deterministic_and_split() {
        let salt = new_salt();
        let a = derive_password_keys("correct horse", &salt, &FAST).unwrap();
        let b = derive_password_keys("correct horse", &salt, &FAST).unwrap();
        assert_eq!(a.kek, b.kek);
        assert_eq!(a.auth, b.auth);
        assert_ne!(a.kek, a.auth);
        let other = derive_password_keys("correct horse", &new_salt(), &FAST).unwrap();
        assert_ne!(a.kek, other.kek);
        let wrong = derive_password_keys("wrong horse", &salt, &FAST).unwrap();
        assert_ne!(a.kek, wrong.kek);
    }

    #[test]
    fn default_params_are_accepted_by_argon2() {
        let d = KdfParams::default();
        assert!(Params::new(d.m_kib, d.t, d.p, Some(2 * KEY_LEN)).is_ok());
    }

    #[test]
    fn recovery_key_roundtrip() {
        let key = random_key();
        let text = format_recovery_key(&key);
        assert_eq!(text.len(), 52 + 12); // 52 base32 chars + 12 dashes
        assert_eq!(parse_recovery_key(&text).unwrap(), key);
        let sloppy = text.to_lowercase().replace('-', " ");
        assert_eq!(parse_recovery_key(&sloppy).unwrap(), key);
    }

    #[test]
    fn parse_rejects_bad_length_or_chars() {
        assert_eq!(parse_recovery_key("ABCD-EFGH"), Err(CryptoError::BadRecoveryKey));
        assert_eq!(parse_recovery_key(&"1".repeat(52)), Err(CryptoError::BadRecoveryKey));
        assert_eq!(parse_recovery_key(""), Err(CryptoError::BadRecoveryKey));
    }
}