import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import TodayFocus from '../components/dashboard/TodayFocus';
import PendingTasks from '../components/dashboard/PendingTasks';
import SubjectsGrid from '../components/dashboard/SubjectsGrid';
import HeroStats from '../components/dashboard/HeroStats';
import AnnouncementsWidget from '../components/dashboard/AnnouncementsWidget';
import DictionaryModal from '../components/dashboard/DictionaryModal';
import TranslationTooltip from '../components/dashboard/TranslationTooltip';
import RankCard from '../components/dashboard/RankCard';
import AggregateScoreCard from '../components/dashboard/AggregateScoreCard';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const navigate = useNavigate();
    const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
    // Tooltip State
    const [tooltipState, setTooltipState] = useState({ visible: false, term: '', x: 0, y: 0 });

    const { user, logout } = useAuth();

    // Centralized Data State
    const [exams, setExams] = useState([]);
    const [profile, setProfile] = useState(null);
    const [ranks, setRanks] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return; // Wait for auth

            try {
                if (user.role === 'Teacher') {
                    // Fetch Teacher Data
                    const teacherRes = await apiClient.get('/api/teacher/dashboard');
                    console.log("Teacher Dashboard Data:", teacherRes.data);

                    // For now, Teachers see the standard dashboard but with empty student-specific data
                    // We can populate 'profile' with basic user info
                    setProfile({
                        fullName: user.username || 'Teacher',
                        role: 'Teacher',
                        accessEnabled: true,
                        assignedSubjects: teacherRes.data.assignedSubjects
                    });
                    setExams([]); // Teachers don't take exams (yet)
                    setRanks(null);
                } else {
                    // Fetch Student Data (Existing Logic)
                    // We promise.allSettled to ensure if ranks fail, others still load? 
                    // Or simple Promise.all. If ranks 404 (not generated yet), it might fail?
                    // Let's use individual awaits or try/catch for ranks if distinct?
                    // Actually, simple Promise.all is fine if endpoints exist.
                    // If rankings/ranks returns 404, Promise.all fails. 
                    // My backend logic: getStudentRanks -> if !student return 404. Should be fine.

                    // Fetch all student data in parallel — saves one full server round-trip
                    let examsData = [], ranksData = null, freshProfile = user;
                    try {
                        const [examsRes, ranksRes, profileRes] = await Promise.all([
                            apiClient.get('/api/exams/student'),
                            apiClient.get('/api/profile/ranks'),
                            apiClient.get('/api/profile') // Fetch fresh profile for Streak/Live Data
                        ]);
                        examsData = examsRes.data || [];
                        ranksData = ranksRes.data;
                        freshProfile = profileRes.data;
                    } catch (e) {
                        console.warn("Partial fetch failed (exams, ranks, or profile):", e);
                        // Falls back to empty exams and user context profile — page still renders
                    }

                    console.log("Dashboard Global Fetch:", { exams: examsData, ranks: ranksData, profile: freshProfile });

                    setExams(examsData);
                    setProfile(freshProfile);
                    setRanks(ranksData);

                }
            } catch (error) {
                console.error("Dashboard Global Fetch Error:", error);
                setExams([]);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const handleGlobalDoubleClick = () => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        // Simple regex to check if it's a single word (mostly letters)
        if (text && /^[a-zA-Z\s]+$/.test(text) && text.length < 30) {
            // Calculate position
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            setTooltipState({
                visible: true,
                term: text,
                x: rect.left + (rect.width / 2),
                y: rect.bottom
            });
        }
    };

    // Close tooltip on any click outside or scrolling
    const handleCloseTooltip = () => setTooltipState(prev => ({ ...prev, visible: false }));

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 20 } }
    };

    // Safety check for ranks
    const safeRanks = ranks && ranks.aggregate ? ranks : null;

    return (
        <div
            className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-100 relative overflow-x-hidden"
            onDoubleClick={handleGlobalDoubleClick}

            // Mobile Long Press Logic
            onTouchStart={(e) => {
                const touch = e.touches[0];
                window.touchStartX = touch.clientX;
                window.touchStartY = touch.clientY;

                window.longPressTimer = setTimeout(() => {
                    // Prevent native menu if we detected a word
                    window.isLongPress = true;

                    // Try to clear any native selection first
                    if (window.getSelection) window.getSelection().removeAllRanges();

                    // Get element at touch point
                    let range;
                    if (document.caretRangeFromPoint) {
                        range = document.caretRangeFromPoint(touch.clientX, touch.clientY);
                    } else if (document.caretPositionFromPoint) {
                        const pos = document.caretPositionFromPoint(touch.clientX, touch.clientY);
                        range = document.createRange();
                        range.setStart(pos.offsetNode, pos.offset);
                        range.collapse(true);
                    }

                    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                        // Expand to word boundary
                        range.expand('word');
                        const text = range.toString().trim();

                        if (text && /^[a-zA-Z\s]+$/.test(text) && text.length < 30) {
                            // Select the text visually to give feedback
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(range);

                            // Show Tooltip
                            const rect = range.getBoundingClientRect();
                            setTooltipState({
                                visible: true,
                                term: text,
                                x: rect.left + (rect.width / 2),
                                y: rect.bottom
                            });

                            // Haptic feedback if available
                            if (window.navigator && window.navigator.vibrate) {
                                window.navigator.vibrate(50);
                            }
                        }
                    }
                }, 600); // 600ms hold
            }}

            onTouchMove={(e) => {
                const touch = e.touches[0];
                const moveX = Math.abs(touch.clientX - (window.touchStartX || 0));
                const moveY = Math.abs(touch.clientY - (window.touchStartY || 0));

                // If moved > 10px, cancel long press (it's a scroll or swipe)
                if (moveX > 10 || moveY > 10) {
                    clearTimeout(window.longPressTimer);
                }
            }}

            onTouchEnd={() => {
                clearTimeout(window.longPressTimer);
                // Reset flag after a short delay so context menu handler can check it
                setTimeout(() => { window.isLongPress = false; }, 100);
            }}

            onContextMenu={(e) => {
                // Block native menu if we just performed a long press action
                if (window.isLongPress || tooltipState.visible) {
                    e.preventDefault();
                }
            }}

            onClick={() => { if (tooltipState.visible) handleCloseTooltip(); }}
        >
            {/* Ambient Animated Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[100px]"
                    style={{ willChange: 'transform' }}
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        x: [0, 50, 0],
                        opacity: [0.3, 0.4, 0.3]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 2 }}
                    className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[80px]"
                    style={{ willChange: 'transform' }}
                />
                <motion.div
                    animate={{
                        y: [0, -50, 0],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 1 }}
                    className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-indigo-50/60 rounded-full blur-[90px]"
                    style={{ willChange: 'transform' }}
                />
            </div>

            {/* Subscription/Access Lock Overlay - Moved to top level for fixed positioning */}
            {(() => {
                if (user?.role === 'Teacher') return null;

                const sub = user?.subscription;
                const accessEnabled = user?.accessEnabled;
                let lockReason = null; // 'DISABLED' or 'EXPIRED'

                if (accessEnabled === false) {
                    lockReason = 'DISABLED';
                } else if (sub) {
                    const now = new Date();
                    const expiry = new Date(sub.expiryDate);
                    const grace = sub.graceDays || 0;
                    const effective = new Date(expiry);
                    effective.setDate(effective.getDate() + grace);

                    if (now > effective) lockReason = 'EXPIRED';
                }

                if (lockReason) {
                    const isExpired = lockReason === 'EXPIRED';
                    const title = isExpired ? "Subscription Expired" : "Account Access Disabled";
                    const message = isExpired
                        ? "Your subscription has expired. Please contact support to renew your access and continue learning."
                        : "Your account has been temporarily disabled by the administrator. Please contact support for assistance.";

                    return (
                        <div className="fixed inset-0 z-50 h-screen w-screen bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                className="bg-white p-8 rounded-3xl shadow-2xl border border-rose-100 text-center max-w-md w-full relative overflow-hidden"
                            >
                                {/* Decorative background elements */}
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-red-500"></div>
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-50 rounded-full blur-2xl opacity-60"></div>

                                <div className="relative z-10">
                                    <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-rose-50/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 drop-shadow-sm">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                    </div>

                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">{title}</h3>
                                    <p className="text-slate-500 mb-8 leading-relaxed">{message}</p>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center">
                                            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Admin Support</p>
                                            <a href="tel:+919398969408" className="text-xl font-bold text-indigo-700 flex items-center justify-center gap-2 hover:text-indigo-800 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                <span>+91 93989 69408</span>
                                            </a>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => navigate('/support')}
                                                className="w-full py-3.5 px-6 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl transition-all border border-slate-200 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2.5"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
                                                Contact Support Desk
                                            </button>

                                            <button
                                                onClick={logout}
                                                className="w-full py-3 px-6 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                                Log Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    );
                }
                return null;
            })()}

            <div className="relative z-10">
                {/* 1. Top Header */}
                <DashboardHeader onOpenDictionary={() => setIsDictionaryOpen(true)} />

                <motion.main
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column: Main Content (Focus & Subjects) */}
                        <div className="lg:col-span-9 space-y-6 relative">


                            {/* 1.5. Hero Stats (Quick Overview) */}
                            <HeroStats exams={exams} profile={profile} loading={loading} />

                            {/* 2. Today's Focus (Prioritized) */}
                            <motion.div variants={itemVariants}>
                                <TodayFocus exams={exams} loading={loading} />
                            </motion.div>

                            {/* 2.5. Pending Tasks (Catch Up) */}
                            <motion.div variants={itemVariants}>
                                <PendingTasks exams={exams} loading={loading} />
                            </motion.div>

                            {/* 3. Subjects Grid (Main Area) */}
                            <motion.div variants={itemVariants}>
                                <SubjectsGrid exams={exams} loading={loading} />
                            </motion.div>
                        </div>

                        {/* Right Column: Progress Snapshot (Sticky Sidebar) */}
                        <div className="lg:col-span-3 lg:sticky lg:top-24 space-y-6">
                            <motion.div variants={itemVariants}>
                                <AnnouncementsWidget />
                            </motion.div>

                            {/* Aggregate Score Card */}
                            <motion.div variants={itemVariants}>
                                <AggregateScoreCard exams={exams} loading={loading} />
                            </motion.div>

                            {/* Rank Card */}
                            <motion.div variants={itemVariants} className="md:col-span-1">
                                <RankCard ranks={safeRanks} loading={loading} exams={exams} />
                            </motion.div>


                        </div>
                    </div>
                </motion.main>

                {/* Dictionary Modal (Manual Open Only) */}
                <DictionaryModal
                    isOpen={isDictionaryOpen}
                    onClose={() => setIsDictionaryOpen(false)}
                />

                {/* Inline Translation Tooltip */}
                {tooltipState.visible && (
                    <TranslationTooltip
                        term={tooltipState.term}
                        position={{ x: tooltipState.x, y: tooltipState.y }}
                        onClose={handleCloseTooltip}
                    />
                )}
            </div>
        </div>
    );
};

export default Dashboard;
