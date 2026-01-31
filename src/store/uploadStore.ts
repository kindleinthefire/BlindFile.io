import { create } from 'zustand';

export interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    status: 'pending' | 'encrypting' | 'uploading' | 'completed' | 'error' | 'paused';
    progress: number;
    encryptionProgress: number;
    uploadProgress: number;
    speed: number;
    encryptionSpeed: number;
    timeRemaining: number;
    error?: string;
    downloadUrl?: string;
    encryptionKey?: string;
    expiresAt?: string;
    partSize?: number;
    totalParts?: number;
    completedParts?: number;
}

export interface UploadStats {
    totalBytes: number;
    uploadedBytes: number;
    encryptedBytes: number;
    overallProgress: number;
    activeUploads: number;
    completedUploads: number;
    failedUploads: number;
}

interface UploadStore {
    files: Map<string, UploadFile>;
    stats: UploadStats;

    // Actions
    addFile: (file: File) => string;
    updateFile: (id: string, updates: Partial<UploadFile>) => void;
    removeFile: (id: string) => void;
    clearCompleted: () => void;
    reset: () => void;

    // Computed
    getFile: (id: string) => UploadFile | undefined;
    getAllFiles: () => UploadFile[];
}

const initialStats: UploadStats = {
    totalBytes: 0,
    uploadedBytes: 0,
    encryptedBytes: 0,
    overallProgress: 0,
    activeUploads: 0,
    completedUploads: 0,
    failedUploads: 0,
};

function generateId(): string {
    return crypto.randomUUID();
}

function calculateStats(files: Map<string, UploadFile>): UploadStats {
    let totalBytes = 0;
    let uploadedBytes = 0;
    let encryptedBytes = 0;
    let activeUploads = 0;
    let completedUploads = 0;
    let failedUploads = 0;

    files.forEach((file) => {
        totalBytes += file.size;
        uploadedBytes += (file.uploadProgress / 100) * file.size;
        encryptedBytes += (file.encryptionProgress / 100) * file.size;

        if (file.status === 'encrypting' || file.status === 'uploading') {
            activeUploads++;
        } else if (file.status === 'completed') {
            completedUploads++;
        } else if (file.status === 'error') {
            failedUploads++;
        }
    });

    return {
        totalBytes,
        uploadedBytes,
        encryptedBytes,
        overallProgress: totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0,
        activeUploads,
        completedUploads,
        failedUploads,
    };
}

export const useUploadStore = create<UploadStore>((set, get) => ({
    files: new Map(),
    stats: initialStats,

    addFile: (file: File) => {
        const id = generateId();
        const uploadFile: UploadFile = {
            id,
            file,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            status: 'pending',
            progress: 0,
            encryptionProgress: 0,
            uploadProgress: 0,
            speed: 0,
            encryptionSpeed: 0,
            timeRemaining: 0,
        };

        set((state) => {
            const newFiles = new Map(state.files);
            newFiles.set(id, uploadFile);
            return {
                files: newFiles,
                stats: calculateStats(newFiles),
            };
        });

        return id;
    },

    updateFile: (id: string, updates: Partial<UploadFile>) => {
        set((state) => {
            const file = state.files.get(id);
            if (!file) return state;

            const updatedFile = { ...file, ...updates };

            // Calculate combined progress
            updatedFile.progress =
                (updatedFile.encryptionProgress * 0.3) + (updatedFile.uploadProgress * 0.7);

            const newFiles = new Map(state.files);
            newFiles.set(id, updatedFile);

            return {
                files: newFiles,
                stats: calculateStats(newFiles),
            };
        });
    },

    removeFile: (id: string) => {
        set((state) => {
            const newFiles = new Map(state.files);
            newFiles.delete(id);
            return {
                files: newFiles,
                stats: calculateStats(newFiles),
            };
        });
    },

    clearCompleted: () => {
        set((state) => {
            const newFiles = new Map(state.files);
            newFiles.forEach((file, id) => {
                if (file.status === 'completed') {
                    newFiles.delete(id);
                }
            });
            return {
                files: newFiles,
                stats: calculateStats(newFiles),
            };
        });
    },

    reset: () => {
        set({ files: new Map(), stats: initialStats });
    },

    getFile: (id: string) => {
        return get().files.get(id);
    },

    getAllFiles: () => {
        return Array.from(get().files.values());
    },
}));
