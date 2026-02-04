import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
                    <div className="max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8">
                        <h1 className="text-xl font-bold mb-4 text-red-400">Something went wrong</h1>
                        <p className="text-white/60 mb-4 text-sm font-mono whitespace-pre-wrap bg-black/50 p-4 rounded-lg overflow-x-auto">
                            {this.state.error?.message}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
