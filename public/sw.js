const SW_VERSION = 'v8-ios-cors-fix';
const streamMap = new Map();

// --- CONFIGURATION ---
// 10MB chunks (Must match encryption)
const PLAIN_CHUNK_SIZE = 10485760;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCRYPTED_CHUNK_SIZE = PLAIN_CHUNK_SIZE + IV_LENGTH + TAG_LENGTH;

self.addEventListener('install', (event) => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'HEARTBEAT') {
        // Keep-alive signal for iOS
        return;
    }

    if (data.type === 'REGISTER_DOWNLOAD') {
        const { url, filename, size, remoteUrl, key, chunkSize } = data;
        // Default to legacy 10MB if not provided
        const plainChunkSize = chunkSize || PLAIN_CHUNK_SIZE;
        const encryptedChunkSize = plainChunkSize + IV_LENGTH + TAG_LENGTH;

        streamMap.set(url, { filename, size, remoteUrl, key, encryptedChunkSize });
        if (event.ports[0]) event.ports[0].postMessage('READY');
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/stream-download/')) {
        const state = streamMap.get(url.pathname);
        if (!state) return;

        event.respondWith((async () => {
            try {
                const response = await fetch(state.remoteUrl);
                if (!response.ok) {
                    console.error("[SW] Remote fetch failed:", response.status, response.statusText);
                    return new Response(`Remote fetch failed: ${response.status}`, { status: 502 });
                }
                if (!response.body) {
                    console.error("[SW] No response body");
                    return new Response("Network Error: No response body", { status: 500 });
                }

                const ENCRYPTED_CHUNK_SIZE = state.encryptedChunkSize;

                // OPTIMIZED: Array-of-Chunks Buffering (No GC Thrashing)
                let chunkQueue = [];
                let totalQueueBytes = 0;

                const decryptionStream = new TransformStream({
                    async transform(chunk, controller) {
                        chunkQueue.push(chunk);
                        totalQueueBytes += chunk.byteLength;

                        // While we have enough data for at least one full encrypted chunk
                        while (totalQueueBytes >= ENCRYPTED_CHUNK_SIZE) {
                            // 1. Coalesce EXACTLY one chunk size from the queue
                            const fullChunk = new Uint8Array(ENCRYPTED_CHUNK_SIZE);
                            let offset = 0;

                            while (offset < ENCRYPTED_CHUNK_SIZE) {
                                const first = chunkQueue[0];
                                const needed = ENCRYPTED_CHUNK_SIZE - offset;

                                if (first.byteLength <= needed) {
                                    // Take the whole piece
                                    fullChunk.set(first, offset);
                                    offset += first.byteLength;
                                    chunkQueue.shift(); // Remove used piece
                                } else {
                                    // Take a slice of the piece
                                    fullChunk.set(first.subarray(0, needed), offset);
                                    offset += needed;
                                    // Replace the first piece with the remainder
                                    chunkQueue[0] = first.subarray(needed);
                                }
                            }

                            totalQueueBytes -= ENCRYPTED_CHUNK_SIZE;

                            // 2. Decrypt immediately to free memory
                            try {
                                const decrypted = await decryptChunk(state.key, fullChunk.buffer);
                                controller.enqueue(new Uint8Array(decrypted));
                            } catch (err) {
                                console.error("[SW] Decryption error", err);
                                controller.error(err);
                                return;
                            }
                        }
                    },
                    async flush(controller) {
                        // Handle remainder (Final Chunk)
                        if (totalQueueBytes > 0) {
                            const finalBuffer = new Uint8Array(totalQueueBytes);
                            let offset = 0;
                            for (const piece of chunkQueue) {
                                finalBuffer.set(piece, offset);
                                offset += piece.byteLength;
                            }

                            try {
                                const decrypted = await decryptChunk(state.key, finalBuffer.buffer);
                                controller.enqueue(new Uint8Array(decrypted));
                            } catch (err) {
                                console.error("[SW] Final decryption error", err);
                                controller.error(err);
                            }
                        }
                    }
                });

                const stream = response.body.pipeThrough(decryptionStream);

                const headers = new Headers();
                headers.set('Content-Type', 'application/octet-stream');
                headers.set('Content-Disposition', `attachment; filename="${state.filename.replace(/"/g, '\\"')}"`);
                // NOTE: Intentionally NOT setting Content-Length
                // The encrypted size != decrypted size, and mismatched Content-Length
                // causes Safari to wait forever for more bytes

                return new Response(stream, { headers });
            } catch (err) {
                console.error("[SW] Download handler error:", err);
                return new Response("Download failed: " + (err.message || err), { status: 500 });
            }
        })());
    }
});

async function decryptChunk(key, data) {
    // Zero-copy view if possible
    const dataArray = new Uint8Array(data);
    const iv = dataArray.subarray(0, IV_LENGTH);
    const encrypted = dataArray.subarray(IV_LENGTH);

    return await self.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
    );
}
