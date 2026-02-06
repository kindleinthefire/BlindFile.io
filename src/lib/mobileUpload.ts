/**
 * Mobile Compatible Upload Utility
 * Uses ZipCrypto (legacy encryption) for iOS Files app native support
 * 
 * SECURITY NOTE: ZipCrypto is weaker than AES-256-GCM but is the only
 * format supported natively by iOS Files app.
 */

import { BlobWriter, ZipWriter, BlobReader } from '@zip.js/zip.js';
import { api } from './api';

// Generate a secure random password for the ZIP
export function generateZipPassword(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return arrayBufferToBase64Url(array.buffer as ArrayBuffer);
}

// Base64URL encoding (URL-safe)
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

// Get file extension from filename
function getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
}

// Obfuscate filename for privacy
function obfuscateFilename(originalFilename: string): string {
    const ext = getExtension(originalFilename);
    return `blindfile_content${ext}`;
}

interface MobileUploadCallbacks {
    onProgress?: (percent: number) => void;
    onComplete?: (downloadUrl: string) => void;
    onError?: (error: Error) => void;
}

interface MobileUploadResult {
    id: string;
    password: string;
    downloadUrl: string;
    originalFilename: string;
}

/**
 * Upload a file using ZipCrypto encryption for iOS compatibility
 * 
 * Flow:
 * 1. Generate random password
 * 2. Create ZIP with ZipCrypto encryption
 * 3. Rename file inside ZIP to obfuscate original name
 * 4. Upload ZIP to R2
 * 5. Return smart link with password and encoded filename
 */
export async function uploadMobileCompatible(
    file: File,
    callbacks?: MobileUploadCallbacks
): Promise<MobileUploadResult | null> {
    try {
        // 1. Generate password
        const password = generateZipPassword();

        // 2. Obfuscate the filename inside the ZIP
        const obfuscatedName = obfuscateFilename(file.name);

        // 3. Create ZIP with ZipCrypto
        const zipBlob = await createZipWithPassword(file, obfuscatedName, password, callbacks?.onProgress);

        // 4. Calculate ZIP size
        const zipSize = zipBlob.size;

        // 5. Initialize upload with server
        const initResponse = await api.initUpload(
            `${file.name}.zip`, // Store as .zip to hint at format
            zipSize,
            'application/zip'
        );

        // 6. Upload the ZIP in a single part (most ZIPs are manageable size)
        // For very large files, this would need to be chunked, but ZipCrypto
        // files are typically smaller and simpler
        const uploadResponse = await uploadZipBlob(
            initResponse.id,
            initResponse.uploadId,
            zipBlob,
            initResponse.partSize,
            callbacks?.onProgress
        );

        // 7. Complete the upload
        await api.completeUpload(initResponse.id, uploadResponse.parts);

        // 8. Generate smart download URL
        const encodedFilename = btoa(file.name);
        const downloadUrl = `/d/${initResponse.id}#${password}|${encodedFilename}`;

        if (callbacks?.onComplete) {
            callbacks.onComplete(downloadUrl);
        }

        return {
            id: initResponse.id,
            password,
            downloadUrl,
            originalFilename: file.name
        };

    } catch (error) {
        console.error('[MobileUpload] Failed:', error);
        if (callbacks?.onError) {
            callbacks.onError(error instanceof Error ? error : new Error('Upload failed'));
        }
        return null;
    }
}

/**
 * Create a password-protected ZIP using ZipCrypto
 */
async function createZipWithPassword(
    file: File,
    entryName: string,
    password: string,
    onProgress?: (percent: number) => void
): Promise<Blob> {
    const blobWriter = new BlobWriter('application/zip');

    const zipWriter = new ZipWriter(blobWriter, {
        password,
        // Use ZipCrypto (legacy) for iOS compatibility
        // Do NOT use encryptionStrength which enables AES
        zipCrypto: true
    });

    // Add the file with obfuscated name
    await zipWriter.add(entryName, new BlobReader(file), {
        onprogress: (current: number, total: number) => {
            if (onProgress) {
                onProgress((current / total) * 50); // 0-50% for ZIP creation
            }
        }
    });

    // Close and return the blob
    return await zipWriter.close();
}

/**
 * Upload a ZIP blob to R2 using the multipart API
 */
async function uploadZipBlob(
    id: string,
    uploadId: string,
    blob: Blob,
    partSize: number,
    onProgress?: (percent: number) => void
): Promise<{ parts: Array<{ partNumber: number; etag: string }> }> {
    const parts: Array<{ partNumber: number; etag: string }> = [];
    const totalParts = Math.ceil(blob.size / partSize);

    for (let i = 0; i < totalParts; i++) {
        const start = i * partSize;
        const end = Math.min(start + partSize, blob.size);
        const chunk = blob.slice(start, end);
        const data = await chunk.arrayBuffer();

        // Upload part
        const result = await api.uploadPart(id, uploadId, uploadId, i + 1, data);
        parts.push({ partNumber: result.partNumber, etag: result.etag });

        // Update progress (50-100% for upload)
        if (onProgress) {
            const uploadPercent = ((i + 1) / totalParts) * 50;
            onProgress(50 + uploadPercent);
        }
    }

    return { parts };
}

/**
 * Parse a smart download URL hash
 * Returns password and original filename if mobile format, or just key if AES format
 */
export function parseDownloadHash(hash: string): {
    isMobileZip: boolean;
    password: string;
    originalFilename?: string;
} {
    if (!hash) {
        return { isMobileZip: false, password: '' };
    }

    if (hash.includes('|')) {
        const [password, encodedFilename] = hash.split('|');
        try {
            const originalFilename = atob(encodedFilename);
            return { isMobileZip: true, password, originalFilename };
        } catch {
            // Invalid base64, treat as regular key
            return { isMobileZip: false, password: hash };
        }
    }

    return { isMobileZip: false, password: hash };
}
