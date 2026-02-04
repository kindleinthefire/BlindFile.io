import { DownloadInfo, api } from './api';
import { decryptChunk } from './crypto';

// Standard constant for GCM auth tag + IV overhead
const ENCRYPTION_OVERHEAD = 28; // 12 bytes IV + 16 bytes Tag

export class DownloadStreamManager {
    private sw: ServiceWorker | null = null;
    private fileInfo: DownloadInfo;
    private key: CryptoKey;
    private abortController: AbortController;
    private queue: { start: number; end: number; partIndex: number }[] = [];
    private isProcessing = false;
    private credits = 0; // Backpressure credits
    private downloadUrlId: string;
    private onProgress?: (percent: number) => void;
    private onComplete?: () => void;
    private onError?: (error: Error) => void;
    private processedBytes = 0;
    private totalBytes: number;

    constructor(
        fileInfo: DownloadInfo,
        key: CryptoKey,
        callbacks?: {
            onProgress?: (percent: number) => void;
            onComplete?: () => void;
            onError?: (error: Error) => void;
        }
    ) {
        this.fileInfo = fileInfo;
        this.key = key;
        this.onProgress = callbacks?.onProgress;
        this.onComplete = callbacks?.onComplete;
        this.onError = callbacks?.onError;
        this.totalBytes = fileInfo.fileSize;
        this.abortController = new AbortController();
        this.downloadUrlId = `/stream-download/${fileInfo.id}/${encodeURIComponent(fileInfo.fileName)}`;
    }

    /**
     * Start the download process
     */
    async start() {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker not supported');
        }

        const registration = await navigator.serviceWorker.ready;
        this.sw = registration.active;

        if (!this.sw) {
            throw new Error('Service Worker not active');
        }

        // Setup channel for PULL requests
        const channel = new MessageChannel();
        channel.port1.onmessage = this.handleMessage.bind(this);

        // 1. Register download with SW
        this.sw.postMessage({
            type: 'REGISTER_DOWNLOAD',
            url: this.downloadUrlId,
            filename: this.fileInfo.fileName,
            size: this.fileInfo.fileSize
        }, [channel.port2]);

        // Wait for OK? (Optional, but good practice)
        // For now, assuming SW is ready.

        // 2. Generate chunks queue
        // We need to fetch encrypted chunks corresponding to the plaintext parts.
        // Part N Plaintext Size -> Encrypted Size = Plain + 28
        // R2 usually concatenates these.

        const partSize = this.fileInfo.partSize || this.fileInfo.fileSize;
        // Fallback to full file if partSize missing (legacy support)

        const totalParts = Math.ceil(this.fileInfo.fileSize / partSize);

        let currentEncryptedOffset = 0;

        for (let i = 0; i < totalParts; i++) {
            // Calculate size of this PART's plaintext
            const isLastPart = i === totalParts - 1;
            const plainSize = isLastPart
                ? this.fileInfo.fileSize - (i * partSize)
                : partSize;

            const encryptedSize = plainSize + ENCRYPTION_OVERHEAD;

            this.queue.push({
                start: currentEncryptedOffset,
                end: currentEncryptedOffset + encryptedSize - 1,
                partIndex: i
            });

            currentEncryptedOffset += encryptedSize;
        }

        // 3. Trigger Download in Browser
        const iframe = document.createElement('iframe');
        iframe.hidden = true;
        iframe.src = this.downloadUrlId;
        iframe.name = 'BlindFileDownload';
        document.body.appendChild(iframe);

        // The SW will intercept this request.
        // Then it will send 'PULL' messages to channel.port1
    }

    private async handleMessage(event: MessageEvent) {
        const data = event.data;

        if (data && data.type === 'PULL') {
            this.credits++;
            this.processQueue();
        }

        if (data && data.type === 'CANCEL') {
            this.abortController.abort();
        }
    }

    private async processQueue() {
        if (this.isProcessing) return;
        if (this.credits <= 0) return;
        if (this.queue.length === 0) {
            // Done?
            if (this.sw) {
                this.sw.postMessage({
                    type: 'CLOSE_STREAM',
                    url: this.downloadUrlId
                });
            }
            if (this.onComplete) this.onComplete();
            return;
        }

        this.isProcessing = true;
        this.credits--; // Consume credit

        const chunkInfo = this.queue.shift();
        if (!chunkInfo) return;

        try {
            // Fetch chunk from R2 via Backend Proxy
            const response = await fetch(`${api.getDownloadUrl(this.fileInfo.id)}`, {
                headers: {
                    'Range': `bytes=${chunkInfo.start}-${chunkInfo.end}`
                },
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch chunk: ${response.status}`);
            }

            const encryptedBuffer = await response.arrayBuffer();

            // Decrypt
            const decryptedBuffer = await decryptChunk(this.key, encryptedBuffer);

            // Update Progress
            this.processedBytes += decryptedBuffer.byteLength;
            if (this.onProgress && this.totalBytes > 0) {
                this.onProgress(Math.min(100, (this.processedBytes / this.totalBytes) * 100));
            }

            // Send to SW
            if (this.sw) {
                this.sw.postMessage({
                    type: 'ENQUEUE_CHUNK',
                    url: this.downloadUrlId,
                    chunk: decryptedBuffer
                }, [decryptedBuffer]); // Transferable
            }

            this.isProcessing = false;

            // If we have more credits (SW asked for multiple), process next
            if (this.credits > 0) {
                this.processQueue();
            } else if (this.queue.length === 0) {
                // Determine if completely done
                this.sw?.postMessage({
                    type: 'CLOSE_STREAM',
                    url: this.downloadUrlId
                });
                if (this.onComplete) this.onComplete();
            }

        } catch (error) {
            console.error('Download stream error:', error);
            if (this.sw) {
                this.sw.postMessage({
                    type: 'ABORT_STREAM',
                    url: this.downloadUrlId,
                    reason: error instanceof Error ? error.message : 'Download failed'
                });
            }
            this.isProcessing = false;
            if (this.onError) this.onError(error instanceof Error ? error : new Error('Download failed'));
        }
    }

    cancel() {
        this.abortController.abort();
        if (this.sw) {
            this.sw.postMessage({
                type: 'ABORT_STREAM',
                url: this.downloadUrlId,
                reason: 'User cancelled'
            });
        }
    }
}
