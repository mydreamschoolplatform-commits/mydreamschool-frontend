import React from 'react';

const RankCard = ({ ranks, loading, exams = [] }) => {
    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-pulse">
                <div className="h-6 w-1/2 bg-slate-200 rounded mb-4"></div>
                <div className="h-10 w-full bg-slate-200 rounded mb-6"></div>
                <div className="space-y-2">
                    <div className="h-8 w-full bg-slate-100 rounded"></div>
                    <div className="h-8 w-full bg-slate-100 rounded"></div>
                </div>
            </div>
        );
    }

    if (!ranks || !ranks.aggregate) return null;

    const { aggregate, subjects } = ranks;

    // --- LIVE ELIGIBILITY GUARD ---
    // Derive eligibility directly from the exams the dashboard already fetched.
    // A student is ranked only if ALL their assigned exams are submitted.
    // We check !e.hasSubmitted to correctly catch both 'Pending' and 'Started' statuses.
    const hasUnfinishedExam = exams.some(e => !e.hasSubmitted);
    const liveEligible = !hasUnfinishedExam && exams.length > 0;
    const showOverallRank = liveEligible && !!aggregate.rank;

    const renderTrend = (direction, value) => {
        if (!direction || direction === 'NEW' || direction === 'SAME') {
            return <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">SAME</span>;
        }
        const isUp = direction === 'UP';
        return (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 flex items-center gap-0.5 ${isUp ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                {isUp ? '↑' : '↓'} {value}
            </span>
        );
    };

    const renderMastery = (level) => {
        let colorClass = 'bg-slate-200';
        let tooltip = 'No Data';
        if (level === 'Strong') {
            colorClass = 'bg-green-500';
            tooltip = 'Strong Mastery (70%+)';
        } else if (level === 'Average') {
            colorClass = 'bg-yellow-400';
            tooltip = 'Average Mastery (40-70%)';
        } else if (level === 'Needs Improvement') {
            colorClass = 'bg-red-400';
            tooltip = 'Needs Improvement (<40%)';
        }

        if (!level) return null;

        return (
            <div className="group/mastery relative ml-auto">
                <div className={`h-2 w-2 rounded-full ${colorClass}`}></div>
                <div className="absolute right-0 bottom-full mb-1 hidden group-hover/mastery:block whitespace-nowrap bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg z-20">
                    {tooltip}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-80" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Class Rank</h3>
                        <p className="text-sm text-slate-500 font-medium">Live Snapshot</p>
                    </div>
                    <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                            <path d="M4 22h16" />
                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                            <path d="M18 2h-4a2 2 0 0 0-2 2h0a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
                        </svg>
                    </div>
                </div>

                {/* Aggregate Rank */}
                <div className="mb-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Overall Rank</p>
                        <div className="flex items-baseline gap-1">
                            {showOverallRank ? (
                                <>
                                    <span className="text-3xl font-black text-slate-800">#{aggregate.rank}</span>
                                    <span className="text-sm text-slate-500 font-semibold">/ {aggregate.totalStudents}</span>
                                    {renderTrend(aggregate.trendDirection, aggregate.trendValue)}
                                </>
                            ) : (
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-500">Not Yet Ranked</span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {hasUnfinishedExam
                                            ? 'Complete all assigned exams to earn your rank'
                                            : 'Complete all subject exams to see your rank'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded-lg text-xs font-bold ${showOverallRank ? 'bg-white text-green-600 border border-green-100' : 'bg-white text-amber-500 border border-amber-100'}`}>
                        {showOverallRank ? 'Active' : 'In Progress'}
                    </div>
                </div>

                {/* Subject Ranks */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Subject Performance</h4>
                    {subjects && Array.isArray(subjects) && subjects.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {subjects.map((sub, idx) => {
                                if (!sub) return null;
                                return (
                                    <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                                        <span className="text-xs font-semibold text-slate-800 truncate" title={sub.subjectName}>{sub.subjectName}</span>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            {sub.rank ? (
                                                <>
                                                    <span className="text-lg font-bold text-indigo-600">#{sub.rank}</span>
                                                    <span className="text-[10px] text-slate-400">/ {sub.totalStudents}</span>
                                                    {renderTrend(sub.trendDirection, sub.trendValue)}
                                                    {renderMastery(sub.masteryLevel)}
                                                </>
                                            ) : (
                                                <span className="text-xs font-medium text-slate-400">N/A</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic px-1">No subject ranks yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RankCard;
