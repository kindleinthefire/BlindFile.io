const SW_VERSION = 'v4-antigravity-final';
const streamMap = new Map();

// --- CONFIGURATION ---
// This must match the chunk size used during ENCRYPTION.
// Standard browser file.stream() uses 64KB chunks.
// BlindFile uses 10MB chunks (10 * 1024 * 1024)
const PLAIN_CHUNK_SIZE = 10485760;
const IV_LENGTH = 12;
const TAG_LENGTH = 16; // AES-GCM tag is always 16 bytes

// The total size of a chunk as it sits on the server (IV + Data + Tag)
const ENCRYPTED_CHUNK_SIZE = PLAIN_CHUNK_SIZE + IV_LENGTH + TAG_LENGTH;

self.addEventListener('install', (event) => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'REGISTER_DOWNLOAD') {
        const { url, filename, size, remoteUrl, key } = data;

        // Store the metadata and the CryptoKey
        streamMap.set(url, {
            filename,
            size,
            remoteUrl,
            key,
        });

        // Signal to the main thread that we are ready to intercept
        if (event.ports[0]) event.ports[0].postMessage('READY');
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Intercept our virtual download URL
    if (url.pathname.startsWith('/stream-download/')) {
        const state = streamMap.get(url.pathname);
        if (!state) return;

        event.respondWith((async () => {
            // 1. Fetch the encrypted file DIRECTLY in the Worker
            // This keeps the 2GB blob out of the UI thread's memory.
            const response = await fetch(state.remoteUrl);
            if (!response.body) return new Response("Network Error", { status: 500 });

            // 2. The Re-Chunking Stream
            // We must buffer incoming bytes until we have a complete chunk 
            // so that AES-GCM auth tags verify correctly.
            let buffer = new Uint8Array(0);

            const decryptionStream = new TransformStream({
                async transform(chunk, controller) {
                    // Append new network data to our buffer
                    const newBuffer = new Uint8Array(buffer.length + chunk.length);
                    newBuffer.set(buffer);
                    newBuffer.set(chunk, buffer.length);
                    buffer = newBuffer;

                    // Process as many FULL chunks as we have in the buffer
                    while (buffer.length >= ENCRYPTED_CHUNK_SIZE) {
                        const chunkToDecrypt = buffer.slice(0, ENCRYPTED_CHUNK_SIZE);
                        buffer = buffer.slice(ENCRYPTED_CHUNK_SIZE); // Keep the remainder

                        try {
                            const decrypted = await decryptChunk(state.key, chunkToDecrypt.buffer);
                            controller.enqueue(new Uint8Array(decrypted));
                        } catch (err) {
                            console.error("Decryption failed on chunk", err);
                            controller.error(err);
                            return;
                        }
                    }
                },
                async flush(controller) {
                    // Handle the final chunk (which is smaller than ENCRYPTED_CHUNK_SIZE)
                    if (buffer.length > 0) {
                        try {
                            const decrypted = await decryptChunk(state.key, buffer.buffer);
                            controller.enqueue(new Uint8Array(decrypted));
                        } catch (err) {
                            console.error("Final chunk decryption failed", err);
                            controller.error(err);
                        }
                    }
                }
            });

            // 3. Pipe: Cloud -> Re-Chunker -> Browser
            const stream = response.body.pipeThrough(decryptionStream);

            // 4. Set Headers for iOS Compatibility
            const headers = new Headers();
            headers.set('Content-Type', 'application/octet-stream');
            headers.set('Content-Disposition', `attachment; filename="${state.filename.replace(/"/g, '\\"')}"`);
            if (state.size) headers.set('Content-Length', state.size.toString());

            return new Response(stream, { headers });
        })());
    }
});

// --- HELPER: Decrypt Logic ---
// Matches your exact "IV + Ciphertext + Tag" format
async function decryptChunk(key, data) {
    const dataArray = new Uint8Array(data);
    const iv = dataArray.slice(0, IV_LENGTH);
    const encrypted = dataArray.slice(IV_LENGTH);

    return await self.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        encrypted
    );
}
