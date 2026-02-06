// ============================================
// ZERO-KNOWLEDGE ENCRYPTION UTILITIES
// All encryption happens client-side only
// ============================================

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Generate a cryptographically secure AES-256-GCM key
 * This key ONLY exists in the browser and is shared via URL hash
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            length: KEY_LENGTH,
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );
}

/**
 * Export key to base64url format for URL hash
 */
export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64Url(exported);
}

/**
 * Import key from base64url format (from URL hash)
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
    const keyBuffer = base64UrlToArrayBuffer(keyString);
    return await window.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: ALGORITHM },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Generate a random IV for AES-GCM
 */
export function generateIV(): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypt a chunk of data using AES-GCM
 * Returns: [IV (12 bytes)] + [encrypted data + auth tag]
 */
export async function encryptChunk(
    key: CryptoKey,
    data: ArrayBuffer
): Promise<ArrayBuffer> {
    const iv = generateIV();

    // Cast IV to satisfy TypeScript strict mode (ArrayBuffer vs SharedArrayBuffer)
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: new Uint8Array(iv) as unknown as Uint8Array<ArrayBuffer>,
        },
        key,
        data
    );

    // Prepend IV to encrypted data
    const result = new Uint8Array(IV_LENGTH + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), IV_LENGTH);

    // Cast to ArrayBuffer to satisfy TypeScript strict mode
    return result.buffer as ArrayBuffer;
}

/**
 * Decrypt a chunk of data using AES-GCM
 * Expects: [IV (12 bytes)] + [encrypted data + auth tag]
 */
export async function decryptChunk(
    key: CryptoKey,
    data: ArrayBuffer
): Promise<ArrayBuffer> {
    const dataArray = new Uint8Array(data);
    const iv = dataArray.slice(0, IV_LENGTH);
    const encrypted = dataArray.slice(IV_LENGTH);

    return await window.crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            iv: new Uint8Array(iv) as unknown as Uint8Array<ArrayBuffer>,
        },
        key,
        encrypted
    );
}

/**
 * Encrypt metadata (JSON) into a Base64URL string using the same key
 */
export async function encryptMetadata(metadata: object, key: CryptoKey): Promise<string> {
    const json = JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    const encrypted = await encryptChunk(key, data.buffer as ArrayBuffer);
    return arrayBufferToBase64Url(encrypted);
}

/**
 * Decrypt metadata string back into an object
 */
export async function decryptMetadata(encryptedMetadata: string, key: CryptoKey): Promise<any> {
    const buffer = base64UrlToArrayBuffer(encryptedMetadata);
    const decrypted = await decryptChunk(key, buffer);
    const decoder = new TextDecoder();
    const json = decoder.decode(decrypted);
    return JSON.parse(json);
}

/**
 * Create an encryption transform stream
 * Encrypts data as it passes through - never loads full file into memory
 */
export function createEncryptStream(
    key: CryptoKey
): TransformStream<Uint8Array, Uint8Array> {
    return new TransformStream({
        async transform(chunk, controller) {
            // Create a proper ArrayBuffer copy
            const buffer = new Uint8Array(chunk).buffer as ArrayBuffer;
            const encrypted = await encryptChunk(key, buffer);
            controller.enqueue(new Uint8Array(encrypted));
        },
    });
}

/**
 * Create a decryption transform stream
 */
export function createDecryptStream(
    key: CryptoKey
): TransformStream<Uint8Array, Uint8Array> {
    return new TransformStream({
        async transform(chunk, controller) {
            try {
                // Create a proper ArrayBuffer copy
                const buffer = new Uint8Array(chunk).buffer as ArrayBuffer;
                const decrypted = await decryptChunk(key, buffer);
                controller.enqueue(new Uint8Array(decrypted));
            } catch {
                controller.error(
                    new Error('Decryption failed. Invalid key or corrupted data.')
                );
            }
        },
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

    const padding = base64.length % 4;
    const padded = padding ? base64 + '='.repeat(4 - padding) : base64;

    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format speed to human readable string
 */
export function formatSpeed(bytesPerSecond: number): string {
    return formatBytes(bytesPerSecond) + '/s';
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}
