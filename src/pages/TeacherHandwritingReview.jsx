import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';

const TeacherHandwritingReview = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [filter, setFilter] = useState('pending'); // pending | reviewed

    useEffect(() => {
        fetchTasks();
    }, [filter]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/api/admin/handwriting?status=${filter}`);
            setTasks(res.data);
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        } finally {
            setLoading(false);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTask) return;

        try {
            await apiClient.post(`/api/admin/handwriting/${selectedTask._id}/review`, reviewForm);

            // Refresh
            fetchTasks();
            setSelectedTask(null);
            setReviewForm({ rating: 5, comment: '' });
        } catch (err) {
            alert('Failed to submit review');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-full bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200 transition-all active:scale-95"
                        aria-label="Back to Dashboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Handwriting Reviews</h1>
                        <p className="text-slate-500">Review student daily practice submissions</p>
                    </div>
                </header>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg font-bold ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        Pending Review
                    </button>
                    <button
                        onClick={() => setFilter('reviewed')}
                        className={`px-4 py-2 rounded-lg font-bold ${filter === 'reviewed' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                        Reviewed History
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Student</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Class</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Analysis</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tasks.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500">No tasks found.</td>
                                    </tr>
                                ) : (
                                    tasks.map(task => (
                                        <tr key={task._id} className="hover:bg-slate-50/50">
                                            <td className="p-4 text-slate-700">
                                                {new Date(task.date).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">
                                                {task.student?.fullName || 'Unknown'}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {task.student?.class} ({task.student?.medium})
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs">
                                                    <span className={`px-2 py-1 rounded ${task.analysis?.isDateValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        Date: {task.analysis?.isDateValid ? 'Match' : 'Mismatch'}
                                                    </span>
                                                    <span className="ml-2 text-slate-500">
                                                        Mistakes: {task.analysis?.mistakes?.length || 0}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => setSelectedTask(task)}
                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded text-sm font-bold hover:bg-indigo-100"
                                                >
                                                    {task.teacherReview?.isReviewed ? 'View Details' : 'Review Now'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">Review Submission</h3>
                            <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Student</p>
                                <p className="text-slate-800 font-medium">{selectedTask.student?.fullName}</p>
                            </div>

                            <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Extracted Text</p>
                                <p className="font-mono text-sm text-slate-600">{selectedTask.analysis?.extractedText || 'No text extracted'}</p>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Teacher Feedback</p>
                                {selectedTask.teacherReview?.isReviewed && filter === 'reviewed' ? (
                                    <div className="bg-green-50 p-4 rounded border border-green-100">
                                        <p className="text-sm text-green-800 italic">"{selectedTask.teacherReview.comment}"</p>
                                        <div className="mt-2 text-xs font-bold text-green-700">Rating: {selectedTask.teacherReview.rating} / 5</div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Rating</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map(r => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setReviewForm({ ...reviewForm, rating: r })}
                                                        className={`w-8 h-8 rounded-full font-bold transition ${reviewForm.rating >= r ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Comment</label>
                                            <textarea
                                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                                                rows="3"
                                                placeholder="Write an encouraging comment..."
                                                value={reviewForm.comment}
                                                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                            ></textarea>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                                        >
                                            Submit Review
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherHandwritingReview;
