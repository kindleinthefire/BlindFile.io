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

        // Mobile Defaults: Hardcode fallback chunkSize to 1MB (not 10MB) on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const defaultChunkSize = isMobile ? 1048576 : 10485760;

        // Use the chunkSize from server metadata, or fallback
        const chunkSize = this.fileInfo.chunkSize || this.fileInfo.partSize || defaultChunkSize;

        // 2. The "Hail Mary" Handshake
        // Race the "READY" response against a 2-second timeout.
        const handshake = new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                console.warn("SW Blind Navigation: Handshake timed out (2s). Proceeding anyway.");
                resolve(); // Proceed anyway
            }, 2000);

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

        // 4. Wait for readiness (or timeout), then trigger
        try {
            await handshake;
            // SW is either ready or we are forcing it
            window.location.href = virtualUrl;
        } catch (err) {
            console.error("Download Start Failed:", err);
            throw err;
        }
    }
    cancel() {
        // Service Worker downloads rely on the browser's download manager.
        // We can't easily cancel the stream once started from here, but we can stop listening.
        console.warn("Canceling Service Worker download stream is not fully supported via API.");
    }
}
