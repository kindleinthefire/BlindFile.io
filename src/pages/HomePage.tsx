import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Github } from 'lucide-react';
import { UploadCard } from '../components/UploadCard';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';

export default function HomePage() {
    const { upload, pause, resume, cancel } = useFileUploader();
    const { getAllFiles } = useUploadStore();

    const files = getAllFiles();

    const handleFilesSelected = useCallback(
        async (selectedFiles: File[]) => {
            for (const file of selectedFiles) {
                upload(file);
            }
        },
        [upload]
    );

    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
            {/* VISUAL LAYER: The Wide Arc - Antigravity Aesthetic */}
            <div
                className="absolute"
                style={{
                    width: '250vw',
                    height: '1000px',
                    bottom: '-750px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(59,130,246,0.3) 50%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(100px)',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />

            {/* Header (Simplified/Hidden or floated if needed, but per request focusing on the re-skin) */}
            {/* Keeping it simple and integrated or removed if it clashes with the "center" vibe. 
                Request asked for specific center layout. Let's keep a minimal header if user wants navigation, 
                but the request specifically detailed the "Arc" and "Center" layout. 
                I will wrap the existing functionality in the new structure.
            */}
            <motion.header
                className="absolute top-0 left-0 right-0 border-b border-white/5 backdrop-blur-sm z-50"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                            <EyeOff className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl text-white">Blind File</h1>
                        </div>
                    </div>
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <Github className="w-5 h-5 text-white/60" />
                    </a>
                </div>
            </motion.header>


            {/* FUNCTIONAL LAYER: Your existing BlindFile components */}
            <div className="relative z-10 w-full max-w-4xl px-4 flex-1 flex flex-col justify-center">

                {/* Dynamic Content Switching: Maintain Antigravity Aesthetic even during upload */}
                <div className="w-full flex flex-col items-center">
                    <AnimatePresence mode="wait">
                        {files.length === 0 && (
                            <motion.div
                                key="hero-text"
                                className="text-center"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, y: -20, position: 'absolute' }}
                                transition={{ duration: 0.5 }}
                            >
                                <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tight">
                                    Upload Files
                                </h1>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Active Uploads List - Floating, specialized for Homepage */}
                    <AnimatePresence>
                        {files.length > 0 && (
                            <motion.div
                                key="upload-list"
                                className="w-full max-w-xl my-12 space-y-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                layout
                            >
                                {files.map((file) => (
                                    <UploadCard
                                        key={file.id}
                                        file={file}
                                        onPause={() => pause(file.id)}
                                        onResume={() => resume(file.id)}
                                        onCancel={() => cancel(file.id)}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Button stays consistent, just moves down if needed */}
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="z-50"
                    >
                        <CustomUploadTrigger
                            onFilesSelected={handleFilesSelected}
                            label={files.length > 0 ? "Add More Files" : "Choose Files"}
                        />
                    </motion.div>
                </div>
            </div>

            {/* Footer */}
            <motion.div
                className="absolute bottom-8 text-center w-full z-10 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <p className="text-white/30 text-xs">
                    500GB Max • Zero-Knowledge • Auto-Delete
                </p>
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
