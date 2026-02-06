import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ThreeBackground } from '../components/ThreeBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, FileText, Server, AlertTriangle } from 'lucide-react';
import logo from '../assets/logo.png';

const SECTIONS = [
    {
        icon: Shield,
        title: "ZERO-KNOWLEDGE DEFINITION",
        subtitle: "Signal Interception & Decryption",
        summary: "We see nothing. We store nothing but static. Your key is the only thing that matters.",
        content: `
            **Protocol Definition:** "Zero-Knowledge" means that BlindFile (the Service Provider) possesses technically zero information about the contents of your encrypted payloads.

            **The Mechanism:**
            1. Encryption keys are generated client-side within your browser's memory.
            2. The key is appended to the URL fragment identifier (after the '#').
            3. Browsers typically do not send fragment identifiers to servers.
            4. Therefore, BlindFile never receives the key required to decrypt your file.

            **The Implication:** Even if compelled by a valid court order or subpoena, we cannot produce unencrypted data because we simply do not possess the mathematical ability to decrypt it.
        `
    },
    {
        icon: Lock,
        title: "DATA RETENTION & RECOVERY",
        subtitle: "Ephemeral Storage Doctrine",
        summary: "Files are dust. If you lose the link, the data is lost to the void forever.",
        content: `
            **The "No Recovery" Doctrine:**
            Because we do not store your encryption keys, **we cannot recover lost files**. If you close your browser tab before the upload completes, or if you lose the unique download link, the data is irretrievable. We accept no liability for data loss resulting from lost keys.

            **The "Blind" Metadata:**
            We do not store original filenames in plaintext. Files are renamed to random UUIDs (e.g., \`550e8400-e29b...\`) upon receipt. Metadata (filename, type) is encrypted client-side and stored as an opaque blob. We cannot "search" our database for a specific filename or user content.

            **Auto-Decay:**
            All files are ephemeral. They are automatically deleted from our servers after their expiration period (24 hours for guests, up to 7 days for Pro users). This deletion is permanent and irreversible (crypto-shredding).
        `
    },
    {
        icon: AlertTriangle,
        title: "THE MOBILE ANOMALY",
        subtitle: "Hybrid Protocol Disclosure",
        summary: "Mobile phones are weak. We briefly help them carry the weight, then we forget we ever did.",
        content: `
            **Transparency Disclosure:**
            Mobile browsers lack the memory management required to decrypt multi-gigabyte files client-side. To enable mobile downloads, we utilize a **Server-Side Bridge Protocol**.

            **The Process:**
            1. The encrypted file is fetched to a secure, isolated memory sandbox on our server.
            2. It is temporarily decrypted using the key you provide.
            3. It is immediately streamed to your device via standard HTTPS.
            4. **The Guarantee:** Once the stream closes, the decrypted data is wiped from RAM instantly. It is never written to disk.

            **Risk Profile:**
            While strictly encrypted in transit, for the brief duration of a mobile download, the file is theoretically visible to the server process. For absolute Zero-Knowledge assurance, we strictly recommend using a Desktop terminal.
        `
    },
    {
        icon: FileText,
        title: "PROHIBITED PAYLOADS",
        subtitle: "Acceptable Use Policy",
        summary: "We don't scan, but we don't protect villains. Don't make us an accomplice.",
        content: `
            **The Rule:** You agree not to use BlindFile to transport illegal content, including but not limited to: malware, child exploitation material (CSAM), or stolen intellectual property.

            **Enforcement:**
            While we cannot scan encrypted files, we comply with valid DMCA takedown notices and court orders regarding specific, identified links. If a link is reported and verified as hosting illegal content, we will terminate the link and the associated file immediately.
        `
    },
    {
        icon: Server,
        title: "INFRASTRUCTURE & JURISDICTION",
        subtitle: "Governing Law",
        summary: "Built on Global Edge Networks. Governed by the Commonwealth of Virginia.",
        content: `
            **Infrastructure:**
            We utilize Tier-1 Global Edge Networks (specifically the Cloudflare R2 distributed object storage system) to ensure high-speed, low-latency transport. Your data may be routed through various global nodes to ensure maximum velocity.

            **Jurisdiction:**
            These Terms and this Privacy Policy shall be governed by and construed in accordance with the laws of the **Commonwealth of Virginia**, without regard to its conflict of law provisions. You agree to submit to the personal jurisdiction of the courts located within Virginia for any actions for which we retain the right to seek injunctive or other equitable relief.
        `
    }
];

export default function PrivacyPage() {
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

                <Link to="/" className="flex items-center gap-3 group cursor-pointer absolute left-1/2 transform -translate-x-1/2">
                    <img
                        src={logo}
                        alt="Blind File Logo"
                        className="w-16 h-16 object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                </Link>

                <div className="w-20" /> {/* Spacer for visual balance */}
            </motion.header>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 pt-8 md:pt-16 pb-20 w-full max-w-4xl mx-auto">

                {/* HERO TEXT */}
                <div className="text-center space-y-4 mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-6xl font-bold tracking-tight drop-shadow-xl uppercase"
                    >
                        Protocol <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Compliance</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto"
                    >
                        Privacy Policy. Terms of Service. Liability Protocols.
                    </motion.p>
                </div>

                {/* SECTIONS */}
                <div className="w-full space-y-16">
                    {SECTIONS.map((section, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-8 md:p-12"
                        >
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                                <section.icon className="w-8 h-8 text-purple-500" />
                                <div>
                                    <h2 className="text-2xl font-bold tracking-wider text-white">{section.title}</h2>
                                    <p className="text-sm text-purple-400 font-mono uppercase tracking-widest">{section.subtitle}</p>
                                </div>
                            </div>

                            {/* Layer 1: The Summary */}
                            <div className="mb-8 pl-4 border-l-2 border-purple-500/50">
                                <p className="text-lg font-medium text-white/90 italic">
                                    "{section.summary}"
                                </p>
                            </div>

                            {/* Layer 2: The Content */}
                            <div className="text-white/70 leading-relaxed whitespace-pre-line space-y-4 font-light">
                                <div dangerouslySetInnerHTML={{
                                    __html: section.content
                                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                                        .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded font-mono text-xs">$1</code>')
                                }} />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* BOTTOM COPYRIGHT */}
                <footer className="relative z-10 w-full py-8 text-center mt-20 border-t border-white/5">
                    <p className="text-[10px] text-white/40 font-medium">
                        © 2026 Blind File. Engineered in Reston, VA.
                    </p>
                </footer>

            </main>
        </div>
    );
}
