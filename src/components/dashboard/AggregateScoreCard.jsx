import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const AggregateScoreCard = ({ exams = [], loading }) => {

    const stats = useMemo(() => {
        if (loading || !exams) return { totalGained: 0, totalMax: 0, percentage: 0 };

        let totalGained = 0;
        let totalMax = 0;

        exams.forEach(exam => {
            // Only count exams that have a score (submitted/passed)
            if ((exam.status === 'Submitted' || exam.status === 'Passed' || exam.hasSubmitted) && typeof exam.score === 'number') {
                totalGained += exam.score;
                totalMax += exam.maxScore;
            }
        });

        const percentage = totalMax > 0 ? Math.round((totalGained / totalMax) * 100) : 0;
        return { totalGained, totalMax, percentage };
    }, [exams, loading]);

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-pulse h-48">
                <div className="h-4 w-1/3 bg-slate-200 rounded mb-8"></div>
                <div className="h-20 w-20 bg-slate-200 rounded-full mx-auto mb-4"></div>
            </div>
        );
    }

    // Determine circular progress stroke
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (stats.percentage / 100) * circumference;

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-violet-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            {/* Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 transition-transform group-hover:scale-110" />

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-1">Total Score</h3>
                    <p className="text-sm text-slate-400 font-medium mb-4">Aggregate Performance</p>

                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-800 tracking-tight">{stats.totalGained}</span>
                        <span className="text-lg text-slate-400 font-semibold">/ {stats.totalMax}</span>
                    </div>
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold border border-violet-100">
                        {stats.percentage}% Accuracy
                    </div>
                </div>

                {/* Circular Progress */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="transform -rotate-90 w-full h-full">
                        {/* Track */}
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-slate-100"
                        />
                        {/* Progress */}
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="text-violet-500 transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-violet-600">
                            {stats.percentage}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AggregateScoreCard;
