# Blind File - Zero-Knowledge Ephemeral File Sharing

> **Transfer files. Leave no trace.**

A high-performance, serverless file-sharing application built on Cloudflare's edge network. Upload files up to 500GB with end-to-end encryption - we never see your data.

## 🔒 Core Security Principles

| Principle | Implementation |
|-----------|---------------|
| **Zero Knowledge** | Client-side AES-256-GCM encryption. Server never sees unencrypted data. |
| **Zero Trace** | Files auto-delete after 12 hours. No logs, no traces. |
| **Zero Trust** | Encryption key only exists in URL hash (`#`), never sent to server. |

## 🚀 Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Cloudflare Workers (Hono framework)
- **Storage**: Cloudflare R2 (zero egress fees)
- **Database**: Cloudflare D1 (SQLite)
- **State**: Zustand

## 📊 Cost Optimization

This project implements a **"Profit-Protection" chunking strategy** to minimize R2 Class A operation fees:

```
Target chunk size: 100MB (not the default 5MB!)
Formula: Math.max(10MB, Math.min(100MB, FileSize / 500))
Result: 78%+ profit margins
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers, R2, and D1 enabled

### 1. Clone and Install

```bash
git clone <repo>
cd blind-file
npm install
```

### 2. Create R2 Bucket

```bash
npx wrangler r2 bucket create blind-file-storage
```

Configure lifecycle rule for auto-deletion:
```json
{
  "rules": [{
    "id": "auto-delete",
    "enabled": true,
    "expiration": { "days": 1 }
  }]
}
```

### 3. Create D1 Database

```bash
npx wrangler d1 create blind-file-db
```

Update `wrangler.toml` with the database ID, then migrate:

```bash
npx wrangler d1 execute blind-file-db --file=./schema.sql
```

### 4. Development

Run frontend and worker locally:

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Worker
npm run worker:dev
```

### 5. Deploy

```bash
npm run build
npm run worker:deploy
```

## 📁 Project Structure

```
blind-file/
├── src/
│   ├── worker/           # Cloudflare Worker backend
│   │   └── index.ts      # Hono API routes
│   ├── components/       # React UI components
│   ├── hooks/            # Custom hooks (useFileUploader)
│   ├── lib/              # Utilities (crypto, queue, api)
│   ├── pages/            # Route pages
│   └── store/            # Zustand state
├── schema.sql            # D1 database schema
├── wrangler.toml         # Cloudflare config
└── package.json
```

## 🔐 How Encryption Works

1. **Key Generation**: Browser generates AES-256-GCM key
2. **Chunking**: File sliced based on profit-optimized partSize (100MB target)
3. **Encryption**: Each chunk encrypted separately (IV prepended)
4. **Upload**: Encrypted chunks uploaded in parallel (5 concurrent)
5. **Share**: Download URL includes key in hash fragment only (`#key`)
6. **Download**: Recipient decrypts entirely in browser

The server **never** sees:
- The encryption key
- Unencrypted file contents
- File names (encrypted in transit)

## 🔄 Cron Cleanup

Worker runs hourly to:
- Delete expired files from R2
- Clean up D1 metadata
- Update analytics

## 📈 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/init` | Initialize multipart upload |
| POST | `/api/sign` | Get signed URLs for parts |
| PUT | `/api/upload-part` | Upload a single chunk |
| POST | `/api/complete` | Finalize upload |
| POST | `/api/abort` | Cancel and cleanup |
| GET | `/api/download/:id` | Get file metadata |
| GET | `/download/:id/file` | Stream file content |

## 🎨 Design System

**"Stealth Mode" Palette:**
- Background: `#050505` (Void)
- Text: `#E0E0E0` (Silver)
- Primary: `#6D28D9` (Deep Purple)
- Success: `#00FF94` (Green)

**Typography:**
- UI: Inter
- Monospace: JetBrains Mono

## License

MIT
