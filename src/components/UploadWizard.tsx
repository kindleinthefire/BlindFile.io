import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Monitor, AlertCircle } from 'lucide-react';

interface UploadWizardProps {
    onComplete: (file: File, chunkSize: number) => void;
}

export function UploadWizard({ onComplete }: UploadWizardProps) {
    const [step, setStep] = useState<'device' | 'file'>('device');
    const [deviceType, setDeviceType] = useState<'mobile' | 'desktop' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const DEVICE_CONFIG = {
        mobile: {
            label: "Mobile / Tablet",
            icon: Smartphone,
            maxSize: 50 * 1024 * 1024 * 1024, // 50GB
            chunkSize: 5 * 1024 * 1024, // 5MB (R2 Minimum)
            desc: "Optimized for stability on iOS/Android. Max 50GB."
        },
        desktop: {
            label: "Desktop / Laptop",
            icon: Monitor,
            maxSize: 500 * 1024 * 1024 * 1024, // 500GB
            chunkSize: 10 * 1024 * 1024, // 10MB
            desc: "Optimized for speed and cost. Max 500GB."
        }
    };

    const handleDeviceSelect = (type: 'mobile' | 'desktop') => {
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

        onComplete(file, config.chunkSize);
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
                            <p className="text-white/60">We optimize the encryption stream based on where it will be opened.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(Object.keys(DEVICE_CONFIG) as Array<'mobile' | 'desktop'>).map((type) => {
                                const config = DEVICE_CONFIG[type];
                                return (
                                    <button
                                        key={type}
                                        onClick={() => handleDeviceSelect(type)}
                                        className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all group text-left"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                                            <config.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{config.label}</h3>
                                        <p className="text-sm text-white/50">{config.desc}</p>
                                    </button>
                                );
                            })}
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
                                Mode: <span className="text-purple-400">{DEVICE_CONFIG[deviceType].label}</span>
                                <br />
                                Chunk Size: {DEVICE_CONFIG[deviceType].chunkSize / 1024 / 1024}MB
                            </p>
                        </div>

                        <div className="relative group">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleFileSelect}
                            />
                            <div className="border-2 border-dashed border-white/20 rounded-3xl p-12 hover:border-purple-500/50 hover:bg-white/5 transition-all">
                                <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/40 group-hover:text-purple-400 transition-colors">
                                    <Smartphone className="w-8 h-8" />
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
