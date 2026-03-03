import React, { useEffect, useState } from 'react';

const DateSelector = ({ value, onChange, label, startYear = 1990, endYear = 2030, required = false, disabled = false }) => {
    // Parse initial value (YYYY-MM-DD)
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setDay(date.getDate());
                setMonth(date.getMonth() + 1); // 1-12
                setYear(date.getFullYear());
            }
        } else {
            setDay('');
            setMonth('');
            setYear('');
        }
    }, [value]);

    const handleChange = (type, val) => {
        let d = day;
        let m = month;
        let y = year;

        if (type === 'day') d = val;
        if (type === 'month') m = val;
        if (type === 'year') y = val;

        // Update local state
        if (type === 'day') setDay(val);
        if (type === 'month') setMonth(val);
        if (type === 'year') setYear(val);

        if (d && m && y) {
            const maxDays = new Date(y, m, 0).getDate();
            if (d > maxDays) d = maxDays;

            const strDay = String(d).padStart(2, '0');
            const strMonth = String(m).padStart(2, '0');
            onChange(`${y}-${strMonth}-${strDay}`);
        } else {
            if (value) onChange('');
        }
    };

    const months = [
        { val: 1, label: 'January' }, { val: 2, label: 'February' }, { val: 3, label: 'March' },
        { val: 4, label: 'April' }, { val: 5, label: 'May' }, { val: 6, label: 'June' },
        { val: 7, label: 'July' }, { val: 8, label: 'August' }, { val: 9, label: 'September' },
        { val: 10, label: 'October' }, { val: 11, label: 'November' }, { val: 12, label: 'December' }
    ];

    const years = [];
    for (let y = endYear; y >= startYear; y--) {
        years.push(y);
    }

    const days = [];
    const maxDays = (month && year) ? new Date(year, month, 0).getDate() : 31;
    for (let i = 1; i <= maxDays; i++) {
        days.push(i);
    }

    return (
        <div className="w-full">
            {label && <label className="text-sm font-semibold text-slate-600 block mb-2">{label} {required && '*'}</label>}
            <div className="flex space-x-2">
                <select
                    value={day}
                    onChange={(e) => handleChange('day', e.target.value)}
                    disabled={disabled}
                    className="w-1/4 block px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <option value="">DD</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                    value={month}
                    onChange={(e) => handleChange('month', e.target.value)}
                    disabled={disabled}
                    className="w-1/2 block px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <option value="">Month</option>
                    {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
                <select
                    value={year}
                    onChange={(e) => handleChange('year', e.target.value)}
                    disabled={disabled}
                    className="w-1/3 block px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <option value="">YYYY</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
    );
};

export default DateSelector;
