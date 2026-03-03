import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

import apiClient from '../../utils/apiClient';
import Avatar from '../common/Avatar';

const DashboardHeader = ({ onOpenDictionary }) => {
    const { user, logout } = useAuth();
    const { language, toggleLanguage, t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = React.useRef(null);
    const navigate = useNavigate();

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    // Placeholder data
    const studentName = user?.fullName || 'Student';

    // Helper removed, using Avatar component
    // const getProfileImageUrl = ...
    // const profileImage = ...
    const className = user?.class ? (user.class.toString().startsWith('Class') ? user.class : `Class ${user.class}`) : 'Class 10';
    const medium = user?.medium || 'English';
    const isSubscribed = user?.accessEnabled === true;

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="bg-white/70 backdrop-blur-2xl border-b border-indigo-100/40 fixed w-full top-0 left-0 z-50 transition-all duration-300 supports-[backdrop-filter]:bg-white/60"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Left Side: Brand */}
                    <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <motion.div
                            whileHover={{ rotate: 15, scale: 1.1 }}
                            className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-2 sm:p-2.5 rounded-xl shadow-lg shadow-indigo-500/30"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                            </svg>
                        </motion.div>
                        <div className="flex flex-col">
                            <span className="font-black text-lg sm:text-xl text-slate-800 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-violet-600 transition-all duration-300 font-[Outfit] leading-tight">MyDreamSchool</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest group-hover:text-indigo-400 transition-colors hidden sm:block">{t('student_portal')}</span>
                        </div>
                    </div>

                    {/* Right Side: Profile Card */}
                    <div className="flex items-center gap-2 sm:gap-4">

                        {/* Language Toggle */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleLanguage}
                            className="flex items-center justify-center gap-1.5 w-auto h-9 sm:h-auto px-3 py-1.5 rounded-full bg-white/50 hover:bg-white text-slate-600 hover:text-indigo-600 transition-all border border-slate-200/60 hover:border-indigo-100 shadow-sm"
                            title="Switch Language"
                        >
                            {/* Mobile Text */}
                            <span className="text-xs font-bold text-indigo-600 sm:hidden">
                                {language === 'en' ? 'E' : 'E'} <span className="text-slate-300 mx-0.5">/</span> {language === 'te' ? 'తె' : 'తె'}
                            </span>

                            {/* Desktop Text */}
                            <div className="hidden sm:flex items-center gap-1">
                                <span className={`text-xs font-bold ${language === 'en' ? 'text-indigo-600' : 'text-slate-400'}`}>English</span>
                                <span className="text-slate-300">/</span>
                                <span className={`text-xs font-bold ${language === 'te' ? 'text-indigo-600' : 'text-slate-400'}`}>తెలుగు</span>
                            </div>
                        </motion.button>

                        {/* Help / Support Button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/support')}
                            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/80 transition-all border border-indigo-100/50 relative overflow-hidden group"
                            title="Support Desk"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
                            <span className="font-bold text-sm hidden sm:inline-block relative z-10">Help</span>
                        </motion.button>

                        {/* Dictionary Button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onOpenDictionary}
                            className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto gap-2 sm:px-3.5 sm:py-2 rounded-full text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/80 transition-all border border-indigo-100/50 relative overflow-hidden group"
                            title="Open Dictionary"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                            <span className="font-bold text-sm hidden sm:inline-block relative z-10">{t('dictionary')}</span>
                        </motion.button>

                        <div className="h-8 w-px bg-slate-200/60 hidden sm:block"></div>

                        {/* Profile Dropdown Trigger */}
                        <div className="relative" ref={dropdownRef}>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="relative z-30 flex items-center gap-2 sm:gap-3 hover:bg-white/80 p-1 sm:p-1.5 sm:pr-4 rounded-full transition-all border border-transparent hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 focus:outline-none bg-slate-50/30"
                            >
                                {/* Avatar */}
                                <Avatar
                                    src={user?.profileImage}
                                    name={studentName}
                                    size="md"
                                    className="h-10 w-10 border-2 border-white shadow-md shadow-indigo-200/50"
                                />

                                {/* Info */}
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-bold text-slate-800 leading-none mb-0.5">{studentName}</p>
                                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{className} • {medium}</p>
                                </div>

                                {/* Status Badge */}
                                <div className={`absolute top-0 right-0 sm:top-1 sm:right-3 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${isSubscribed ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                                {/* Dropdown chevron */}
                                <motion.div animate={{ rotate: isMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="hidden sm:block">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </motion.div>
                            </motion.button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {isMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-indigo-500/15 border border-white ring-1 ring-black/5 z-30 py-2 overflow-hidden origin-top-right"
                                    >
                                        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
                                            <p className="text-sm font-bold text-slate-900">{t('my_account')}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{t('manage_profile')}</p>
                                        </div>

                                        <div className="p-2 space-y-1">
                                            <button
                                                onClick={() => {
                                                    navigate('/profile');
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all flex items-center gap-3 font-semibold group"
                                            >
                                                <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                </div>
                                                {t('my_profile')}
                                            </button>
                                            {/* Announcements Link */}
                                            <button
                                                onClick={() => {
                                                    navigate('/announcements');
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all flex items-center gap-3 font-semibold group"
                                            >
                                                <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                                </div>
                                                {t('announcements')}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    navigate('/support');
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all flex items-center gap-3 font-semibold group"
                                            >
                                                <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
                                                </div>
                                                {t('support') || 'Support / Help'}
                                            </button>
                                        </div>

                                        <div className="px-5 py-2 my-1">
                                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('subscription')}</span>
                                                    {user?.subscription?.expiryDate && (
                                                        <span className="text-xs text-slate-800 font-bold mt-1 whitespace-nowrap">
                                                            Valid till: {(() => {
                                                                const d = new Date(user.subscription.expiryDate);
                                                                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>

                                                {(() => {
                                                    const sub = user?.subscription;
                                                    const accessEnabled = user?.accessEnabled;
                                                    let status = 'ACTIVE';
                                                    let label = t('active'); // 'Active'
                                                    let colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';

                                                    if (accessEnabled === false) {
                                                        status = 'DISABLED';
                                                        label = t('disabled') || 'Disabled';
                                                        colorClass = 'bg-rose-100 text-rose-800 border-rose-200';
                                                    } else if (sub) {
                                                        const now = new Date();
                                                        const expiry = new Date(sub.expiryDate);
                                                        const grace = sub.graceDays || 0;
                                                        const effective = new Date(expiry);
                                                        effective.setDate(effective.getDate() + grace);

                                                        const warningDate = new Date(effective);
                                                        warningDate.setDate(warningDate.getDate() - 7);

                                                        if (now > effective) {
                                                            status = 'EXPIRED';
                                                            label = 'Expired';
                                                            colorClass = 'bg-rose-100 text-rose-800 border-rose-200';
                                                        } else if (now > warningDate) {
                                                            status = 'EXPIRING';
                                                            const diffTime = Math.abs(effective - now);
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                            label = `Expiring (${diffDays}d)`;
                                                            colorClass = 'bg-amber-100 text-amber-800 border-amber-200';
                                                        }
                                                    }

                                                    return (
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border ${colorClass}`}>
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <div className="p-2 border-t border-slate-100">
                                            <button
                                                onClick={logout}
                                                className="w-full text-left px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-3 font-bold"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                                                {t('logout')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </motion.header>
    );
};

export default DashboardHeader;
