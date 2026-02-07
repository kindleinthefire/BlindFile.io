import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import { BetaBadge } from '../components/BetaBadge';
import logo from '../assets/logo.png';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(false); // Default to Sign Up
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/app');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                    },
                });
                if (error) throw error;
                setSuccessMsg('Check your email for the confirmation link!');
            }
        } catch (err) {
            console.error('Auth Error Details:', err);
            setError(err instanceof Error ? err.message : 'Authentication failed. Please check your network connection and Supabase settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col font-sans selection:bg-purple-500/30 text-white relative overflow-hidden">

            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-[100rem] h-[100rem] bg-purple-900/10 rounded-full blur-3xl opacity-30 animate-pulse-slow" />
                <div className="absolute -bottom-1/2 -right-1/2 w-[100rem] h-[100rem] bg-indigo-900/10 rounded-full blur-3xl opacity-30 animate-pulse-slow delay-1000" />
            </div>

            {/* Header */}
            <header className="relative z-50 p-8">
                <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Home
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md"
                >
                    <div className="
                        bg-zinc-900/40 backdrop-blur-2xl 
                        border border-white/10 rounded-[2rem] 
                        p-8 shadow-2xl shadow-purple-900/20
                    ">
                        <div className="text-center mb-8">
                            <div className="flex justify-center mb-6">
                                <Link to="/" className="flex flex-col items-center">
                                    <img src={logo} alt="Blind File Logo" className="w-16 h-16 object-contain hover:opacity-80 transition-opacity" />
                                    <div className="scale-90 origin-top mt-1">
                                        <BetaBadge />
                                    </div>
                                </Link>
                            </div>
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 mb-2">
                                {isLogin ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="text-white/50">
                                {isLogin ? 'Enter your details to access your account' : 'Sign up to get started'}
                            </p>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 ml-1">Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-white/30 group-focus-within:text-purple-400 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all text-white placeholder:text-white/20"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-white/30 group-focus-within:text-purple-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all text-white placeholder:text-white/20"
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg py-2"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                                {successMsg && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="text-green-400 text-sm text-center bg-green-400/10 rounded-lg py-2"
                                    >
                                        {successMsg}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {isLogin ? 'Sign In' : 'Create Account'}
                                        {!loading && !isLogin && <Sparkles className="w-4 h-4 text-purple-200" />}
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-white/40 text-sm">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
                                >
                                    {isLogin ? 'Sign Up' : 'Log In'}
                                </button>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
