import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Clock, User, CheckCircle, Menu, X, UploadCloud, MessageSquare, Feather, Lock, ArrowRight, Check, Copy, Info } from 'lucide-react';
import { UploadCard } from '../components/UploadCard';
import { UploadStats } from '../components/UploadStats';
import { DeviceSelectionModal } from '../components/DeviceSelectionModal';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';
import { supabase } from '../lib/supabase';
import { formatBytes } from '../lib/crypto';
import { ProfileModal } from '../components/ProfileModal';
import { uploadMobileCompatible } from '../lib/mobileUpload';
import { encryptMessage, generateBlindTextUrl } from '../lib/messageEncryption';
import { api } from '../lib/api';

import logo from '../assets/logo.png';

export default function LegacyAppPage() {
    const { upload, pause, resume, cancel } = useFileUploader();
    const { getAllFiles, addFile, updateFile, stats } = useUploadStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [tier, setTier] = useState<string>('basic');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Device selection modal state
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    // BlindText (Secure Message) state
    const [uploadMode, setUploadMode] = useState<'file' | 'message'>('file');
    const [messageText, setMessageText] = useState('');
    const [messagePassword, setMessagePassword] = useState('');
    const [isCreatingLink, setIsCreatingLink] = useState(false);
    const [blindTextLink, setBlindTextLink] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    const MENU_ITEMS = [
        { label: 'How It Works', path: '/how-it-works' },
        { label: 'Pricing', path: '/pricing' },
        { label: 'FAQ', path: '/faq' },
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Contact Us', path: '/contact' },
    ];

    const files = getAllFiles();
    const hasFiles = files.length > 0;

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

    // Handle File Selection (Drop or Click)
    const handleFilesSelected = useCallback(
        async (selectedFiles: File[]) => {
            const LIMITS: Record<string, number> = {
                basic: 5 * 1024 * 1024 * 1024,
                pro: 500 * 1024 * 1024 * 1024,
            };
            const limit = LIMITS[tier] || LIMITS['basic'];

            if (selectedFiles.length === 0) return;
            const file = selectedFiles[0]; // Handle first file for now (Modal limitation)

            if (file.size > limit) {
                alert(`Limit Exceeded. You are on the ${tier.toUpperCase()} tier (Limit: ${formatBytes(limit)}). Upgrade to Pro for 500GB.`);
                return;
            }

            setPendingFile(file);
            setShowDeviceModal(true);
        },
        [tier]
    );

    // Handle Device Selection from Modal
    const handleDeviceSelection = async (mode: 'desktop' | 'mobileZip', password?: string) => {
        if (!pendingFile) return;

        setShowDeviceModal(false);

        if (mode === 'mobileZip') {
            // Mobile ZIP Flow
            const localId = addFile(pendingFile);
            updateFile(localId, { status: 'encrypting' });

            const result = await uploadMobileCompatible(pendingFile, {
                password: password,
                onProgress: (percent) => {
                    updateFile(localId, {
                        encryptionProgress: percent,
                        uploadProgress: percent
                    });
                },
                onComplete: (downloadUrl) => {
                    updateFile(localId, {
                        status: 'completed',
                        progress: 100,
                        downloadUrl,
                    });
                },
                onError: (error) => {
                    updateFile(localId, {
                        status: 'error',
                        error: error.message,
                    });
                },
            });

            if (result) {
                updateFile(localId, { encryptionKey: result.password });
            }
        } else {
            // Standard AES-256 Flow
            upload(pendingFile);
        }

        setPendingFile(null);
    };

    // BlindText Logic
    const handleMessageUpload = async () => {
        if (!messageText.trim() || !messagePassword.trim()) return;

        setIsCreatingLink(true);
        setBlindTextLink(null);

        try {
            const { encryptedBlob, salt } = await encryptMessage(messageText, messagePassword);
            const initResponse = await api.initUpload('message.blindtext', encryptedBlob.size, 'application/octet-stream');
            const data = await encryptedBlob.arrayBuffer();
            const uploadResult = await api.uploadPart(initResponse.id, initResponse.uploadId, initResponse.uploadId, 1, data);
            await api.completeUpload(initResponse.id, [{ partNumber: uploadResult.partNumber, etag: uploadResult.etag }]);
            const url = generateBlindTextUrl(initResponse.id, salt);
            setBlindTextLink(url);
        } catch (error) {
            console.error('BlindText upload failed:', error);
            alert('Failed to create secure message. Please try again.');
        } finally {
            setIsCreatingLink(false);
        }
    };

    const copyBlindTextLink = () => {
        if (blindTextLink) {
            navigator.clipboard.writeText(blindTextLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const resetBlindText = () => {
        setMessageText('');
        setMessagePassword('');
        setBlindTextLink(null);
        setUploadMode('file');
    };

    // Drag & Drop
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


    if (loading) {
        return <div className="min-h-screen bg-black" />;
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
                            <button
                                onClick={() => setIsProfileOpen(true)}
                                className="hidden md:flex items-center gap-2 text-sm font-bold transition-colors hover:text-purple-400 text-silver/80"
                            >
                                <User className="w-5 h-5" />
                                <span>Profile</span>
                            </button>

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

            <DeviceSelectionModal
                isOpen={showDeviceModal}
                onClose={() => setShowDeviceModal(false)}
                onSelect={handleDeviceSelection}
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
                </div>
            </motion.section>

            {/* Upload Section */}
            <section className="flex-1 pb-16">
                <div className="container mx-auto px-4 max-w-3xl">
                    {/* Stats bar */}
                    {hasFiles && (
                        <div className="mb-6">
                            <UploadStats stats={stats} />
                        </div>
                    )}

                    {/* --- THE UPLOAD CARD (Replaces UploadWizard) --- */}
                    <div
                        onDrop={uploadMode === 'file' ? onDrop : undefined}
                        onDragOver={uploadMode === 'file' ? onDragOver : undefined}
                        className={`
                            relative w-full ${uploadMode === 'message' ? 'min-h-[400px]' : 'aspect-video'} rounded-[2rem]
                            bg-gradient-to-br ${uploadMode === 'message' ? 'from-emerald-500/20 via-teal-900/30 to-black/40' : 'from-purple-500/20 via-purple-900/30 to-black/40'}
                            backdrop-blur-2xl
                            border ${uploadMode === 'message' ? 'border-emerald-400/20' : 'border-purple-400/20'}
                            shadow-[0_0_60px_-15px_${uploadMode === 'message' ? 'rgba(16,185,129,0.4)' : 'rgba(124,58,237,0.4)'}]
                            group overflow-hidden
                            flex flex-col
                            transition-all duration-500
                            mb-12
                        `}
                    >
                        {/* Internal Specular Highlight */}
                        <div
                            className="absolute inset-0 pointer-events-none opacity-20"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 100%)'
                            }}
                        />

                        {/* High-gloss Top Border Accent */}
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-70" />

                        {/* MODE TOGGLE PILL */}
                        <div className="relative z-20 flex justify-center pt-5">
                            <div className="inline-flex p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                                <button
                                    onClick={() => setUploadMode('file')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${uploadMode === 'file'
                                        ? 'bg-white/15 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                                        : 'text-white/50 hover:text-white/70'
                                        }`}
                                >
                                    <UploadCloud className="w-4 h-4" />
                                    File Upload
                                </button>
                                <button
                                    onClick={() => setUploadMode('message')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${uploadMode === 'message'
                                        ? 'bg-white/15 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                        : 'text-white/50 hover:text-white/70'
                                        }`}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    BlindText
                                </button>
                            </div>
                        </div>

                        {/* Content - File Upload Mode */}
                        {uploadMode === 'file' && (
                            <div
                                className="relative z-10 flex flex-col items-center justify-center text-center p-8 flex-1 cursor-pointer hover:scale-[1.02] transition-transform"
                                onClick={() => document.getElementById('app-file-upload-hidden')?.click()}
                            >
                                <UploadCloud
                                    className="w-20 h-20 text-purple-400 mb-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform duration-500"
                                    strokeWidth={1.5}
                                />

                                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-100 transition-colors">
                                    Drop to Encrypt
                                </h2>

                                <p className="text-white/50 text-base font-medium">
                                    Drag & Drop files here or <span className="text-purple-400 font-bold underline underline-offset-4 decoration-purple-400/30 hover:decoration-purple-400 hover:text-purple-300 transition-all">Browse</span>
                                </p>
                            </div>
                        )}

                        {/* Content - BlindText Mode */}
                        {uploadMode === 'message' && !blindTextLink && (
                            <div className="relative z-10 flex flex-col p-6 flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <Feather className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Type to Encrypt</h2>
                                        <p className="text-white/40 text-sm">Password-protected secure message (Free & Unlimited)</p>
                                    </div>
                                </div>

                                {/* Message Textarea */}
                                <textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Write your secret message here..."
                                    className="flex-1 w-full bg-transparent text-white placeholder:text-white/30 resize-none focus:outline-none text-lg leading-relaxed min-h-[120px]"
                                />

                                {/* Password + Submit */}
                                <div className="flex gap-3 mt-4">
                                    <div className="relative flex-1">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                                        <input
                                            type="password"
                                            value={messagePassword}
                                            onChange={(e) => setMessagePassword(e.target.value)}
                                            placeholder="Set a password..."
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/30 border border-emerald-500/30 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/60"
                                        />
                                    </div>
                                    <button
                                        onClick={handleMessageUpload}
                                        disabled={!messageText.trim() || !messagePassword.trim() || isCreatingLink}
                                        className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isCreatingLink ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                Create Link
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Content - BlindText Success */}
                        {uploadMode === 'message' && blindTextLink && (
                            <div className="relative z-10 flex flex-col items-center justify-center p-8 flex-1 text-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Secure Link Created!</h2>
                                <p className="text-white/50 mb-6">Share this link. The recipient will need the password.</p>

                                {/* Link Display */}
                                <div className="w-full max-w-md bg-black/40 rounded-xl p-4 border border-emerald-500/30 mb-4">
                                    <p className="text-white/70 text-sm break-all font-mono">{blindTextLink}</p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={copyBlindTextLink}
                                        className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 transition-all flex items-center gap-2"
                                    >
                                        {linkCopied ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                Copy Link
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={resetBlindText}
                                        className="px-6 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
                                    >
                                        New Message
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Hidden Input */}
                        <input
                            id="app-file-upload-hidden"
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.length) handleFilesSelected(Array.from(e.target.files));
                                e.target.value = '';
                            }}
                        />
                    </div>

                    {/* Upload list */}
                    <AnimatePresence>
                        {hasFiles && (
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
                                    <button
                                        onClick={() => document.getElementById('app-file-upload-hidden')?.click()}
                                        className="text-xs font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        + Add Files
                                    </button>
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
