import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { Clock, Video, AlertCircle } from 'lucide-react';
import BackButton from '../components/common/BackButton';

const LiveSessionJoinPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joinLoading, setJoinLoading] = useState(false);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await apiClient.get(`/api/live-sessions/${sessionId}`);
                setSession(res.data);
            } catch (err) {
                setError("Session not found or access denied.");
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, [sessionId]);

    const handleJoin = async () => {
        setJoinLoading(true);
        try {
            const res = await apiClient.post(`/api/live-sessions/${sessionId}/join`);
            if (res.data.joinLink) {
                // Determine if we should redirect or open in new tab
                // "Open meeting in new tab" per requirements
                window.open(res.data.joinLink, '_blank', 'noopener,noreferrer');
            }
        } catch (err) {
            alert("Unable to join: " + (err.response?.data?.message || err.message));
        } finally {
            setJoinLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Loading Session...</div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-500">{error}</div>;

    const isUpcoming = session.status === 'Upcoming';
    const isLive = session.status === 'Live';
    // const isEnded = session.status === 'Ended';
    // const isCancelled = session.status === 'Cancelled';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className={`h-2 ${isLive ? 'bg-red-500 animate-pulse' :
                    isUpcoming ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />

                <div className="p-8">
                    <BackButton to={-1} label="Back" />

                    {/* Status Badge */}
                    <div className="flex justify-center mb-6">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase
                            ${isLive ? 'bg-red-100 text-red-600' :
                                isUpcoming ? 'bg-blue-100 text-blue-600' :
                                    'bg-gray-100 text-gray-500'}
                        `}>
                            {session.status}
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">{session.title}</h1>
                    <p className="text-center text-slate-500 mb-8">{session.description}</p>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <div>
                                <div className="text-xs text-slate-400 font-semibold uppercase">Schedule</div>
                                <div className="text-sm font-medium text-slate-700">
                                    {new Date(session.startTime).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Video className="w-5 h-5 text-slate-400" />
                            <div>
                                <div className="text-xs text-slate-400 font-semibold uppercase">Platform</div>
                                <div className="text-sm font-medium text-slate-700">{session.platform}</div>
                            </div>
                        </div>
                    </div>

                    {/* ACTION AREA */}
                    <div className="space-y-4">
                        {isLive ? (
                            <button
                                onClick={handleJoin}
                                disabled={joinLoading}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-200 transition transform hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                {joinLoading ? 'Joining...' : 'JOIN LIVE SESSION'}
                            </button>
                        ) : isUpcoming ? (
                            <div className="text-center p-4 bg-blue-50 rounded-xl text-blue-700 border border-blue-100">
                                <p className="font-semibold">Session has not started yet.</p>
                                <p className="text-sm opacity-80 mt-1">Check back closer to the start time.</p>
                            </div>
                        ) : (
                            <div className="text-center p-4 bg-gray-50 rounded-xl text-gray-500 border border-gray-100">
                                <p className="font-semibold">This session has ended.</p>
                                {session.recordingLink && (
                                    <a href={session.recordingLink} target="_blank" rel="noreferrer" className="block mt-2 text-indigo-600 hover:underline">
                                        Watch Recording
                                    </a>
                                )}
                            </div>
                        )}

                        <div className="flex items-start gap-2 text-xs text-slate-400 mt-6 bg-slate-50 p-3 rounded">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>No account required to join the meeting. Attendance is strictly logged when you click Join above.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveSessionJoinPage;
