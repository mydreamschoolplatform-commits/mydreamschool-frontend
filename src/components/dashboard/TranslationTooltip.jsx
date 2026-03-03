import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import apiClient from '../../utils/apiClient';

const TranslationTooltip = ({ term, position, onClose }) => {
    const { t } = useLanguage();
    const [translation, setTranslation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const fetchTranslation = useCallback(async () => {
        if (!term) return;

        setLoading(true);
        setError(false);
        setTranslation(null);

        try {
            const response = await apiClient.get('/api/utils/translate', {
                params: { text: term }
            });

            if (response.data?.translated) {
                setTranslation(response.data.translated);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error('Tooltip Translation Error:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [term]);

    // Fetch on mount / when term changes
    useEffect(() => {
        fetchTranslation();
    }, [fetchTranslation]);

    if (!term || !position) return null;

    // Clamp so tooltip never goes off-screen
    const tooltipTop = Math.min(position.y + 12, window.innerHeight - 100);
    const tooltipLeft = position.x;

    return (
        <div
            className="fixed z-[9999] animate-in zoom-in-95 duration-200"
            style={{
                top: tooltipTop,
                left: tooltipLeft,
                transform: 'translateX(-50%)'
            }}
        >
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-xl border border-white/10 flex items-center gap-3 min-w-[140px] max-w-[240px]">
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                        Telugu
                    </span>

                    {loading ? (
                        /* Loading state */
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-slate-500 border-t-indigo-400 rounded-full animate-spin shrink-0" />
                            <span className="text-xs text-slate-400">Translating...</span>
                        </div>
                    ) : error ? (
                        /* Error state with retry */
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-400">Failed</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); fetchTranslation(); }}
                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : translation ? (
                        /* Success */
                        <span className="text-sm font-bold leading-snug break-words">{translation}</span>
                    ) : null}
                </div>

                {/* Close Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="ml-1 p-1 hover:bg-white/20 rounded-full transition-colors shrink-0 self-start"
                    aria-label="Close tooltip"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Arrow pointing up */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 rotate-45 border-l border-t border-white/10" />
        </div>
    );
};

export default TranslationTooltip;
