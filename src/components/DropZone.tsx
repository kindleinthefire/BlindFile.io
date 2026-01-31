import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileUp, Shield, Lock } from 'lucide-react';

interface DropZoneProps {
    onFilesSelected: (files: File[]) => void;
    disabled?: boolean;
}

export function DropZone({ onFilesSelected, disabled }: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onFilesSelected(files);
        }
    }, [disabled, onFilesSelected]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            onFilesSelected(files);
        }
        // Reset input
        e.target.value = '';
    }, [onFilesSelected]);

    return (
        <motion.div
            className={`
        upload-zone rounded-2xl p-12 cursor-pointer
        transition-all duration-300 relative
        ${isDragging ? 'active glow-purple' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:glow-purple'}
      `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            whileHover={disabled ? {} : { scale: 1.01 }}
            whileTap={disabled ? {} : { scale: 0.99 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <input
                type="file"
                id="file-input"
                className="hidden"
                multiple
                onChange={handleFileInput}
                disabled={disabled}
            />

            <label
                htmlFor="file-input"
                className="flex flex-col items-center justify-center gap-6 cursor-pointer"
            >
                <AnimatePresence mode="wait">
                    {isDragging ? (
                        <motion.div
                            key="dragging"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative"
                        >
                            <div className="w-24 h-24 rounded-full bg-deep-purple/20 flex items-center justify-center">
                                <FileUp className="w-12 h-12 text-deep-purple" />
                            </div>
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-deep-purple"
                                animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative"
                        >
                            <div className="w-24 h-24 rounded-full bg-stealth-700 flex items-center justify-center border border-deep-purple/30">
                                <Upload className="w-10 h-10 text-silver" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="text-center">
                    <h3 className="text-xl font-semibold text-silver mb-2">
                        {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
                    </h3>
                    <p className="text-silver/60 text-sm">
                        Maximum file size: <span className="text-deep-purple font-mono">500 GB</span>
                    </p>
                </div>

                {/* Security badges */}
                <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-xs text-silver/50">
                        <Shield className="w-4 h-4 text-success" />
                        <span>Zero-Knowledge</span>
                    </div>
                    <div className="w-px h-4 bg-silver/20" />
                    <div className="flex items-center gap-2 text-xs text-silver/50">
                        <Lock className="w-4 h-4 text-deep-purple" />
                        <span>AES-256-GCM</span>
                    </div>
                </div>
            </label>

            {/* Animated border gradient */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
                <motion.div
                    className="absolute inset-0 opacity-20"
                    style={{
                        background: 'linear-gradient(90deg, transparent, #6D28D9, transparent)',
                    }}
                    animate={{
                        x: ['-100%', '100%'],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />
            </div>
        </motion.div>
    );
}
