/**
 * End-to-End Encryption Service
 * 
 * Provides cryptographic functions for encrypting and decrypting sensitive financial data.
 * Uses AES-GCM 256-bit encryption with Web Crypto API.
 * 
 * Security principles:
 * - All encryption happens client-side
 * - Server never has access to encryption keys
 * - Each encrypted payload includes a unique IV (initialization vector)
 * - Uses authenticated encryption (GCM mode) to prevent tampering
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM

export interface EncryptedData {
  ciphertext: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  version: number; // For future algorithm upgrades
}

/**
 * Generates a new 256-bit AES encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to a base64 string for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Imports a base64 key string back to a CryptoKey
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(keyString);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts any JSON-serializable data
 */
export async function encryptData(
  data: unknown,
  key: CryptoKey
): Promise<EncryptedData> {
  // Convert data to string
  const plaintext = JSON.stringify(data);
  const plaintextBuffer = new TextEncoder().encode(plaintext);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    plaintextBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    version: 1,
  };
}

/**
 * Decrypts data encrypted with encryptData
 */
export async function decryptData<T = unknown>(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<T> {
  if (encryptedData.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
  }

  const ciphertextBuffer = base64ToArrayBuffer(encryptedData.ciphertext);
  const iv = base64ToArrayBuffer(encryptedData.iv);

  // Decrypt
  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    ciphertextBuffer
  );

  // Convert back to string and parse JSON
  const plaintext = new TextDecoder().decode(plaintextBuffer);
  return JSON.parse(plaintext) as T;
}

/**
 * Encrypts a specific field object for database storage
 */
export async function encryptField<T>(
  value: T,
  key: CryptoKey
): Promise<EncryptedData> {
  return await encryptData(value, key);
}

/**
 * Decrypts a specific field from database
 */
export async function decryptField<T>(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<T> {
  return await decryptData<T>(encryptedData, key);
}

// Helper functions for base64 encoding/decoding

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash a string (useful for generating deterministic IDs from encrypted data)
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hashBuffer);
}
