/**
 * BlindText - Password-Based Message Encryption
 * Uses PBKDF2 for key derivation + AES-256-GCM for encryption
 * 
 * ZERO KNOWLEDGE: Password never leaves the browser
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

/**
 * Generate a random salt for PBKDF2
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derive an AES-256 key from a password using PBKDF2
 */
export async function deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    // Convert password to key material
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive AES-256-GCM key
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(salt) as unknown as Uint8Array<ArrayBuffer>,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a message with a user-defined password
 * Returns the encrypted blob and the salt needed for decryption
 */
export async function encryptMessage(
    text: string,
    password: string
): Promise<{ encryptedBlob: Blob; salt: string }> {
    // Generate random salt
    const salt = generateSalt();

    // Derive key from password
    const key = await deriveKeyFromPassword(password, salt);

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt the message
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(text);

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        messageBuffer
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(IV_LENGTH + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), IV_LENGTH);

    // Create blob with .blindtext extension hint
    const encryptedBlob = new Blob([combined], { type: 'application/octet-stream' });

    return {
        encryptedBlob,
        salt: saltToBase64(salt)
    };
}

/**
 * Decrypt a message using the password and salt
 */
export async function decryptMessage(
    encryptedBlob: Blob,
    password: string,
    saltBase64: string
): Promise<string> {
    // Parse salt from base64
    const salt = base64ToSalt(saltBase64);

    // Derive key from password
    const key = await deriveKeyFromPassword(password, salt);

    // Read blob as ArrayBuffer
    const combined = await encryptedBlob.arrayBuffer();
    const combinedArray = new Uint8Array(combined);

    // Extract IV and encrypted data
    const iv = combinedArray.slice(0, IV_LENGTH);
    const encryptedData = combinedArray.slice(IV_LENGTH);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        encryptedData
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

/**
 * Convert salt to URL-safe base64
 */
export function saltToBase64(salt: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < salt.byteLength; i++) {
        binary += String.fromCharCode(salt[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Convert URL-safe base64 back to salt
 */
export function base64ToSalt(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const padded = padding ? base64 + '='.repeat(4 - padding) : base64;

    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Parse BlindText hash from URL
 * Format: #salt=<base64>&type=message
 */
export function parseBlindTextHash(hash: string): {
    isBlindText: boolean;
    salt: string | null;
} {
    if (!hash || !hash.includes('type=message')) {
        return { isBlindText: false, salt: null };
    }

    const params = new URLSearchParams(hash.replace('#', ''));
    const salt = params.get('salt');
    const type = params.get('type');

    if (type === 'message' && salt) {
        return { isBlindText: true, salt };
    }

    return { isBlindText: false, salt: null };
}

/**
 * Generate BlindText download URL
 */
export function generateBlindTextUrl(uploadId: string, salt: string): string {
    return `https://www.blindfile.io/d/${uploadId}#salt=${salt}&type=message`;
}
