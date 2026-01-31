import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, HardDrive } from 'lucide-react';
import { UploadStats as Stats } from '../store/uploadStore';
import { formatBytes } from '../lib/crypto';

interface UploadStatsProps {
    stats: Stats;
}

export function UploadStats({ stats }: UploadStatsProps) {
    return (
        <motion.div
            className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total progress */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <span className="text-xs text-silver/60">Progress</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-success">
                        {stats.overallProgress.toFixed(1)}%
                    </p>
                </div>

                {/* Active uploads */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-deep-purple" />
                        <span className="text-xs text-silver/60">Active</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-deep-purple">
                        {stats.activeUploads}
                    </p>
                </div>

                {/* Completed */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <TrendingDown className="w-4 h-4 text-success" />
                        <span className="text-xs text-silver/60">Completed</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-silver">
                        {stats.completedUploads}
                    </p>
                </div>

                {/* Total data */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <HardDrive className="w-4 h-4 text-silver/60" />
                        <span className="text-xs text-silver/60">Total</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-silver">
                        {formatBytes(stats.totalBytes)}
                    </p>
                </div>
            </div>

            {/* Overall progress bar */}
            <div className="mt-4">
                <div className="h-2 bg-stealth-700 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full progress-bar"
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.overallProgress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
