import { useCallback, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, Menu, User, Check, ArrowRight, Shield, Zap, Clock, CheckCircle, MessageSquare, Feather, Copy, Info, Lock } from 'lucide-react';
import { DeviceSelectionModal } from '../components/DeviceSelectionModal';
import { UploadCard } from '../components/UploadCard';
import { useFileUploader } from '../hooks/useFileUploader';
import { useUploadStore } from '../store/uploadStore';
import { ThreeBackground } from '../components/ThreeBackground';
import { supabase } from '../lib/supabase';
import { ProfileModal } from '../components/ProfileModal';
import { ShootingStarsOverlay } from '../components/ShootingStarsOverlay';
import { uploadMobileCompatible } from '../lib/mobileUpload';
import { encryptMessage, generateBlindTextUrl } from '../lib/messageEncryption';
import { api } from '../lib/api';

import { Link, useNavigate } from 'react-router-dom';

import logo from '../assets/logo.png';

export default function HomePage() {
    const { upload, cancel } = useFileUploader();
    const { getAllFiles, addFile, updateFile } = useUploadStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [tier, setTier] = useState<string>('guest');
    const navigate = useNavigate();

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

    // Auto-select BlindText mode from URL param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'blindtext') {
            setUploadMode('message');
        }
    }, []);

    const MENU_ITEMS = [
        { label: 'How It Works', path: '/how-it-works' },
        { label: 'Pricing', path: '/pricing' },
        { label: 'FAQ', path: '/faq' },
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Contact Us', path: '/contact' },
    ];

    useEffect(() => {
        const fetchTier = async (userId: string) => {
            const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).single();
            if (data?.subscription_tier) setTier(data.subscription_tier);
            else setTier('basic'); // Auth user default
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) fetchTier(session.user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) fetchTier(session.user.id);
            else setTier('guest');
        });

        return () => subscription.unsubscribe();
    }, []);

    const files = getAllFiles();
    const hasFiles = files.length > 0;

    const handleFilesSelected = useCallback(
        async (selectedFiles: File[]) => {
            const LIMITS: Record<string, number> = {
                guest: 1 * 1024 * 1024 * 1024,
                basic: 5 * 1024 * 1024 * 1024,
                pro: 500 * 1024 * 1024 * 1024,
            };
            const limit = LIMITS[tier] || LIMITS['guest'];

            if (session) {
                navigate('/app');
                return;
            }

            // GUEST: Show device selection modal
            for (const file of selectedFiles) {
                if (file.size > limit) {
                    alert(`Limit Exceeded. Guests are limited to 1GB. Sign in for 5GB or Go Pro for 500GB.`);
                    return;
                }
                // Store file and show modal
                setPendingFile(file);
                setShowDeviceModal(true);
            }
        },
        [session, navigate, tier]
    );

    // Handle device selection from modal
    const handleDeviceSelection = async (mode: 'desktop' | 'mobileZip', password?: string) => {
        if (!pendingFile) return;

        setShowDeviceModal(false);

        if (mode === 'mobileZip') {
            // Use Mobile ZIP flow with user password
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
            // Standard AES-256 flow
            upload(pendingFile);
        }

        setPendingFile(null);
    };

    // Simple Drag & Drop Logic for the Card
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (session) {
            navigate('/app');
            return;
        }

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) handleFilesSelected(droppedFiles);
    }, [handleFilesSelected, session, navigate]);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    // BlindText: Handle secure message upload
    const handleMessageUpload = async () => {
        if (!messageText.trim() || !messagePassword.trim()) {
            return;
        }

        setIsCreatingLink(true);
        setBlindTextLink(null);

        try {
            // 1. Encrypt message with password
            const { encryptedBlob, salt } = await encryptMessage(messageText, messagePassword);

            // 2. Upload encrypted blob to R2
            const initResponse = await api.initUpload(
                'message.blindtext',
                encryptedBlob.size,
                'application/octet-stream'
            );

            // Upload as single part
            const data = await encryptedBlob.arrayBuffer();
            const uploadResult = await api.uploadPart(
                initResponse.id,
                initResponse.uploadId,
                initResponse.uploadId,
                1,
                data
            );

            // Complete upload
            await api.completeUpload(initResponse.id, [
                { partNumber: uploadResult.partNumber, etag: uploadResult.etag }
            ]);

            // 3. Generate BlindText URL (password NOT in URL, only salt)
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

    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex flex-col font-sans selection:bg-purple-500/30 text-white">

            {/* --- VISUAL BACKGROUND: Three.js Planet Arc --- */}
            <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
                <ThreeBackground />
            </Suspense>

            {/* --- SHOOTING STARS FOREGROUND --- */}
            <ShootingStarsOverlay />

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
                            className="w-32 h-32 object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="font-bold text-xl tracking-[0.25em] text-white/90 group-hover:text-white transition-colors">
                            BLIND FILE
                        </span>
                    </Link>

                    {/* Desktop Nav (Column Layout for Auth + Menu) */}
                    {/* Desktop Nav (Column Layout for Auth + Menu) */}
                    <nav className="flex flex-col items-center gap-3">
                        {/* 1. Auth / Profile Link */}
                        <div className="mb-1">
                            {session ? (
                                <div className="flex items-center gap-6">
                                    <Link
                                        to="/app"
                                        className="text-lg font-bold transition-colors hover:text-purple-400 text-white"
                                    >
                                        App
                                    </Link>
                                    <button
                                        onClick={() => setIsProfileOpen(true)}
                                        className="text-lg font-bold transition-colors hover:text-purple-400 text-white flex items-center gap-2"
                                    >
                                        <User className="w-5 h-5" />
                                        Profile
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/auth"
                                    className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.5)] hover:shadow-[0_0_30px_rgba(147,51,234,0.7)]"
                                >
                                    Get 5GB Free
                                </Link>
                            )}
                        </div>

                        {/* 2. Desktop Hamburger Menu (Under Auth) */}
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
                                        className="absolute top-full right-1/2 translate-x-1/2 mt-3 w-48 bg-[rgba(20,20,20,0.8)] backdrop-blur-[10px] border border-white/10 rounded-xl p-2 shadow-2xl z-50 overflow-hidden"
                                    >
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
                                        {session ? (
                                            <button
                                                onClick={() => {
                                                    supabase.auth.signOut();
                                                    setIsDesktopMenuOpen(false);
                                                }}
                                                className="block w-full text-left py-2 px-4 text-sm font-medium text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                Sign Out
                                            </button>
                                        ) : (
                                            <Link
                                                to="/auth"
                                                className="block w-full text-left py-2 px-4 text-sm font-medium text-white hover:bg-white/5 hover:text-purple-300 rounded-lg transition-colors"
                                                onClick={() => setIsDesktopMenuOpen(false)}
                                            >
                                                Login
                                            </Link>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </nav>
                </div>

                {/* MOBILE HEADER LAYOUT (Centered Logo + Menu) */}
                <div className="md:hidden w-full flex flex-col items-center relative gap-2">
                    <Link to="/" className="flex flex-col items-center gap-0 group cursor-pointer">
                        <img
                            src={logo}
                            alt="Blind File Logo"
                            className="w-16 h-16 object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="font-bold text-xl tracking-[0.25em] text-white/90 group-hover:text-white transition-colors -mt-1">
                            BLIND FILE
                        </span>
                    </Link>

                    {/* Hamburger Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors"
                    >
                        {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                                {session ? (
                                    <>
                                        <Link
                                            to="/app"
                                            className="block w-full py-3 px-4 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Go to App
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setIsProfileOpen(true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="block w-full py-3 px-4 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            Profile
                                        </button>
                                    </>
                                ) : (
                                    <Link
                                        to="/auth"
                                        className="mx-4 my-2 block py-3 px-4 text-center rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Get 5GB Free
                                    </Link>
                                )}

                                <div className="border-t border-white/10 my-2" />

                                {MENU_ITEMS.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className="block w-full py-2 px-4 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}

                                <div className="border-t border-white/10 my-2" />
                                {session ? (
                                    <button
                                        onClick={() => {
                                            supabase.auth.signOut();
                                            setIsMenuOpen(false);
                                        }}
                                        className="block w-full py-2 px-4 text-sm font-medium text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                ) : (
                                    <Link
                                        to="/auth"
                                        className="block w-full py-2 px-4 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Login
                                    </Link>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


            </motion.header>

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                session={session}
            />

            {/* --- DEVICE SELECTION MODAL --- */}
            <DeviceSelectionModal
                isOpen={showDeviceModal}
                onClose={() => setShowDeviceModal(false)}
                onSelect={handleDeviceSelection}
            />

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-start md:justify-center px-4 pt-4 md:pt-0 w-full max-w-[1920px] mx-auto">

                <AnimatePresence mode="wait">
                    {!hasFiles ? (
                        /* --- IDLE STATE: The Hero Card --- */
                        <motion.div
                            key="hero-card"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-col items-center gap-2 md:gap-8 w-full max-w-lg -mt-4 md:mt-0"
                        >
                            {/* HERO TEXT - Above Card */}
                            {/* HERO TEXT - Above Card */}
                            {/* HERO TEXT - Above Card */}
                            <div className="text-center space-y-4 mb-4">
                                <h1 className="text-4xl md:text-6xl font-bold tracking-tight drop-shadow-xl">
                                    Total Privacy. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Massive Scale.</span>
                                </h1>
                                <p className="text-lg md:text-xl text-white/60 font-medium max-w-xl mx-auto">
                                    Send 1GB instantly with no account. Sign up for 5GB free, or go Pro for 500GB.
                                </p>
                            </div>

                            {/* THE GLASS PANEL */}
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
                                `}
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

                                {/* MODE TOGGLE PILL */}
                                {!session && (
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
                                )}

                                {/* Content - File Upload Mode */}
                                {uploadMode === 'file' && (
                                    <div
                                        className="relative z-10 flex flex-col items-center justify-center text-center p-8 flex-1 cursor-pointer hover:scale-[1.02] transition-transform"
                                        onClick={() => {
                                            if (session) {
                                                navigate('/app');
                                            } else {
                                                document.getElementById('file-upload-hidden')?.click();
                                            }
                                        }}
                                    >
                                        <UploadCloud
                                            className="w-20 h-20 text-purple-400 mb-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform duration-500"
                                            strokeWidth={1.5}
                                        />

                                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-100 transition-colors">
                                            {session ? 'Go to Dashboard' : 'Drop to Encrypt'}
                                        </h2>

                                        <p className="text-white/50 text-base font-medium">
                                            {session ? 'Click to manage your files in the App' : (
                                                <>Drag & Drop files here or <span className="text-purple-400 font-bold underline underline-offset-4 decoration-purple-400/30 hover:decoration-purple-400 hover:text-purple-300 transition-all">Browse</span></>
                                            )}
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
                            <p className="flex items-center justify-center gap-1.5 mb-4 text-xs md:text-sm font-medium text-white">
                                <span>✨ Guest limit: 1GB.</span>
                                <Link
                                    to="/auth"
                                    className="text-purple-500 font-bold hover:text-purple-400 transition-colors"
                                >
                                    Unlock 5GB Free →
                                </Link>
                            </p>

                            {/* Feature badges */}
                            <motion.div
                                className="flex flex-wrap items-center justify-center gap-4 px-4"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Link
                                    to="/faq#mobile-encryption"
                                    className="glass rounded-full px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                    <Shield className="w-4 h-4 text-success" />
                                    <span className="text-sm text-silver flex items-center gap-1.5">
                                        Zero-Knowledge Encryption
                                        <Info className="w-3 h-3 text-white/40" strokeWidth={2} />
                                    </span>
                                </Link>
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
                                    <span className="text-sm text-white">
                                        No Logs Kept
                                    </span>
                                </div>
                            </motion.div>

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

            {/* --- FOOTER --- */}
            <footer className="relative z-10 w-full py-4 text-center">
                <p className="text-[10px] text-white/40 font-medium">
                    © 2026 Blind File. Engineered in Reston, VA.
                </p>
            </footer>
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
