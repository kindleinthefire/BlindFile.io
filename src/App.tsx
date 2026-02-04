import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LegacyAppPage from './pages/LegacyAppPage';
import HomePage from './pages/HomePage';
import DownloadPage from './pages/DownloadPage';
import AuthPage from './pages/AuthPage';

function App() {
    return (
        <div className="min-h-screen stealth-bg grid-pattern">
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/app" element={<LegacyAppPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/download/:id" element={<DownloadPage />} />
                </Routes>
            </AnimatePresence>
        </div>
    );
}

export default App;
