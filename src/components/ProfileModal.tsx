import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, HardDrive, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserStats, UserStats } from '../lib/userStats';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: any;
}

export function ProfileModal({ isOpen, onClose, session }: ProfileModalProps) {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && session?.user?.id) {
            setLoading(true);
            getUserStats(session.user.id)
                .then(setStats)
                .finally(() => setLoading(false));
        }
    }, [isOpen, session]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        onClose();
        // Force reload or navigation might be needed if base layout doesn't react, 
        // but typically onAuthStateChange handles it.
        window.location.reload();
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">Profile</h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* User Info */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                                    {session?.user?.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-medium text-white truncate">
                                        {session?.user?.email}
                                    </h3>
                                    <p className="text-sm text-white/40">Free Plan</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-purple-400">
                                        <HardDrive className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Total Uploads</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">
                                        {loading ? '...' : formatBytes(stats?.total_uploaded || 0)}
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-emerald-400">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">30-Day Usage</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">
                                        {loading ? '...' : formatBytes(stats?.last_30_days_uploaded || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white/5 border-t border-white/5">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors font-medium border border-red-500/20"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
