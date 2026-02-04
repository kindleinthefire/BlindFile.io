import { DownloadInfo, api } from './api';
import { decryptChunk } from './crypto';
import { DownloadStreamManager } from './downloadStream';

// Standard constant for GCM auth tag + IV overhead
const ENCRYPTION_OVERHEAD = 28; // 12 bytes IV + 16 bytes Tag

export class FileDownloader {
    private fileInfo: DownloadInfo;
    private key: CryptoKey;
    private onProgress?: (percent: number) => void;
    private onDownloadProgress?: (percent: number) => void;
    private onComplete?: () => void;
    private onError?: (error: Error) => void;
    private abortController: AbortController;
    private streamManager: DownloadStreamManager | null = null;
    private isCancelled = false;

    constructor(
        fileInfo: DownloadInfo,
        key: CryptoKey,
        callbacks?: {
            onProgress?: (percent: number) => void;
            onDownloadProgress?: (percent: number) => void;
            onComplete?: () => void;
            onError?: (error: Error) => void;
        }
    ) {
        this.fileInfo = fileInfo;
        this.key = key;
        this.onProgress = callbacks?.onProgress;
        this.onDownloadProgress = callbacks?.onDownloadProgress;
        this.onComplete = callbacks?.onComplete;
        this.onError = callbacks?.onError;
        this.abortController = new AbortController();
    }

    async start() {
        try {
            // Strategy 1: File System Access API (Chrome/Edge/Opera)
            // This is the fastest method as it writes directly to disk
            if ('showSaveFilePicker' in window) {
                await this.downloadViaFileSystem();
            } else {
                // Strategy 2: Service Worker Stream (Firefox/Safari/Fallback)
                // This simulates a stream download
                await this.downloadViaServiceWorker();
            }
        } catch (error) {
            if (this.isCancelled) return;

            // If user cancelled picker, don't error
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            if (this.onError) {
                this.onError(error instanceof Error ? error : new Error('Download failed'));
            }
        }
    }

    cancel() {
        this.isCancelled = true;
        this.abortController.abort();
        if (this.streamManager) {
            this.streamManager.cancel();
        }
    }

    // ==========================================
    // STRATEGY 1: File System Access API
    // ==========================================
    private async downloadViaFileSystem() {
        console.log('Using File System Access API');

        // 1. Request file handle
        // @ts-ignore - showSaveFilePicker is not in all TS defs yet
        const fileExtension = this.fileInfo.fileName.split('.').pop();
        const mimeType = this.fileInfo.contentType || 'application/octet-stream';

        const accept: Record<string, string[]> = {};
        if (fileExtension) {
            accept[mimeType] = [`.${fileExtension}`];
        } else {
            accept['application/octet-stream'] = ['.bin'];
        }

        const handle = await window.showSaveFilePicker({
            suggestedName: this.fileInfo.fileName,
            types: [{
                description: 'File',
                accept: accept
            }]
        });

        const writable = await handle.createWritable();

        const partSize = this.fileInfo.partSize || this.fileInfo.fileSize;
        const totalParts = Math.ceil(this.fileInfo.fileSize / partSize);
        let processedBytes = 0;
        let currentEncryptedOffset = 0;
        let currentDownloadedBytes = 0;

        // Pipelining Setup
        // We fetch the next chunk while processing the current one
        let nextFetchPromise: Promise<Response> | null = this.fetchChunk(0, partSize, currentEncryptedOffset, totalParts === 1);

        for (let i = 0; i < totalParts; i++) {
            if (this.isCancelled) {
                await writable.close();
                throw new Error('Cancelled');
            }

            // 1. Await the fetch that we started in previous iteration
            const response = await nextFetchPromise;
            if (!response || !response.ok) {
                throw new Error(`Failed to fetch part ${i}`);
            }

            // Calculations for Next Loop
            const isLastPart = i === totalParts - 1;
            const plainSize = isLastPart
                ? this.fileInfo.fileSize - (i * partSize)
                : partSize;

            // This is the offset where the NEXT chunk will start
            // Note: plainSize is what we will get after decrypting THIS chunk.
            const nextOffset = currentEncryptedOffset + (plainSize + ENCRYPTION_OVERHEAD);

            // 2. Start NEXT fetch immediately (if more parts exist)
            if (i < totalParts - 1) {
                const isNextLast = (i + 1) === totalParts - 1;
                // We use nextOffset for the next fetch
                nextFetchPromise = this.fetchChunk(i + 1, partSize, nextOffset, isNextLast);
            } else {
                nextFetchPromise = null;
            }

            // 3. Process Current Chunk (CPU + Disk IO)
            const encryptedData = await response.arrayBuffer();

            // Update DOWNLOAD Progress (Chunk fully arrived)
            currentDownloadedBytes += encryptedData.byteLength;
            if (this.onDownloadProgress) {
                // Est Total Encrypted Size = FileSize (Plain) + TotalOverhead
                const totalOverhead = totalParts * ENCRYPTION_OVERHEAD;
                const estTotalEncrypted = this.fileInfo.fileSize + totalOverhead;
                this.onDownloadProgress(Math.min(100, (currentDownloadedBytes / estTotalEncrypted) * 100));
            }

            const decryptedData = await decryptChunk(this.key, encryptedData);

            await writable.write(decryptedData);

            // Update offset for next calculation
            currentEncryptedOffset = nextOffset;

            // 4. Update DECRYPTION Progress
            processedBytes += decryptedData.byteLength;
            if (this.onProgress) {
                this.onProgress(Math.min(100, (processedBytes / this.fileInfo.fileSize) * 100));
            }
        }

        await writable.close();
        if (this.onComplete) this.onComplete();
    }

    private fetchChunk(partIndex: number, partSize: number, startOffset: number, isLastPart: boolean): Promise<Response> {
        // Calculate size of this PART's plaintext
        const plainSize = isLastPart
            ? this.fileInfo.fileSize - (partIndex * partSize)
            : partSize;

        const encryptedSize = plainSize + ENCRYPTION_OVERHEAD;
        const end = startOffset + encryptedSize - 1;

        return fetch(api.getDownloadUrl(this.fileInfo.id), {
            headers: {
                'Range': `bytes=${startOffset}-${end}`
            },
            signal: this.abortController.signal
        });
    }

    // ==========================================
    // STRATEGY 2: Service Worker Fallback
    // ==========================================
    private async downloadViaServiceWorker() {
        console.log('Falling back to Service Worker Stream');
        this.streamManager = new DownloadStreamManager(
            this.fileInfo,
            this.key,
            {
                onProgress: this.onProgress,
                onComplete: this.onComplete,
                onError: this.onError
            }
        );
        await this.streamManager.start();
    }
}
