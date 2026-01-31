import type { EventContext } from '@cloudflare/workers-types';

interface Env {
    BUCKET: R2Bucket;
    DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { params, env } = context;
    const id = params.id as string;

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
            return new Response(JSON.stringify({ error: 'File not found or expired' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const objectKey = `uploads/${id}/${upload.file_name}`;
        const object = await env.BUCKET.get(objectKey as string);

        if (!object) {
            return new Response(JSON.stringify({ error: 'File not found in storage' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const headers = new Headers();
        headers.set('Content-Type', upload.content_type as string);
        headers.set('Content-Disposition', `attachment; filename="${upload.file_name}"`);
        headers.set('Content-Length', String(upload.file_size));
        headers.set('Cache-Control', 'no-cache');
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(object.body, { headers });
    } catch (error) {
        console.error('Download file error:', error);
        return new Response(JSON.stringify({ error: 'Failed to download file' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
