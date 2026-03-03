
import React, { useState, useEffect } from 'react';
import { Play, AlertCircle } from 'lucide-react';

const SecureVideoPlayer = ({ url, onEnded }) => {
    const [videoId, setVideoId] = useState(null);
    const [hasError, setHasError] = useState(false);
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        if (!url) {
            setHasError(true);
            return;
        }

        try {
            // Robust ID extraction
            const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (match && match[1]) {
                setVideoId(match[1]);
                setHasError(false);
            } else {
                console.error("Invalid YouTube URL:", url);
                setHasError(true);
            }
        } catch (e) {
            setHasError(true);
        }
    }, [url]);

    if (hasError || !videoId) {
        return (
            <div className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-6 text-center border-2 border-slate-800 rounded-xl">
                <AlertCircle size={48} className="mb-4 text-red-400" />
                <h3 className="text-white font-bold text-lg">Video Unavailable</h3>
                <p className="text-sm opacity-75">The video URL could not be loaded.</p>
                <div className="mt-4 p-2 bg-black/50 rounded text-xs font-mono break-all text-slate-500">
                    {url || "No URL Provided"}
                </div>
            </div>
        );
    }

    // Embed URL with parameters for security and minimalism
    // origin: vital for security
    // rel=0: limit related videos
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&playsinline=1&origin=${window.location.origin}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    return (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10 group">

            {/* 1. START SCREEN (Click to Load Iframe) */}
            {/* We do this to prevent heavy iframe loading until needed */}
            {!isStarted ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-60 blur-sm transform scale-105 transition-transform duration-700 hover:scale-100"
                        style={{ backgroundImage: `url(${thumbnailUrl})` }}
                    />
                    <div className="absolute inset-0 bg-black/20" /> {/* Dimmer */}

                    <button
                        onClick={() => setIsStarted(true)}
                        className="relative z-30 group"
                    >
                        <div className="relative flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/30 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-500">
                            <Play size={32} fill="currentColor" className="text-white ml-2" />
                        </div>
                        <div className="mt-4 text-center">
                            <span className="block text-white font-bold text-lg drop-shadow-md">Start Exam Video</span>
                            <span className="text-white/80 text-xs font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm mt-2 inline-block">
                                Click to Play
                            </span>
                        </div>
                    </button>
                </div>
            ) : (
                /* 2. THE IFRAME (Direct Embed with Security Sandbox) */
                <>
                    <iframe
                        title="Exam Video"
                        src={embedUrl}
                        className="w-full h-full absolute inset-0 border-0 z-10"
                        /* 
                           SANDBOX SECURITY:
                           - allow-scripts: Required for playback
                           - allow-same-origin: Required for YouTube cookies/loading
                           - allow-presentation: Required for Fullscreen
                           - OMITTING: allow-popups, allow-top-navigation (Blocks Redirects)
                        */
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />

                    {/* 3. HOLLOW SHIELDS (Click Interceptors) */}
                    {/* Top Bar Shield: Blocks Title, Share, Watch Later */}
                    <div className="absolute top-0 left-0 right-0 h-16 bg-transparent z-20" />

                    {/* Bottom Right Shield: Blocks YouTube Logo */}
                    {/* We leave the main control bar (bottom) accessible, just covering the logo corner */}
                    <div className="absolute bottom-0 right-0 w-24 h-12 bg-transparent z-20" />
                </>
            )}
        </div>
    );
};

export default SecureVideoPlayer;
