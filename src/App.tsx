import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LegacyAppPage from './pages/LegacyAppPage';
import HomePage from './pages/HomePage';
import DownloadPage from './pages/DownloadPage';

function App() {
    return (
        <div className="min-h-screen stealth-bg grid-pattern">
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/app" element={<LegacyAppPage />} />
                    <Route path="/download/:id" element={<DownloadPage />} />
                </Routes>
            </AnimatePresence>
        </div>
    );
}

export default App;
