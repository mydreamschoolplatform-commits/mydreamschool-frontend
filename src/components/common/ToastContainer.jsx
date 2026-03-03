import React, { useState, useEffect } from 'react';
import { toastEvent } from '../../utils/toast';

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handleToast = (e) => {
            const { message, type } = e.detail;
            const id = Date.now() + Math.random();
            setToasts(prev => [...prev, { id, message, type }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 3000);
        };

        toastEvent.addEventListener('show-toast', handleToast);
        return () => toastEvent.removeEventListener('show-toast', handleToast);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className={`p-4 rounded-xl shadow-lg border text-sm font-bold animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 shadow-red-100' : 'bg-green-50 border-green-200 text-green-800 shadow-green-100'}`}>
                    <span className="text-xl leading-none">{toast.type === 'error' ? '⚠️' : '✅'}</span>
                    <span className="flex-1">{toast.message}</span>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
