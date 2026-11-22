/**
 * Client-Side WebCrypto Device Binding Service
 * Generates non-extractable ECDSA P-256 keys in IndexedDB.
 * The private key can NEVER be extracted or copied out of the browser via DevTools exportKey().
 */

const DB_NAME = "LMS_Device_KeyStore";
const STORE_NAME = "keys";
const KEY_PAIR_ID = "device_keypair";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Gets the existing device key pair from IndexedDB or generates a new one.
 * Returns the public key encoded as SPKI Base64 string.
 */
export async function getOrCreateDevicePublicKey(): Promise<string | undefined> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return undefined;
  }

  try {
    const db = await openDB();

    // 1. Try to read existing keypair from IndexedDB
    const existing = await new Promise<CryptoKeyPair | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_PAIR_ID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (existing?.publicKey) {
      const exported = await crypto.subtle.exportKey("spki", existing.publicKey);
      return arrayBufferToBase64(exported);
    }

    // 2. Generate a new ECDSA P-256 key pair with extractable: false
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false, // non-extractable private key!
      ["sign", "verify"]
    );

    // 3. Store the opaque CryptoKeyPair in IndexedDB
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(keyPair, KEY_PAIR_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Request persistent storage so browser does not evict it under low disk
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }

    const exported = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    return arrayBufferToBase64(exported);
  } catch (err) {
    console.warn("WebCrypto device key generation failed, continuing without it:", err);
    return undefined;
  }
}

/**
 * Human-readable device and browser label.
 */
export function getDeviceLabel(): string {
  if (typeof window === "undefined") return "Desktop Browser";

  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/")) browser = "Google Chrome";
  else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";

  let os = "Desktop";
  if (ua.includes("Macintosh") || ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Windows NT")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}
