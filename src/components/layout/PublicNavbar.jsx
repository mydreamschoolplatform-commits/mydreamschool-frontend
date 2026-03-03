import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const PublicNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language, toggleLanguage, t } = useLanguage();

    const isLoginPage = location.pathname === '/login';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
                {/* Logo & Brand */}
                <div
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate('/')}
                >
                    <div className="h-8 w-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 hidden sm:block">
                        MyDreamSchool
                    </span>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 sm:gap-4">
                    {/* Language Toggle */}
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center justify-center gap-1.5 w-auto h-9 sm:h-auto px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-sm transition-colors border border-slate-200"
                        title="Switch Language"
                    >
                        {/* Mobile Text */}
                        <span className="text-xs font-bold text-indigo-600 sm:hidden">
                            {language === 'en' ? 'E' : 'E'} <span className="text-slate-300 mx-0.5">/</span> {language === 'te' ? 'తె' : 'తె'}
                        </span>

                        {/* Desktop Text */}
                        <div className="hidden sm:flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                            <span className={`text-xs font-bold ${language === 'en' ? 'text-indigo-600' : 'text-slate-400'}`}>English</span>
                            <span className="text-slate-300">/</span>
                            <span className={`text-xs font-bold ${language === 'te' ? 'text-indigo-600' : 'text-slate-400'}`}>తెలుగు</span>
                        </div>
                    </button>

                    {/* Support Link - Visible on Mobile as Icon */}
                    <button
                        onClick={() => window.open('https://api.whatsapp.com/send?phone=919398969408', '_blank')}
                        className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-medium text-sm transition-all"
                        title="Help"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        <span className="hidden sm:inline-block">Help</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    {/* Context Action Button */}
                    {isLoginPage ? (
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
                        >
                            Sign Up
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="px-5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 font-semibold text-sm shadow-sm transition-all hover:-translate-y-0.5"
                        >
                            Login
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default PublicNavbar;
