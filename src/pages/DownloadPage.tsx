import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    Lock,
    AlertCircle,
    File,
    Shield,
    ArrowLeft,
    EyeOff,
    Loader2,
    Check,
} from 'lucide-react';
import { CountdownTimer } from '../components/CountdownTimer';
import { api, DownloadInfo } from '../lib/api';
import { importKey, formatBytes } from '../lib/crypto';
import { FileDownloader } from '../lib/fileDownloader';

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
    const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
    const downloadManager = useRef<FileDownloader | null>(null);

    // Extract encryption key from URL hash
    useEffect(() => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            setEncryptionKey(hash);
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

    const handleDownload = async () => {
        if (!id || !fileInfo || !encryptionKey) return;

        try {
            setStatus('decrypting');
            setProgress(0);

            // Import the encryption key
            const key = await importKey(encryptionKey);

            if (downloadManager.current) {
                downloadManager.current.cancel();
            }

            // Initialize File Downloader
            downloadManager.current = new FileDownloader(fileInfo, key, {
                onProgress: (p: number) => setProgress(Number(p.toFixed(1))),
                onComplete: () => {
                    setStatus('complete');
                    setProgress(100);
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
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-deep-purple to-success flex items-center justify-center">
                                <EyeOff className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-xl text-silver">Blind File</h1>
                                <p className="text-xs text-silver/50">
                                    Zero-Knowledge Transfer
                                </p>
                            </div>
                        </Link>

                        <Link
                            to="/"
                            className="flex items-center gap-2 text-sm text-silver/60 hover:text-silver transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Upload new file
                        </Link>
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
                                {/* File icon */}
                                <div className="w-16 h-16 rounded-2xl bg-stealth-700 flex items-center justify-center mx-auto mb-4 border border-deep-purple/30">
                                    <File className="w-8 h-8 text-deep-purple" />
                                </div>

                                {/* File info */}
                                <h2 className="text-xl font-bold text-silver mb-1 truncate">
                                    {fileInfo.fileName}
                                </h2>
                                <p className="text-sm text-silver/60 font-mono mb-4">
                                    {formatBytes(fileInfo.fileSize)}
                                </p>

                                {/* Countdown */}
                                <div className="flex justify-center mb-6">
                                    <CountdownTimer expiresAt={fileInfo.expiresAt} />
                                </div>

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
                            </motion.div>
                        )}

                        {/* Decrypting state */}
                        {status === 'decrypting' && (
                            <motion.div
                                key="decrypting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-8"
                            >
                                <div className="w-16 h-16 rounded-full bg-deep-purple/20 flex items-center justify-center mx-auto mb-4">
                                    <Lock className="w-8 h-8 text-deep-purple animate-pulse" />
                                </div>
                                <h2 className="text-xl font-bold text-silver mb-2">
                                    Decrypting...
                                </h2>
                                <p className="text-silver/60 text-sm mb-6">
                                    Your file is being decrypted locally in your browser.
                                </p>

                                {/* Progress bar */}
                                <div className="w-full h-2 bg-stealth-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-deep-purple to-success"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                                <p className="text-xs text-silver/50 mt-2 font-mono">
                                    {progress}%
                                </p>
                            </motion.div>
                        )}

                        {/* Complete state */}
                        {status === 'complete' && (
                            <motion.div
                                key="complete"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-8"
                            >
                                <motion.div
                                    className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', delay: 0.1 }}
                                >
                                    <Check className="w-8 h-8 text-success" />
                                </motion.div>
                                <h2 className="text-xl font-bold text-silver mb-2">
                                    Download Complete!
                                </h2>
                                <p className="text-silver/60 text-sm mb-6">
                                    Your file has been decrypted and saved.
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDownload}
                                        className="flex-1 py-3 rounded-xl bg-stealth-700 hover:bg-stealth-600 text-silver font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Again
                                    </button>
                                    <Link
                                        to="/"
                                        className="flex-1 py-3 rounded-xl bg-deep-purple hover:bg-deep-purple/80 text-white font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Upload New
                                    </Link>
                                </div>
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
