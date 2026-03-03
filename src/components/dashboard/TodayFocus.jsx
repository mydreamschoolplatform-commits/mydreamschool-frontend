import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../utils/apiClient';
import { useLanguage } from '../../context/LanguageContext';

const TodayFocus = ({ exams = [], loading = true }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    // Memoize derived state to prevent layout thrashing
    const scheduledItems = React.useMemo(() => {
        if (loading || !exams) return [];

        console.log("TodayFocus processing exams:", exams.length);
        return exams.filter(exam => {
            if (!exam.startTime) return false;
            const examDate = new Date(exam.startTime).toDateString();
            const todayDate = new Date().toDateString();
            return exam.isPublished && examDate === todayDate;
        }); // Removed slice here to keep all
    }, [exams, loading]);

    const [isExpanded, setIsExpanded] = React.useState(false);
    const LIMIT = 1;
    const visibleItems = isExpanded ? scheduledItems : scheduledItems.slice(0, LIMIT);
    const hiddenCount = scheduledItems.length - visibleItems.length;

    // Hardcoded date for demo purpose
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Helper for subject colors (simplified map)
    const getSubjectColor = (subjectName) => {
        const colors = {
            'Mathematics': 'blue',
            'Science': 'emerald',
            'English': 'violet',
            'Social': 'amber',
            'Telugu': 'orange',
            'Hindi': 'rose'
        };
        return colors[subjectName] || 'indigo';
    };

    return (
        <section className="mb-10">
            <div className="flex justify-between items-baseline mb-4 px-1">
                <div className="flex items-center gap-2">
                    <span className="text-2xl drop-shadow-sm">📅</span>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{t('todays_focus')}: {formattedDate}</h2>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-indigo-50 shadow-xl shadow-slate-200/40 overflow-hidden ring-1 ring-slate-100">
                {/* 1. Handwriting Practice - High Priority */}
                <motion.div
                    onClick={() => navigate('/handwriting')}
                    whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                    className="p-6 sm:p-8 border-b border-indigo-100 relative overflow-hidden group cursor-pointer"
                >
                    <motion.div
                        initial={{ opacity: 0.3, scale: 0.8 }}
                        whileHover={{ scale: 1.2, opacity: 0.5 }}
                        transition={{ duration: 0.5 }}
                        className="absolute top-0 right-0 w-64 h-64 bg-orange-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
                    />

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                        <div className="flex items-start gap-5">
                            <motion.div
                                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                                transition={{ duration: 0.5 }}
                                className="p-3.5 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl shadow-lg shadow-orange-500/20 ring-4 ring-orange-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                </svg>
                            </motion.div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 font-[Outfit]">{t('daily_handwriting')}</h3>
                                <p className="text-sm font-semibold text-slate-600 mt-1">{t('upload_handwriting')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-black uppercase tracking-wider rounded-full shadow-sm">Pending</span>
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); navigate('/handwriting'); }}
                                className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-slate-900/20"
                            >
                                {t('upload_now')}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Scheduled Tasks (Dynamic) */}
                <div className="bg-slate-50/50 backdrop-blur-sm">
                    <div className="p-4 sm:p-6 sm:px-8">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 inline-block">{t('scheduled_today')}</h4>

                        <motion.div
                            key={loading ? 'loading' : 'content'}
                            className="space-y-3"
                            variants={{
                                show: { transition: { staggerChildren: 0.05 } }
                            }}
                            initial="hidden"
                            animate="show"
                        >
                            {loading && (
                                <div className="space-y-3">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm animate-pulse h-[88px]">
                                            <div className="flex items-center gap-5 w-full">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex-shrink-0"></div>
                                                <div className="flex-1 space-y-2.5 py-1">
                                                    <div className="h-5 bg-slate-100 rounded w-1/3"></div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-5 w-12 bg-slate-100 rounded"></div>
                                                        <div className="h-3 w-16 bg-slate-100 rounded"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!loading && scheduledItems.length === 0 && (
                                <div className="text-center py-4 text-slate-500 italic font-medium">
                                    No exams scheduled for today. Great job!
                                </div>
                            )}

                            {!loading && visibleItems.map((item) => {
                                const color = getSubjectColor(item.subject?.name || 'General');
                                const bgClass = `bg-${color}-50`;
                                const textClass = `text-${color}-700`;
                                const borderClass = `border-${color}-200`;
                                const shadowClass = `shadow-${color}-500/5`;
                                const hoverTextClass = `group-hover:text-${color}-700`;

                                return (
                                    <motion.div
                                        key={item._id}
                                        variants={{
                                            hidden: { opacity: 0, x: -20 },
                                            show: { opacity: 1, x: 0 }
                                        }}
                                        whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 1)" }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(`/exams/${item._id}`)}
                                        className={`bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-md ${shadowClass} group cursor-pointer relative overflow-hidden`}
                                    >
                                        <div className={`absolute left-0 top-0 w-1.5 h-full bg-${color}-500 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                        <div className="flex items-center gap-5">
                                            <div className={`w-12 h-12 rounded-2xl ${bgClass} ${textClass} flex items-center justify-center font-black text-xs border ${borderClass} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                                {item.subject?.name?.substring(0, 3).toUpperCase() || 'EXM'}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-slate-800 text-lg ${hoverTextClass} transition-colors font-[Outfit]`}>{item.title}</p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${bgClass} ${textClass} border ${borderClass} uppercase tracking-wide`}>EXAM</span>
                                                    <span className="text-xs font-bold text-slate-500">· {item.duration} mins</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className={`text-slate-400 ${hoverTextClass} transition-all p-2 rounded-full hover:bg-slate-100`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m10 8 4 4-4 4" /></svg>
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </motion.div>

                        {!loading && hiddenCount > 0 && (
                            <div className="mt-3 text-center">
                                <button
                                    onClick={() => setIsExpanded(true)}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-colors inline-flex items-center gap-2"
                                >
                                    +{hiddenCount} more scheduled
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                            </div>
                        )}

                        {!loading && isExpanded && scheduledItems.length > LIMIT && (
                            <div className="mt-3 text-center">
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors inline-flex items-center gap-2"
                                >
                                    Show less
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </section >
    );
};
export default TodayFocus;
