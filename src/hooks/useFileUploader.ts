import { useCallback, useRef } from 'react';
import { useUploadStore } from '../store/uploadStore';
import { api } from '../lib/api';
import {
    generateEncryptionKey,
    exportKey,
    encryptChunk,
    formatBytes,
} from '../lib/crypto';
import { ConcurrentQueue, createUploadQueue } from '../lib/queue';

interface UploadPartTask {
    partNumber: number;
    data: ArrayBuffer;
    etag?: string;
}

interface UseFileUploaderReturn {
    upload: (file: File) => Promise<string | null>;
    pause: (id: string) => void;
    resume: (id: string) => void;
    cancel: (id: string) => void;
}

/**
 * CRITICAL: Zero-Knowledge File Uploader Hook
 * 
 * Pipeline:
 * 1. Generate AES-256-GCM key (browser only)
 * 2. Slice file based on server-provided partSize (profit protection)
 * 3. Encrypt chunks WITHOUT loading full file into RAM
 * 4. Upload chunks in parallel (4-6 concurrent)
 * 5. Key ONLY shared via URL hash (#key) - never sent to server
 */
export function useFileUploader(): UseFileUploaderReturn {
    const { addFile, updateFile, removeFile } = useUploadStore();
    const queuesRef = useRef<Map<string, ConcurrentQueue<UploadPartTask>>>(new Map());
    const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

    const upload = useCallback(async (file: File): Promise<string | null> => {
        const id = addFile(file);
        const abortController = new AbortController();
        abortControllersRef.current.set(id, abortController);

        try {
            updateFile(id, { status: 'encrypting' });

            // Step 1: Generate encryption key (NEVER leaves the browser)
            const encryptionKey = await generateEncryptionKey();
            const keyString = await exportKey(encryptionKey);

            updateFile(id, { encryptionKey: keyString });

            // Step 2: Initialize upload with server (get profit-optimized partSize)
            const initResponse = await api.initUpload(file.name, file.size, file.type);

            updateFile(id, {
                partSize: initResponse.partSize,
                totalParts: initResponse.totalParts,
                expiresAt: initResponse.expiresAt,
                completedParts: 0,
            });

            console.log(`[BlindFile] Upload initialized:`, {
                id: initResponse.id,
                partSize: formatBytes(initResponse.partSize),
                totalParts: initResponse.totalParts,
            });

            // Step 3: Create concurrent upload queue
            const queue = createUploadQueue<UploadPartTask>();
            queuesRef.current.set(id, queue);

            const completedParts: Array<{ partNumber: number; etag: string }> = [];
            let uploadedBytes = 0;
            let encryptedBytes = 0;
            const startTime = Date.now();

            // Track encryption speed
            let lastEncryptionTime = startTime;
            let lastEncryptedBytes = 0;

            // Track upload speed
            let lastUploadTime = startTime;
            let lastUploadedBytes = 0;

            queue.on('complete', (data: { id: string; result: UploadPartTask }) => {
                if (data.result.etag) {
                    completedParts.push({
                        partNumber: data.result.partNumber,
                        etag: data.result.etag,
                    });
                    uploadedBytes += data.result.data.byteLength;

                    // Calculate speed
                    const now = Date.now();
                    const elapsed = (now - lastUploadTime) / 1000;
                    if (elapsed >= 0.5) {
                        const speed = (uploadedBytes - lastUploadedBytes) / elapsed;
                        const remaining = (file.size - uploadedBytes) / (speed || 1);

                        updateFile(id, {
                            uploadProgress: (uploadedBytes / file.size) * 100,
                            speed,
                            timeRemaining: remaining,
                            completedParts: completedParts.length,
                        });

                        lastUploadTime = now;
                        lastUploadedBytes = uploadedBytes;
                    }
                }
            });

            queue.on('error', (data: { id: string; error: Error }) => {
                console.error(`[BlindFile] Part upload failed:`, data.error);
            });

            queue.on('pause', () => {
                updateFile(id, { status: 'paused' });
            });

            queue.on('resume', () => {
                updateFile(id, { status: 'uploading' });
            });

            // Step 4: Slice, encrypt, and queue uploads
            const partSize = initResponse.partSize;
            const totalParts = initResponse.totalParts;

            updateFile(id, { status: 'uploading' });

            for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
                if (abortController.signal.aborted) break;

                const start = (partNumber - 1) * partSize;
                const end = Math.min(start + partSize, file.size);
                const chunk = file.slice(start, end);

                // Read chunk WITHOUT loading full file
                const chunkBuffer = await chunk.arrayBuffer();

                // Encrypt chunk
                const encryptedChunk = await encryptChunk(encryptionKey, chunkBuffer);

                encryptedBytes += chunkBuffer.byteLength;

                // Update encryption progress
                const encryptNow = Date.now();
                const encryptElapsed = (encryptNow - lastEncryptionTime) / 1000;
                if (encryptElapsed >= 0.5) {
                    const encryptSpeed = (encryptedBytes - lastEncryptedBytes) / encryptElapsed;
                    updateFile(id, {
                        encryptionProgress: (encryptedBytes / file.size) * 100,
                        encryptionSpeed: encryptSpeed,
                    });
                    lastEncryptionTime = encryptNow;
                    lastEncryptedBytes = encryptedBytes;
                }

                // Queue upload
                queue.add({
                    id: `part-${partNumber}`,
                    execute: async () => {
                        const result = await api.uploadPart(
                            initResponse.id,
                            id,
                            initResponse.uploadId,
                            partNumber,
                            encryptedChunk
                        );
                        return {
                            partNumber,
                            data: encryptedChunk,
                            etag: result.etag,
                        };
                    },
                });
            }

            // Wait for all parts to complete
            await new Promise<void>((resolve, reject) => {
                const checkComplete = setInterval(() => {
                    if (abortController.signal.aborted) {
                        clearInterval(checkComplete);
                        reject(new Error('Upload cancelled'));
                        return;
                    }

                    if (queue.pending === 0 && queue.active === 0) {
                        clearInterval(checkComplete);

                        if (completedParts.length === totalParts) {
                            resolve();
                        } else if (queue.paused) {
                            // Wait for resume
                        } else {
                            reject(new Error(`Only ${completedParts.length}/${totalParts} parts completed`));
                        }
                    }
                }, 100);
            });

            // Step 5: Complete upload
            const completeResponse = await api.completeUpload(initResponse.id, completedParts);

            // Generate download URL with encryption key in hash
            const downloadUrl = `${window.location.origin}/download/${initResponse.id}#${keyString}`;

            updateFile(id, {
                status: 'completed',
                progress: 100,
                encryptionProgress: 100,
                uploadProgress: 100,
                downloadUrl,
                expiresAt: completeResponse.expiresAt,
            });

            console.log(`[BlindFile] Upload complete:`, {
                id: initResponse.id,
                downloadUrl: downloadUrl.substring(0, 50) + '...',
            });

            // Cleanup
            queuesRef.current.delete(id);
            abortControllersRef.current.delete(id);

            return initResponse.id;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';

            if (errorMessage !== 'Upload cancelled') {
                updateFile(id, {
                    status: 'error',
                    error: errorMessage,
                });
            }

            // Attempt to abort the upload on server
            try {
                await api.abortUpload(id);
            } catch (e) {
                console.error('[BlindFile] Failed to abort on server:', e);
            }

            // Cleanup
            queuesRef.current.delete(id);
            abortControllersRef.current.delete(id);

            return null;
        }
    }, [addFile, updateFile]);

    const pause = useCallback((id: string) => {
        const queue = queuesRef.current.get(id);
        if (queue) {
            queue.pause();
        }
    }, []);

    const resume = useCallback((id: string) => {
        const queue = queuesRef.current.get(id);
        if (queue) {
            queue.resume();
        }
    }, []);

    const cancel = useCallback(async (id: string) => {
        const abortController = abortControllersRef.current.get(id);
        if (abortController) {
            abortController.abort();
        }

        const queue = queuesRef.current.get(id);
        if (queue) {
            queue.clear();
        }

        try {
            await api.abortUpload(id);
        } catch (e) {
            console.error('[BlindFile] Failed to abort:', e);
        }

        removeFile(id);
    }, [removeFile]);

    return {
        upload,
        pause,
        resume,
        cancel,
    };
}
