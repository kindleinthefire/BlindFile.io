import { supabase } from './supabase';

const API_BASE = '/api';

export interface InitUploadResponse {
    id: string;
    uploadId: string;
    key: string;
    partSize: number;
    totalParts: number;
    expiresAt: string;
}

export interface SignedPartsResponse {
    uploadId: string;
    parts: Array<{
        partNumber: number;
        uploadUrl: string;
        method: string;
    }>;
    key: string;
}

export interface UploadPartResponse {
    partNumber: number;
    etag: string;
    size: number;
}

export interface CompleteUploadResponse {
    success: boolean;
    id: string;
    downloadUrl: string;
    expiresAt: string;
}

export interface DownloadInfo {
    id: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    expiresAt: string;
    createdAt: string;
    partSize: number;
    encryptedMetadata?: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const { data: { session } } = await supabase.auth.getSession();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (session) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Initialize a multipart upload
     */
    async initUpload(
        fileName: string,
        fileSize: number,
        contentType?: string,
        encryptedMetadata?: string
    ): Promise<InitUploadResponse> {
        return this.request<InitUploadResponse>('/upload/init', {
            method: 'POST',
            body: JSON.stringify({ fileName, fileSize, contentType, encryptedMetadata }),
        });
    }

    /**
     * Get signed URLs for batch of parts
     */
    async signParts(
        uploadId: string,
        partNumbers: number[]
    ): Promise<SignedPartsResponse> {
        return this.request<SignedPartsResponse>('/upload/sign', {
            method: 'POST',
            body: JSON.stringify({ uploadId, partNumbers }),
        });
    }

    /**
     * Upload a single part
     */
    async uploadPart(
        id: string,
        uploadId: string,
        r2UploadId: string,
        partNumber: number,
        data: ArrayBuffer
    ): Promise<UploadPartResponse> {
        const params = new URLSearchParams({
            id,
            uploadId,
            r2UploadId,
            partNumber: partNumber.toString(),
        });

        const response = await fetch(
            `${this.baseUrl}/upload/part?${params.toString()}`,
            {
                method: 'PUT',
                body: data,
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' })) as { error?: string };
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Complete the multipart upload
     */
    async completeUpload(
        uploadId: string,
        parts: Array<{ partNumber: number; etag: string }>
    ): Promise<CompleteUploadResponse> {
        return this.request<CompleteUploadResponse>('/upload/complete', {
            method: 'POST',
            body: JSON.stringify({ uploadId, parts }),
        });
    }

    /**
     * Abort an upload
     */
    async abortUpload(uploadId: string): Promise<void> {
        await this.request('/upload/abort', {
            method: 'POST',
            body: JSON.stringify({ uploadId }),
        });
    }

    /**
     * Get download info
     */
    async getDownloadInfo(id: string): Promise<DownloadInfo> {
        return this.request<DownloadInfo>(`/download/${id}`);
    }

    /**
     * Get download URL
     */
    getDownloadUrl(id: string): string {
        return `${this.baseUrl}/download/${id}/file`;
    }
}

export const api = new ApiClient();
