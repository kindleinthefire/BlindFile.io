-- Blind File D1 Schema
-- Ephemeral metadata storage with 12-hour TTL

-- Main uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,                          -- UUID for the upload
    upload_id TEXT NOT NULL,                       -- R2 multipart upload ID
    file_name TEXT NOT NULL,                       -- Original filename
    file_size INTEGER NOT NULL,                    -- Total file size in bytes
    part_size INTEGER NOT NULL,                    -- Chunk size used for this upload
    total_parts INTEGER NOT NULL,                  -- Expected number of parts
    completed_parts INTEGER DEFAULT 0,             -- Number of parts uploaded
    status TEXT DEFAULT 'pending',                 -- pending, uploading, completed, aborted
    content_type TEXT,                             -- MIME type
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,                  -- Auto-delete timestamp (12 hours from creation)
    completed_at DATETIME                          -- When upload was finalized
);

-- Index for fast cleanup queries - critical for cron trigger performance
CREATE INDEX IF NOT EXISTS idx_uploads_expires_at ON uploads(expires_at);

-- Index for status lookups
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);

-- Parts tracking table for resumable uploads
CREATE TABLE IF NOT EXISTS upload_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id TEXT NOT NULL,                       -- References uploads.id
    part_number INTEGER NOT NULL,
    etag TEXT,                                     -- ETag returned from R2
    size INTEGER NOT NULL,                         -- Part size in bytes
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    UNIQUE(upload_id, part_number)
);

-- Index for fast part lookups
CREATE INDEX IF NOT EXISTS idx_parts_upload_id ON upload_parts(upload_id);

-- Analytics table for monitoring (optional, lightweight)
CREATE TABLE IF NOT EXISTS transfer_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                            -- YYYY-MM-DD format
    total_uploads INTEGER DEFAULT 0,
    total_bytes INTEGER DEFAULT 0,
    successful_uploads INTEGER DEFAULT 0,
    failed_uploads INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_date ON transfer_stats(date);
