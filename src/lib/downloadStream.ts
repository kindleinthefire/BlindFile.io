import { DownloadInfo, api } from './api';

export class DownloadStreamManager {
    private fileInfo: DownloadInfo;
    private key: CryptoKey;
    private id: string;

    constructor(id: string, fileInfo: DownloadInfo, key: CryptoKey) {
        this.id = id;
        this.fileInfo = fileInfo;
        this.key = key;
    }

    async start() {
        if (!navigator.serviceWorker.controller) {
            throw new Error('Service Worker not active. Please refresh the page.');
        }

        const channel = new MessageChannel();

        // 1. Prepare Metadata
        const virtualFileName = this.fileInfo.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const virtualUrl = `/stream-download/${encodeURIComponent(virtualFileName)}`;
        const remoteUrl = api.getDownloadUrl(this.id);

        // Use the chunkSize from server metadata, or fallback to fileInfo.partSize if missing.
        // It's critical this matches what was used during encryption.
        // If the server provided 'chunkSize' in the metadata response, use that.
        // Otherwise default to 10MB (legacy uploads).
        const chunkSize = this.fileInfo.chunkSize || this.fileInfo.partSize || 10485760;

        // 2. The Handshake Promise
        // We MUST wait for the SW to say "I'm ready" before we trigger the browser download.
        // Otherwise, the browser request hits the network before the SW has registered the route map.
        const handshake = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Service Worker handshake timed out (3s). It may be sleeping or busy."));
            }, 3000);

            channel.port1.onmessage = (event) => {
                if (event.data === 'READY') {
                    clearTimeout(timeout);
                    resolve();
                }
            };
        });

        // 3. Register the download with the SW
        navigator.serviceWorker.controller.postMessage({
            type: 'REGISTER_DOWNLOAD',
            url: virtualUrl,
            filename: this.fileInfo.fileName,
            size: this.fileInfo.fileSize,
            remoteUrl: remoteUrl,
            key: this.key,
            chunkSize: chunkSize
        }, [channel.port2]);

        // 4. Wait for readiness, then trigger
        try {
            await handshake;
            // SW is definitely ready now.
            window.location.href = virtualUrl;
        } catch (err) {
            console.error("Download Handshake Failed:", err);
            // Optionally retry or fallback
            throw err;
        }
    }
    cancel() {
        // Service Worker downloads rely on the browser's download manager.
        // We can't easily cancel the stream once started from here, but we can stop listening.
        console.warn("Canceling Service Worker download stream is not fully supported via API.");
    }
}
