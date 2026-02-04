const SW_VERSION = 'v1';

// Map to store stream controllers keyed by file ID/URL
const streamControllers = new Map();

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    // 1. Setup Stream
    if (data.type === 'REGISTER_DOWNLOAD') {
        const { url, filename, size } = data;

        // Store client to send PULL requests back
        const client = event.source;
        // Prefer the dedicated channel port if provided
        const port = event.ports[0];

        streamControllers.set(url, {
            filename,
            size,
            controller: null,
            client,
            port,
            isClosed: false
        });

        if (port) port.postMessage('OK');
    }

    // 2. Enqueue Chunk
    if (data.type === 'ENQUEUE_CHUNK') {
        const { url, chunk } = data;
        const state = streamControllers.get(url);

        if (state && state.controller && !state.isClosed) {
            try {
                // If chunk is null/empty, interpret as close? No, explicit CLOSE_STREAM used.
                state.controller.enqueue(chunk);
            } catch (err) {
                console.error('SW: Enqueue failed', err);
            }
        }
    }

    // 3. Close Stream
    if (data.type === 'CLOSE_STREAM') {
        const { url } = data;
        const state = streamControllers.get(url);
        if (state && state.controller && !state.isClosed) {
            try {
                state.controller.close();
                state.isClosed = true;
            } catch (e) { }
            // Don't delete immediately, let the response finish? 
            // Actually close() is sufficient.
            streamControllers.delete(url);
        }
    }

    // 4. Abort Stream
    if (data.type === 'ABORT_STREAM') {
        const { url, reason } = data;
        const state = streamControllers.get(url);
        if (state && state.controller && !state.isClosed) {
            try {
                state.controller.error(new Error(reason));
                state.isClosed = true;
            } catch (e) { }
            streamControllers.delete(url);
        }
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Intercept download requests
    if (url.pathname.startsWith('/stream-download/')) {
        const state = streamControllers.get(url.pathname);

        if (state) {
            const stream = new ReadableStream({
                start(controller) {
                    state.controller = controller;
                    // Signal main thread to start/send first chunk
                    if (state.port) {
                        state.port.postMessage({ type: 'PULL', url: url.pathname });
                    } else if (state.client) {
                        state.client.postMessage({ type: 'PULL', url: url.pathname });
                    }
                },
                pull(controller) {
                    // Backpressure: This is called when the queue is low
                    if (!state.isClosed) {
                        if (state.port) {
                            state.port.postMessage({ type: 'PULL', url: url.pathname });
                        } else if (state.client) {
                            state.client.postMessage({ type: 'PULL', url: url.pathname });
                        }
                    }
                },
                cancel() {
                    if (state.port) {
                        state.port.postMessage({ type: 'CANCEL', url: url.pathname });
                    } else if (state.client) {
                        state.client.postMessage({ type: 'CANCEL', url: url.pathname });
                    }
                    streamControllers.delete(url.pathname);
                }
            });

            const headers = new Headers();
            headers.set('Content-Type', 'application/octet-stream');
            headers.set('Content-Disposition', `attachment; filename="${state.filename.replace(/"/g, '\\"')}"`);
            if (state.size) {
                headers.set('Content-Length', state.size.toString());
            }

            event.respondWith(new Response(stream, { headers }));
            return;
        }
    }
});
