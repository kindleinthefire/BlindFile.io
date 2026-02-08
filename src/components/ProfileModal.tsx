import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, HardDrive, Calendar, User, Crown, Mail, CreditCard, ShieldCheck, Sparkles, Share2, Users, Key, ChevronRight, Clock, AlertTriangle, Infinity } from 'lucide-react';
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

    // Derived state
    const user = session?.user;
    const profile = user?.user_metadata || {};
    const displayName = profile.full_name || user?.email?.split('@')[0];
    const plan = profile.plan || 'free';
    const subscription = profile.subscription || null;

    // Map stats to UI
    const storageUsed = formatBytes(stats?.total_uploaded || 0);
    // UserStats doesn't have file count or downloads, use placeholders or real props if available.
    // For now we will hide them or using basic derived values if possible. 
    // Since we don't have them in UserStats, we'll comment out or remove those specific stats to avoid errors,
    // OR we can just show what we have.

    // Let's stick to the visible stats we have: Storage Used (Total Uploaded) and 30-Day Usage.

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

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden z-[9999] shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        {/* HEADER */}
                        <div className="relative p-8 pb-6 border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl shrink-0">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-6">
                                <div className="relative group cursor-pointer">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
                                        {profile?.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-8 h-8 text-white/40" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Edit</span>
                                    </div>
                                    {/* Status Indicator */}
                                    <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${plan === 'unlimited' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' :
                                            plan === 'pro' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                                                'bg-zinc-500'
                                        }`} />
                                </div>

                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-bold text-white">
                                            {displayName || 'Anonymous User'}
                                        </h2>
                                        {plan === 'unlimited' && (
                                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider border border-purple-500/20 flex items-center gap-1">
                                                <Infinity className="w-3 h-3" />
                                                Unlimited
                                            </span>
                                        )}
                                        {plan === 'pro' && (
                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20 flex items-center gap-1">
                                                <Crown className="w-3 h-3" />
                                                Pro
                                            </span>
                                        )}
                                        {plan === 'free' && (
                                            <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 text-[10px] font-bold uppercase tracking-wider border border-zinc-500/20">
                                                Free Tier
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-white/40 text-sm flex items-center gap-2">
                                        <Mail className="w-3 h-3" />
                                        {user?.email}
                                    </p>
                                    <p className="text-white/20 text-xs mt-1 font-mono uppercase">
                                        UUID: {user?.id.slice(0, 8)}...{user?.id.slice(-4)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT - SCROLLABLE */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                            {/* PLAN DETAILS */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <CreditCard className="w-3 h-3" />
                                    Subscription Status
                                </h3>

                                <div className="bg-white/5 rounded-2xl p-1 border border-white/5">
                                    <div className="grid grid-cols-2 gap-1">
                                        <div className="p-4 rounded-xl bg-zinc-900/50">
                                            <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Current Plan</div>
                                            <div className="text-white font-bold text-lg capitalize">{plan}</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-zinc-900/50">
                                            <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Next Billing</div>
                                            <div className="text-white font-mono text-sm">{formatDate(subscription?.current_period_end)}</div>
                                        </div>
                                    </div>

                                    {plan === 'free' ? (
                                        <div className="p-4 border-t border-white/5 flex items-center justify-between">
                                            <p className="text-sm text-white/60">Upgrade to unlock larger files & longer retention.</p>
                                            <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors">
                                                View Plans
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-gradient-to-r from-transparent to-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">Active Subscription</p>
                                                    <p className="text-xs text-white/40">Auto-renewal enabled</p>
                                                </div>
                                            </div>
                                            <button className="text-xs text-white/40 hover:text-white underline decoration-white/20 hover:decoration-white transition-all">
                                                Manage Billing
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* STATISTICS */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" />
                                    Mission Stats
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center group hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3 text-purple-400 group-hover:scale-110 transition-transform">
                                            <HardDrive className="w-5 h-5" />
                                        </div>
                                        <div className="text-2xl font-bold text-white mb-1">{storageUsed}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-white/40">Total Uploaded</div>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center group hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 text-emerald-400 group-hover:scale-110 transition-transform">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div className="text-2xl font-bold text-white mb-1">{formatBytes(stats?.last_30_days_uploaded || 0)}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-white/40">30-Day Usage</div>
                                    </div>
                                </div>
                            </section>

                            {/* SECURITY SETTINGS */}
                            <section>
                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Key className="w-3 h-3" />
                                    Security Protocols
                                </h3>
                                <div className="space-y-3">
                                    <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 group-hover:text-white transition-colors">
                                                <Key className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">Change Password</div>
                                                <div className="text-xs text-white/40">Update your access credentials</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60" />
                                    </button>

                                    <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 group-hover:text-white transition-colors">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Retention Policy</div>
                                                <div className="text-xs text-white/40">Configure default auto-decay settings</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60" />
                                    </button>
                                </div>
                            </section>

                            {/* DANGER ZONE */}
                            <section>
                                <h3 className="text-xs font-bold text-red-500/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" />
                                    Danger Zone
                                </h3>
                                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl overflow-hidden">
                                    <div className="p-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-red-200">Sign Out</div>
                                            <div className="text-xs text-red-500/60">Terminate current session</div>
                                        </div>
                                        <button
                                            onClick={handleSignOut}
                                            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-colors flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                    <div className="p-4 border-t border-red-500/10 flex items-center justify-between bg-red-500/5">
                                        <div>
                                            <div className="text-sm font-medium text-red-200">Delete Account</div>
                                            <div className="text-xs text-red-500/60">Permanently erase all data</div>
                                        </div>
                                        <button className="text-xs text-red-400 hover:text-red-300 underline decoration-red-500/30 hover:decoration-red-500 transition-all">
                                            Request Deletion
                                        </button>
                                    </div>
                                </div>
                            </section>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
