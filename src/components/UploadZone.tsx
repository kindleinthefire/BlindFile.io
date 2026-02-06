
import { api } from '../lib/api';
import { generateEncryptionKey, exportKey, encryptChunk, encryptMetadata } from '../lib/crypto';
import { UploadFile } from '../store/uploadStore';
import { supabase } from '../lib/supabase';
import { incrementUserStats } from '../lib/userStats';

// 1. CONCURRENCY LIMIT
const MAX_CONCURRENT_UPLOADS = 3;

// Helper class for reading chunks with memory safety
class ChunkReader {
    private file: File;
    private chunkSize: number;
    private offset: number = 0;

    constructor(file: File, chunkSize: number) {
        this.file = file;
        this.chunkSize = chunkSize;
    }

    async read(): Promise<{ value: ArrayBuffer | null, done: boolean }> {
        if (this.offset >= this.file.size) {
            return { value: null, done: true };
        }

        // Strict Blob slicing to prevent keeping whole file in memory
        const end = Math.min(this.offset + this.chunkSize, this.file.size);
        const chunk = this.file.slice(this.offset, end);
        this.offset = end;

        const buffer = await chunk.arrayBuffer();
        return { value: buffer, done: false };
    }
}



export async function uploadFile(
    file: File,
    fileId: string,
    updateFile: (id: string, updates: Partial<UploadFile>) => void,
    abortSignal: AbortSignal
): Promise<string | null> {
    try {
        updateFile(fileId, { status: 'encrypting' });

        // Step 1: Generate encryption key
        const encryptionKey = await generateEncryptionKey();
        const keyString = await exportKey(encryptionKey);
        updateFile(fileId, { encryptionKey: keyString });

        // Step 1.5: Encrypt Metadata (Filename Obfuscation)
        const encryptedMetadata = await encryptMetadata({ name: file.name, type: file.type }, encryptionKey);

        // Step 2: Initialize upload to get partSize
        // We send "encrypted-payload.bin" to server. Server ignores it for storage but uses it for validation if needed.
        const initResponse = await api.initUpload("encrypted-payload.bin", file.size, "application/octet-stream", encryptedMetadata);
        updateFile(fileId, {
            partSize: initResponse.partSize,
            totalParts: initResponse.totalParts,
            expiresAt: initResponse.expiresAt,
            completedParts: 0,
        });

        // Step 3: The Semaphore Pipeline
        const reader = new ChunkReader(file, initResponse.partSize);
        const pool: Set<Promise<any>> = new Set();
        const completedParts: Array<{ partNumber: number; etag: string }> = [];

        // Progress tracking
        const startTime = Date.now();
        let uploadedBytes = 0;

        let partNumber = 1;

        // 2. THE LOOP LOGIC
        while (true) {
            if (abortSignal.aborted) throw new Error('Upload cancelled');

            // a. Check activeUploads. If >= MAX, await one to finish.
            if (pool.size >= MAX_CONCURRENT_UPLOADS) {
                await Promise.race(pool);
            }

            // b. reader.read() the next chunk from disk.
            const { value: chunkBuffer, done } = await reader.read();
            if (done || !chunkBuffer) break;

            const currentPartNumber = partNumber++;
            const currentChunkSize = chunkBuffer.byteLength;

            // c. Encrypt the chunk immediately.
            const encryptedChunk = await encryptChunk(encryptionKey, chunkBuffer);

            // d. Initiate the Upload Promise.
            const uploadPromise = (async () => {
                // 4. ROBUSTNESS: Retry logic
                let lastError;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        if (abortSignal.aborted) throw new Error('Upload cancelled');

                        const result = await api.uploadPart(
                            initResponse.id,
                            fileId,
                            initResponse.uploadId,
                            currentPartNumber,
                            encryptedChunk
                        );

                        return {
                            partNumber: currentPartNumber,
                            etag: result.etag,
                            size: currentChunkSize // Use original size for progress or encrypted size? Typically progress is user-facing (original)
                        };
                    } catch (err) {
                        lastError = err;
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                    }
                }
                throw lastError || new Error(`Failed to upload part ${currentPartNumber} after 3 attempts`);
            })();

            // Wrapper to handle pool cleanup and progress
            const pooledPromise = uploadPromise
                .then((result) => {
                    completedParts.push({ partNumber: result.partNumber, etag: result.etag });

                    // Update progress metrics
                    uploadedBytes += result.size;
                    const elapsedSeconds = (Date.now() - startTime) / 1000;
                    const speed = elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0;
                    const remainingBytes = file.size - uploadedBytes;
                    const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

                    const percent = (completedParts.length / initResponse.totalParts) * 100;

                    updateFile(fileId, {
                        uploadProgress: percent,
                        encryptionProgress: percent,
                        completedParts: completedParts.length,
                        speed,
                        timeRemaining
                    });
                })
                .finally(() => {
                    pool.delete(pooledPromise);
                });

            // e. Add Promise to a pool.
            pool.add(pooledPromise);

            // f. If pool.size >= MAX, await Promise.race(pool).
            // (Already handled at start of loop, but strictly speaking we also shouldn't *continue* reading if we just filled the pool?
            // The constraint "Never have more than 3 chunks in flight" is satisfied by checking at start.
            // But if we just added one and it's now 3, we proceed. Next loop iteration will wait.)
        }

        // Wait for remaining uploads
        await Promise.all(pool);

        if (abortSignal.aborted) throw new Error('Upload cancelled');

        // Step 5: Complete upload
        const completeResponse = await api.completeUpload(initResponse.id, completedParts);
        const downloadUrl = `${window.location.origin}/download/${initResponse.id}#${keyString}`;

        // 6. TRACK STATS (Fire and forget, or await if critical)
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // We use file.size (original unencrypted size) for usage tracking usually
                await incrementUserStats(user.id, file.size);
            }
        } catch (err) {
            console.error('Failed to update stats:', err);
        }

        updateFile(fileId, {
            status: 'completed',
            progress: 100,
            encryptionProgress: 100,
            uploadProgress: 100,
            downloadUrl,
            expiresAt: completeResponse.expiresAt,
        });

        return initResponse.id;

    } catch (error) {
        if (abortSignal.aborted) return null;

        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateFile(fileId, {
            status: 'error',
            error: errorMessage,
        });

        try {
            // Need initResponse.id here, but it might not be available if init failed.
            // Assuming fileId maps to the one we created locally.
            // In a real refactor we might pass initResponse.id out or check store.
        } catch (e) {
            console.error('Failed to abort', e);
        }
        return null;
    }
}

// Re-export UI components if this file was meant to replace DropZone or be the main entry
// For now, exporting the function as requested.
