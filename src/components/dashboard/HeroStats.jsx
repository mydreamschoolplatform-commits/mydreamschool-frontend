import React, { useEffect, useState, useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

const AnimatedCounter = ({ value, duration = 2 }) => {
    const springValue = useSpring(0, { duration: duration * 1000, bounce: 0 });
    const rounded = useTransform(springValue, (latest) => Math.floor(latest));
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        springValue.set(value);
    }, [value, springValue]);

    useEffect(() => {
        const unsubscribe = rounded.on("change", (latest) => {
            setDisplayValue(latest);
        });
        return () => unsubscribe();
    }, [rounded]);

    return <span>{displayValue}</span>;
};

const HeroStats = ({ exams = [], profile = null, loading = true }) => {
    const { t } = useLanguage();

    const stats = useMemo(() => {
        if (loading || !exams) return { conducted: 0, pending: 0, streak: 0 };

        const conductedExams = exams.filter(e => e.status === 'Submitted' || e.status === 'Passed' || e.hasSubmitted);
        const conductedCount = conductedExams.length;
        const pendingCount = exams.length - conductedCount;

        const streak = profile?.handwritingStreak?.currentStreak || 0;

        return { conducted: conductedCount, pending: pendingCount, streak };
    }, [exams, profile, loading]);

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 h-24 animate-pulse"></div>
                ))}
            </div>
        )
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
        >
            {/* 1. Exams Conducted */}
            <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center hover:shadow-md transition-shadow">
                <div className="text-3xl font-black text-indigo-600 font-[Outfit] mb-1">
                    <AnimatedCounter value={stats.conducted} />
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('exams_conducted')}</div>
            </motion.div>

            {/* 2. Tasks Pending */}
            <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center hover:shadow-md transition-shadow">
                <div className="text-3xl font-black text-slate-700 font-[Outfit] mb-1">
                    <AnimatedCounter value={stats.pending} />
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tasks Pending</div>
            </motion.div>

            {/* 3. Day Streak */}
            <motion.div variants={itemVariants} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center hover:shadow-md transition-shadow">
                <div className="flex items-baseline gap-1 mb-1">
                    <div className="text-3xl font-black text-orange-500 font-[Outfit]">
                        <AnimatedCounter value={stats.streak} />
                    </div>
                    <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-lg"
                    >🔥</motion.span>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Day Streak</div>
            </motion.div>
        </motion.div>
    );
};

export default HeroStats;
