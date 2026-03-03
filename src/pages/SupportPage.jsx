import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import DashboardHeader from '../components/dashboard/DashboardHeader'; // Assuming this exists and used in Dashboard
import BackButton from '../components/common/BackButton';

const SupportPage = () => {
    const [activeTab, setActiveTab] = useState('new'); // 'new', 'list', 'detail'
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [formData, setFormData] = useState({ category: 'Technical Issue', description: '', image: '' });
    const [replyMessage, setReplyMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const categories = ['Payment', 'Technical Issue', 'Account Access', 'Other'];



    useEffect(() => {
        if (activeTab === 'list') {
            fetchTickets();
        }
    }, [activeTab]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/support/my-tickets');
            setTickets(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetail = async (id) => {
        // setLoading(true); // Don't block UI with loading state for now to see if it helps
        try {
            const res = await apiClient.get(`/api/support/${id}`);
            setSelectedTicket(res.data);
            setActiveTab('detail');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiClient.post('/api/support', formData);
            alert('Ticket Created Successfully');
            setFormData({ category: 'Technical Issue', description: '', image: '' });
            setActiveTab('list');
        } catch (err) {
            alert('Error creating ticket');
        } finally {
            setLoading(false);
        }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;
        setLoading(true);
        try {
            const res = await apiClient.post(`/api/support/${selectedTicket._id}/reply`, { message: replyMessage });
            setSelectedTicket(res.data); // Update view with new history
            setReplyMessage('');
        } catch (err) {
            alert('Error sending reply');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <DashboardHeader />

            <div className="max-w-6xl mx-auto pt-24 px-4 pb-8 md:px-6 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold text-slate-800 order-2 sm:order-1">Support Desk</h1>
                    <div className="order-1 sm:order-2 self-start sm:self-auto">
                        <BackButton to="/dashboard" label="Back to Dashboard" />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 border-b border-slate-200">
                    <button
                        onClick={() => { setActiveTab('new'); setSelectedTicket(null); }}
                        className={`pb-2 px-4 ${activeTab === 'new' ? 'border-b-2 border-indigo-600 text-indigo-700 font-semibold' : 'text-slate-500'}`}
                    >
                        New Ticket
                    </button>
                    <button
                        onClick={() => { setActiveTab('list'); setSelectedTicket(null); fetchTickets(); }}
                        className={`pb-2 px-4 ${activeTab === 'list' || activeTab === 'detail' ? 'border-b-2 border-indigo-600 text-indigo-700 font-semibold' : 'text-slate-500'}`}
                    >
                        My Tickets
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[600px] flex overflow-hidden">

                    {/* CREATE TICKET VIEW */}
                    {activeTab === 'new' && (
                        <div className="p-6 w-full max-w-2xl mx-auto">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Create New Support Ticket</h2>
                            <form onSubmit={handleCreateSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                    <select
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full p-3 border border-slate-300 rounded-lg h-40 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        placeholder="Describe your issue clearly..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
                                >
                                    {loading ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* SPLIT VIEW (List + Chat) */}
                    {(activeTab === 'list' || activeTab === 'detail') && (
                        <>
                            {/* Left Sidebar: Ticket List */}
                            <div className={`${selectedTicket ? 'hidden md:block md:w-1/3' : 'w-full'} border-r border-slate-200 flex flex-col`}>
                                <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center">
                                    <span>My Tickets</span>
                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{tickets.length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {loading && !tickets.length && <p className="p-4 text-slate-500">Loading...</p>}
                                    {!loading && tickets.length === 0 && <div className="p-8 text-center text-slate-500">No tickets found.<br /><span className="text-xs">Create one to get started!</span></div>}
                                    {tickets.map(ticket => (
                                        <div
                                            key={ticket._id}
                                            onClick={() => fetchTicketDetail(ticket._id)}
                                            className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors
                                                ${selectedTicket && selectedTicket._id === ticket._id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide
                                                    ${ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                                                        ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {ticket.status}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="font-semibold text-slate-800 text-sm mb-1">{ticket.category}</div>
                                            <div className="text-xs text-slate-500 truncate">{ticket.ticketId}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Main: Chat Area */}
                            <div className={`${!selectedTicket ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 flex-col bg-white`}>
                                {selectedTicket ? (
                                    <>
                                        {/* Chat Header */}
                                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setSelectedTicket(null)} className="md:hidden text-slate-500 pr-2">
                                                        ←
                                                    </button>
                                                    <h2 className="text-lg font-bold text-slate-800">{selectedTicket.category}</h2>
                                                </div>
                                                <div className="text-xs text-slate-500 ml-6 md:ml-0">ID: {selectedTicket.ticketId}</div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                                                ${selectedTicket.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                                                    selectedTicket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {selectedTicket.status}
                                            </span>
                                        </div>

                                        {/* Chat Messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
                                            {/* Original Issue */}
                                            <div className="flex justify-end">
                                                <div className="max-w-[85%]">
                                                    <div className="flex items-center justify-end gap-2 mb-1">
                                                        <span className="text-xs text-slate-400">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                                                        <span className="text-xs font-bold text-indigo-700">You</span>
                                                    </div>
                                                    <div className="bg-indigo-50 text-indigo-900 p-4 rounded-2xl rounded-tr-none shadow-sm border border-indigo-100">
                                                        <p className="whitespace-pre-wrap text-sm">{selectedTicket.description}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* History */}
                                            {selectedTicket.history
                                                .filter(h => h.action !== 'Created')
                                                .map((item, idx) => {
                                                    const isStudent = item.senderRole === 'Student';
                                                    return (
                                                        <div key={idx} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                                                            <div className="max-w-[85%]">
                                                                <div className={`flex items-center gap-2 mb-1 ${isStudent ? 'justify-end' : 'justify-start'}`}>
                                                                    {!isStudent && <span className="text-xs font-bold text-slate-700">Support Team ({item.senderRole})</span>}
                                                                    <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                                                                    {isStudent && <span className="text-xs font-bold text-indigo-700">You</span>}
                                                                </div>

                                                                <div className={`p-4 rounded-2xl shadow-sm text-sm border
                                                                    ${isStudent
                                                                        ? 'bg-indigo-50 text-indigo-900 rounded-tr-none border-indigo-100'
                                                                        : 'bg-white text-slate-800 rounded-tl-none border-slate-200'}`}>
                                                                    {item.action !== 'Reply' && (
                                                                        <div className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-2 border-b border-black/5 pb-1">
                                                                            {item.action === 'Status Change' ? 'System Update' : item.action}
                                                                        </div>
                                                                    )}
                                                                    <p className="whitespace-pre-wrap">{item.message}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        {/* Reply Input */}
                                        {selectedTicket.status !== 'Resolved' ? (
                                            <div className="p-4 border-t border-slate-200 bg-white">
                                                <form onSubmit={handleReplySubmit}>
                                                    <div className="flex gap-2">
                                                        <textarea
                                                            value={replyMessage}
                                                            onChange={(e) => setReplyMessage(e.target.value)}
                                                            placeholder="Type your reply..."
                                                            className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none h-12 py-3"
                                                            style={{ minHeight: '48px' }}
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={!replyMessage.trim() || loading}
                                                            className="bg-indigo-600 text-white px-6 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            Send
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-gray-50 border-t border-slate-200 text-center text-sm text-gray-500">
                                                This ticket is marked as Resolved.
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                        </div>
                                        <p className="text-lg font-medium">Select a ticket to view the conversation</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportPage;
