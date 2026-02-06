import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Clock, User, CheckCircle, Menu, X } from 'lucide-react';
import { DropZone } from '../components/DropZone';
import { UploadCard } from '../components/UploadCard';
import { UploadStats } from '../components/UploadStats';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';
import { supabase } from '../lib/supabase';
import { formatBytes } from '../lib/crypto';
import { ProfileModal } from '../components/ProfileModal';

import logo from '../assets/logo.png';

export default function LegacyAppPage() {
    const { upload, pause, resume, cancel } = useFileUploader();
    const { getAllFiles, stats } = useUploadStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [tier, setTier] = useState<string>('basic');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const bottomRef = useRef<HTMLDivElement>(null);

    const MENU_ITEMS = [
        { label: 'How It Works', path: '/how-it-works' },
        { label: 'Pricing', path: '/pricing' },
        { label: 'FAQ', path: '/faq' },
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Contact Us', path: '/contact' },
    ];

    const files = getAllFiles();

    // Auto-scroll to bottom when a file status changes to 'completed'
    useEffect(() => {
        const hasCompletedFile = files.some(f => f.status === 'completed');
        if (hasCompletedFile) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [files]);

    useEffect(() => {
        const fetchTier = async (userId: string) => {
            const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).single();
            if (data?.subscription_tier) setTier(data.subscription_tier);
        };

        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/');
                return;
            }
            setSession(session);
            if (session.user) await fetchTier(session.user.id);
            setLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                navigate('/');
                return;
            }
            setSession(session);
            if (session.user) fetchTier(session.user.id);
        });

        return () => subscription.unsubscribe();
    }, [navigate]);




    const handleFilesSelected = useCallback(
        async (selectedFiles: File[]) => {
            const LIMITS: Record<string, number> = {
                basic: 5 * 1024 * 1024 * 1024,
                pro: 500 * 1024 * 1024 * 1024,
            };
            // Fallback to basic if tier is somehow guest or undefined in this view
            const limit = LIMITS[tier] || LIMITS['basic'];

            for (const file of selectedFiles) {
                if (file.size > limit) {
                    alert(`Limit Exceeded. You are on the ${tier.toUpperCase()} tier (Limit: ${formatBytes(limit)}). Upgrade to Pro for 500GB.`);
                    return;
                }
                upload(file);
            }
        },
        [upload, tier]
    );

    if (loading) {
        return <div className="min-h-screen bg-black" />; // Stealth loading
    }

    return (
        <div className="min-h-screen flex flex-col stealth-bg grid-pattern">
            {/* Header */}
            <motion.header
                className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="container mx-auto px-4 py-4 max-w-7xl">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
                            <img
                                src={logo}
                                alt="Blind File Logo"
                                className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                            <div>
                                <h1 className="font-bold text-xl text-silver group-hover:text-white transition-colors">Blind File</h1>
                                <p className="text-xs text-silver/50">
                                    Zero-Knowledge Transfer
                                </p>
                            </div>
                        </Link>

                        {/* Desktop Nav (Profile + Menu) */}
                        <nav className="flex items-center gap-4">
                            {/* Profile Button */}
                            <button
                                onClick={() => setIsProfileOpen(true)}
                                className="hidden md:flex items-center gap-2 text-sm font-bold transition-colors hover:text-purple-400 text-silver/80"
                            >
                                <User className="w-5 h-5" />
                                <span>Profile</span>
                            </button>

                            {/* Hamburger Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}
                                    className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:text-white hover:bg-purple-500/20 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] group"
                                >
                                    {isDesktopMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                                </button>

                                <AnimatePresence>
                                    {isDesktopMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            className="absolute top-full right-0 mt-3 w-48 bg-[rgba(20,20,20,0.95)] backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl z-50 overflow-hidden"
                                        >
                                            {/* Mobile Profile Link (Only visible on mobile inside menu) */}
                                            <button
                                                onClick={() => {
                                                    setIsProfileOpen(true);
                                                    setIsDesktopMenuOpen(false);
                                                }}
                                                className="md:hidden block w-full text-left py-2 px-4 text-sm font-medium text-white hover:bg-white/5 hover:text-purple-300 rounded-lg transition-colors border-b border-white/10 mb-1"
                                            >
                                                Profile
                                            </button>

                                            {MENU_ITEMS.map((item) => (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    className="block w-full text-left py-2 px-4 text-sm font-medium text-white hover:bg-white/5 hover:text-purple-300 rounded-lg transition-colors"
                                                    onClick={() => setIsDesktopMenuOpen(false)}
                                                >
                                                    {item.label}
                                                </Link>
                                            ))}
                                            <div className="border-t border-white/10 my-1" />
                                            <button
                                                onClick={() => {
                                                    supabase.auth.signOut();
                                                    setIsDesktopMenuOpen(false);
                                                }}
                                                className="block w-full text-left py-2 px-4 text-sm font-medium text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                Sign Out
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </nav>
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

            {/* Scroll Anchor */}
            <div ref={bottomRef} className="pb-8" />
        </div>
    );
}
