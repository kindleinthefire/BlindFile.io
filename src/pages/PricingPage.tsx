import { Suspense, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThreeBackground } from '../components/ThreeBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Zap, Clock, Rocket, Globe, Database, Infinity, X, Check, Loader2 } from 'lucide-react';
import { BetaBadge } from '../components/BetaBadge';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

const PRICING_TIERS = [
    {
        id: 'guest',
        title: 'GUEST',
        price: '$0',
        period: '',
        hook: 'Lighter than air.',
        description: 'For the quick, anonymous drop. No account, no strings attached. Just pure, ephemeral data.',
        features: [
            { icon: Rocket, text: '1GB File Limit' },
            { icon: Shield, text: 'Zero-Knowledge Encryption' },
            { icon: Clock, text: '24-Hour Expiry Only' },
        ],
        buttonText: 'Start Uploading',
        buttonLink: '/',
        highlight: false,
        animationDelay: 0,
        duration: 6
    },
    {
        id: 'explorer',
        title: 'EXPLORER',
        price: 'Free',
        period: 'Forever',
        hook: 'Establish Orbit.',
        description: 'Secure your frequency. Unlock 5x the sending power just by claiming your callsign.',
        features: [
            { icon: Globe, text: '5GB File Limit' },
            { icon: Database, text: '100GB Monthly Cap' },
            { icon: Zap, text: 'Basic Dashboard Access' },
        ],
        buttonText: 'Sign Up Free',
        buttonLink: '/auth',
        highlight: false,
        animationDelay: 1,
        duration: 5
    },
    {
        id: 'commander',
        title: 'PRO',
        price: '$9',
        period: '/mo',
        hook: 'Warp Speed.',
        description: 'The reason you are here. Send massive 500GB files that defy logic. No throttle, no waiting.',
        features: [
            { icon: Zap, text: '500GB File Limit (Massive Scale)' },
            { icon: Database, text: '5TB Monthly Cap' },
            { icon: Zap, text: 'Global Edge Acceleration' },
            { icon: Clock, text: 'Custom Expiry Settings' },
        ],
        buttonText: 'Join Waiting List',
        buttonLink: '#waitlist',
        highlight: true,
        animationDelay: 0.5,
        duration: 7
    },
    {
        id: 'singularity',
        title: 'UNLIMITED',
        price: '$39',
        period: '/mo',
        hook: 'Infinite Density.',
        description: 'For heavy-duty transport. The massive 500GB capacity of Pro, with absolutely no monthly fuel limits.',
        features: [
            { icon: Zap, text: 'Everything in Pro +' },
            { icon: Globe, text: '500GB File Limit' },
            { icon: Infinity, text: 'Unlimited Monthly Sends*' },
        ],
        buttonText: 'Join Waiting List',
        buttonLink: '#waitlist',
        highlight: false,
        animationDelay: 2,
        duration: 8
    }
];

function WaitingListModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setErrorMsg('');

        try {
            const { error } = await supabase
                .from('waiting_list')
                .insert({ email });

            if (error) {
                if (error.code === '23505') { // Unique violation
                    setStatus('success'); // Treat duplicate as success to avoid leaking info/annoying user
                } else {
                    throw error;
                }
            } else {
                setStatus('success');
            }
        } catch (err) {
            console.error('Waitlist error:', err);
            setStatus('error');
            setErrorMsg('Failed to join. Please try again.');
        }
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8 z-[70] shadow-2xl shadow-purple-900/20"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                                <Rocket className="w-6 h-6 text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Join the Waiting List</h2>
                            <p className="text-white/60 text-sm">
                                Spot secured. Launch imminent. <br />
                                Be the first to access Pro features when we lift off.
                            </p>
                        </div>

                        {status === 'success' ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                                    <Check className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-white font-bold mb-1">You're on the list!</h3>
                                <p className="text-white/60 text-sm">We'll notify you as soon as spots open up.</p>
                                <button
                                    onClick={onClose}
                                    className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
                                >
                                    Close
                                </button>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                    />
                                </div>

                                {status === 'error' && (
                                    <p className="text-red-400 text-sm text-center">{errorMsg}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Joining...
                                        </>
                                    ) : (
                                        'Secure My Spot'
                                    )}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default function PricingPage() {
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex flex-col font-sans selection:bg-purple-500/30 text-white">
            {/* --- VISUAL BACKGROUND: Three.js Planet Arc --- */}
            <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
                <ThreeBackground />
            </Suspense>

            {/* --- HEADER --- */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full"
            >
                <Link to="/" className="flex items-center gap-2 group text-white/60 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium text-sm">Back to Home</span>
                </Link>

                <Link to="/" className="flex flex-col items-center gap-0 group cursor-pointer absolute left-1/2 transform -translate-x-1/2">
                    <img
                        src={logo}
                        alt="Blind File Logo"
                        className="w-16 h-16 object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="scale-75 origin-top -mt-1">
                        <BetaBadge />
                    </div>
                </Link>

                <div className="w-20" /> {/* Spacer for visual balance */}
            </motion.header>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 pt-8 md:pt-16 pb-20 w-full max-w-7xl mx-auto">

                {/* HERO TEXT */}
                <div className="text-center space-y-4 mb-20">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-7xl font-bold tracking-tight drop-shadow-xl"
                    >
                        Defy Gravity. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Escape Your Limits.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto"
                    >
                        From light-speed drops to massive interstellar payloads. Choose your encryption class.
                    </motion.p>
                </div>

                {/* PRICING CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
                    {PRICING_TIERS.map((tier) => (
                        <motion.div
                            key={tier.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{
                                opacity: 1,
                                y: [0, -15, 0] // Float animation handled here via Framer Motion for smoother React integration
                            }}
                            transition={{
                                opacity: { duration: 0.5, delay: 0.3 + tier.animationDelay * 0.2 },
                                y: {
                                    duration: tier.duration,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: tier.animationDelay
                                }
                            }}
                            className={`
                                relative flex flex-col p-8 rounded-3xl backdrop-blur-xl border transition-all duration-300
                                ${tier.highlight
                                    ? 'bg-purple-900/20 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] z-10 scale-105 md:scale-110 xl:scale-105'
                                    : 'bg-zinc-900/40 border-white/10 hover:border-white/20 hover:bg-zinc-900/60'
                                }
                            `}
                        >
                            {tier.highlight && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-xs font-bold text-white shadow-lg tracking-wider uppercase">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-lg font-bold tracking-[0.2em] text-white/40 mb-2 uppercase">{tier.title}</h3>
                                <div className="flex items-end gap-1 mb-4">
                                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                                    {tier.period && <span className="text-sm text-white/40 font-medium mb-1.5">{tier.period}</span>}
                                </div>
                                <p className="text-purple-400 font-bold italic mb-2">"{tier.hook}"</p>
                                <p className="text-sm text-white/60 leading-relaxed">{tier.description}</p>
                            </div>

                            <div className="flex-1 space-y-4 mb-8">
                                {tier.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-sm text-white/80">
                                        <feature.icon className={`w-4 h-4 ${tier.highlight ? 'text-purple-400' : 'text-white/40'}`} />
                                        <span>{feature.text}</span>
                                    </div>
                                ))}
                            </div>

                            {tier.buttonLink === '#waitlist' ? (
                                <button
                                    onClick={() => setIsWaitlistOpen(true)}
                                    className={`
                                        w-full py-3 rounded-xl font-bold text-center transition-all duration-300
                                        ${tier.highlight
                                            ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/40'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                        }
                                    `}
                                >
                                    {tier.buttonText}
                                </button>
                            ) : (
                                <Link
                                    to={tier.buttonLink}
                                    className={`
                                        w-full py-3 rounded-xl font-bold text-center transition-all duration-300 block
                                        ${tier.highlight
                                            ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/40'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                        }
                                    `}
                                >
                                    {tier.buttonText}
                                </Link>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* FOOTER NOTE */}
                <div className="mt-20 text-center max-w-3xl mx-auto px-4">
                    <p className="text-[12px] font-mono text-white/40 leading-relaxed">
                        * FAIR USE PROTOCOL: "Unlimited" refers to transfer frequency and volume for manual human workflows.
                        Automated, bot-driven traffic that threatens system stability may be throttled to ensure gravity remains constant for all users.
                    </p>
                </div>

                {/* BOTTOM COPYRIGHT */}
                <footer className="relative z-10 w-full py-8 text-center mt-10">
                    <p className="text-[10px] text-white/40 font-medium">
                        © 2026 Blind File. Engineered in Reston, VA.
                    </p>
                </footer>

            </main>

            <WaitingListModal
                isOpen={isWaitlistOpen}
                onClose={() => setIsWaitlistOpen(false)}
            />
        </div>
    );
}
