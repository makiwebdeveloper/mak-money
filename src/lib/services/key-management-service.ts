/**
 * Key Management Service
 * 
 * Handles secure storage and retrieval of user encryption keys.
 * Keys are stored in browser's IndexedDB for persistence across sessions.
 * 
 * Security considerations:
 * - Keys are stored only in the user's browser
 * - Never transmitted to or stored on the server
 * - User is responsible for backing up their key
 * - Loss of key means permanent loss of data access
 */

import { exportKey, generateEncryptionKey, importKey } from './encryption-service';

const DB_NAME = 'mak_money_secure_storage';
const DB_VERSION = 1;
const STORE_NAME = 'encryption_keys';
const KEY_ID = 'master_encryption_key';

interface StoredKey {
  id: string;
  keyData: string;
  createdAt: number;
  lastUsed: number;
}

/**
 * Opens IndexedDB connection
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Stores encryption key in IndexedDB
 */
async function storeKeyInDB(key: CryptoKey): Promise<void> {
  const db = await openDatabase();
  const keyData = await exportKey(key);

  const storedKey: StoredKey = {
    id: KEY_ID,
    keyData,
    createdAt: Date.now(),
    lastUsed: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(storedKey);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves encryption key from IndexedDB
 */
async function getKeyFromDB(): Promise<CryptoKey | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY_ID);

    request.onsuccess = async () => {
      const storedKey = request.result as StoredKey | undefined;
      if (!storedKey) {
        resolve(null);
        return;
      }

      try {
        const key = await importKey(storedKey.keyData);
        
        // Update last used timestamp
        const updateTransaction = db.transaction([STORE_NAME], 'readwrite');
        const updateStore = updateTransaction.objectStore(STORE_NAME);
        storedKey.lastUsed = Date.now();
        updateStore.put(storedKey);
        
        resolve(key);
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes encryption key from IndexedDB
 */
async function deleteKeyFromDB(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(KEY_ID);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Public API

/**
 * Initializes a new encryption key for the user
 * Should be called during onboarding
 */
export async function initializeUserKey(): Promise<CryptoKey> {
  const key = await generateEncryptionKey();
  await storeKeyInDB(key);
  return key;
}

/**
 * Gets the user's encryption key
 * Returns null if no key exists (user needs to initialize or restore)
 */
export async function getUserKey(): Promise<CryptoKey | null> {
  return await getKeyFromDB();
}

/**
 * Checks if user has an encryption key
 */
export async function hasUserKey(): Promise<boolean> {
  const key = await getUserKey();
  return key !== null;
}

/**
 * Exports user's key for backup purposes
 * Returns base64-encoded key string
 */
export async function exportUserKey(): Promise<string> {
  const key = await getUserKey();
  if (!key) {
    throw new Error('No encryption key found');
  }
  return await exportKey(key);
}

/**
 * Imports a previously exported key (for restoration)
 */
export async function importUserKey(keyString: string): Promise<void> {
  try {
    const key = await importKey(keyString);
    await storeKeyInDB(key);
  } catch (error) {
    throw new Error('Invalid encryption key format');
  }
}

/**
 * Deletes user's encryption key
 * WARNING: This will make all encrypted data unrecoverable
 */
export async function deleteUserKey(): Promise<void> {
  await deleteKeyFromDB();
}

/**
 * Generates a human-readable recovery phrase from the key
 * (Simple implementation - in production, consider using BIP39 or similar)
 */
export async function getRecoveryPhrase(): Promise<string> {
  const keyString = await exportUserKey();
  // Format as groups of 4 characters for readability
  const formatted = keyString.match(/.{1,4}/g)?.join('-') || keyString;
  return formatted;
}

/**
 * Restores key from recovery phrase
 */
export async function restoreFromRecoveryPhrase(phrase: string): Promise<void> {
  // Remove formatting
  const keyString = phrase.replace(/-/g, '');
  await importUserKey(keyString);
}

/**
 * Memory cache for the current session
 * Avoids repeated IndexedDB access
 */
let keyCache: CryptoKey | null | undefined = undefined;

/**
 * Gets key with caching for performance
 */
export async function getCachedUserKey(): Promise<CryptoKey | null> {
  if (keyCache === undefined) {
    keyCache = await getUserKey();
  }
  return keyCache;
}

/**
 * Clears the key cache (e.g., on logout)
 */
export function clearKeyCache(): void {
  keyCache = undefined;
}
