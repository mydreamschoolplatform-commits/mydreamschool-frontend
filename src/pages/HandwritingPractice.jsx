import React, { useState, useRef } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';

const HandwritingPractice = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [timer, setTimer] = useState(60);

    // Cleanup Object URL on unmount or change
    React.useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Handle File Selection
    const handleFileChange = async (e) => { // Async now
        const file = e.target.files[0];
        if (file) {
            try {
                // Determine if we need to show a loading state for compression?
                // For now, let's just do it. It's usually fast (<500ms).

                // Dynamically import to avoid top-level issues if utils missing (bad practice but safe here)
                // Better: Standard Import. Let's assume standard import at top.

                // Optimizing Image...
                const { compressImage } = await import('../utils/imageOptimizer');
                const compressedFile = await compressImage(file);

                setSelectedImage(compressedFile);
                setPreviewUrl(URL.createObjectURL(compressedFile));
                setResult(null);
                setError(null);
            } catch (err) {
                console.error("Compression failed, using original", err);
                setSelectedImage(file);
                setPreviewUrl(URL.createObjectURL(file));
                setResult(null);
                setError(null);
            }
        }
        // Reset input value to allow selecting same file again if needed
        e.target.value = '';
    };

    // Submit for Analysis
    const handleSubmit = async () => {
        if (!selectedImage) return;

        setIsProcessing(true);
        setError(null);
        setTimer(60); // Reset timer

        // Start countdown
        const intervalId = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        try {
            const formData = new FormData();
            formData.append('image', selectedImage);
            formData.append('language', 'English');

            const response = await apiClient.post('/api/tasks/handwriting/submit', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            setResult(response.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            clearInterval(intervalId); // Stop timer when done
            setIsProcessing(false);
        }
    };

    const handleRetake = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200 transition-all active:scale-95"
                    aria-label="Go Back"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Daily Handwriting Practice</h1>
            </div>

            {/* 1. Upload Section */}
            {!previewUrl && (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-white space-y-4">
                    <div className="text-slate-500 text-center">
                        <p>Take a photo of your handwriting.</p>
                        <p className="font-bold text-slate-700">Daily Writing Task</p>
                        <p className="text-sm">1. Write today's date at the top: <span className="font-mono bg-yellow-100 px-1 rounded font-bold">DD-MM-YYYY</span></p>
                        <p className="text-sm">2. Write your practice sentences clearly.</p>
                        <p className="text-sm">3. Take a photo and upload!</p>
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        // capture="environment" - Removed to prevent low-memory crash on some devices
                        onChange={handleFileChange}
                        className="hidden"
                        ref={fileInputRef}
                    />

                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium shadow-lg hover:bg-indigo-700 transition"
                    >
                        Open Camera / Upload
                    </button>
                </div>
            )}

            {/* 2. Preview Section */}
            {previewUrl && !result && !isProcessing && (
                <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-200">
                        <img src={previewUrl} alt="Preview" loading="lazy" className="w-full object-contain max-h-[60vh] bg-black" />
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={handleRetake}
                            className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium"
                        >
                            Retake
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium shadow-lg"
                        >
                            Submit Analysis
                        </button>
                    </div>
                </div>
            )}

            {/* 3. Processing State */}
            {isProcessing && (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="relative flex items-center justify-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
                        <div className="absolute font-bold text-indigo-700 text-sm">{timer}s</div>
                    </div>
                    <p className="text-slate-600 font-medium animate-pulse">Analyzing your handwriting...</p>
                    <p className="text-xs text-slate-400">Please wait. This may take up to 60 seconds.</p>
                    {timer < 10 && (
                        <p className="text-xs text-orange-500 font-medium">Taking a bit longer to find the date...</p>
                    )}
                </div>
            )}

            {/* 4. Results */}
            {result && (
                <div className="space-y-6">
                    {/* Success Header */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl">✓</div>
                        <div>
                            <p className="font-bold text-green-800">{result.message}</p>
                            <p className="text-sm text-green-700">{result.analysis.feedbackMessage}</p>
                        </div>
                    </div>

                    {/* Streak Badge */}
                    {result.streak && (
                        <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-xl p-4 text-white flex justify-between items-center shadow-lg">
                            <div>
                                <p className="text-xs font-bold opacity-90">CURRENT STREAK</p>
                                <p className="text-3xl font-black">{result.streak.currentStreak} DAYS</p>
                            </div>
                            <div className="text-4xl">🔥</div>
                        </div>
                    )}

                    {/* Mistakes / Feedback */}
                    <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-3">Analysis & Corrections</h3>
                        {result.analysis.mistakes && result.analysis.mistakes.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {result.analysis.mistakes.map((m, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                                        <div className="flex-1">
                                            {/* Unified Rendering for Spelling AND Grammar */}
                                            <div className="flex flex-wrap items-center gap-2 text-base">
                                                <span className="font-bold text-red-500 line-through decoration-2 decoration-red-300 opacity-80">{m.original}</span>
                                                <span className="text-slate-400">➜</span>
                                                <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{m.correction || '?'}</span>
                                                <span className="text-slate-500 mx-1">-</span>
                                                <span className="text-indigo-700 font-medium">{m.meaning}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No specific vocabulary words identified this time.</p>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg"
                    >
                        Back to Dashboard
                    </button>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="font-bold text-red-800">Submission Failed</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <button
                        onClick={handleRetake}
                        className="w-full py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default HandwritingPractice;
