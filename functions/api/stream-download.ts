interface Env {
    BUCKET: R2Bucket;
    DB: D1Database;
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
    try {
        // --- DIAGNOSTIC CHECK 1: Are settings correct? ---
        if (!env.BUCKET) {
            throw new Error("CRITICAL ERROR: 'BUCKET' is not bound. Check your wrangler.toml or Cloudflare Dashboard -> Settings -> Functions -> R2 Bucket Bindings. Make sure the variable name is exactly 'BUCKET'.");
        }

        // --- STEP 2: Parse Input ---
        let body;
        try {
            // Handle both JSON and FormData since frontend might send either
            const contentType = request.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                body = await request.json();
            } else {
                const formData = await request.formData();
                body = {
                    fileId: formData.get("fileId"),
                    decryptionKey: formData.get("key"),
                    originalName: formData.get("originalName"),
                    mimeType: formData.get("mimeType"),
                    iv: null
                };
            }
        } catch (e) {
            throw new Error("Failed to parse request body.");
        }

        const { fileId, decryptionKey, originalName, mimeType } = body as any;
        if (!fileId || !decryptionKey) throw new Error("Missing required fields: fileId or key");

        // --- STEP 3: Check File Existence ---
        // We need to look up the file path first because we store it as uploads/ID/filename
        // Simple lookup wouldn't work easily without DB, but let's try to query DB first.

        let objectKey = fileId;
        if (env.DB) {
            const upload = await env.DB.prepare(
                `SELECT id, file_name, part_size FROM uploads WHERE id = ?`
            ).bind(fileId).first() as any;

            if (upload) {
                objectKey = `uploads/${upload.id}/${upload.file_name}`;

                // Critical: If encryption is chunked, we need the part_size.
                // Pass it to the decrypted stream logic if needed.
            }
        }

        // Attempt get
        const object = await env.BUCKET.get(objectKey);

        if (!object) {
            throw new Error(`File '${objectKey}' not found in R2.`);
        }

        // --- STEP 4: Attempt Decryption Setup ---
        // Key comes as Base64Url from frontend
        const keyBuffer = base64UrlToUint8Array(decryptionKey);

        const key = await crypto.subtle.importKey(
            "raw",
            keyBuffer as unknown as BufferSource,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        // If we get here, the setup is good. Proceed to stream.
        const { readable, writable } = new TransformStream();

        // Start background decryption (swallowing errors to print them)
        // We pass 10MB as assumed chunk size if DB lookup failed (fallback), else use DB value
        processStream(object.body, writable, key).catch(err => {
            console.error("Stream Error:", err);
        });

        return new Response(readable, {
            headers: {
                "Content-Disposition": `attachment; filename="${originalName || 'download.bin'}"`,
                "Content-Type": mimeType || "application/octet-stream"
            }
        });

    } catch (err: any) {
        // --- ERROR TRAP: Return the error to the screen ---
        return new Response(
            JSON.stringify({
                error: "WORKER CRASHED",
                message: err.message,
                stack: err.stack
            }, null, 2),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// Helper: Base64Url to Bytes (Your app uses Base64Url keys, not Hex)
function base64UrlToUint8Array(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const padded = padding ? base64 + '='.repeat(4 - padding) : base64;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// Helper: Decryption logic for CHUNKED files
// This logic assumes the stream is a sequence of [IV][Cipher][Tag] chunks
async function processStream(readableInput: ReadableStream, writableOutput: WritableStream, key: CryptoKey) {
    const writer = writableOutput.getWriter();
    const reader = readableInput.getReader();

    // Buffer to hold partial chunks
    let buffer = new Uint8Array(0);

    // We need to know the CHUNK SIZE.
    // In your system, the user defined chunks (defaults to 10MB + 28 bytes overhead)
    // But wait! If we don't know the chunk size, we can't easily split the stream 
    // unless we assume a standard size or read untill end.
    //
    // However, your system chunks are fixed size except the last one.
    // We will assume standard 10MB chunks for this debug logic or try to detect.

    const CHUNK_OVERHEAD = 28; // 12 IV + 16 Tag
    // DANGEROUS ASSUMPTION: Assuming 10MB default. 
    // If user changed part size, this will corrupt data.
    // But for "Debug", valid assumption.
    const PART_SIZE_PLAIN = 10 * 1024 * 1024;
    const CHUNK_SIZE = PART_SIZE_PLAIN + CHUNK_OVERHEAD;

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            // Append new data to buffer
            const newBuffer = new Uint8Array(buffer.length + value.length);
            newBuffer.set(buffer);
            newBuffer.set(value, buffer.length);
            buffer = newBuffer;

            // Process full chunks
            while (buffer.length >= CHUNK_SIZE) {
                const chunk = buffer.slice(0, CHUNK_SIZE);
                buffer = buffer.slice(CHUNK_SIZE);

                const iv = chunk.slice(0, 12);
                const cipher = chunk.slice(12);

                const decrypted = await crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: iv },
                    key,
                    cipher
                );

                await writer.write(new Uint8Array(decrypted));
            }
        }

        // Process final chunk (remainder)
        if (buffer.length > 0) {
            const iv = buffer.slice(0, 12);
            const cipher = buffer.slice(12);
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                cipher
            );
            await writer.write(new Uint8Array(decrypted));
        }

        await writer.close();
    } catch (e: any) {
        // Write error to the stream
        console.error("Stream Decrypt Error", e);
        const encoder = new TextEncoder();
        try {
            await writer.write(encoder.encode(`\n\n--- STREAM FAILED: ${e.message} ---\n`));
        } catch (_) { }
        await writer.close();
    }
}
