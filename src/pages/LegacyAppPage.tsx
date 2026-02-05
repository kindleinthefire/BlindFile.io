import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Clock, User, CheckCircle } from 'lucide-react';
import { DropZone } from '../components/DropZone';
import { UploadCard } from '../components/UploadCard';
import { UploadStats } from '../components/UploadStats';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';
import { supabase } from '../lib/supabase';
import { ProfileModal } from '../components/ProfileModal';

import logo from '../assets/logo.png';

export default function LegacyAppPage() {
    const { upload, pause, resume, cancel } = useFileUploader();
    const { getAllFiles, stats } = useUploadStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

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
        <div className="min-h-screen flex flex-col stealth-bg grid-pattern">
            {/* Header */}
            <motion.header
                className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={logo}
                                alt="Blind File Logo"
                                className="w-10 h-10 object-contain"
                            />
                            <div>
                                <h1 className="font-bold text-xl text-silver">Blind File</h1>
                                <p className="text-xs text-silver/50">
                                    Zero-Knowledge Transfer
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {session ? (
                                <button
                                    onClick={() => setIsProfileOpen(true)}
                                    className="p-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 text-silver/60 hover:text-silver"
                                >
                                    <User className="w-5 h-5" />
                                    <span className="text-sm font-medium hidden md:inline">Profile</span>
                                </button>
                            ) : (
                                <div />
                            )}
                        </div>
                    </div>
                </div>
            </motion.header>

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                session={session}
            />

            {/* Hero Section */}
            <motion.section
                className="py-16 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className="container mx-auto px-4">
                    <motion.h2
                        className="text-4xl md:text-5xl font-bold text-silver mb-4"
                        initial={{ y: 20 }}
                        animate={{ y: 0 }}
                    >
                        Transfer files.{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-deep-purple to-success">
                            Leave no trace.
                        </span>
                    </motion.h2>

                    <motion.p
                        className="text-silver/60 text-lg max-w-2xl mx-auto mb-8"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        End-to-end encrypted file sharing up to 500GB. Your files
                        self-destruct in 24 hours. We never see your data.
                    </motion.p>

                    {/* Feature badges */}
                    <motion.div
                        className="flex flex-wrap items-center justify-center gap-4 mb-12"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-success" />
                            <span className="text-sm text-silver">
                                Zero-Knowledge Encryption
                            </span>
                        </div>
                        <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-deep-purple" />
                            <span className="text-sm text-silver">500GB Max Size</span>
                        </div>
                        <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-silver">24-Hour Auto-Delete</span>
                        </div>
                        <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-silver">
                                No Logs Kept
                            </span>
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* Upload Section */}
            <section className="flex-1 pb-16">
                <div className="container mx-auto px-4 max-w-3xl">
                    {/* Stats bar (when there are files) */}
                    {files.length > 0 && (
                        <div className="mb-6">
                            <UploadStats stats={stats} />
                        </div>
                    )}

                    {/* Drop zone */}
                    <DropZone onFilesSelected={handleFilesSelected} disabled={false} />

                    {/* Upload list */}
                    <AnimatePresence>
                        {files.length > 0 && (
                            <motion.div
                                className="mt-6 space-y-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-silver/60">
                                        Uploads ({files.length})
                                    </h3>
                                </div>

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
                </div>
            </section>



            {/* Background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-deep-purple/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
            </div>
        </div>
    );
}
