import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/cloudflare-pages';

// Types for Cloudflare bindings
interface Env {
    BUCKET: R2Bucket;
    DB: D1Database;
    ENVIRONMENT: string;
}

interface InitRequest {
    fileName: string;
    fileSize: number;
    contentType?: string;
}

interface SignRequest {
    uploadId: string;
    partNumbers: number[];
}

interface CompleteRequest {
    uploadId: string;
    parts: Array<{ partNumber: number; etag: string }>;
}

interface AbortRequest {
    uploadId: string;
}

// ============================================
// PROFIT-PROTECTION CHUNKING CALCULATOR
// This is CRITICAL for maintaining 78%+ margins
// ============================================
function calculateOptimalPartSize(fileSize: number): number {
    const MIN_PART_SIZE = 10 * 1024 * 1024; // 10MB - prevent abuse
    const TARGET_PART_SIZE = 100 * 1024 * 1024; // 100MB - optimal for profit
    const MAX_PART_SIZE = 500 * 1024 * 1024; // 500MB - R2 limit
    const MAX_PARTS = 10000; // R2 hard limit

    let calculatedSize = Math.floor(fileSize / 500);

    // Apply boundaries
    calculatedSize = Math.max(MIN_PART_SIZE, calculatedSize);
    calculatedSize = Math.min(TARGET_PART_SIZE, calculatedSize);

    // Edge case: if file is huge, we need larger parts to stay under 10k parts
    const minRequiredSize = Math.ceil(fileSize / MAX_PARTS);
    if (minRequiredSize > calculatedSize) {
        calculatedSize = Math.min(minRequiredSize, MAX_PART_SIZE);
    }

    return calculatedSize;
}

function generateUUID(): string {
    return crypto.randomUUID();
}

function getExpirationTime(): string {
    // 12 hours from now
    const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
    return expires.toISOString();
}

// ============================================
// HONO APP CONFIGURATION
// ============================================
const app = new Hono<{ Bindings: Env }>().basePath('/api');

// CORS middleware
app.use(
    '/*',
    cors({
        origin: '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['ETag'],
    })
);

// Health check
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// POST /api/init - Initialize Multipart Upload
// ============================================
app.post('/init', async (c) => {
    const env = c.env;
    const body = await c.req.json<InitRequest>();

    if (!body.fileName || !body.fileSize) {
        return c.json({ error: 'fileName and fileSize are required' }, 400);
    }

    // Validate file size (max 500GB)
    const maxFileSize = 500 * 1024 * 1024 * 1024;
    if (body.fileSize > maxFileSize) {
        return c.json({ error: 'File size exceeds 500GB limit' }, 400);
    }

    try {
        // Calculate optimal part size for profit protection
        const partSize = calculateOptimalPartSize(body.fileSize);
        const totalParts = Math.ceil(body.fileSize / partSize);

        // Generate unique identifiers
        const id = generateUUID();
        const objectKey = `uploads/${id}/${body.fileName}`;

        // Create multipart upload in R2
        const multipartUpload = await env.BUCKET.createMultipartUpload(objectKey, {
            httpMetadata: {
                contentType: body.contentType || 'application/octet-stream',
            },
            customMetadata: {
                originalName: body.fileName,
                uploadId: id,
            },
        });

        // Log to D1 database
        await env.DB.prepare(
            `
      INSERT INTO uploads (id, upload_id, file_name, file_size, part_size, total_parts, content_type, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
        )
            .bind(
                id,
                multipartUpload.uploadId,
                body.fileName,
                body.fileSize,
                partSize,
                totalParts,
                body.contentType || 'application/octet-stream',
                getExpirationTime()
            )
            .run();

        return c.json({
            id,
            uploadId: multipartUpload.uploadId,
            key: objectKey,
            partSize,
            totalParts,
            expiresAt: getExpirationTime(),
        });
    } catch (error) {
        console.error('Init error:', error);
        return c.json({ error: 'Failed to initialize upload' }, 500);
    }
});

// ============================================
// POST /api/sign - Generate Signed URLs (Batch)
// ============================================
app.post('/sign', async (c) => {
    const env = c.env;
    const body = await c.req.json<SignRequest>();

    if (!body.uploadId || !body.partNumbers?.length) {
        return c.json({ error: 'uploadId and partNumbers are required' }, 400);
    }

    try {
        // Verify upload exists and is valid
        const upload = await env.DB.prepare(
            `
      SELECT * FROM uploads WHERE id = ? AND status != 'aborted' AND expires_at > datetime('now')
    `
        )
            .bind(body.uploadId)
            .first();

        if (!upload) {
            return c.json({ error: 'Upload not found or expired' }, 404);
        }

        // For R2, we don't need traditional signed URLs since we're using the binding
        const signedParts = body.partNumbers.map((partNumber) => ({
            partNumber,
            uploadUrl: `/api/upload-part`,
            method: 'PUT',
        }));

        // Update status to uploading
        await env.DB.prepare(
            `
      UPDATE uploads SET status = 'uploading' WHERE id = ?
    `
        )
            .bind(body.uploadId)
            .run();

        return c.json({
            uploadId: body.uploadId,
            parts: signedParts,
            key: upload.file_name,
        });
    } catch (error) {
        console.error('Sign error:', error);
        return c.json({ error: 'Failed to generate signed URLs' }, 500);
    }
});

// ============================================
// PUT /api/upload-part - Upload a single part
// ============================================
app.put('/upload-part', async (c) => {
    const env = c.env;
    const uploadId = c.req.query('uploadId');
    const id = c.req.query('id');
    const partNumber = parseInt(c.req.query('partNumber') || '0');
    const r2UploadId = c.req.query('r2UploadId');

    if (!uploadId || !partNumber || !id || !r2UploadId) {
        return c.json({ error: 'Missing required parameters' }, 400);
    }

    try {
        // Get upload info
        const upload = (await env.DB.prepare(
            `
      SELECT * FROM uploads WHERE id = ? AND status != 'aborted'
    `
        )
            .bind(id)
            .first()) as Record<string, unknown> | null;

        if (!upload) {
            return c.json({ error: 'Upload not found' }, 404);
        }

        const objectKey = `uploads/${id}/${upload.file_name}`;

        // Get the multipart upload
        const multipartUpload = env.BUCKET.resumeMultipartUpload(
            objectKey as string,
            r2UploadId
        );

        // Upload the part
        const body = await c.req.arrayBuffer();
        const uploadedPart = await multipartUpload.uploadPart(partNumber, body);

        // Record part in database
        await env.DB.prepare(
            `
      INSERT OR REPLACE INTO upload_parts (upload_id, part_number, etag, size)
      VALUES (?, ?, ?, ?)
    `
        )
            .bind(id, partNumber, uploadedPart.etag, body.byteLength)
            .run();

        // Update completed parts count
        await env.DB.prepare(
            `
      UPDATE uploads SET completed_parts = completed_parts + 1 WHERE id = ?
    `
        )
            .bind(id)
            .run();

        return c.json({
            partNumber,
            etag: uploadedPart.etag,
            size: body.byteLength,
        });
    } catch (error) {
        console.error('Upload part error:', error);
        return c.json({ error: 'Failed to upload part' }, 500);
    }
});

// ============================================
// POST /api/complete - Finalize Multipart Upload
// ============================================
app.post('/complete', async (c) => {
    const env = c.env;
    const body = await c.req.json<CompleteRequest>();

    if (!body.uploadId || !body.parts?.length) {
        return c.json({ error: 'uploadId and parts are required' }, 400);
    }

    try {
        // Get upload info
        const upload = (await env.DB.prepare(
            `
      SELECT * FROM uploads WHERE id = ? AND status = 'uploading'
    `
        )
            .bind(body.uploadId)
            .first()) as Record<string, unknown> | null;

        if (!upload) {
            return c.json(
                { error: 'Upload not found or not in uploading state' },
                404
            );
        }

        const objectKey = `uploads/${body.uploadId}/${upload.file_name}`;

        // Resume and complete the multipart upload
        const multipartUpload = env.BUCKET.resumeMultipartUpload(
            objectKey as string,
            upload.upload_id as string
        );

        // Sort parts by part number
        const sortedParts = body.parts.sort((a, b) => a.partNumber - b.partNumber);

        const uploadedParts = sortedParts.map((p) => ({
            partNumber: p.partNumber,
            etag: p.etag,
        }));

        await multipartUpload.complete(uploadedParts);

        // Update database
        await env.DB.prepare(
            `
      UPDATE uploads 
      SET status = 'completed', completed_at = datetime('now')
      WHERE id = ?
    `
        )
            .bind(body.uploadId)
            .run();

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        await env.DB.prepare(
            `
      INSERT INTO transfer_stats (date, total_uploads, total_bytes, successful_uploads)
      VALUES (?, 1, ?, 1)
      ON CONFLICT(date) DO UPDATE SET
        total_uploads = total_uploads + 1,
        total_bytes = total_bytes + excluded.total_bytes,
        successful_uploads = successful_uploads + 1
    `
        )
            .bind(today, upload.file_size)
            .run();

        return c.json({
            success: true,
            id: body.uploadId,
            downloadUrl: `/download/${body.uploadId}`,
            expiresAt: upload.expires_at,
        });
    } catch (error) {
        console.error('Complete error:', error);
        return c.json({ error: 'Failed to complete upload' }, 500);
    }
});

// ============================================
// POST /api/abort - Abort and cleanup upload
// ============================================
app.post('/abort', async (c) => {
    const env = c.env;
    const body = await c.req.json<AbortRequest>();

    if (!body.uploadId) {
        return c.json({ error: 'uploadId is required' }, 400);
    }

    try {
        // Get upload info
        const upload = (await env.DB.prepare(
            `
      SELECT * FROM uploads WHERE id = ?
    `
        )
            .bind(body.uploadId)
            .first()) as Record<string, unknown> | null;

        if (!upload) {
            return c.json({ error: 'Upload not found' }, 404);
        }

        const objectKey = `uploads/${body.uploadId}/${upload.file_name}`;

        // Abort the multipart upload in R2
        try {
            const multipartUpload = env.BUCKET.resumeMultipartUpload(
                objectKey as string,
                upload.upload_id as string
            );
            await multipartUpload.abort();
        } catch (e) {
            console.log('Abort R2 upload failed (may already be cleaned):', e);
        }

        // Update database
        await env.DB.prepare(
            `
      UPDATE uploads SET status = 'aborted' WHERE id = ?
    `
        )
            .bind(body.uploadId)
            .run();

        // Update failed stats
        const today = new Date().toISOString().split('T')[0];
        await env.DB.prepare(
            `
      INSERT INTO transfer_stats (date, failed_uploads)
      VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET
        failed_uploads = failed_uploads + 1
    `
        )
            .bind(today)
            .run();

        return c.json({
            success: true,
            message: 'Upload aborted and cleaned up',
        });
    } catch (error) {
        console.error('Abort error:', error);
        return c.json({ error: 'Failed to abort upload' }, 500);
    }
});

// ============================================
// GET /api/download/:id - Get download info
// ============================================
app.get('/download/:id', async (c) => {
    const env = c.env;
    const id = c.req.param('id');

    try {
        const upload = (await env.DB.prepare(
            `
      SELECT * FROM uploads 
      WHERE id = ? AND status = 'completed' AND expires_at > datetime('now')
    `
        )
            .bind(id)
            .first()) as Record<string, unknown> | null;

        if (!upload) {
            return c.json({ error: 'File not found or expired' }, 404);
        }

        return c.json({
            id: upload.id,
            fileName: upload.file_name,
            fileSize: upload.file_size,
            contentType: upload.content_type,
            expiresAt: upload.expires_at,
            createdAt: upload.created_at,
        });
    } catch (error) {
        console.error('Download info error:', error);
        return c.json({ error: 'Failed to get download info' }, 500);
    }
});

// ============================================
// EXPORT FOR CLOUDFLARE PAGES FUNCTIONS
// ============================================
export const onRequest = handle(app);
