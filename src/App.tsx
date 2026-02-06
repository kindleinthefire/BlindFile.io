import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LegacyAppPage from './pages/LegacyAppPage';
import HomePage from './pages/HomePage';
import DownloadPage from './pages/DownloadPage';
import AuthPage from './pages/AuthPage';
import PricingPage from './pages/PricingPage';
import FAQPage from './pages/FAQPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';
import HowItWorksPage from './pages/HowItWorksPage';

function App() {
    return (
        <div className="min-h-screen stealth-bg grid-pattern">
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/app" element={<LegacyAppPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/how-it-works" element={<HowItWorksPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/download/:id" element={<DownloadPage />} />
                </Routes>
            </AnimatePresence>
        </div>
    );
}

export default App;
