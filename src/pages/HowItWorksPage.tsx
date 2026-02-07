import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ThreeBackground } from '../components/ThreeBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Globe, Key, ShieldCheck, FileKey, Server, Play } from 'lucide-react';
import { BetaBadge } from '../components/BetaBadge';
import logo from '../assets/logo.png';

const STEPS = [
    {
        icon: Key,
        title: "CLIENT-SIDE KEY GEN",
        subtitle: "The Origin",
        description: "Before your file leaves your device, your browser generates a unique 256-bit encryption key. This key is never sent to our servers. It lives only in your local memory and the URL hash fragment."
    },
    {
        icon: Lock,
        title: "AES-GCM ENCRYPTION",
        subtitle: "The Shield",
        description: "Your file is encrypted locally using AES-256-GCM (Galois/Counter Mode). This military-grade standard ensures both confidentiality and integrity. The result is a meaningless blob of static noise."
    },
    {
        icon: FileKey,
        title: "METADATA OBFUSCATION",
        subtitle: "Total Blindness",
        description: "We don't just encrypt the content. We encrypt the filename and MIME type too. Our servers receive a generic 'UUID.bin' file. We have zero knowledge of what you are storing."
    },
    {
        icon: Server,
        title: "CHUNKED UPLOAD",
        subtitle: "The Transport",
        description: "For massive files (up to 500GB), we split the encrypted static into manageable chunks. These travel through our secure tunnel to a distributed global network."
    },
    {
        icon: Globe,
        title: "GLOBAL EDGE NETWORK",
        subtitle: "The Velocity",
        description: "Your encrypted chunks are replicated across Tier-1 edge nodes worldwide. This ensures that no matter where your recipient is, they pull data from the closest possible server for maximum speed."
    },
    {
        icon: ShieldCheck,
        title: "CLIENT-SIDE DECRYPTION",
        subtitle: "The Reveal",
        description: "When your recipient clicks the link, their browser fetches the encrypted blobs. The key (found in their URL hash) unlocks the data locally. The file is reassembled and restored to its original form instanty."
    }
];

export default function HowItWorksPage() {
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
                        Protocol <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Deep Dive</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto uppercase tracking-widest"
                    >
                        From Local Key Gen to Global Edge Delivery
                    </motion.p>
                </div>

                {/* DEMO BUTTON */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-16"
                >
                    <button
                        onClick={() => window.open('https://youtube.com', '_blank')}
                        className="group relative flex items-center gap-3 px-6 py-3 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.25)]"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                        <span className="font-medium text-blue-200 group-hover:text-white transition-colors tracking-wide text-sm">
                            Watch a Demo
                        </span>

                        {/* Glow Effect */}
                        <div className="absolute inset-0 rounded-full ring-2 ring-blue-400/20 group-hover:ring-blue-400/40 transition-all animate-pulse" />
                    </button>
                </motion.div>

                {/* Desktop Version Warning */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-orange-600 font-bold text-sm tracking-wide mb-4"
                >
                    Desktop Version Only
                </motion.p>

                {/* STEPS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {STEPS.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-8 flex flex-col relative group hover:border-white/10 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 text-cyan-400">
                                <step.icon className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">{step.title}</h2>
                            <p className="text-xs font-mono uppercase tracking-widest text-cyan-500 mb-4">{step.subtitle}</p>
                            <div className="flex-1">
                                <p className="text-white/60 leading-relaxed text-sm">
                                    {step.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* FOOTER CALL TO ACTION */}
                <div className="mt-20">
                    <Link
                        to="/"
                        className="px-8 py-4 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_40px_rgba(8,145,178,0.5)]"
                    >
                        INITIATE SECURE TRANSFER
                    </Link>
                </div>

            </main>
        </div>
    );
}
