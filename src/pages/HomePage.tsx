import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Github } from 'lucide-react';
import { DropZone } from '../components/DropZone';
import { UploadCard } from '../components/UploadCard';
import { UploadStats } from '../components/UploadStats';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';

export default function HomePage() {
    const { upload, pause, resume, cancel } = useFileUploader();
    const { getAllFiles, stats } = useUploadStore();

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

                {/* Dynamic Content Switching: If files exist, show stats/list. If not, show the 'Antigravity' prompt */}
                {files.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full"
                    >
                        <div className="mb-6">
                            <UploadStats stats={stats} />
                        </div>
                        {/* We can re-use the standard dropzone here or keep the minimal one. 
                             To stick to the request "Keep all existing file upload logic", let's render the list and a mini dropzone.
                         */}
                        <div className="glass rounded-2xl p-6 bg-black/40 border border-white/10 backdrop-blur-xl mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white/80 font-medium">Active Uploads</h3>
                            </div>
                            <AnimatePresence>
                                <motion.div className="space-y-3">
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
                            </AnimatePresence>
                        </div>

                        {/* Mini Dropzone for adding more files */}
                        <DropZone onFilesSelected={handleFilesSelected} disabled={false} />
                    </motion.div>
                ) : (
                    <div className="text-center">
                        <motion.h1
                            className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            Upload Files
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                        >
                            {/* The DropZone Component actually handles the click/drag logic internally.
                                 To style it as a simple "Ghost Button", we might need to adjust DropZone prop or wrap it. 
                                 However, DropZone has its own UI. 
                                 Request: "Re-skin the UI... Center the 'Upload Files' header and the 'Choose Files' button."
                                 
                                 Since DropZone contains the input logic, the cleanest way without rewriting DropZone entirely 
                                 (which violates "Keep... logic... exactly as they are" potentially, but user said "Re-skin")
                                 is to WRAP the logic or Customise the DropZone appearance.
                                 
                                 Wait, the prompt said "Keep all existing file upload logic... Re-skin the UI".
                                 It implies I can change the JSX in DropZone or here.
                                 Let's keep DropZone logic but pass a custom trigger or simply
                                 render the DropZone invisible on top of our button? 
                                 
                                 Actually, DropZone.tsx exports a full UI. 
                                 The user provided a snippet:
                                 <button onClick={yourExistingUploadFunction} ...>Choose Files</button>
                                 <input type="file" ... />
                                 
                                 I cannot access `yourExistingUploadFunction` easily without exposing it from DropZone 
                                 or rewriting DropZone logic here. 
                                 
                                 COMPROMISE: I will use the `DropZone` component but wrapping it 
                                 or relying on the user's implicit permission to modify `DropZone.tsx` visually 
                                 since they asked to "Re-skin the UI".
                                 However, I will simply modify HomePage to use the DropZone in a way that fits, 
                                 OR better yet, I will modify THIS file (HomePage) to render the new UI 
                                 and pass the logic to DropZone if possible? No.
                                 
                                 ACTUAL PLAN: use `DropZone` as is for "functional layer" but maybe we need to
                                 tweak DropZone styling to match the ghost button request?
                                 
                                 Let's look at the request again: "Center the 'Upload Files' header and the 'Choose Files' button... Ensure the button is a 'Ghost' style".
                                 
                                 If I use the existing `DropZone`, it looks like a big box.
                                 I will replace the big `DropZone` usage here with the explicit markup requested, 
                                 and wire up the input ref manually here since I have `handleFilesSelected`.
                                 This is "keeping all existing file upload logic" (the hook, the store, the uploader)
                                 but changing the "UI" (the click handler/input).
                            */}

                            <CustomUploadTrigger onFilesSelected={handleFilesSelected} />

                        </motion.div>
                    </div>
                )}
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
function CustomUploadTrigger({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) onFilesSelected(files);
        e.target.value = '';
    };

    // We can't reuse DropZone logic 1:1 without copying it or modifying DropZone.tsx.
    // But basic file input triggering is simple. 
    // DRAG AND DROP support on the "whole screen" or the button? 
    // The request implies a simple button center screen. 
    // Let's implement a simple click-to-upload for the "Antigravity" look 
    // and maybe a full-screen drag listener? simpler is better for "Ghost".

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
                Choose Files
            </label>
        </div>
    );
}
