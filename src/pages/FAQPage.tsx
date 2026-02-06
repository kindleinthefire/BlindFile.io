import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ThreeBackground } from '../components/ThreeBackground';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Rocket, Shield, Server, Activity } from 'lucide-react';
import logo from '../assets/logo.png';

const FAQ_CATEGORIES = [
    {
        title: "MISSION PROTOCOLS",
        subtitle: "General Questions",
        icon: Rocket,
        questions: [
            {
                q: "What exactly is a \"Blind\" File?",
                a: "A \"Blind File\" is data that has been encrypted before it ever leaves your gravitational pull (your device). We call it \"Blind\" because even we, the service providers, cannot see what is inside. To us, your 500GB project file looks identical to 500GB of static noise. We transport the container, but we do not hold the key."
            },
            {
                q: "How long do files last?",
                a: "All data on BlindFile is ephemeral.\n\nGuests & Free Accounts: Files exist for 24 hours before they encounter a \"decay orbit\" and are permanently deleted from our servers.\n\nPro & Unlimited: You control the decay. Set files to self-destruct after 1 download, 1 hour, or keep them in stable orbit for up to 7 days."
            },
            {
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
                q: "If I lose my link, can you recover my file?",
                a: "No. This is a feature, not a bug. Because the encryption key is generated in your browser and attached to the link fragment (the part after the #), we never receive it. If you lose the link, the data is mathematically unrecoverable. It is lost to the void."
            },
            {
                q: "What encryption standards do you use?",
                a: "We utilize AES-GCM (256-bit) for the payload encryption. The key exchange happens via your browser using the Web Crypto API. This is not \"proprietary magic\"—it is the battle-tested standard used by banks and military communications worldwide."
            },
            {
                q: "Do you sell user data?",
                a: "We have nothing to sell. Because we utilize Zero-Knowledge Architecture, we do not possess your files, passwords, or keys. We cannot sell what we cannot see."
            },
            {
                q: "Is mobile downloading Zero-Knowledge?",
                a: "Status: HYBRID. Mobile browsers lack the computational density and memory management required to decrypt massive files client-side without crashing. To bypass these hardware limits, we utilize a Server-Side Bridge Protocol for mobile devices.\n\nThe Process: The file is temporarily decrypted in a secure, isolated memory sandbox on our server, then immediately streamed to your device via standard HTTPS.\n\nThe Risk Profile: While the file is strictly encrypted in transit, for the brief duration of the download, it is theoretically visible to the server process.\n\nThe Guarantee: This memory sandbox is ephemeral. Once the stream closes, the decrypted data is wiped from RAM instantly. No logs, no copies. For absolute Zero-Knowledge assurance, we recommend using a Desktop terminal."
            }
        ]
    },
    {
        title: "PAYLOAD & VELOCITY",
        subtitle: "Limits & Speed",
        icon: Server,
        questions: [
            {
                q: "How can I send 500GB in a browser?",
                a: "Most browsers crash around 10GB due to memory limits. BlindFile utilizes a proprietary Stream-Processing Engine. We slice your massive file into tiny, manageable chunks, encrypt them individually, and stream them to our Global Edge Network. This allows us to bypass browser memory caps and handle massive 500GB payloads smoothly."
            },
            {
                q: "What is \"Global Edge Acceleration\"?",
                a: "Instead of routing your upload to a single server in Virginia, we route your data to the nearest Edge Node (a server physically close to you). We utilize the Cloudflare R2 network to ensure your upload saturates your entire internet bandwidth. We do not throttle speeds—if you have a Gigabit connection, you get Gigabit performance."
            },
            {
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
                q: "My download stopped at 99%. What happened?",
                a: "This usually occurs if the browser tab is closed or the device goes to sleep during the decryption phase. Remember: decryption happens on your device, not our server. Keep the \"Airlock\" (tab) open until the file is fully reconstructed on your drive."
            },
            {
                q: "Can I resume an interrupted upload?",
                a: "Currently, due to the security requirement of generating unique encryption keys per session, interrupted uploads must be restarted. We are engineering a \"Suspend/Resume\" protocol for a future update."
            },
            {
                q: "How do I cancel my subscription?",
                a: "You are in command. Go to Dashboard > Billing > Abort Mission. Your account will immediately revert to the Free \"Explorer\" tier at the end of your billing cycle. No phone calls, no retention tricks."
            }
        ]
    }
];

function FAQItem({ question, answer }: { question: string, answer: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group"
        >
            <details className="group [&_summary::-webkit-details-marker]:hidden">
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
                                    <FAQItem key={qIdx} question={item.q} answer={item.a} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* BOTTOM COPYRIGHT */}
                <footer className="relative z-10 w-full py-8 text-center mt-20 border-t border-white/5">
                    <p className="text-[10px] text-white/40 font-medium">
                        © 2025 Blind File. Encrypted in Reston, VA.
                    </p>
                </footer>

            </main>
        </div>
    );
}
