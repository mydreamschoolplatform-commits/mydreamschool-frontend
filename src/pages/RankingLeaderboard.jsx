import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';

const RankingLeaderboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [rankings, setRankings] = useState(null); // { students: [] }
    const [stats, setStats] = useState(null); // for refresh output

    // Filters
    const [filterType, setFilterType] = useState('class'); // class | subject
    const [className, setClassName] = useState('9');
    const [medium, setMedium] = useState('English');
    const [subjectId, setSubjectId] = useState(''); // Need to fetch subjects?
    const [subjectsList, setSubjectsList] = useState([]);

    useEffect(() => {
        // Fetch Subjects if needed
        const loadSubjects = async () => {
            try {
                const res = await apiClient.get('/api/subjects'); // Assume generic endpoint
                setSubjectsList(res.data || []);
            } catch (err) {
                console.error("Subject Load Error", err);
            }
        };
        loadSubjects();
    }, []);

    const fetchRankings = async () => {
        setLoading(true);
        try {
            // Mapping UI filter to API params
            const params = {
                type: filterType,
                className: className,
                medium: medium,
                subjectId: filterType === 'subject' ? subjectId : undefined
            };

            // Endpoint depends on role? Admin routes vs Teacher routes?
            // Both map to rankingController.getLeaderboard
            // Admin: /api/admin/rankings/leaderboard
            // Teacher: /api/teacher/rankings (which is getLeaderboard)

            let endpoint = '/api/admin/rankings/leaderboard';
            if (user.role === 'Teacher') {
                endpoint = '/api/teacher/rankings';
            }

            const res = await apiClient.get(endpoint, { params });
            setRankings(res.data);
        } catch (err) {
            console.error("Fetch Ranking Error", err);
            setRankings(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshSnapshots = async () => {
        if (!confirm("Are you sure you want to regenerate all snapshots? This might take a moment.")) return;
        setLoading(true);
        try {
            const res = await apiClient.post('/api/admin/rankings/generate');
            setStats(res.data.stats);
            alert("Snapshots generated successfully!");
            fetchRankings(); // Reload view
        } catch (err) {
            alert("Failed to generate snapshots");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Access Check
    if (user && user.role === 'Student') {
        return <div className="p-8 text-center text-slate-500">Students cannot view the full leaderboard. please check your Dashboard for your rank.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-12 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
                    <div className="order-2 lg:order-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Ranking Leaderboard</h1>
                        <p className="text-slate-500 font-medium">View Class and Subject Performance Snapshots</p>
                    </div>
                    <div className="order-1 lg:order-2 self-start lg:self-auto flex flex-wrap items-center gap-3">
                        {user.role !== 'Teacher' && (
                            <button
                                onClick={handleRefreshSnapshots}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Processing...' : 'Trigger Refresh'}
                            </button>
                        )}
                        <BackButton to="/dashboard" label="Back" />
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">

                    {/* View Type */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">View Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                        >
                            <option value="class">Aggregate Class Rank</option>
                            <option value="subject">Subject Rank</option>
                        </select>
                    </div>

                    {/* Class */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class</label>
                        <select
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                        >
                            {/* Hardcoded for now, or dynamic */}
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                        </select>
                    </div>

                    {/* Medium */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medium</label>
                        <select
                            value={medium}
                            onChange={(e) => setMedium(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                        >
                            <option value="English">English</option>
                            <option value="Telugu">Telugu</option>
                        </select>
                    </div>

                    {/* Subject (Conditional) */}
                    <div className="space-y-1">
                        <label className={`text-xs font-bold text-slate-500 uppercase tracking-wider ${filterType !== 'subject' ? 'opacity-50' : ''}`}>Subject</label>
                        <select
                            value={subjectId}
                            onChange={(e) => setSubjectId(e.target.value)}
                            disabled={filterType !== 'subject'}
                            className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                        >
                            <option value="">Select Subject</option>
                            {subjectsList.map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={fetchRankings}
                        disabled={loading}
                        className="h-[42px] px-6 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                    >
                        View Results
                    </button>
                </div>

                {/* Results Table */}
                <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-x-auto">
                    {rankings ? (
                        rankings.students && rankings.students.length > 0 ? (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Rank</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{filterType === 'class' ? 'Aggregate Score' : 'Score'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rankings.students.map((student, idx) => (
                                        <motion.tr
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="p-4 text-center">
                                                <div className={`
                                                    inline-flex justify-center items-center w-8 h-8 rounded-full font-black text-sm
                                                    ${student.rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                                                        student.rank === 2 ? 'bg-slate-200 text-slate-600' :
                                                            student.rank === 3 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}
                                                `}>
                                                    {student.rank}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-slate-700">{student.name || 'Unknown'}</td>
                                            <td className="p-4 text-right font-mono font-medium text-slate-600">
                                                {filterType === 'class' ? student.aggregateScore : student.score}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-slate-400 font-medium">No results found for this snapshot.</p>
                                <p className="text-sm text-slate-300 mt-2">Try generating a fresh snapshot if you believe this is error.</p>
                            </div>
                        )
                    ) : (
                        <div className="p-12 text-center text-slate-400">
                            Select filters and convert to view rankings.
                        </div>
                    )}
                </div>

                {rankings && (
                    <div className="mt-4 text-right">
                        <p className="text-xs text-slate-400">Snapshot Generated: {new Date(rankings.generatedAt).toLocaleString()}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RankingLeaderboard;
