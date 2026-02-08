import { Suspense, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThreeBackground } from '../components/ThreeBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, LifeBuoy, ShieldAlert, Rocket, Mail, MapPin, X, Check, Loader2, Send } from 'lucide-react';
import { BetaBadge } from '../components/BetaBadge';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

type TicketType = 'technical' | 'abuse' | 'partnership' | null;

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: TicketType;
}

function ContactModal({ isOpen, onClose, type }: ContactModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name || !email || !message || !type) return;

        setStatus('loading');
        setErrorMsg('');

        try {
            const { error } = await supabase
                .from('support_tickets')
                .insert({
                    name,
                    email,
                    message,
                    ticket_type: type
                });

            if (error) throw error;
            setStatus('success');
            // Reset form
            setName('');
            setEmail('');
            setMessage('');
        } catch (err) {
            console.error('Support ticket error:', err);
            setStatus('error');
            setErrorMsg('Failed to send. Please try again later.');
        }
    };

    const getModalContent = () => {
        switch (type) {
            case 'technical':
                return {
                    title: 'Technical Support',
                    desc: 'Describe the issue. We\'ll investigate.',
                    icon: LifeBuoy,
                    color: 'blue'
                };
            case 'abuse':
                return {
                    title: 'File Abuse Report',
                    desc: 'Report malware, illegal content, or TOS violations.',
                    icon: ShieldAlert,
                    color: 'red'
                };
            case 'partnership':
                return {
                    title: 'Establish Uplink',
                    desc: 'Partnerships, enterprise licensing, and press.',
                    icon: Rocket,
                    color: 'purple'
                };
            default:
                return {
                    title: 'Contact Us',
                    desc: 'Send us a message.',
                    icon: Mail,
                    color: 'purple'
                };
        }
    };

    const content = getModalContent();
    const Icon = content.icon;

    // Dynamic styles based on type
    const colors = {
        blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', button: 'bg-blue-600 hover:bg-blue-500' },
        red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', button: 'bg-red-600 hover:bg-red-500' },
        purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', button: 'bg-purple-600 hover:bg-purple-500' }
    };
    const theme = colors[content.color as keyof typeof colors];

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
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-8 z-[9999] shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className={`w-12 h-12 rounded-full ${theme.bg} flex items-center justify-center mx-auto mb-4 border ${theme.border}`}>
                                <Icon className={`w-6 h-6 ${theme.text}`} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">{content.title}</h2>
                            <p className="text-white/60 text-sm">{content.desc}</p>
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
                                <h3 className="text-white font-bold mb-1">Transmission Received</h3>
                                <p className="text-white/60 text-sm">Your message has been securely logged. Our team will review it shortly.</p>
                                <button
                                    onClick={onClose}
                                    className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
                                >
                                    Close Channel
                                </button>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Identity</label>
                                    <input
                                        type="text"
                                        placeholder="Your Name / Handle"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Comms Frequency</label>
                                    <input
                                        type="email"
                                        placeholder="Return Email Address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Payload</label>
                                    <textarea
                                        placeholder="Message contents..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                        rows={4}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all resize-none"
                                    />
                                </div>

                                {status === 'error' && (
                                    <p className="text-red-400 text-sm text-center">{errorMsg}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className={`w-full ${theme.button} disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2`}
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Encrypting & Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Transmit Securely
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

export default function ContactPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<TicketType>(null);

    const openModal = (type: TicketType) => {
        setModalType(type);
        setModalOpen(true);
    };

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

                <div className="w-20" /> {/* Spacer */}
            </motion.header>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 pt-8 md:pt-16 pb-20 w-full max-w-7xl mx-auto">

                {/* HERO */}
                <div className="text-center space-y-4 mb-20">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-6xl font-bold tracking-tight drop-shadow-xl uppercase"
                    >
                        Comms <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Uplink</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto uppercase tracking-widest"
                    >
                        Signal Triage & Support
                    </motion.p>
                </div>

                {/* THE TRIAGE GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">

                    {/* CHANNEL 1: MISSION SUPPORT */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col relative group hover:border-white/10 transition-colors"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                            <LifeBuoy className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Technical Support</h2>
                        <div className="flex-1">
                            <p className="text-white/60 leading-relaxed mb-6 text-sm">
                                Check the Mission Briefing (FAQ) first.
                                <br /><br />
                                Due to Zero-Knowledge architecture, support staff <strong className="text-white">cannot</strong> recover lost links, reset BlindText passwords, or view file contents. No exceptions. We can assist however with resetting user accounts and investigating technical issues.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Link
                                to="/faq"
                                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors"
                            >
                                Read FAQ
                            </Link>
                            <button
                                onClick={() => openModal('technical')}
                                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-white/5"
                            >
                                Submit Ticket
                            </button>
                        </div>
                    </motion.div>

                    {/* CHANNEL 2: ABUSE & SECURITY */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col relative group hover:border-red-500/20 transition-colors"
                    >
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                            <ShieldAlert className="w-6 h-6 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Trust & Safety</h2>
                        <div className="flex-1">
                            <p className="text-white/60 leading-relaxed mb-6 text-sm">
                                We maintain a clean orbit. Reports regarding malware, phishing, or copyright violations are processed with high priority and strict legal protocols.
                            </p>
                        </div>
                        <button
                            onClick={() => openModal('abuse')}
                            className="w-full px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-200 text-sm font-medium text-center transition-colors border border-red-500/20 flex items-center justify-center gap-2"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            File a Report
                        </button>
                    </motion.div>

                    {/* CHANNEL 3: ENTERPRISE & PRESS */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-b from-purple-900/20 to-zinc-900/30 backdrop-blur-md border border-purple-500/20 rounded-3xl p-8 flex flex-col relative group hover:border-purple-500/40 transition-colors shadow-[0_0_50px_-20px_rgba(168,85,247,0.15)]"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                            <Rocket className="w-6 h-6 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Strategic Partnerships</h2>
                        <div className="flex-1">
                            <p className="text-white/60 leading-relaxed mb-6 text-sm">
                                Open a direct frequency with our engineering or sales command. For API integration, high-volume team licenses, or media inquiries.
                            </p>
                        </div>
                        <button
                            onClick={() => openModal('partnership')}
                            className="w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold text-center transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] flex items-center justify-center gap-2"
                        >
                            <Mail className="w-4 h-4" />
                            Establish Uplink
                        </button>
                    </motion.div>

                </div>

                {/* FOOTER */}
                <footer className="relative z-10 w-full py-8 text-center mt-20 border-t border-white/5 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-white/40 text-xs font-mono uppercase tracking-widest">
                        <MapPin className="w-3 h-3" />
                        Base of Operations: Reston, VA [Dulles Tech Corridor]
                    </div>
                </footer>

            </main>

            <ContactModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                type={modalType}
            />
        </div>
    );
}
