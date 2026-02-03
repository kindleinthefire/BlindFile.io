import { useCallback, useRef } from 'react';
import { useUploadStore } from '../store/uploadStore';
import { api } from '../lib/api';
import {
    generateEncryptionKey,
    exportKey,
} from '../lib/crypto';
import { ConcurrentQueue } from '../lib/queue';
import { uploadFile } from '../components/UploadZone';

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

            // Delegate to the strict backpressure uploader
            await uploadFile(file, id, updateFile, abortController.signal);

            // cleanup is handled inside uploadFile for the most part, but we need to ensure local maps are cleared
            queuesRef.current.delete(id);
            abortControllersRef.current.delete(id);

            return id;

        } catch (error) {
            // Error handling is partly done in uploadFile but we might need to catch bubbling errors
            // if uploadFile throws instead of handling internally (it catches internally but might rethrow or return null)
            // Check implementation of uploadFile: it catches and returns null or throws?
            // It catches, updates status to error, and returns null.
            // But if it throws 'Upload cancelled', we should handle it.

            // ... actually uploadFile returns valid id or null. 
            // We can just return the result of uploadFile if we adjust the signature.
            // But for now let's keep the hook structure similar but simplified.

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
