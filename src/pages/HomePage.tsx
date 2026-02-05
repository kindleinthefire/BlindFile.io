import { useCallback, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, ArrowRight, Menu, X } from 'lucide-react';
import { UploadCard } from '../components/UploadCard';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';
import { ThreeBackground } from '../components/ThreeBackground';

import { Link } from 'react-router-dom';

import logo from '../assets/logo.png';

export default function HomePage() {
    const { upload, pause, resume, cancel } = useFileUploader();
    const { getAllFiles } = useUploadStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                {/* DESKTOP HEADER LAYOUT */}
                <div className="hidden md:flex items-center justify-between w-full">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group cursor-pointer">
                        <img
                            src={logo}
                            alt="Blind File Logo"
                            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="font-bold text-xl tracking-wide text-white/90 group-hover:text-white transition-colors">
                            BLIND FILE
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="flex items-center gap-8">
                        <Link
                            to="/auth"
                            className="text-sm font-medium transition-colors hover:text-purple-400 text-zinc-500"
                        >
                            Sign Up
                        </Link>
                    </nav>
                </div>

                {/* MOBILE HEADER LAYOUT (Centered Logo + Menu) */}
                <div className="md:hidden w-full flex flex-col items-center relative">
                    <Link to="/" className="flex flex-col items-center gap-2 group cursor-pointer mb-4">
                        <img
                            src={logo}
                            alt="Blind File Logo"
                            className="w-20 h-20 object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="font-bold text-2xl tracking-wide text-white/90 group-hover:text-white transition-colors">
                            BLIND FILE
                        </span>
                    </Link>

                    {/* Hamburger Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                    {/* Mobile Dropdown Menu */}
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full mt-4 w-48 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-xl z-50 overflow-hidden text-center"
                            >
                                <Link
                                    to="/auth"
                                    className="block w-full py-3 px-4 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Sign Up / Login
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


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
                            {/* HERO TEXT - Above Card */}
                            <div className="text-center space-y-2 mb-2">
                                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-xl">
                                    Free 1GB Sends. <span className="text-purple-400">Forever.</span>
                                </h1>
                            </div>

                            {/* THE GLASS PANEL */}
                            <div
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                className="
                                    relative w-full aspect-video rounded-[2rem]
                                    bg-gradient-to-br from-purple-500/20 via-purple-900/30 to-black/40
                                    backdrop-blur-2xl
                                    border border-purple-400/20
                                    shadow-[0_0_60px_-15px_rgba(124,58,237,0.4)]
                                    group overflow-hidden
                                    flex flex-col items-center justify-center
                                    transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_80px_-10px_rgba(124,58,237,0.6)] hover:border-purple-400/40
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

                            {/* SUB TEXT - Below Card */}
                            <p className="text-white/40 text-sm font-medium tracking-widest uppercase">
                                No Sign Up Required
                            </p>

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
                                bg-gradient-to-br from-purple-900/40 via-black/80 to-purple-900/20 backdrop-blur-2xl 
                                border border-purple-400/20 rounded-[2rem] 
                                p-8 shadow-2xl shadow-purple-900/40
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
        </div >
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
