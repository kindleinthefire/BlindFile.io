import { useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, UploadCloud, ArrowRight } from 'lucide-react';
import { UploadCard } from '../components/UploadCard';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';
import { ThreeBackground } from '../components/ThreeBackground';

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

    // Simple Drag & Drop Logic for the Card
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) handleFilesSelected(droppedFiles);
    }, [handleFilesSelected]);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex flex-col font-sans selection:bg-purple-500/30 text-white">

            {/* --- VISUAL BACKGROUND: Three.js Planet Arc --- */}
            <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
                <ThreeBackground />
            </Suspense>

            {/* --- HEADER --- */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full"
            >
                {/* Logo */}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform duration-300">
                        <FileText className="w-5 h-5 text-white" fill="currentColor" fillOpacity={0.2} />
                    </div>
                    <span className="font-bold text-xl tracking-wide text-white/90 group-hover:text-white transition-colors">
                        BLIND FILE
                    </span>
                </div>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <a
                        href="#"
                        className="text-sm font-medium transition-colors hover:text-purple-400 text-zinc-500"
                    >
                        Sign Up
                    </a>
                </nav>
            </motion.header>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full max-w-[1920px] mx-auto">

                <AnimatePresence mode="wait">
                    {!hasFiles ? (
                        /* --- IDLE STATE: The Hero Card --- */
                        <motion.div
                            key="hero-card"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-col items-center gap-8 w-full max-w-lg"
                        >
                            {/* THE GLASS PANEL */}
                            <div
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                className="
                                    relative w-full aspect-video rounded-[2rem]
                                    bg-purple-900/10 backdrop-blur-xl
                                    border border-white/10
                                    shadow-[0_0_60px_-15px_rgba(124,58,237,0.3)]
                                    group overflow-hidden
                                    flex flex-col items-center justify-center
                                    transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_80px_-20px_rgba(124,58,237,0.5)]
                                    cursor-pointer
                                "
                                onClick={() => document.getElementById('file-upload-hidden')?.click()}
                            >
                                {/* Internal Specular Highlight (The 45deg shine) */}
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-20"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 100%)'
                                    }}
                                />

                                {/* High-gloss Top Border Accent */}
                                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-70" />

                                {/* Content */}
                                <div className="relative z-10 flex flex-col items-center text-center p-8">
                                    <UploadCloud
                                        className="w-20 h-20 text-purple-400 mb-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform duration-500"
                                        strokeWidth={1.5}
                                    />

                                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-100 transition-colors">
                                        Upload Blind File
                                    </h2>

                                    <p className="text-white/50 text-base font-medium">
                                        Drag & Drop files here or <span className="text-purple-400 underline underline-offset-4 decoration-purple-400/30 hover:decoration-purple-400 hover:text-purple-300 transition-all">Browse</span>
                                    </p>
                                </div>

                                {/* Hidden Input */}
                                <input
                                    id="file-upload-hidden"
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.length) handleFilesSelected(Array.from(e.target.files));
                                        e.target.value = '';
                                    }}
                                />
                            </div>

                        </motion.div>
                    ) : (
                        /* --- ACTIVE STATE: The Upload List (Preserving the aesthetic) --- */
                        <motion.div
                            key="upload-list-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full max-w-2xl"
                        >
                            {/* We use a modified container to match the 'Glass Panel' vibe, but taller for the list */}
                            <div className="
                                bg-zinc-900/40 backdrop-blur-2xl 
                                border border-white/10 rounded-[2rem] 
                                p-8 shadow-2xl shadow-purple-900/20
                            ">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white">Active Transfers</h3>
                                    <button
                                        onClick={() => document.getElementById('add-more-hidden')?.click()}
                                        className="text-xs font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        + Add Files
                                    </button>
                                    <input
                                        id="add-more-hidden"
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.length) handleFilesSelected(Array.from(e.target.files));
                                            e.target.value = '';
                                        }}
                                    />
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                            </div>

                            <div className="mt-8 flex justify-center">
                                <GlassPillButton label="Back to Home" icon={<ArrowRight className="w-4 h-4 ml-2" />} onClick={() => {/* Logic to clear or just view? For now visual */ }} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </main>
        </div>
    );
}

function GlassPillButton({ label, icon, onClick }: { label: string, icon?: React.ReactNode, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="
                flex-1 h-14 rounded-full
                bg-white/5 hover:bg-white/10 active:bg-white/5
                backdrop-blur-md
                border border-white/5
                flex items-center justify-center
                text-white/80 font-medium text-sm tracking-wide
                transition-all duration-300
                shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:shadow-[inset_0_1px_10px_rgba(255,255,255,0.05),0_10px_20px_-10px_rgba(0,0,0,0.5)]
                group
            "
        >
            {label}
            {icon && <span className="opacity-50 group-hover:opacity-100 transition-opacity">{icon}</span>}
        </button>
    );
}
