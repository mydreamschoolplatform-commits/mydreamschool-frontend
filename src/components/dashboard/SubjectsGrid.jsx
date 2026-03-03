import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../utils/apiClient';
import { useLanguage } from '../../context/LanguageContext';

// We'll move subjects inside the component to use the 't' hook if they need translation key mappings.
// Or we can map their IDs to translation keys.

const SubjectsGrid = ({ exams = [], loading = true }) => {
    const { t } = useLanguage();

    const navigate = useNavigate();
    const stats = React.useMemo(() => {
        if (loading || !exams) return {};

        const newStats = {};
        exams.forEach(exam => {
            // Normalize subject name to key (e.g. 'Mathematics' -> 'math')
            let key = '';
            const subName = (exam.subject?.name || '').toLowerCase();

            if (subName.includes('telugu')) key = 'telugu';
            else if (subName.includes('hindi')) key = 'hindi';
            else if (subName.includes('english')) key = 'english';
            else if (subName.includes('math')) key = 'math';
            else if (subName.includes('science')) key = 'science';
            else if (subName.includes('social')) key = 'social';
            else if (subName.includes('general') || subName.includes('gk') || subName.includes('bio')) key = 'generalknowledge';

            if (key) {
                if (!newStats[key]) newStats[key] = { total: 0, completed: 0, hasPending: false, pendingSection: null, subjectId: null };

                const stat = newStats[key];
                stat.total++;

                // Capture the subjectId from the exam so we can pass it to SubjectDetails
                // (avoids a redundant /api/contents/subjects fetch on navigation)
                if (!stat.subjectId && exam.subject?._id) {
                    stat.subjectId = exam.subject._id;
                }

                if (exam.status === 'Submitted' || exam.status === 'Passed' || exam.hasSubmitted) {
                    stat.completed++;
                } else if (exam.isPublished) {
                    stat.hasPending = true;
                    // Capture the section of the pending exam to auto-open it
                    if (!stat.pendingSection) {
                        stat.pendingSection = exam.section;
                    }
                }
            }
        });
        return newStats;
    }, [exams, loading]);

    const subjects = [
        { id: 'math', name: 'Mathematics', dbName: 'Mathematics', icon: 'bg-blue-500', color: 'bg-blue-500', hover: 'hover:bg-blue-50' },
        { id: 'science', name: 'Science', dbName: 'Science', icon: 'bg-emerald-500', color: 'bg-emerald-500', hover: 'hover:bg-emerald-50' },
        { id: 'english', name: 'English', dbName: 'English', icon: 'bg-violet-500', color: 'bg-violet-500', hover: 'hover:bg-violet-50' },
        { id: 'social', name: 'Social Studies', dbName: 'Social', icon: 'bg-yellow-500', color: 'bg-yellow-500', hover: 'hover:bg-yellow-50' },
        { id: 'telugu', name: 'Telugu', dbName: 'Telugu', icon: 'bg-orange-500', color: 'bg-orange-500', hover: 'hover:bg-orange-50' },
        { id: 'hindi', name: 'Hindi', dbName: 'Hindi', icon: 'bg-rose-500', color: 'bg-rose-500', hover: 'hover:bg-rose-50' },
        { id: 'generalknowledge', name: 'General Knowledge', dbName: 'General Knowledge', icon: 'bg-lime-500', color: 'bg-lime-500', hover: 'hover:bg-lime-50' }
    ];

    // Previously we filtered out subjects with 0 exams:
    // const filteredSubjects = React.useMemo(() => { ... });
    // User requested to see ALL subjects to avoid confusion.
    const displaySubjects = subjects;

    const colorVariants = {
        blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' }, // Emerald uses darker text/bg for status usually, but sticking to pattern
        violet: { gradient: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-200', text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
        yellow: { gradient: 'from-yellow-500 to-yellow-600', shadow: 'shadow-yellow-200', text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
        orange: { gradient: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-200', text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
        rose: { gradient: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-200', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
        lime: { gradient: 'from-lime-500 to-lime-600', shadow: 'shadow-lime-200', text: 'text-lime-600', bg: 'bg-lime-50', border: 'border-lime-100' },
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
    };

    return (
        <section className="mb-10">
            <h2 className="text-xl font-black text-slate-800 mb-5 px-1 tracking-tight">{t('my_subjects')}</h2>

            <motion.div
                key={loading ? 'loading' : 'content'}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            >
                {loading && [1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-[140px] relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-slate-200"></div>
                            <div className="w-20 h-6 rounded-full bg-slate-200"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                    </div>
                ))}

                {!loading && displaySubjects.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="text-5xl mb-3 opacity-50">📚</div>
                        <h3 className="text-xl font-bold text-slate-700 mb-1">{t('no_subjects_yet') || 'No Subjects Assigned Yet'}</h3>
                        <p className="text-slate-500 max-w-md mx-auto">{t('no_subjects_desc') || "You don't have any exams or content assigned at the moment. Check back later when your teachers add new material."}</p>
                    </div>
                )}

                {!loading && displaySubjects.map((subject) => {
                    const stat = stats[subject.id] || { total: 0, completed: 0, hasPending: false, pendingSection: null, subjectId: null };
                    // Extract color name (e.g. 'blue' from 'bg-blue-500')
                    const colorName = subject.color.split('-')[1];
                    const theme = colorVariants[colorName] || colorVariants.blue;

                    return (
                        <motion.button
                            key={subject.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            whileHover={{ scale: 1.03, y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(`/subjects/${subject.id}`, {
                                state: {
                                    subjectName: subject.name,
                                    dbName: subject.dbName,
                                    color: subject.color,
                                    activeTab: stat.pendingSection, // Pass the section to open
                                    subjectId: stat.subjectId      // Pass ID to skip redundant API call
                                }
                            })}
                            className={`bg-white p-5 rounded-3xl border transition-all duration-300 shadow-sm ${subject.hover} group relative overflow-hidden ring-1 ${stat.hasPending ? 'ring-2 ring-orange-300 border-orange-200 shadow-orange-100' : 'border-slate-200/60 ring-transparent hover:ring-indigo-100'} z-0 h-[140px] flex flex-col justify-between`}
                        >
                            {/* Subtle background glow */}
                            <div className={`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-full blur-2xl -translate-y-10 translate-x-10 ${subject.color.split(' ')[0]}`}></div>

                            <div className="flex justify-between items-start mb-0 relative z-10 w-full">
                                <motion.div
                                    whileHover={{ rotate: [0, -2, 2, -2, 0] }}
                                    transition={{ duration: 0.4 }}
                                    className={`h-9 px-3 rounded-xl bg-gradient-to-r ${theme.gradient} text-white flex items-center justify-center font-bold shadow-md ${theme.shadow} min-w-[3rem] w-auto whitespace-nowrap tracking-wide ${subject.name.length > 13 ? 'text-xs' : 'text-sm'}`}
                                >
                                    {subject.name}
                                </motion.div>
                                {/* Status Indicator */}
                                <div className={`backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[10px] font-bold border shadow-sm transition-all ${stat.completed === stat.total && stat.total > 0
                                    ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
                                    : `${theme.bg} ${theme.text} ${theme.border}`}`}>
                                    {stat.completed}/{stat.total}
                                </div>
                            </div>

                            <div className="relative z-10">
                                {/* <h3 className="text-slate-800 font-extrabold text-lg leading-tight group-hover:text-indigo-900 transition-colors font-[Outfit]">{subject.name}</h3> */}
                                <p className="text-xs font-bold text-slate-400 mt-1 group-hover:text-indigo-500 transition-colors ml-1">{t('continue_learning')}</p>
                            </div>
                        </motion.button>
                    );
                })}
            </motion.div>
        </section>
    );
};

export default SubjectsGrid;
