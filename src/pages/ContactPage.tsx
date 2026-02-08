import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ThreeBackground } from '../components/ThreeBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, LifeBuoy, ShieldAlert, Rocket, Mail, MapPin } from 'lucide-react';
import { BetaBadge } from '../components/BetaBadge';
import logo from '../assets/logo.png';

export default function ContactPage() {
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
                            <a
                                href="mailto:support@blindfile.io"
                                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-white/5"
                            >
                                Submit Ticket
                            </a>
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
                        <a
                            href="mailto:abuse@blindfile.io?subject=Abuse%20Report"
                            className="w-full px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-200 text-sm font-medium text-center transition-colors border border-red-500/20 flex items-center justify-center gap-2"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            File a Report
                        </a>
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
                        <a
                            href="mailto:partners@blindfile.io"
                            className="w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold text-center transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] flex items-center justify-center gap-2"
                        >
                            <Mail className="w-4 h-4" />
                            Establish Uplink
                        </a>
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
        </div>
    );
}
