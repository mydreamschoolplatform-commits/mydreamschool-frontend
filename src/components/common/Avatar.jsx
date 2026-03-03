import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';

/**
 * Smart Avatar Component (Student Frontend)
 */
const Avatar = ({
    src,
    name = 'User',
    size = 'md',
    className = '',
    alt,
    onClick
}) => {
    const [error, setError] = useState(false);
    const [imgSrc, setImgSrc] = useState(null);

    // Size mapping
    const sizeClasses = {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-16 w-16 text-lg',
        xl: 'h-24 w-24 text-2xl',
        '2xl': 'h-32 w-32 text-4xl'
    };

    const normalizeSrc = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:')) return url;

        const baseURL = apiClient.defaults.baseURL || '';
        // Strip leading slash if base ends with one (unlikely with axios defaults, but safe)
        // Actually typical axios baseURL might include /api, so we need the ROOT for images?
        // Usually apiClient.defaults.baseURL is http://localhost:5000/api
        // Images are at http://localhost:5000/uploads
        // So we need to strip '/api' if present? Or use a separate IMAGE_BASE.

        // Let's rely on relative pathing if it starts with /uploads.
        // If baseURL is http://localhost:5000/api, and we want http://localhost:5000/uploads...

        let root = baseURL;
        if (root.endsWith('/api')) {
            root = root.slice(0, -4);
        }

        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        return `${root}${cleanPath}`;
    };

    useEffect(() => {
        setError(false);
        setImgSrc(normalizeSrc(src));
    }, [src]);

    const getColorFromName = (nameStr) => {
        const colors = [
            'bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-amber-100 text-amber-600',
            'bg-green-100 text-green-600', 'bg-emerald-100 text-emerald-600', 'bg-teal-100 text-teal-600',
            'bg-cyan-100 text-cyan-600', 'bg-sky-100 text-sky-600', 'bg-blue-100 text-blue-600',
            'bg-indigo-100 text-indigo-600', 'bg-violet-100 text-violet-600', 'bg-purple-100 text-purple-600',
            'bg-fuchsia-100 text-fuchsia-600', 'bg-pink-100 text-pink-600', 'bg-rose-100 text-rose-600'
        ];
        let hash = 0;
        const str = (nameStr && typeof nameStr === 'string') ? nameStr : 'User';
        for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
        return colors[Math.abs(hash) % colors.length];
    };

    const initials = (name && typeof name === 'string') ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
    const colorClass = getColorFromName(name);
    const sizeClass = sizeClasses[size] || sizeClasses.md;

    if (!imgSrc || error) {
        return (
            <div
                onClick={onClick}
                className={`
                    ${sizeClass} 
                    ${colorClass} 
                    rounded-full flex items-center justify-center font-bold font-sans select-none
                    ${className}
                `}
                title={name}
            >
                {initials}
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            alt={alt || name}
            onClick={onClick}
            loading="lazy"
            className={`
                ${sizeClass} 
                rounded-full object-cover 
                ${className}
            `}
            onError={() => setError(true)}
        />
    );
};

export default Avatar;
