import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Apple, Lock, Shield, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface DeviceSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (mode: 'desktop' | 'mobileZip', password?: string) => void;
}

export function DeviceSelectionModal({ isOpen, onClose, onSelect }: DeviceSelectionModalProps) {
    const [modalStep, setModalStep] = useState<'device' | 'password'>('device');
    const [mobilePassword, setMobilePassword] = useState('');

    const handleSelection = (mode: 'desktop' | 'mobileZip') => {
        if (mode === 'mobileZip' && modalStep === 'device') {
            setModalStep('password');
            return;
        }

        // Reset and callback
        setModalStep('device');
        setMobilePassword('');
        onSelect(mode, mode === 'mobileZip' ? mobilePassword : undefined);
    };

    const handleClose = () => {
        setModalStep('device');
        setMobilePassword('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-2xl bg-zinc-900/95 border border-white/10 rounded-3xl p-8 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <AnimatePresence mode="wait">
                            {modalStep === 'device' && (
                                <motion.div
                                    key="device-step"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <h2 className="text-2xl font-bold text-white text-center mb-2">
                                        Where will this file be downloaded?
                                    </h2>
                                    <p className="text-white/60 text-center mb-8">
                                        Choose based on the recipient's device for the best experience.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Desktop Option */}
                                        <button
                                            onClick={() => handleSelection('desktop')}
                                            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                                                <Monitor className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-2">Desktop / Laptop</h3>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-green-400">
                                                    <Lock className="w-4 h-4" />
                                                    <span>AES-256 Encryption</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-green-400">
                                                    <Shield className="w-4 h-4" />
                                                    <span>True Zero-Knowledge</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-white/60">
                                                    <Zap className="w-4 h-4" />
                                                    <span>Max 1GB (Guest)</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-white/40">
                                                Military-grade encryption. Best for computers.
                                            </p>
                                        </button>

                                        {/* iOS/Android Option */}
                                        <button
                                            onClick={() => handleSelection('mobileZip')}
                                            className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/30 hover:border-green-500/60 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
                                                <Apple className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-2">iOS / Android</h3>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-yellow-400">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span>Password-Protected ZIP</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>Opens Natively in Files</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-white/60">
                                                    <Zap className="w-4 h-4" />
                                                    <span>Max 1GB (Guest)</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-white/40">
                                                Less secure, but guaranteed to work on phones.
                                            </p>
                                        </button>
                                    </div>

                                    <p className="text-xs text-white/30 text-center mt-6">
                                        📱 iOS users: Desktop mode may fail on Safari. Choose iOS/Android for reliability.
                                    </p>
                                </motion.div>
                            )}

                            {modalStep === 'password' && (
                                <motion.div
                                    key="password-step"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <h2 className="text-2xl font-bold text-white text-center mb-2">
                                        Choose a Password
                                    </h2>
                                    <p className="text-white/60 text-center mb-8">
                                        The recipient will need this to open the file.
                                    </p>

                                    <div className="space-y-4 max-w-md mx-auto">
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                                            <input
                                                type="text"
                                                value={mobilePassword}
                                                onChange={(e) => setMobilePassword(e.target.value)}
                                                placeholder="Enter a simple password..."
                                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-green-500/30 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/60 text-lg"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && mobilePassword.length >= 4) {
                                                        handleSelection('mobileZip');
                                                    }
                                                }}
                                            />
                                        </div>

                                        <p className="text-xs text-white/40 text-center">
                                            💡 Tip: Keep it simple! "1234" or "secret" works great.
                                        </p>

                                        <button
                                            onClick={() => handleSelection('mobileZip')}
                                            disabled={mobilePassword.length < 4}
                                            className="w-full py-4 rounded-xl font-medium bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Upload File →
                                        </button>

                                        <button
                                            onClick={() => setModalStep('device')}
                                            className="text-sm text-white/40 hover:text-white transition-colors w-full text-center"
                                        >
                                            ← Back
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
