import { Hono } from 'hono';

interface Env {
    BUCKET: R2Bucket;
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// Standard AES-GCM constants
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCRYPTION_OVERHEAD = IV_LENGTH + TAG_LENGTH;

// Helper to convert hex string to Uint8Array (if key is sent as hex)
// Or Base64Url (if key is sent as base64url from URL hash)
function base64UrlToUint8Array(base64url: string): Uint8Array {
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

app.post('/', async (c) => {
    try {
        // 1. Get Form Data (fileId, key)
        // We use form-urlencoded or multipart/form-data so we can submit via HTML form
        const formData = await c.req.parseBody();
        const fileId = formData['fileId'] as string;
        const keyString = formData['key'] as string;

        if (!fileId || !keyString) {
            return c.text('Missing fileId or key', 400);
        }

        // 2. Import Key
        // Key comes from URL hash (base64url), we need to import it as CryptoKey
        const rawKey = base64UrlToUint8Array(keyString);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            rawKey as unknown as BufferSource,
            { name: ALGORITHM },
            false, // non-extractable
            ['decrypt']
        );

        // 3. Get File Metadata using D1
        // We NEED the part_size to know where chunk boundaries are
        const upload = await c.env.DB.prepare(
            `SELECT * FROM uploads WHERE id = ? AND status = 'completed'`
        ).bind(fileId).first() as any;

        if (!upload) {
            return c.text('File not found or expired', 404);
        }

        // 4. Get R2 Object Stream
        const objectKey = `uploads/${upload.id}/${upload.file_name}`;
        const object = await c.env.BUCKET.get(objectKey);

        if (!object) {
            return c.text('Object not found in storage', 404);
        }

        // 5. Setup Decryption Transform Stream
        const partSizePlain = upload.part_size;
        const partSizeEncrypted = partSizePlain + ENCRYPTION_OVERHEAD;

        let buffer = new Uint8Array(0);
        let chunkCount = 0;

        const transformStream = new TransformStream({
            async transform(chunk: Uint8Array, controller) {
                // Concatenate new chunk to buffer
                const newBuffer = new Uint8Array(buffer.length + chunk.length);
                newBuffer.set(buffer);
                newBuffer.set(chunk, buffer.length);
                buffer = newBuffer;

                // Process all full chunks in buffer
                while (true) {
                    // Calculate expected size for CURRENT chunk
                    // The last chunk might be smaller than partSizeEncrypted
                    // But usually we just assume stream flow. 
                    // Wait. We need accurate size. 

                    // Determining if this is the last chunk is hard in a stream without total size knowledge upfront in loop.
                    // However, we know standard parts are partSizeEncrypted.
                    // Only the last part is smaller (remainder).

                    if (buffer.length >= partSizeEncrypted) {
                        // We have at least one full standard chunk
                        const currentChunk = buffer.slice(0, partSizeEncrypted);
                        buffer = buffer.slice(partSizeEncrypted);

                        const decrypted = await decryptChunk(cryptoKey, currentChunk);
                        controller.enqueue(new Uint8Array(decrypted));
                        chunkCount++;
                    } else {
                        // Not enough data for a full chunk yet.
                        // But what if it's the LAST chunk?
                        // The `flush` method will handle the remainder.
                        break;
                    }
                }
            },
            async flush(controller) {
                if (buffer.length > 0) {
                    // Process remaining data (the last chunk)
                    try {
                        const decrypted = await decryptChunk(cryptoKey, buffer);
                        controller.enqueue(new Uint8Array(decrypted));
                    } catch (e) {
                        console.error('Final chunk decryption failed', e);
                        controller.error(e);
                    }
                }
            }
        });

        // 6. Return Response
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('Content-Disposition', `attachment; filename="${upload.file_name}"`);
        headers.set('Content-Type', 'application/octet-stream'); // Force download
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate'); // No caching decrypted data

        // Pipe R2 body -> Decryptor
        const decryptedStream = object.body.pipeThrough(transformStream);

        return new Response(decryptedStream, {
            headers
        });

    } catch (err: any) {
        console.error('Stream Download Error:', err);
        return c.text('Internal Server Error: ' + err.message, 500);
    }
});

// Helper for decryption
async function decryptChunk(key: CryptoKey, chunk: Uint8Array): Promise<ArrayBuffer> {
    // Format: [IV 12][Cipher...][Tag 16 (included in cipher for WebCrypto)]
    const iv = chunk.slice(0, IV_LENGTH);
    const encrypted = chunk.slice(IV_LENGTH);

    return await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        encrypted
    );
}

export const onRequest = app.fetch;
