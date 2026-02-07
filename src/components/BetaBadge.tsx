
import { motion } from 'framer-motion';

export function BetaBadge() {
    return (
        <motion.div
            className="inline-flex items-center px-3 py-1 mt-1 rounded-full bg-green-500/10 border border-green-500/30"
            animate={{
                boxShadow: [
                    "0 0 0px rgba(34, 197, 94, 0)",
                    "0 0 10px rgba(34, 197, 94, 0.4)",
                    "0 0 0px rgba(34, 197, 94, 0)"
                ],
                borderColor: [
                    "rgba(34, 197, 94, 0.3)",
                    "rgba(34, 197, 94, 0.6)",
                    "rgba(34, 197, 94, 0.3)"
                ]
            }}
            transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse" />
            <span className="text-[10px] font-bold text-green-400 font-mono tracking-wider uppercase" style={{ fontFamily: '"Space Mono", monospace' }}>
                Beta Version 3.1
            </span>
        </motion.div>
    );
}
