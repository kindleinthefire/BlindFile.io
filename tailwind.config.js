/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                void: '#050505',
                silver: '#E0E0E0',
                'deep-purple': '#6D28D9',
                success: '#00FF94',
                'stealth': {
                    900: '#0A0A0A',
                    800: '#121212',
                    700: '#1A1A1A',
                    600: '#242424',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'slide-up': 'slide-up 0.3s ease-out',
                'fade-in': 'fade-in 0.4s ease-out',
                'self-destruct': 'self-destruct 1s ease-in-out infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(109, 40, 217, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(109, 40, 217, 0.6)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'self-destruct': {
                    '0%, 100%': { color: '#FF4444' },
                    '50%': { color: '#FF8888' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'stealth-gradient': 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%)',
            },
        },
    },
    plugins: [],
}
