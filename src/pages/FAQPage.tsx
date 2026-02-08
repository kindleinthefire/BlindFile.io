import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ThreeBackground } from '../components/ThreeBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Rocket, Shield, Server, Activity } from 'lucide-react';
import { BetaBadge } from '../components/BetaBadge';
import logo from '../assets/logo.png';

const FAQ_CATEGORIES = [
    {
        title: "MISSION PROTOCOLS",
        subtitle: "General Questions",
        icon: Rocket,
        questions: [
            {
                id: "blind-file",
                q: "What exactly is a \"Blind\" File?",
                a: "A \"Blind File\" is data that has been encrypted before it ever leaves your gravitational pull (your device). We call it \"Blind\" because even we, the service providers, cannot see what is inside. To us, your 500GB project file looks identical to 500GB of static noise. We transport the container, but we do not hold the key."
            },
            {
                id: "file-expiry",
                q: "How long do files last?",
                a: "All data on BlindFile is ephemeral.\n\nGuests & Free Accounts: Files exist for 24 hours before they encounter a \"decay orbit\" and are permanently deleted from our servers.\n\nPro & Unlimited: You control the decay. Set files to self-destruct after 1 download, 1 hour, or keep them in stable orbit for up to 7 days."
            },
            {
                id: "no-account",
                q: "Why don't I need an account to send 1GB?",
                a: "We believe privacy should have zero friction. For small payloads (under 1GB), requiring an email address creates a \"paper trail\" that defeats the purpose of a burner link. Drop the file, get the link, vanish."
            }
        ]
    },
    {
        title: "ENCRYPTION SPECS",
        subtitle: "Security",
        icon: Shield,
        questions: [
            {
                id: "recover-link",
                q: "If I lose my link, can you recover my file?",
                a: "No. This is a feature, not a bug. Because the encryption key is generated in your browser and attached to the link fragment (the part after the #), we never receive it. If you lose the link, the data is mathematically unrecoverable. It is lost to the void."
            },
            {
                id: "encryption-standards",
                q: "What encryption standards do you use?",
                a: "We utilize AES-GCM (256-bit) for the payload encryption. The key exchange happens via your browser using the Web Crypto API. This is not \"proprietary magic\"—it is the battle-tested standard used by banks and military communications worldwide."
            },
            {
                id: "sell-data",
                q: "Do you sell user data?",
                a: "We have nothing to sell. Because we utilize Zero-Knowledge Architecture, we do not possess your files, passwords, or keys. We cannot sell what we cannot see."
            },
            {
                id: "mobile-encryption",
                q: "Is mobile downloading Zero-Knowledge?",
                a: "Status: ZERO-KNOWLEDGE (Native). While mobile browsers lack the memory to decrypt massive files via AES-GCM without crashing, we solved this by implementing native ZipCrypto support.\n\nThe Process: Your file is encrypted into a password-protected ZIP on your device before upload. The password is generated locally and never sent to us.\n\nThe Trade-off: To ensure you can open files natively in the iOS Files app, we use standard ZipCrypto encryption. While slightly less robust than our Desktop AES-256-GCM, it ensures the server NEVER sees your unencrypted data.\n\nThe Guarantee: Zero logs. Zero copies. Zero knowledge. Your phone creates the lock, and only the recipient has the key."
            }
        ]
    },
    {
        title: "PAYLOAD & VELOCITY",
        subtitle: "Limits & Speed",
        icon: Server,
        questions: [
            {
                id: "browser-limit",
                q: "How can I send 500GB in a browser?",
                a: "Most browsers crash around 10GB due to memory limits. BlindFile utilizes a proprietary Stream-Processing Engine. We slice your massive file into tiny, manageable chunks, encrypt them individually, and stream them to our Global Edge Network. This allows us to bypass browser memory caps and handle massive 500GB payloads smoothly."
            },
            {
                id: "edge-acceleration",
                q: "What is \"Global Edge Acceleration\"?",
                a: "Instead of forcing your data to travel halfway across the world to a centralized hub, we route your payload to the nearest Global Edge Node. Our distributed Tier-1 network ensures your upload saturates your entire available bandwidth. We do not throttle speeds—if you have a Gigabit connection, you get Gigabit performance."
            },
            {
                id: "pro-vs-unlimited",
                q: "What is the difference between Pro and Unlimited?",
                a: "It comes down to volume.\n\nPro ($9/mo): Perfect for the freelancer. You get the 500GB file capability, but you are capped at 5TB of total transfer per month.\n\nUnlimited ($39/mo): Perfect for agencies and video houses. You get the same 500GB capability, but with no monthly bandwidth caps (subject to standard fair use protocols)."
            }
        ]
    },
    {
        title: "ANOMALIES",
        subtitle: "Troubleshooting",
        icon: Activity,
        questions: [
            {
                id: "download-stopped",
                q: "My download stopped at 99%. What happened?",
                a: "This usually occurs if the browser tab is closed or the device goes to sleep during the decryption phase. Remember: decryption happens on your device, not our server. Keep the \"Airlock\" (tab) open until the file is fully reconstructed on your drive."
            },
            {
                id: "resume-upload",
                q: "Can I resume an interrupted upload?",
                a: "Currently, due to the security requirement of generating unique encryption keys per session, interrupted uploads must be restarted. We are engineering a \"Suspend/Resume\" protocol for a future update."
            },
            {
                id: "cancel-subscription",
                q: "How do I cancel my subscription?",
                a: "You are in command. Go to Dashboard > Billing > Abort Mission. Your account will immediately revert to the Free \"Explorer\" tier at the end of your billing cycle. No phone calls, no retention tricks."
            }
        ]
    }
];

function FAQItem({ id, question, answer }: { id: string, question: string, answer: string }) {
    const isTarget = window.location.hash === `#${id}`;

    return (
        <motion.div
            id={id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`group target:ring-2 target:ring-purple-500/50 target:rounded-lg transition-all duration-500 ${isTarget ? 'scroll-mt-32' : ''}`}
        >
            <details className="group [&_summary::-webkit-details-marker]:hidden" open={isTarget}>
                <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-white/5 p-4 text-white hover:bg-white/10 transition-colors border border-white/5 hover:border-purple-500/30">
                    <h3 className="font-medium text-lg text-white/90 group-hover:text-purple-300 transition-colors">
                        {question}
                    </h3>
                    <ChevronDown className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180 text-white/50" />
                </summary>

                <div className="mt-4 px-4 leading-relaxed text-white/70 whitespace-pre-line">
                    {answer}
                </div>
            </details>
        </motion.div>
    );
}

export default function FAQPage() {
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
            <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 pt-8 md:pt-16 pb-20 w-full max-w-4xl mx-auto">

                {/* HERO TEXT */}
                <div className="text-center space-y-4 mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-6xl font-bold tracking-tight drop-shadow-xl uppercase"
                    >
                        Central <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Command</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mx-auto"
                    >
                        Mission Protocols. Encryption Specs. Operational Data.
                    </motion.p>
                </div>

                {/* FAQ SECTIONS */}
                <div className="w-full space-y-12">
                    {FAQ_CATEGORIES.map((category, idx) => (
                        <div key={idx} className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-3 border-b border-white/10 pb-2"
                            >
                                <category.icon className="w-6 h-6 text-purple-500" />
                                <div>
                                    <h2 className="text-xl font-bold tracking-wider text-white">{category.title}</h2>
                                    <p className="text-xs text-purple-400 font-mono uppercase tracking-widest">{category.subtitle}</p>
                                </div>
                            </motion.div>

                            <div className="space-y-4">
                                {category.questions.map((item, qIdx) => (
                                    <FAQItem key={qIdx} id={item.id} question={item.q} answer={item.a} />
                                ))}
                            </div>
                        </div>
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
