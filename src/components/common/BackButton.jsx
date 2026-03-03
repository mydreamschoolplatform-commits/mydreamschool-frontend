import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ to = '/dashboard', label = 'Back to Dashboard', className = '', iconOnly = false }) => {
    const navigate = useNavigate();

    const handleNavigation = () => {
        if (to === -1) {
            navigate(-1);
        } else {
            navigate(to);
        }
    };

    if (iconOnly) {
        return (
            <button
                onClick={handleNavigation}
                className={`p-2 rounded-full bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200 transition-all active:scale-95 ${className}`}
                aria-label={label}
                title={label}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
        );
    }

    return (
        <button
            onClick={handleNavigation}
            className={`flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold group ${className}`}
        >
            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </div>
            {label}
        </button>
    );
};

export default BackButton;
