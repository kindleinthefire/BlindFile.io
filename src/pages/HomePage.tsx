import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import { UploadCard } from '../components/UploadCard';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';

export default function HomePage() {
    const { upload, pause, resume, cancel } = useFileUploader();
    const { getAllFiles } = useUploadStore();

    const files = getAllFiles();
    const hasFiles = files.length > 0;

    const handleFilesSelected = useCallback(
        async (selectedFiles: File[]) => {
            for (const file of selectedFiles) {
                upload(file);
            }
        },
        [upload]
    );

    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans">

            {/* --- ANTIGRAVITY HORIZON (CSS Implementation) --- */}

            {/* 1. Deep Atmospheric Glow (Background) */}
            <div
                className="absolute left-1/2 bottom-[-40vh] -translate-x-1/2 w-[180vw] h-[80vh] rounded-[100%] opacity-40 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 100%, #5b21b6 0%, #1e1b4b 40%, transparent 70%)',
                    filter: 'blur(80px)',
                    zIndex: 0
                }}
            />

            {/* 2. The Sharp Horizon Line (The "Planet Edge") */}
            <div
                className="absolute left-1/2 bottom-[-850px] -translate-x-1/2 w-[3000px] h-[3000px] rounded-[50%] pointer-events-none"
                style={{
                    boxShadow: '0 -20px 80px 40px rgba(139, 92, 246, 0.4), inset 0 10px 40px 0px rgba(255, 255, 255, 0.1)',
                    background: '#000', // Masks the bottom
                    borderTop: '1px solid rgba(139, 92, 246, 0.3)',
                    zIndex: 1
                }}
            />

            {/* 3. The Core Glow (Intense Purple Center) */}
            <div
                className="absolute left-1/2 bottom-[-10vh] -translate-x-1/2 w-[100vw] h-[40vh] rounded-[100%] pointer-events-none opacity-60"
                style={{
                    background: 'radial-gradient(circle at 50% 100%, #a78bfa 0%, transparent 60%)',
                    filter: 'blur(60px)',
                    zIndex: 2,
                    mixBlendMode: 'screen'
                }}
            />


            {/* --- CENTRAL GLASS INTERFACE --- */}
            <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center">

                {/* The Glass Card */}
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="
                        relative 
                        backdrop-blur-2xl 
                        bg-white/[0.03] 
                        border border-white/10 
                        rounded-[2rem] 
                        shadow-[0_0_40px_-10px_rgba(139,92,246,0.15)]
                        overflow-hidden
                        isolate
                    "
                    style={{
                        // Subtle glass gradient reflection
                        backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, transparent 100%)'
                    }}
                >
                    {/* Inner Noise Texture if desired, sticking to pure glass for now */}

                    <div className="p-8 md:p-12 min-w-[320px] md:min-w-[480px] flex flex-col items-center text-center">

                        {/* Header Content */}
                        <AnimatePresence mode="wait">
                            {!hasFiles && (
                                <motion.div
                                    key="header-idle"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                    transition={{ duration: 0.4 }}
                                    className="mb-8"
                                >
                                    <div className="mb-6 flex justify-center">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-white/10 shadow-inner">
                                            <EyeOff className="w-8 h-8 text-white/80" strokeWidth={1.5} />
                                        </div>
                                    </div>
                                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                                        Blind File
                                    </h1>
                                    <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
                                        Transfer files with zero knowledge. <br />
                                        Ephemeral. Encrypted. Anonymous.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* File List (Shows only when files exist) */}
                        <AnimatePresence>
                            {hasFiles && (
                                <motion.div
                                    key="file-list-active"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="w-full mb-8"
                                >
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <h3 className="text-white/60 text-sm font-medium">Active Transfers</h3>
                                        <span className="text-xs font-mono text-white/30">{files.length} active</span>
                                    </div>
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {files.map((file) => (
                                            <UploadCard
                                                key={file.id}
                                                file={file}
                                                onPause={() => pause(file.id)}
                                                onResume={() => resume(file.id)}
                                                onCancel={() => cancel(file.id)}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action Area */}
                        <motion.div layout className="relative z-20">
                            <CustomUploadTrigger
                                onFilesSelected={handleFilesSelected}
                                label={hasFiles ? "Add Another File" : "Upload Files"}
                            />
                        </motion.div>

                    </div>

                    {/* Decorative Top Highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                </motion.div>

            </div>

            {/* Footer */}
            <motion.div
                className="absolute bottom-8 text-center w-full z-10 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                <div className="flex items-center justify-center gap-6 text-white/20 text-[10px] tracking-widest uppercase font-medium">
                    <span>End-to-End Encrypted</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>P2P Direct</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>No Logs</span>
                </div>
            </motion.div>

        </div>
    );
}

// Helper component to implement the "Ghost Button" UI while keeping logic
function CustomUploadTrigger({
    onFilesSelected,
    label = "Choose Files"
}: {
    onFilesSelected: (files: File[]) => void,
    label?: string
}) {
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) onFilesSelected(files);
        e.target.value = '';
    };

    return (
        <div className="relative group">
            <input
                type="file"
                id="file-input-custom"
                className="hidden"
                multiple
                onChange={handleFileInput}
            />
            <label
                htmlFor="file-input-custom"
                className="
                    px-8 py-4 
                    rounded-full 
                    border border-white/30 
                    text-white 
                    text-lg font-medium 
                    tracking-wide
                    cursor-pointer 
                    transition-all duration-300
                    hover:bg-white/10 hover:border-white/50 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]
                    active:scale-95
                    backdrop-blur-md
                "
            >
                {label}
            </label>
        </div>
    );
}
