/**
 * SHA-256 hash via Web Crypto API (SubtleCrypto).
 * All functions are async — Web Crypto API is Promise-based.
 */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function stringToUtf8Bytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

/**
 * Compute SHA-256 hash of a UTF-8 string.
 * Returns the hex-encoded digest.
 */
export async function sha256(input: string): Promise<string> {
  const bytes = stringToUtf8Bytes(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Compute SHA-256 hash of raw bytes.
 * Returns the hex-encoded digest.
 */
export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}