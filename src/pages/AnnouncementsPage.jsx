import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import BackButton from '../components/common/BackButton';

const AnnouncementsPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [liveSessions, setLiveSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();



    useEffect(() => {
        fetchAnnouncements();
        fetchLiveSessions();
    }, []);

    const fetchLiveSessions = async () => {
        try {
            const res = await apiClient.get('/api/live-sessions/student/list');
            setLiveSessions(res.data);
        } catch (err) {
            console.error("Error fetching live sessions", err);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const res = await apiClient.get('/api/announcements');
            setAnnouncements(res.data);
            // Update local read tracker
            if (res.data.length > 0) {
                localStorage.setItem('lastViewedAnnouncementTime', new Date().toISOString());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <DashboardHeader />

            <div className="max-w-4xl mx-auto pt-24 px-4 pb-8 md:px-6 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold text-slate-800 order-2 sm:order-1">Announcements</h1>
                    <div className="order-1 sm:order-2 self-start sm:self-auto">
                        <BackButton to="/dashboard" label="Back to Dashboard" />
                    </div>
                </div>

                {/* Live Sessions Section */}
                {liveSessions.length > 0 && (
                    <div className="mb-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Live Sessions & Webinars
                        </h2>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                            {liveSessions.map(session => (
                                <div key={session._id} className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100 flex justify-between items-center hover:shadow-md transition">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                                 ${session.status === 'Live' ? 'bg-red-100 text-red-600' :
                                                    session.status === 'Upcoming' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-gray-100 text-gray-500'}`}>
                                                {session.status}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {new Date(session.startTime).toLocaleString()}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-slate-800">{session.title}</h3>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{session.description}</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/live-session/${session._id}`)}
                                        className="ml-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
                                    >
                                        {session.status === 'Live' ? 'Join Now' : 'View Details'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800">Notice Board</h2>
                    {loading && <p className="text-slate-500">Loading...</p>}
                    {!loading && announcements.length === 0 && (
                        <div className="p-8 bg-white rounded-xl text-center text-slate-500 border border-slate-100">
                            No announcements yet.
                        </div>
                    )}

                    {announcements.map((ann) => (
                        <div
                            key={ann._id}
                            className={`bg-white rounded-xl p-5 border shadow-sm transition hover:shadow-md
                ${ann.priority === 'Important' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}
              `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {ann.priority === 'Important' && (
                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                                            Important
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400 font-medium">
                                        {new Date(ann.createdAt).toLocaleDateString()} • {ann.authorRole}
                                    </span>
                                    {/* Target Badge */}
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">
                                        {ann.targetAudience.type}
                                        {ann.targetAudience.subjectId && ` - ${ann.targetAudience.subjectId.name}`}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 mb-2">{ann.title}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                {ann.message}
                            </p>
                            {ann.attachment && ann.attachment.url && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <a
                                        href={ann.attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download Attachment
                                        <span className="text-xs opacity-75">
                                            ({ann.attachment.name || 'File'})
                                        </span>
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnnouncementsPage;
