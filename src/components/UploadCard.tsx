import { motion } from 'framer-motion';
import {
    File,
    CheckCircle,
    AlertCircle,
    Pause,
    Play,
    X,
    Lock,
    Upload,
    Copy,
    ExternalLink,
} from 'lucide-react';
import { UploadFile } from '../store/uploadStore';
import { formatBytes, formatSpeed, formatTimeRemaining } from '../lib/crypto';
import { useState } from 'react';

interface UploadCardProps {
    file: UploadFile;
    onPause: () => void;
    onResume: () => void;
    onCancel: () => void;
}

export function UploadCard({ file, onPause, onResume, onCancel }: UploadCardProps) {
    const [copied, setCopied] = useState(false);

    const getStatusIcon = () => {
        switch (file.status) {
            case 'encrypting':
                return <Lock className="w-5 h-5 text-deep-purple animate-pulse" />;
            case 'uploading':
                return <Upload className="w-5 h-5 text-success animate-pulse" />;
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-success" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'paused':
                return <Pause className="w-5 h-5 text-yellow-500" />;
            default:
                return <File className="w-5 h-5 text-silver/50" />;
        }
    };

    const getStatusText = () => {
        switch (file.status) {
            case 'encrypting':
                return 'Encrypting...';
            case 'uploading':
                return `Uploading ${file.completedParts || 0}/${file.totalParts || '?'} parts`;
            case 'completed':
                return 'Complete';
            case 'error':
                return file.error || 'Failed';
            case 'paused':
                return 'Paused';
            default:
                return 'Pending';
        }
    };

    const copyLink = async () => {
        if (file.downloadUrl) {
            await navigator.clipboard.writeText(file.downloadUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isActive = file.status === 'encrypting' || file.status === 'uploading';

    return (
        <motion.div
            className="glass rounded-xl p-4 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            layout
        >
            {/* Background progress */}
            <div
                className="absolute inset-0 bg-gradient-to-r from-deep-purple/10 to-success/10 transition-all duration-300"
                style={{ width: `${file.progress}%` }}
            />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusIcon()}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-silver truncate">{file.name}</h4>
                            <p className="text-xs text-silver/50 font-mono">{formatBytes(file.size)}</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        {isActive && (
                            <button
                                onClick={file.status === 'paused' ? onResume : onPause}
                                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                {file.status === 'paused' ? (
                                    <Play className="w-4 h-4 text-success" />
                                ) : (
                                    <Pause className="w-4 h-4 text-yellow-500" />
                                )}
                            </button>
                        )}
                        {file.status !== 'completed' && (
                            <button
                                onClick={onCancel}
                                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <X className="w-4 h-4 text-red-500" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress bars */}
                {isActive && (
                    <div className="space-y-2 mb-3">
                        {/* Encryption progress */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-deep-purple flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Encryption
                                </span>
                                <span className="font-mono text-silver/60">
                                    {file.encryptionProgress.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-1 bg-stealth-700 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-deep-purple"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${file.encryptionProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>

                        {/* Upload progress */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-success flex items-center gap-1">
                                    <Upload className="w-3 h-3" />
                                    Upload
                                </span>
                                <span className="font-mono text-silver/60">
                                    {file.uploadProgress.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-1 bg-stealth-700 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-success"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${file.uploadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats */}
                {isActive && (
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                            <span className="text-silver/50">
                                Speed: <span className="font-mono text-success">{formatSpeed(file.speed)}</span>
                            </span>
                            <span className="text-silver/50">
                                ETA: <span className="font-mono text-silver">{formatTimeRemaining(file.timeRemaining)}</span>
                            </span>
                        </div>
                    </div>
                )}

                {/* Status text */}
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-silver/60">{getStatusText()}</span>

                    {file.status === 'completed' && file.downloadUrl && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={copyLink}
                                className="flex items-center gap-1 text-xs text-deep-purple hover:text-deep-purple/80 transition-colors"
                            >
                                <Copy className="w-3 h-3" />
                                {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                            <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-success hover:text-success/80 transition-colors"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Open
                            </a>
                        </div>
                    )}
                </div>

                {/* Error message */}
                {file.status === 'error' && file.error && (
                    <p className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
                        {file.error}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
