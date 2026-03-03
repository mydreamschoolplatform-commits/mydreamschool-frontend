import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import { useLanguage } from '../../context/LanguageContext';

const AnnouncementsWidget = () => {
    const { t } = useLanguage();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await apiClient.get('/api/announcements');
                // Take top 3
                setAnnouncements(res.data.slice(0, 3));
            } catch (err) {
                console.error("Failed to fetch announcements widget", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, []);

    if (loading) return null; // Or skeleton

    // If no announcements, maybe don't show or show empty state?
    // "Announcements section" location implying it should be there.
    if (announcements.length === 0) return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('announcements')}</h3>
            <p className="text-slate-500 text-sm">{t('no_announcements')}</p>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">{t('announcements')}</h3>
                <button
                    onClick={() => navigate('/announcements')}
                    className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
                >
                    {t('view_all')}
                </button>
            </div>

            <div className="space-y-4">
                {announcements.map(ann => (
                    <div key={ann._id} className={`p-3 rounded-xl border ${ann.priority === 'Important' ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                {new Date(ann.createdAt).toLocaleDateString()}
                            </span>
                            {ann.priority === 'Important' && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded font-bold">{t('imp')}</span>
                            )}
                        </div>
                        <h4 className="font-semibold text-slate-700 text-sm line-clamp-1">{ann.title}</h4>
                        <p className="text-slate-500 text-xs line-clamp-2 mt-1">{ann.message}</p>
                        {ann.attachment && ann.attachment.url && (
                            <a
                                href={ann.attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {t('view_attachment') || 'View Attachment'}
                            </a>
                        )}
                    </div>
                ))}
            </div>

        </div>
    );
};

export default AnnouncementsWidget;
