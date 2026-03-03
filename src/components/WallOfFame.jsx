import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../utils/apiClient';
import Avatar from './common/Avatar';

const CACHE_KEY = 'wof_leaderboard_cache';

// Read last-known data from localStorage (instant, zero latency)
const readLocalCache = () => {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

// Persist fresh data to localStorage for next visit
const writeLocalCache = (data) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* quota exceeded — ignore */ }
};

const WallOfFame = () => {
    // Initialise state from localStorage IMMEDIATELY — no loading flash on repeat visits
    const [leaderboards, setLeaderboards] = useState(() => readLocalCache() || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(() => !readLocalCache()); // only show skeleton on truly first visit
    const [isStale, setIsStale] = useState(false); // background refresh in progress
    const [error, setError] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchLeaderboard = async () => {
            try {
                // Short 5s timeout — backend is pre-warmed so it should respond in <200ms
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 5000)
                );
                const res = await Promise.race([
                    apiClient.get('/api/analytics/public-wall-of-fame'),
                    timeout
                ]);

                if (res.data && Array.isArray(res.data)) {
                    setLeaderboards(res.data);
                    writeLocalCache(res.data);  // persist for next visit
                    setError(false);
                    setLoading(false);
                    setIsStale(false);
                } else {
                    throw new Error('Invalid format');
                }
            } catch (err) {
                console.warn('WallOfFame fetch failed:', err.message);
                const cached = readLocalCache();
                if (cached && cached.length > 0) {
                    // We already have stale data visible — just stop the refresh indicator
                    setIsStale(false);
                } else {
                    // Truly first visit with no cached data and fetch failed
                    setError(true);
                    setLoading(false);
                }
            }
        };

        if (leaderboards.length > 0) {
            // We have cached data visible — fetch silently in background without skeleton
            setIsStale(true);
        }
        fetchLeaderboard();
    }, []);

    // Reset index when data changes
    useEffect(() => { setCurrentIndex(0); }, [leaderboards]);

    // Auto-rotate
    useEffect(() => {
        if (!Array.isArray(leaderboards) || leaderboards.length <= 1 || isPaused) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % leaderboards.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [leaderboards, isPaused]);

    const nextSlide = () => {
        if (!leaderboards.length) return;
        setCurrentIndex((prev) => (prev + 1) % leaderboards.length);
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 8000);
    };

    const prevSlide = () => {
        if (!leaderboards.length) return;
        setCurrentIndex((prev) => (prev - 1 + leaderboards.length) % leaderboards.length);
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 8000);
    };

    // Skeleton — only shown on a truly first-ever visit (no localStorage cache)
    const WallOfFameSkeleton = () => (
        <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 h-[450px] animate-pulse">
            <div className="bg-slate-200 h-24 w-full"></div>
            <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center p-3 rounded-xl border border-slate-100">
                        <div className="w-12 h-12 bg-slate-200 rounded-full mr-4"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-10 h-6 bg-slate-200 rounded"></div>
                    </div>
                ))}
            </div>
            <div className="p-3 border-t border-slate-100 flex justify-center">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
        </div>
    );

    if (loading) return <WallOfFameSkeleton />;

    if (error || !Array.isArray(leaderboards) || leaderboards.length === 0) {
        return (
            <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 p-8 text-center">
                <div className="text-4xl mb-3">🏅</div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Wall of Fame</h3>
                <p className="text-slate-500 text-sm">Waiting for champions to rise! Check back later.</p>
            </div>
        );
    }

    const currentGroup = leaderboards[currentIndex];
    if (!currentGroup) return null;

    return (
        <div
            className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/50 h-fit transform transition-all hover:scale-[1.01] relative group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Subtle "refreshing" indicator — shown during background refresh */}
            {isStale && (
                <div className="absolute top-2 right-2 z-30">
                    <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" title="Refreshing..." />
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                <h2 className="text-2xl font-bold mb-1 relative z-10 flex items-center justify-center gap-2">
                    <span>🏆</span> Wall of Fame
                </h2>

                {leaderboards.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-20 backdrop-blur-sm group-hover:opacity-100 opacity-60"
                            aria-label="Previous Class"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-20 backdrop-blur-sm group-hover:opacity-100 opacity-60"
                            aria-label="Next Class"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </>
                )}

                <div className="flex justify-center items-center gap-2 mt-2 relative z-10">
                    <span className="text-indigo-100 text-sm font-medium tracking-wide uppercase bg-white/20 px-3 py-1 rounded-full whitespace-nowrap">
                        {currentGroup.title}
                    </span>
                </div>

                {Array.isArray(leaderboards) && leaderboards.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-4 absolute bottom-2 left-0 w-full">
                        {leaderboards.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Carousel Content */}
            <div className="p-4 bg-gradient-to-b from-indigo-50/50 to-white min-h-[300px] relative">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-4"
                    >
                        {(!currentGroup.students || currentGroup.students.length === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-center p-6">
                                <div className="text-4xl mb-4 opacity-30 grayscale">🏆</div>
                                <h3 className="text-lg font-bold text-slate-400 mb-2">No Champions Yet</h3>
                                <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed">
                                    {currentGroup.message || "Be the first to complete all exams and claim your spot!"}
                                </p>
                            </div>
                        ) : (
                            (currentGroup.students || []).map((student, index) => (
                                <motion.div
                                    key={`${currentGroup.title}-${index}`}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 + 0.1 }}
                                    className={`relative flex items-center p-3 sm:p-4 rounded-xl transition-all border shadow-sm hover:shadow-md
                                        ${index === 0 ? 'bg-amber-50/80 border-amber-200' :
                                            index === 1 ? 'bg-slate-50/80 border-slate-200' :
                                                index === 2 ? 'bg-orange-50/80 border-orange-200' : 'bg-white border-slate-100'}
                                    `}
                                >
                                    <div className="absolute -top-2 -left-2 z-10">
                                        <div className={`
                                            w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shadow-md border-2 border-white
                                            ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                index === 1 ? 'bg-slate-300 text-slate-800' :
                                                    index === 2 ? 'bg-orange-400 text-orange-900' :
                                                        'bg-indigo-100 text-indigo-600'}
                                        `}>
                                            {index + 1}
                                        </div>
                                    </div>

                                    <div className={`
                                        w-14 h-14 rounded-full shadow-inner mr-4 shrink-0 overflow-hidden border-2 flex items-center justify-center bg-white
                                        ${index === 0 ? 'border-amber-300' :
                                            index === 1 ? 'border-slate-300' :
                                                index === 2 ? 'border-orange-300' :
                                                    'border-indigo-100 bg-indigo-50'}
                                    `}>
                                        <Avatar src={student.avatar} name={student.name} size="md" className="w-full h-full" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 text-lg truncate leading-tight">{student.name}</h3>
                                        <div className="flex flex-col mt-1 space-y-0.5">
                                            <p className="text-[11px] sm:text-xs text-indigo-600 font-semibold truncate flex items-center gap-1">
                                                <span>🏫</span> {student.schoolName || 'MyDreamSchool'}
                                            </p>
                                            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                                                <span>👤</span> {student.parentName ? `${student.parentName}` : 'Parent'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0 ml-2">
                                        <span className={`font-bold text-xl block leading-none ${index === 0 ? 'text-amber-600' :
                                            index === 1 ? 'text-slate-600' : 'text-orange-600'}`}>
                                            {student.score}
                                        </span>
                                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">XP</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="bg-white p-3 text-center border-t border-slate-100">
                <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest hover:underline flex items-center justify-center gap-1 mx-auto">
                    View Full Leaderboard <span>→</span>
                </button>
            </div>
        </div>
    );
};

export default WallOfFame;
