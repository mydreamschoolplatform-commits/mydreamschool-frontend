import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import apiClient from '../../utils/apiClient';

const DictionaryModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setResult(null);
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    // Debounce search to avoid hitting API too fast
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim().length >= 2) {
                fetchTranslation(searchTerm);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            fetchTranslation(searchTerm);
        }
    };

    const fetchTranslation = async (word) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/api/utils/translate', {
                params: { text: word }
            });

            if (response.data) {
                setResult({
                    word: word,
                    te: response.data.translated,
                    type: 'Translation',
                    def: `English to Telugu translation for "${word}".`
                });
            }
        } catch (err) {
            console.error('Dictionary API Error:', err);
            setError({ message: 'Translation failed. Tap Retry to try again.', word });
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (

        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                    onClick={onClose}
                    aria-hidden="true"
                ></div>

                {/* Modal Panel */}
                <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-sm sm:max-w-xl animate-in zoom-in-95 duration-200 ring-1 ring-black/5 mx-auto">
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-4 flex justify-between items-center border-b border-indigo-400/20">
                        <h3 className="text-lg leading-6 font-black text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                            {t('dictionary')}
                        </h3>
                        <button onClick={onClose} className="text-indigo-100 hover:text-white transition-colors bg-white/20 p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="px-6 py-6 bg-slate-50/50">
                        {/* Search Input */}
                        <div className="relative mb-6">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:text-sm font-medium shadow-sm transition-all"
                                placeholder={t('type_word')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                        </div>

                        {/* Results Area */}
                        <div className="min-h-[180px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10 text-indigo-500 animate-pulse">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin mb-2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                    <p className="text-xs font-bold">{t('translating')}</p>
                                </div>
                            ) : result ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                                        {/* Side by Side Layout */}
                                        <div className="flex flex-col sm:flex-row h-full">
                                            {/* English Side */}
                                            <div className="flex-1 p-5 border-b sm:border-b-0 sm:border-r border-slate-100 bg-white">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="text-2xl font-black text-slate-800 capitalize leading-none">{result.word}</h4>
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-500">{result.type}</span>
                                                </div>
                                                <div className="h-px w-8 bg-indigo-500 mb-3 mt-3"></div>
                                                <p className="text-sm text-slate-500 italic leading-relaxed">
                                                    {result.def}
                                                </p>
                                            </div>

                                            {/* Telugu Side */}
                                            <div className="flex-1 p-5 bg-indigo-50/30 flex flex-col justify-center min-h-[120px]">
                                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">{t('telugu_meaning')}</p>
                                                <p className="text-3xl font-black text-indigo-700 leading-snug">{result.te}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8 text-rose-400">
                                    <p className="text-sm font-bold mb-3">{error.message}</p>
                                    <button
                                        onClick={() => fetchTranslation(error.word)}
                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-400">
                                    <div className="inline-block p-3 rounded-full bg-indigo-50 text-indigo-300 mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                                    </div>
                                    <p className="text-sm font-medium">{t('type_to_translate')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 px-6 py-3 flex justify-between items-center border-t border-slate-200/60">
                        <span className="text-xs text-slate-400 font-medium">{t('powered_by')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DictionaryModal;
