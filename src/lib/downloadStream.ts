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
        const apiUrl = api.getDownloadUrl(this.id);

        // Mobile detection
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // 2. Redirect Bypass: Resolve final R2 URL via HEAD request
        // This prevents SW from dealing with redirects which can fail on mobile
        let remoteUrl = apiUrl;
        try {
            console.log("[DownloadStream] Resolving final URL via HEAD...");
            const headResponse = await fetch(apiUrl, { method: 'HEAD', redirect: 'follow' });
            remoteUrl = headResponse.url;
            console.log("[DownloadStream] Resolved URL:", remoteUrl);
        } catch (headErr) {
            console.warn("[DownloadStream] HEAD request failed, using API URL directly:", headErr);
            // Fall back to the API URL if HEAD fails
        }

        // 3. Mobile-First Chunking: FORCE 1MB on mobile for stability
        // On desktop, use server metadata or default to 10MB
        const chunkSize = isMobile
            ? 1048576
            : (this.fileInfo.chunkSize || this.fileInfo.partSize || 10485760);

        console.log(`[DownloadStream] Using chunkSize: ${chunkSize} (mobile: ${isMobile})`);

        // 4. The "Hail Mary" Handshake
        // Race the "READY" response against a 2-second timeout.
        const handshake = new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                console.warn("[DownloadStream] SW Silent, forcing navigation after 2s timeout.");
                resolve(); // Proceed anyway
            }, 2000);

            channel.port1.onmessage = (event) => {
                if (event.data === 'READY') {
                    console.log("[DownloadStream] SW handshake received READY.");
                    clearTimeout(timeout);
                    resolve();
                }
            };
        });

        // 5. Register the download with the SW
        console.log("[DownloadStream] Sending REGISTER_DOWNLOAD to SW...");
        navigator.serviceWorker.controller.postMessage({
            type: 'REGISTER_DOWNLOAD',
            url: virtualUrl,
            filename: this.fileInfo.fileName,
            size: this.fileInfo.fileSize,
            remoteUrl: remoteUrl,
            key: this.key,
            chunkSize: chunkSize
        }, [channel.port2]);

        // 6. Wait for readiness (or timeout), then trigger
        try {
            await handshake;
            console.log("[DownloadStream] Navigating to download URL...");
            window.location.href = virtualUrl;
        } catch (err) {
            console.error("[DownloadStream] Download Start Failed:", err);
            throw err;
        }
    }
    cancel() {
        // Service Worker downloads rely on the browser's download manager.
        // We can't easily cancel the stream once started from here, but we can stop listening.
        console.warn("Canceling Service Worker download stream is not fully supported via API.");
    }
}
