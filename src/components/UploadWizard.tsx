import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Monitor, AlertCircle, Apple } from 'lucide-react';

interface UploadWizardProps {
    onComplete: (file: File, chunkSize: number, mobileZipMode?: boolean) => void;
}

export function UploadWizard({ onComplete }: UploadWizardProps) {
    const [step, setStep] = useState<'device' | 'file'>('device');
    const [deviceType, setDeviceType] = useState<'mobile' | 'desktop' | 'mobileZip' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const DEVICE_CONFIG = {
        desktop: {
            label: "Desktop / Laptop",
            icon: Monitor,
            maxSize: 500 * 1024 * 1024 * 1024, // 500GB
            chunkSize: 10 * 1024 * 1024, // 10MB
            desc: "AES-256 encryption. Optimal for speed.",
            color: "purple"
        },
        mobile: {
            label: "Mobile (Advanced)",
            icon: Smartphone,
            maxSize: 50 * 1024 * 1024 * 1024, // 50GB
            chunkSize: 5 * 1024 * 1024, // 5MB (R2 Minimum)
            desc: "AES-256 with Service Worker decryption.",
            color: "purple"
        },
        mobileZip: {
            label: "iOS / Android (Recommended)",
            icon: Apple,
            maxSize: 10 * 1024 * 1024 * 1024, // 10GB for ZIP
            chunkSize: 5 * 1024 * 1024,
            desc: "Password-protected ZIP. Opens natively in iOS Files.",
            color: "green"
        }
    };

    const handleDeviceSelect = (type: 'mobile' | 'desktop' | 'mobileZip') => {
        setDeviceType(type);
        setStep('file');
        setError(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !deviceType) return;

        const config = DEVICE_CONFIG[deviceType];

        if (file.size > config.maxSize) {
            setError(`File too large for ${config.label}. Limit is ${config.maxSize / (1024 * 1024 * 1024)}GB.`);
            return;
        }

        // Pass mobileZipMode flag to parent
        onComplete(file, config.chunkSize, deviceType === 'mobileZip');
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-6">
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
                            <p className="text-white/60">We optimize the encryption based on where it will be opened.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Mobile ZIP First - Recommended */}
                            <button
                                onClick={() => handleDeviceSelect('mobileZip')}
                                className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/30 hover:border-green-500/60 transition-all group text-left relative"
                            >
                                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                                    Recommended
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
                                    <Apple className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{DEVICE_CONFIG.mobileZip.label}</h3>
                                <p className="text-sm text-white/50">{DEVICE_CONFIG.mobileZip.desc}</p>
                            </button>

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

                            {/* Mobile Advanced */}
                            <button
                                onClick={() => handleDeviceSelect('mobile')}
                                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{DEVICE_CONFIG.mobile.label}</h3>
                                <p className="text-sm text-white/50">{DEVICE_CONFIG.mobile.desc}</p>
                            </button>
                        </div>
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
                                {deviceType === 'mobileZip' && (
                                    <span className="block text-xs text-green-400/70 mt-1">
                                        📱 Opens natively on iPhone/Android
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
                                    {deviceType === 'mobileZip' ? <Apple className="w-8 h-8" /> : <Smartphone className="w-8 h-8" />}
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
                            onClick={() => setStep('device')}
                            className="text-sm text-white/40 hover:text-white transition-colors"
                        >
                            ← Change Device
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
