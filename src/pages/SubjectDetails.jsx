import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';

import { useLanguage } from '../context/LanguageContext';

const SubjectDetails = () => {
    const { t, language, toggleLanguage } = useLanguage();
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Mapping for Reloads (ID -> DB Name)
    const subjectMap = {
        'telugu': { dbName: 'Telugu', label: t('subject_telugu'), color: 'bg-amber-100 text-amber-600' },
        'hindi': { dbName: 'Hindi', label: t('subject_hindi'), color: 'bg-orange-100 text-orange-600' },
        'english': { dbName: 'English', label: t('subject_english'), color: 'bg-blue-100 text-blue-600' },
        'math': { dbName: 'Mathematics', label: t('subject_maths'), color: 'bg-violet-100 text-violet-600' },
        'science': { dbName: 'Science', label: t('subject_science'), color: 'bg-emerald-100 text-emerald-600' },
        'social': { dbName: 'Social', label: t('subject_social'), color: 'bg-rose-100 text-rose-600' },
        'biology': { dbName: 'Biology', label: t('subject_biology'), color: 'bg-indigo-100 text-indigo-600' },
        'generalknowledge': { dbName: 'General Knowledge', label: t('subject_biology'), color: 'bg-lime-100 text-lime-600' } // reusing subject_biology which is now GK
    };

    // Use State or Fallback to Map
    const currentSubject = location.state || {
        subjectName: subjectMap[id]?.label || 'Subject',
        dbName: subjectMap[id]?.dbName || '',
        color: subjectMap[id]?.color || 'bg-slate-100 text-slate-600'
    };

    const { subjectName, dbName, color } = currentSubject;

    const [activeTab, setActiveTab] = useState(t('tab_introduction')); // Use default as key or just keep english internal
    // Actually, internal logic relies on activeTab being "Introduction" etc.
    // So let's keep internal state English, but Display translated.
    const [activeTabInternal, setActiveTabInternal] = useState(location.state?.activeTab || 'Introduction');

    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(false);

    // Map section names to what backend expects
    const tabs = [
        { id: 'Introduction', label: t('tab_introduction') },
        { id: 'Chapters', label: t('tab_chapters') },
        { id: 'Revision', label: t('tab_revision') }
    ];

    // For colors
    const themeColor = color.split(' ')[0].replace('bg-', '').replace('-100', ''); // e.g. amber, blue
    const themeText = color.split(' ')[1]; // e.g. text-amber-600

    useEffect(() => {
        const fetchExams = async () => {
            if (!dbName) return;
            setLoading(true);
            try {
                // If subjectId was passed via navigation state, use it directly (zero extra round-trip).
                // This is the normal path: Dashboard → Subject card (carries subjectId in state).
                let resolvedSubjectId = location.state?.subjectId;

                if (!resolvedSubjectId) {
                    // Fallback: direct URL visit without state — resolve once via name lookup
                    const subRes = await apiClient.get('/api/contents/subjects');
                    const targetSubject = subRes.data.find(s =>
                        s.name.trim().toLowerCase() === dbName.trim().toLowerCase() ||
                        s.name.toLowerCase().includes(dbName.toLowerCase())
                    );
                    if (!targetSubject) {
                        console.warn(`Subject not found in DB: ${dbName}`);
                        setLoading(false);
                        return;
                    }
                    resolvedSubjectId = targetSubject._id;
                }

                const res = await apiClient.get(`/api/exams/${resolvedSubjectId}/${activeTabInternal}`);
                setExams(res.data);
            } catch (err) {
                console.error("Error fetching exams:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchExams();
    }, [dbName, activeTabInternal]); // Depend on internal tab state

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="font-bold text-xl text-slate-800">{subjectName}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-sm transition-colors border border-slate-200"
                            title="Switch Language"
                        >
                            <span className={`text-xs font-bold ${language === 'en' ? 'text-indigo-600' : 'text-slate-400'}`}>English</span>
                            <span className="text-slate-300">/</span>
                            <span className={`text-xs font-bold ${language === 'te' ? 'text-indigo-600' : 'text-slate-400'}`}>తెలుగు</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-5xl mx-auto px-4 flex gap-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTabInternal(tab.id)}
                            className={`py-4 text-sm font-bold border-b-2 transition-all ${activeTabInternal === tab.id
                                ? `border-indigo-600 text-indigo-600`
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
                {loading ? (
                    <div className="text-center py-12 text-slate-400">{t('loading_content')}</div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                        <div className="text-4xl mb-2">📭</div>
                        <h3 className="font-bold text-slate-600">{t('no_content_yet')}</h3>
                        <p className="text-sm text-slate-400">{t('no_content_message')}</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {exams.map(exam => (
                            <div key={exam._id} className={`p-4 sm:p-5 rounded-2xl border transition-all group relative overflow-hidden ${exam.status === 'Submitted'
                                ? 'bg-indigo-50/30 border-indigo-100 hover:shadow-md'
                                : exam.status === 'Started'
                                    ? 'bg-amber-50/30 border-amber-100 hover:shadow-md'
                                    : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200'
                                }`}>
                                {exam.hasSubmitted ? (
                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg">
                                        {t('completed')}
                                    </div>
                                ) : exam.status === 'Started' && (
                                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg">
                                        {t('in_progress')}
                                    </div>
                                )}

                                {/* Card body: top row = icon + info; bottom row = action buttons on portrait */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">

                                    {/* Top / Left: icon + title + meta */}
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className={`w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${exam.status === 'Submitted'
                                            ? 'bg-white text-indigo-400 border border-indigo-50'
                                            : exam.status === 'Started'
                                                ? 'bg-white text-amber-500 border-amber-100'
                                                : `${color.replace('text-', 'bg-').replace('100', '50')} text-opacity-40`
                                            }`}>
                                            {exam.pattern === 'Video_MCQ' ? '📺' : '📝'}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className={`font-bold text-base sm:text-lg leading-snug transition-colors ${exam.status === 'Submitted' ? 'text-slate-700' : 'text-slate-800 group-hover:text-indigo-600'
                                                }`}>{exam.title}</h3>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 mt-1.5">
                                                {exam.hasSubmitted ? (
                                                    <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M6 20V10M18 20V4" /></svg>
                                                        {t('score')}: {exam.score} / {exam.attemptMaxScore || '?'}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M6 20V10M18 20V4" /></svg>
                                                        {exam.questions?.length || '0'} {t('questions')}
                                                    </span>
                                                )}
                                                <span className="text-slate-300 hidden sm:inline">•</span>
                                                <span className="flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                    {exam.duration} {t('mins')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom / Right: action buttons — always on their own row on portrait */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {exam.status === 'Submitted' ? (
                                            <>
                                                <button
                                                    onClick={() => navigate(`/exams/${exam._id}`, { state: { returnPath: location.pathname, subjectData: currentSubject, reviewMode: true } })}
                                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-all shadow-sm flex items-center justify-center gap-1.5"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                                    Review
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/exams/${exam._id}`, { state: { returnPath: location.pathname, subjectData: currentSubject } })}
                                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-indigo-200 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                                    {t('retake')}
                                                </button>
                                            </>
                                        ) : exam.status === 'Started' ? (
                                            <button
                                                onClick={() => navigate(`/exams/${exam._id}`, { state: { returnPath: location.pathname, subjectData: currentSubject } })}
                                                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                {t('resume')}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => navigate(`/exams/${exam._id}`, { state: { returnPath: location.pathname, subjectData: currentSubject } })}
                                                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                {t('start_exam')}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SubjectDetails;
