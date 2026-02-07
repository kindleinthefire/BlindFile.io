import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock,
    AlertCircle,
    File,
    Shield,
    ArrowLeft,
    Loader2,
    Check,
    Copy,
    Download,
    Apple,
    MessageSquare,
    Feather,
} from 'lucide-react';
import { CountdownTimer } from '../components/CountdownTimer';
import { api, DownloadInfo } from '../lib/api';
import { importKey, formatBytes, decryptMetadata } from '../lib/crypto';
import { FileDownloader } from '../lib/fileDownloader';
import { parseDownloadHash } from '../lib/mobileUpload';
import { parseBlindTextHash, decryptMessage } from '../lib/messageEncryption';
import logo from '../assets/logo.png';

type DownloadStatus =
    | 'loading'
    | 'ready'
    | 'decrypting'
    | 'complete'
    | 'error'
    | 'expired';

export default function DownloadPage() {
    const { id } = useParams<{ id: string }>();

    const [status, setStatus] = useState<DownloadStatus>('loading');
    const [fileInfo, setFileInfo] = useState<DownloadInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
    const [downloadMode, setDownloadMode] = useState<'desktop' | 'mobile'>('desktop');
    const [loadingMessage, setLoadingMessage] = useState('Initializing secure value...');
    const downloadManager = useRef<FileDownloader | null>(null);

    // Mobile ZIP detection
    const [isMobileZip, setIsMobileZip] = useState(false);
    const [originalFilename, setOriginalFilename] = useState<string | null>(null);
    const [passwordCopied, setPasswordCopied] = useState(false);

    // BlindText (Secure Message) state
    const [isBlindText, setIsBlindText] = useState(false);
    const [blindTextSalt, setBlindTextSalt] = useState<string | null>(null);
    const [blindTextPassword, setBlindTextPassword] = useState('');
    const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
    const [isDecryptingMessage, setIsDecryptingMessage] = useState(false);
    const [messageCopied, setMessageCopied] = useState(false);

    // Auto-detect Mobile (iOS/Android)
    useEffect(() => {
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod|Android/i.test(ua)) {
            setDownloadMode('mobile');
        }
    }, []);

    // Extract encryption key from URL hash - with mobile ZIP and BlindText detection
    useEffect(() => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            // Check for BlindText first
            const blindTextParsed = parseBlindTextHash(hash);
            if (blindTextParsed.isBlindText && blindTextParsed.salt) {
                setIsBlindText(true);
                setBlindTextSalt(blindTextParsed.salt);
                return; // BlindText doesn't need encryption key from URL
            }

            // Fall back to standard/mobile ZIP parsing
            const parsed = parseDownloadHash(hash);
            setEncryptionKey(parsed.password);
            setIsMobileZip(parsed.isMobileZip);
            if (parsed.originalFilename) {
                setOriginalFilename(parsed.originalFilename);
            }
        }
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (downloadManager.current) {
                downloadManager.current.cancel();
            }
        };
    }, []);

    // Fetch file info
    useEffect(() => {
        if (!id) return;

        const fetchInfo = async () => {
            try {
                const info = await api.getDownloadInfo(id);
                setFileInfo(info);
                setStatus('ready');
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'Failed to load file info';
                if (message.includes('expired') || message.includes('not found')) {
                    setStatus('expired');
                } else {
                    setStatus('error');
                    setError(message);
                }
            }
        };

        fetchInfo();
    }, [id]);

    // Decrypt Metadata if available
    useEffect(() => {
        const decryptInfo = async () => {
            if (fileInfo && fileInfo.encryptedMetadata && encryptionKey && fileInfo.fileName.endsWith('.bin')) {
                try {
                    const key = await importKey(encryptionKey);
                    const metadata = await decryptMetadata(fileInfo.encryptedMetadata, key);
                    setFileInfo(prev => prev ? {
                        ...prev,
                        fileName: metadata.name,
                        contentType: metadata.type,
                        encryptedMetadata: undefined // Prevent loop
                    } : null);
                } catch (e) {
                    console.error("Failed to decrypt metadata", e);
                }
            }
        };
        decryptInfo();
    }, [fileInfo?.encryptedMetadata, encryptionKey]);

    const handleDownload = async () => {
        if (!id || !fileInfo || !encryptionKey) return;

        // --- MOBILE FLOW (Service Worker Interceptor) ---
        if (downloadMode === 'mobile') {
            try {
                if (!navigator.serviceWorker.controller) {
                    throw new Error("Service Worker not active. Please refresh the page.");
                }

                setStatus('decrypting');
                setLoadingMessage("Initializing Service Worker stream...");

                // 1. Get the Key Material
                const key = await importKey(encryptionKey);

                // 2. Construct URLs
                const virtualUrl = `/stream-download/${encodeURIComponent(fileInfo.fileName)}`;
                const remoteUrl = `${window.location.origin}/api/download/${id}`;

                // 3. Establish Channel
                const channel = new MessageChannel();

                // --- HEARTBEAT FOR IOS ---
                // iOS Safari kills Service Workers after 30s of "idleness" even if streaming.
                // We send a heartbeat to keep it alive during the handshake.
                const heartbeatInterval = setInterval(() => {
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'HEARTBEAT' });
                    }
                }, 5000);

                // Safety timeout to clear heartbeat if it hangs
                const heartbeatTimeout = setTimeout(() => {
                    clearInterval(heartbeatInterval);
                }, 30000);

                channel.port1.onmessage = (event) => {
                    if (event.data === 'READY') {
                        // Clear heartbeats immediately upon connection success
                        clearInterval(heartbeatInterval);
                        clearTimeout(heartbeatTimeout);

                        // 4. Trigger Native Download
                        setStatus('complete'); // Optimistically update UI
                        window.location.href = virtualUrl;
                    }
                };

                // 4. Register
                navigator.serviceWorker.controller.postMessage({
                    type: 'REGISTER_DOWNLOAD',
                    url: virtualUrl,
                    filename: fileInfo.fileName,
                    size: fileInfo.fileSize,
                    remoteUrl: remoteUrl,
                    key: key,
                    chunkSize: fileInfo.chunkSize || 10485760 // Default to 10MB to maintain backward compatibility
                }, [channel.port2]);

            } catch (err) {
                const message = err instanceof Error ? err.message : 'Mobile download failed';
                setStatus('error');
                setError(message);
            }
            return;
        }

        // --- DESKTOP FLOW (Client-Side StreamSaver) ---
        try {
            setStatus('decrypting');
            setProgress(0);
            setDownloadProgress(0);

            // Import the encryption key
            const key = await importKey(encryptionKey);

            if (downloadManager.current) {
                downloadManager.current.cancel();
            }

            // Initialize File Downloader
            // @ts-ignore
            downloadManager.current = new FileDownloader(fileInfo, key, {
                onProgress: (p: number) => setProgress(Number(p.toFixed(1))),
                onDownloadProgress: (p: number) => setDownloadProgress(Number(p.toFixed(1))),
                onComplete: () => {
                    setStatus('complete');
                    setProgress(100);
                    setDownloadProgress(100);
                },
                onError: (err: Error) => {
                    setStatus('error');
                    setError(err.message);
                }
            });

            await downloadManager.current.start();

        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Decryption failed';
            setStatus('error');
            setError(message);
        }
    };

    // BlindText: Unlock secure message
    const handleUnlockMessage = async () => {
        if (!id || !blindTextSalt || !blindTextPassword.trim()) return;

        setIsDecryptingMessage(true);
        setDecryptedMessage(null);

        try {
            // Fetch the encrypted blob using the file endpoint (not the info endpoint)
            const response = await fetch(`/api/download/${id}/file`);
            if (!response.ok) {
                throw new Error('Failed to fetch encrypted message');
            }
            const encryptedBlob = await response.blob();

            // Decrypt using PBKDF2-derived key
            const message = await decryptMessage(encryptedBlob, blindTextPassword, blindTextSalt);
            setDecryptedMessage(message);
        } catch (err) {
            console.error('Message decryption failed:', err);
            setDecryptedMessage(null);
            alert('Wrong password or corrupted message. Please try again.');
        } finally {
            setIsDecryptingMessage(false);
        }
    };

    const copyMessage = () => {
        if (decryptedMessage) {
            navigator.clipboard.writeText(decryptedMessage);
            setMessageCopied(true);
            setTimeout(() => setMessageCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <motion.header
                className="border-b border-white/5 backdrop-blur-sm"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-3 group">
                            <img
                                src={logo}
                                alt="Blind File Logo"
                                className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                            <div>
                                <h1 className="font-bold text-xl text-silver group-hover:text-white transition-colors">Blind File</h1>
                                <p className="text-xs text-silver/50">
                                    Zero-Knowledge Transfer
                                </p>
                            </div>
                        </Link>

                        {/* MODE TOGGLE */}
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                            <button
                                onClick={() => setDownloadMode('desktop')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${downloadMode === 'desktop' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Desktop
                            </button>
                            <button
                                onClick={() => setDownloadMode('mobile')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${downloadMode === 'mobile' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Mobile
                            </button>
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Main content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <motion.div
                    className="glass rounded-2xl p-8 max-w-md w-full text-center"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <AnimatePresence mode="wait">
                        {/* Loading state */}
                        {status === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-8"
                            >
                                <Loader2 className="w-12 h-12 text-deep-purple animate-spin mx-auto mb-4" />
                                <p className="text-silver/60">Loading file information...</p>
                            </motion.div>
                        )}

                        {/* Expired state */}
                        {status === 'expired' && (
                            <motion.div
                                key="expired"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-8"
                            >
                                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h2 className="text-xl font-bold text-silver mb-2">
                                    File Expired
                                </h2>
                                <p className="text-silver/60 mb-6">
                                    This file has self-destructed after 12 hours.
                                </p>
                                <Link
                                    to="/"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-deep-purple hover:bg-deep-purple/80 text-white font-medium transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Upload a new file
                                </Link>
                            </motion.div>
                        )}

                        {/* Ready state */}
                        {status === 'ready' && fileInfo && (
                            <motion.div
                                key="ready"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {/* ====== BLINDTEXT MESSAGE MODE ====== */}
                                {isBlindText ? (
                                    <>
                                        {!decryptedMessage ? (
                                            // Password Input for BlindText
                                            <>
                                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                                                    <MessageSquare className="w-8 h-8 text-emerald-400" />
                                                </div>

                                                <h2 className="text-xl font-bold text-silver mb-2">
                                                    Secure Message
                                                </h2>
                                                <p className="text-sm text-silver/60 mb-6">
                                                    Enter the password to unlock this message
                                                </p>

                                                {/* Password Input */}
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                                                        <input
                                                            type="password"
                                                            value={blindTextPassword}
                                                            onChange={(e) => setBlindTextPassword(e.target.value)}
                                                            placeholder="Enter password..."
                                                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-stealth-700 border border-emerald-500/30 text-white placeholder:text-silver/40 focus:outline-none focus:border-emerald-500/60 text-lg"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && blindTextPassword.trim()) {
                                                                    handleUnlockMessage();
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={handleUnlockMessage}
                                                        disabled={!blindTextPassword.trim() || isDecryptingMessage}
                                                        className="w-full py-4 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        {isDecryptingMessage ? (
                                                            <>
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                                Decrypting...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock className="w-5 h-5" />
                                                                Unlock Message
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            // Decrypted Message Display
                                            <>
                                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                                                    <Feather className="w-8 h-8 text-emerald-400" />
                                                </div>

                                                <h2 className="text-xl font-bold text-silver mb-4">
                                                    Message Unlocked
                                                </h2>

                                                {/* Message Content */}
                                                <div className="w-full max-w-2xl mx-auto bg-stealth-700 rounded-xl p-6 border border-emerald-500/30 mb-4 text-left">
                                                    <pre className="text-silver whitespace-pre-wrap font-sans text-base leading-relaxed min-h-[100px] max-h-[60vh] overflow-y-auto">
                                                        {decryptedMessage}
                                                    </pre>
                                                </div>

                                                <button
                                                    onClick={copyMessage}
                                                    className="w-full py-3 rounded-xl font-medium bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {messageCopied ? (
                                                        <>
                                                            <Check className="w-5 h-5" />
                                                            Copied to Clipboard!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-5 h-5" />
                                                            Copy to Clipboard
                                                        </>
                                                    )}
                                                </button>

                                                <Link
                                                    to="/?mode=blindtext"
                                                    className="w-full py-3 rounded-xl font-medium bg-white/5 border border-white/10 text-silver hover:bg-white/10 transition-all flex items-center justify-center gap-2 mt-3"
                                                >
                                                    <MessageSquare className="w-5 h-5" />
                                                    Send Your Own BlindText
                                                </Link>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    // ====== REGULAR FILE MODE ======
                                    <>
                                        {/* File icon */}
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${isMobileZip
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-stealth-700 border-deep-purple/30'
                                            }`}>
                                            {isMobileZip
                                                ? <Apple className="w-8 h-8 text-green-400" />
                                                : <File className="w-8 h-8 text-deep-purple" />
                                            }
                                        </div>

                                        {/* File info */}
                                        <h2 className="text-xl font-bold text-silver mb-1 truncate">
                                            {isMobileZip && originalFilename ? originalFilename : fileInfo.fileName}
                                        </h2>
                                        <p className="text-sm text-silver/60 font-mono mb-4">
                                            {formatBytes(fileInfo.fileSize)}
                                        </p>

                                        {/* Countdown */}
                                        <div className="flex justify-center mb-6">
                                            <CountdownTimer expiresAt={fileInfo.expiresAt} />
                                        </div>

                                        {/* MOBILE ZIP UI */}
                                        {isMobileZip && encryptionKey && (
                                            <div className="space-y-4 mb-6">
                                                {/* Password Card */}
                                                <div className="glass rounded-xl p-4 text-left border border-green-500/20">
                                                    <p className="text-xs text-green-400 font-medium mb-2">
                                                        🔐 ZIP Password (Copy this!)
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <code className="flex-1 bg-black/30 px-3 py-2 rounded-lg text-sm font-mono text-white break-all">
                                                            {encryptionKey}
                                                        </code>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(encryptionKey);
                                                                setPasswordCopied(true);
                                                                setTimeout(() => setPasswordCopied(false), 2000);
                                                            }}
                                                            className={`p-2 rounded-lg transition-colors ${passwordCopied
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : 'bg-white/5 text-silver hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {passwordCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Rename Warning */}
                                                <div className="glass rounded-xl p-4 text-left border border-yellow-500/20">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm text-yellow-500 font-medium">
                                                                Filename Obfuscated
                                                            </p>
                                                            <p className="text-xs text-silver/60 mt-1">
                                                                The file inside the ZIP is named <code className="text-white">blindfile_content</code> for privacy.
                                                                After extracting, rename it back to: <span className="text-white font-medium">{originalFilename}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Security badge */}
                                                <div className="flex items-center justify-center gap-2 text-xs text-silver/50">
                                                    <Shield className="w-4 h-4 text-green-400" />
                                                    <span>Password-protected ZIP (ZipCrypto)</span>
                                                </div>

                                                {/* Direct Download Button */}
                                                <a
                                                    href={api.getDownloadUrl(id!)}
                                                    download
                                                    className="w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
                                                >
                                                    <Download className="w-5 h-5" />
                                                    Download ZIP
                                                </a>
                                            </div>
                                        )}

                                        {/* STANDARD AES UI */}
                                        {!isMobileZip && (
                                            <>
                                                {/* Key warning */}
                                                {!encryptionKey && (
                                                    <div className="glass rounded-xl p-4 mb-6 text-left">
                                                        <div className="flex items-start gap-3">
                                                            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-sm text-yellow-500 font-medium">
                                                                    Missing Encryption Key
                                                                </p>
                                                                <p className="text-xs text-silver/60 mt-1">
                                                                    The decryption key is missing from the URL. Make sure
                                                                    you're using the complete download link.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Security badge */}
                                                <div className="flex items-center justify-center gap-2 text-xs text-silver/50 mb-6">
                                                    <Shield className="w-4 h-4 text-success" />
                                                    <span>End-to-end encrypted with AES-256-GCM</span>
                                                </div>

                                                {/* Download button */}
                                                <button
                                                    onClick={handleDownload}
                                                    disabled={!encryptionKey}
                                                    className={`
                                                w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2
                                                transition-all duration-300
                                                ${encryptionKey
                                                            ? 'bg-gradient-to-r from-deep-purple to-success hover:opacity-90 glow-purple text-white'
                                                            : 'bg-stealth-700 text-silver/50 cursor-not-allowed'
                                                        }
                                            `}
                                                >
                                                    <Lock className="w-5 h-5" />
                                                    Decrypt & Download
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* Decrypting state - AND Complete state base */}
                        {(status === 'decrypting' || status === 'complete') && (
                            <motion.div
                                key="decrypting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-8 relative"
                            >
                                {downloadMode === 'mobile' ? (
                                    /* --- MOBILE UI: Spinner + Rotating Text --- */
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-deep-purple/20 flex items-center justify-center mx-auto mb-6">
                                            <Loader2 className="w-8 h-8 text-deep-purple animate-spin" />
                                        </div>
                                        <h2 className="text-xl font-bold text-silver mb-2 animate-pulse">
                                            Preparing file for download...
                                        </h2>
                                        <p className="text-silver/60 text-sm mb-8 h-6">
                                            {loadingMessage}
                                        </p>
                                    </>
                                ) : (
                                    /* --- DESKTOP UI: True Progress Bars --- */
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-deep-purple/20 flex items-center justify-center mx-auto mb-4">
                                            <Lock className="w-8 h-8 text-deep-purple animate-pulse" />
                                        </div>
                                        <h2 className="text-xl font-bold text-silver mb-2">
                                            {status === 'complete' ? 'Decryption Finished' : 'Downloading & Decrypting...'}
                                        </h2>
                                        <p className="text-silver/60 text-sm mb-6">
                                            {status === 'complete'
                                                ? 'Your file is ready.'
                                                : 'Your file is being streamed and decrypted on the fly.'}
                                        </p>

                                        {/* Download Progress bar */}
                                        <div className="mb-4 text-left">
                                            <div className="flex justify-between text-xs text-silver/60 mb-1">
                                                <span>Download</span>
                                                <span>{downloadProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-stealth-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-blue-500"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${downloadProgress}%` }}
                                                    transition={{ duration: 0.1 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Decryption Progress bar */}
                                        <div className="text-left mb-6">
                                            <div className="flex justify-between text-xs text-silver/60 mb-1">
                                                <span>Decryption</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-stealth-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-deep-purple to-success"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Complete Overlay Card */}
                                <AnimatePresence>
                                    {status === 'complete' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className="absolute inset-x-0 bottom-0 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex flex-col gap-3"
                                        >
                                            {downloadMode === 'mobile' ? (
                                                /* MOBILE COMPLETE STATE */
                                                <>
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                                                            <AlertCircle className="w-5 h-5 text-blue-400" />
                                                        </div>
                                                        <div className="text-left flex-1">
                                                            <h3 className="font-bold text-white text-sm mb-1">Download Started!</h3>
                                                            <p className="text-xs text-silver/70 leading-relaxed">
                                                                Check your browser's address bar or notification center to see the progress of your {formatBytes(fileInfo?.fileSize || 0)} file.
                                                                <br /><br />
                                                                <span className="text-blue-300 font-medium">Please keep this tab open until the system confirms the download is finished.</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                /* DESKTOP COMPLETE STATE */
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                                                        <Check className="w-5 h-5 text-success" />
                                                    </div>
                                                    <div className="text-left flex-1">
                                                        <h3 className="font-bold text-white text-sm">Download Complete!</h3>
                                                        <p className="text-xs text-silver/60">File decrypted & saved.</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2 w-full mt-2">
                                                <button
                                                    onClick={handleDownload}
                                                    className="flex-1 py-2 rounded-lg bg-stealth-700 hover:bg-stealth-600 text-silver text-xs font-medium transition-colors"
                                                >
                                                    Download Again
                                                </button>
                                                <Link
                                                    to="/"
                                                    className="flex-1 py-2 rounded-lg bg-deep-purple hover:bg-deep-purple/80 text-white text-xs font-medium flex items-center justify-center transition-colors"
                                                >
                                                    Upload New
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Error state */}
                        {status === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-8"
                            >
                                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h2 className="text-xl font-bold text-silver mb-2">Error</h2>
                                <p className="text-silver/60 text-sm mb-4">
                                    {error || 'Something went wrong'}
                                </p>

                                <div className="glass rounded-xl p-4 mb-6 text-left">
                                    <p className="text-xs text-silver/50">This could mean:</p>
                                    <ul className="text-xs text-silver/50 mt-2 space-y-1 ml-4 list-disc">
                                        <li>The encryption key in the URL is incorrect</li>
                                        <li>The file has been corrupted</li>
                                        <li>Network error during download</li>
                                    </ul>
                                </div>

                                <button
                                    onClick={() => setStatus('ready')}
                                    className="w-full py-3 rounded-xl bg-stealth-700 hover:bg-stealth-600 text-silver font-medium transition-colors"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </main>

            {/* Background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-deep-purple/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
            </div>
        </div>
    );
}
