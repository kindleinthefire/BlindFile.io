import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skull, Timer } from 'lucide-react';

interface CountdownTimerProps {
    expiresAt: string;
    className?: string;
}

export function CountdownTimer({ expiresAt, className = '' }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<{
        hours: number;
        minutes: number;
        seconds: number;
        expired: boolean;
    }>({ hours: 0, minutes: 0, seconds: 0, expired: false });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const expires = new Date(expiresAt).getTime();
            const difference = expires - now;

            if (difference <= 0) {
                return { hours: 0, minutes: 0, seconds: 0, expired: true };
            }

            return {
                hours: Math.floor(difference / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
                expired: false,
            };
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [expiresAt]);

    const padZero = (num: number) => num.toString().padStart(2, '0');

    if (timeLeft.expired) {
        return (
            <motion.div
                className={`flex items-center gap-2 ${className}`}
                initial={{ scale: 0.9 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
            >
                <Skull className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-mono font-bold">EXPIRED</span>
            </motion.div>
        );
    }

    const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 30;

    return (
        <motion.div
            className={`flex items-center gap-3 ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <Timer className={`w-5 h-5 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-deep-purple'}`} />

            <div className="flex items-center gap-1">
                <span className={`text-sm ${isUrgent ? 'text-red-400' : 'text-silver/60'}`}>
                    Self-destructs in:
                </span>

                <div className={`font-mono font-bold text-lg ${isUrgent ? 'countdown' : 'text-silver'}`}>
                    <motion.span
                        key={`h-${timeLeft.hours}`}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="inline-block w-8 text-center"
                    >
                        {padZero(timeLeft.hours)}
                    </motion.span>
                    <span className="text-silver/40">:</span>
                    <motion.span
                        key={`m-${timeLeft.minutes}`}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="inline-block w-8 text-center"
                    >
                        {padZero(timeLeft.minutes)}
                    </motion.span>
                    <span className="text-silver/40">:</span>
                    <motion.span
                        key={`s-${timeLeft.seconds}`}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="inline-block w-8 text-center"
                    >
                        {padZero(timeLeft.seconds)}
                    </motion.span>
                </div>
            </div>
        </motion.div>
    );
}
