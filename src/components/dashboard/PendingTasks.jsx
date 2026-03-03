import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

const PendingTasks = ({ exams = [], loading = true }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const pendingItems = useMemo(() => {
        if (loading || !exams) return [];

        const todayDate = new Date().toDateString();

        return exams.filter(exam => {
            // 1. Must be published
            if (!exam.isPublished) return false;

            // 2. Must NOT be submitted (hasSubmitted is false)
            if (exam.hasSubmitted) return false;

            // 3. Must NOT be scheduled for today (TodayFocus handles those)
            // If it has a start time, check if it's NOT today
            if (exam.startTime) {
                const examDate = new Date(exam.startTime).toDateString();
                if (examDate === todayDate) return false;
            }

            // Exclude if status is 'Submitted' (double check)
            if (exam.status === 'Submitted' || exam.status === 'Passed') return false;

            return true;
        }); // Removed slice to permit expanding
    }, [exams, loading]);

    // Expand/Collapse Logic
    const [isExpanded, setIsExpanded] = React.useState(false);
    const LIMIT = 2;
    const visibleItems = isExpanded ? pendingItems : pendingItems.slice(0, LIMIT);
    const hiddenCount = pendingItems.length - visibleItems.length;

    // Helper for subject colors
    const getSubjectDetails = (subjectName) => {
        const map = {
            'Mathematics': { color: 'blue', dbName: 'Mathematics', id: 'math' },
            'Science': { color: 'emerald', dbName: 'Science', id: 'science' },
            'English': { color: 'violet', dbName: 'English', id: 'english' },
            'Social': { color: 'amber', dbName: 'Social', id: 'social' },
            'Telugu': { color: 'orange', dbName: 'Telugu', id: 'telugu' },
            'Hindi': { color: 'rose', dbName: 'Hindi', id: 'hindi' },
            'Biology': { color: 'lime', dbName: 'Biology', id: 'biology' }
        };
        // Fuzzy match or default
        const key = Object.keys(map).find(k => subjectName?.includes(k)) || 'Mathematics';
        return map[key] || { color: 'indigo', dbName: subjectName, id: 'math' };
    };

    // if (!loading && pendingItems.length === 0) return null; // Logic removed to show "Good Job" message

    if (!loading && pendingItems.length === 0) {
        return (
            <section className="mb-10">
                <div className="flex justify-between items-baseline mb-4 px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl drop-shadow-sm">⏳</span>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{t('catch_up')}</h2>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-dashed border-slate-300 text-center">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                        🎉
                    </div>
                    <h3 className="text-base font-bold text-slate-700">{t('all_caught_up')}</h3>
                    <p className="text-slate-500 text-xs mt-0.5">{t('no_pending_message')}</p>
                </div>
            </section>
        );
    }

    return (
        <section className="mb-10">
            <div className="flex justify-between items-baseline mb-4 px-1">
                <div className="flex items-center gap-2">
                    <span className="text-2xl drop-shadow-sm">⏳</span>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{t('catch_up')}</h2>
                </div>
                {pendingItems.length > LIMIT && (
                    <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                        {pendingItems.length} {t('total')}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    [1, 2].map(i => (
                        <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse"></div>
                    ))
                ) : (
                    visibleItems.map(item => {
                        const { color, dbName, id } = getSubjectDetails(item.subject?.name);

                        return (
                            <motion.div
                                key={item._id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/subjects/${id}`, {
                                    state: {
                                        subjectName: item.subject?.name,
                                        dbName: dbName,
                                        color: `bg-${color}-100 text-${color}-600` // Approximation for consistency
                                    }
                                })}
                                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-4 group"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center font-bold text-xs border border-${color}-100`}>
                                    {item.subject?.name?.substring(0, 3).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                        {item.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">
                                        {item.duration} {t('mins')} • <span className="text-orange-500">{t('pending')}</span>
                                    </p>
                                </div>
                                <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {!loading && hiddenCount > 0 && (
                <div className="mt-4 text-center">
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all"
                    >
                        {t('view_more_tasks').replace('{count}', hiddenCount)} ↓
                    </button>
                </div>
            )}

            {!loading && isExpanded && pendingItems.length > LIMIT && (
                <div className="mt-4 text-center">
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                    >
                        {t('show_less')} ↑
                    </button>
                </div>
            )}
        </section>
    );
};

export default PendingTasks;
