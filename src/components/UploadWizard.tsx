import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, AlertCircle, Apple, Lock } from 'lucide-react';

interface UploadWizardProps {
    onComplete: (file: File, chunkSize: number, mobileZipMode?: boolean, password?: string) => void;
}

export function UploadWizard({ onComplete }: UploadWizardProps) {
    const [step, setStep] = useState<'device' | 'password' | 'file'>('device');
    const [deviceType, setDeviceType] = useState<'desktop' | 'mobileZip' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');

    const DEVICE_CONFIG = {
        desktop: {
            label: "Desktop / Laptop",
            icon: Monitor,
            maxSize: 500 * 1024 * 1024 * 1024, // 500GB
            chunkSize: 10 * 1024 * 1024, // 10MB
            desc: "AES-256 zero-knowledge encryption. Max 500GB."
        },
        mobileZip: {
            label: "iOS / Android",
            icon: Apple,
            maxSize: 50 * 1024 * 1024 * 1024, // 50GB for mobile downloads
            chunkSize: 5 * 1024 * 1024,
            desc: "Password-protected ZIP. Opens natively. Max 50GB."
        }
    };

    const handleDeviceSelect = (type: 'desktop' | 'mobileZip') => {
        setDeviceType(type);
        setError(null);

        if (type === 'mobileZip') {
            // For iOS mode, ask for password first
            setStep('password');
        } else {
            // Desktop mode goes straight to file
            setStep('file');
        }
    };

    const handlePasswordSubmit = () => {
        if (!password.trim()) {
            setError('Please enter a password');
            return;
        }
        if (password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }
        setError(null);
        setStep('file');
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !deviceType) return;

        const config = DEVICE_CONFIG[deviceType];

        if (file.size > config.maxSize) {
            setError(`File too large for ${config.label}. Limit is ${config.maxSize / (1024 * 1024 * 1024)}GB.`);
            return;
        }

        // Pass mobileZipMode flag and password to parent
        onComplete(file, config.chunkSize, deviceType === 'mobileZip', deviceType === 'mobileZip' ? password : undefined);
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6">
            <AnimatePresence mode="wait">
                {step === 'device' && (
                    <motion.div
                        key="device"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Recipient Device?</h2>
                            <p className="text-white/60">Choose based on where the file will be downloaded.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Desktop */}
                            <button
                                onClick={() => handleDeviceSelect('desktop')}
                                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                                    <Monitor className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{DEVICE_CONFIG.desktop.label}</h3>
                                <p className="text-sm text-white/50">{DEVICE_CONFIG.desktop.desc}</p>
                            </button>

                            {/* iOS/Android */}
                            <button
                                onClick={() => handleDeviceSelect('mobileZip')}
                                className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/30 hover:border-green-500/60 transition-all group text-left relative"
                            >
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
                                    <Apple className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{DEVICE_CONFIG.mobileZip.label}</h3>
                                <p className="text-sm text-white/50">{DEVICE_CONFIG.mobileZip.desc}</p>
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'password' && deviceType === 'mobileZip' && (
                    <motion.div
                        key="password"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Choose a Password</h2>
                            <p className="text-white/60">The recipient will need this to open the file.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter a simple password..."
                                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-green-500/30 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/60 text-lg"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handlePasswordSubmit();
                                    }}
                                />
                            </div>

                            <p className="text-xs text-white/40 text-center">
                                💡 Tip: Keep it simple! "1234" or "secret" works great.
                            </p>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-200"
                                >
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </motion.div>
                            )}

                            <button
                                onClick={handlePasswordSubmit}
                                className="w-full py-4 rounded-xl font-medium bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white transition-all"
                            >
                                Continue →
                            </button>
                        </div>

                        <button
                            onClick={() => setStep('device')}
                            className="text-sm text-white/40 hover:text-white transition-colors w-full text-center"
                        >
                            ← Change Device
                        </button>
                    </motion.div>
                )}

                {step === 'file' && deviceType && (
                    <motion.div
                        key="file"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6 text-center"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Select File</h2>
                            <p className="text-white/60">
                                Mode: <span className={deviceType === 'mobileZip' ? 'text-green-400' : 'text-purple-400'}>
                                    {DEVICE_CONFIG[deviceType].label}
                                </span>
                                {deviceType === 'mobileZip' && password && (
                                    <span className="block text-xs text-green-400/70 mt-1">
                                        🔐 Password: {password}
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="relative group">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleFileSelect}
                            />
                            <div className={`border-2 border-dashed rounded-3xl p-12 transition-all ${deviceType === 'mobileZip'
                                    ? 'border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5'
                                    : 'border-white/20 hover:border-purple-500/50 hover:bg-white/5'
                                }`}>
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors ${deviceType === 'mobileZip'
                                        ? 'bg-green-500/10 text-green-400'
                                        : 'bg-white/5 text-white/40 group-hover:text-purple-400'
                                    }`}>
                                    {deviceType === 'mobileZip' ? <Apple className="w-8 h-8" /> : <Monitor className="w-8 h-8" />}
                                </div>
                                <p className="text-lg font-medium text-white mb-2">Click or Drop File</p>
                                <p className="text-sm text-white/40">Max {DEVICE_CONFIG[deviceType].maxSize / (1024 * 1024 * 1024)}GB</p>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-200"
                            >
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span className="text-sm">{error}</span>
                            </motion.div>
                        )}

                        <button
                            onClick={() => deviceType === 'mobileZip' ? setStep('password') : setStep('device')}
                            className="text-sm text-white/40 hover:text-white transition-colors"
                        >
                            ← {deviceType === 'mobileZip' ? 'Change Password' : 'Change Device'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
