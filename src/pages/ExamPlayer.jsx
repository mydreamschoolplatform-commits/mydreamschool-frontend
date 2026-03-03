import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../utils/apiClient';
import { useLanguage } from '../context/LanguageContext';
import TranslationTooltip from '../components/dashboard/TranslationTooltip';
import SecureVideoPlayer from '../components/common/SecureVideoPlayer';

const ExamPlayer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();

    // Get return path and data from state
    const returnPath = location.state?.returnPath || '/dashboard';
    const subjectData = location.state?.subjectData;

    // ── Navigation helper ────────────────────────────────────────────────────
    // Always use REPLACE so review/exam pages do not stack in browser history.
    // Without replace, Android back from Exam2 review goes to Exam1 review
    // (because 3 pushes exist: SubjectDetails → Review1 → SubjectDetails → Review2).
    // With replace, the review page slot is REUSED for SubjectDetails entry so
    // Android back always arrives at the real previous page (e.g. subject list).
    const goBackToSubject = () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        navigate(returnPath, { state: subjectData, replace: true });
    };

    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isExamStarted, setIsExamStarted] = useState(false); // Blocks exam start until instructions acknowledged

    // Exam State
    const [examStage, setExamStage] = useState('questions'); // 'video' | 'questions'
    const [mobileTab, setMobileTab] = useState('question'); // 'reference' | 'question' — default to 'question' so plain MCQ shows content immediately
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: selectedOption }
    const [visited, setVisited] = useState(new Set([0])); // Track visited question indices
    const [marked, setMarked] = useState(new Set()); // Track marked for review indices
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null); // Timer state in seconds
    const examPlayerRef = useRef(null);

    // Orientation & Mobile Logic
    const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);
    const [isMobileLandscape, setIsMobileLandscape] = useState(window.matchMedia("(orientation: landscape) and (max-height: 600px)").matches);

    useEffect(() => {
        const checkLandscape = () => {
            setIsMobileLandscape(window.matchMedia("(orientation: landscape) and (max-height: 600px)").matches);
        };
        window.addEventListener('resize', checkLandscape);
        return () => window.removeEventListener('resize', checkLandscape);
    }, []);

    const [swipeDirection, setSwipeDirection] = useState(null);

    // --- Highlight & Assist State ---
    const [highlightMode, setHighlightMode] = useState(false);
    const [assistBubble, setAssistBubble] = useState(null); // { x, y, text, translation? }
    const [loadingAssist, setLoadingAssist] = useState(false);
    const [voices, setVoices] = useState([]);

    // Dictionary Tooltip State
    const [tooltipState, setTooltipState] = useState({ visible: false, term: '', x: 0, y: 0 });
    const [showInstructions, setShowInstructions] = useState(false); // Instructions Modal

    // Long-press refs (using refs instead of window globals to prevent memory leaks)
    const longPressTimerRef = useRef(null);
    const isLongPressRef = useRef(false);
    const touchStartXRef = useRef(0);
    const touchStartYRef = useRef(0);

    // Load Voices
    // Load Voices
    useEffect(() => {
        const loadVoices = () => {
            const vs = window.speechSynthesis.getVoices();
            console.log("[ExamPlayer] Loaded Voices:", vs.length, vs.map(v => `${v.name} (${v.lang})`));

            if (vs.length > 0) {
                setVoices(vs);

                // Diagnostic Check
                const hasIndianEnglish = vs.some(v => v.lang === 'en-IN' || v.name.includes('India'));
                const hasTelugu = vs.some(v => v.lang === 'te-IN' || v.name.includes('Telugu'));

                if (!hasIndianEnglish || !hasTelugu) {
                    console.warn("[ExamPlayer] Missing Voices detected!", { hasIndianEnglish, hasTelugu });
                    // Typically we might show a UI toast here, but for now console is precise for dev.
                }
            }
        };
        // specific fix for chrome loading voices async
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    const getBestVoice = (lang, keywords = []) => {
        if (!voices.length) {
            console.warn("[ExamPlayer] No voices loaded yet.");
            return null;
        }

        const normalize = (l) => l.replace('_', '-').toLowerCase();
        const target = normalize(lang);

        // Priority 1: Match lang + keyword (e.g. 'hi-IN' + 'Google')
        let match = voices.find(v => normalize(v.lang) === target && keywords.some(k => v.name.includes(k)));

        // Priority 2: Match lang only
        if (!match) match = voices.find(v => normalize(v.lang) === target);

        // Priority 3: Loose match for language prefix (e.g. 'te' matches 'te-IN')
        if (!match) match = voices.find(v => normalize(v.lang).startsWith(target.split('-')[0]));

        // Priority 4: Relaxed lang match for English
        if (!match && lang.startsWith('en')) {
            // 4a. Aggressive Search for "India" or "Indian" in ANY English voice name
            // (Addresses "Microsoft Heera" often being tagged generically)
            match = voices.find(v => v.lang.startsWith('en') && (v.name.includes('India') || v.name.includes('Indian') || v.name.includes('Heera')));

            // 4b. Fallback chain: en-GB -> en-US -> First English
            if (!match) {
                match = voices.find(v => v.lang === 'en-GB') ||
                    voices.find(v => v.lang === 'en-US') ||
                    voices.find(v => v.lang.startsWith('en'));
            }
        }

        // Debug
        console.log(`[ExamPlayer] Selecting Voice for ${lang}:`, match ? `${match.name} (${match.lang})` : "None found (Using Default)");
        return match;
    };

    // Handle Text Selection (Universal - Mobile & Desktop)
    const handleSelection = useCallback(() => {
        if (submitted) return;
        // Only run Highlighter logic if Highlight Mode is ON
        if (!highlightMode) return;

        // Clear existing timeout to debounce
        if (window.selectionTimeout) clearTimeout(window.selectionTimeout);

        window.selectionTimeout = setTimeout(() => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0) {
                try {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();

                    // Smart Positioning (Boundary Check)
                    const screenW = window.innerWidth;
                    const screenH = window.innerHeight;
                    const bubbleW = 300;
                    const bubbleH = 200;

                    let x = rect.left + (rect.width / 2);
                    let y = rect.top;

                    // Ensure within bounds
                    if (x - (bubbleW / 2) < 10) x = (bubbleW / 2) + 10;
                    if (x + (bubbleW / 2) > screenW - 10) x = screenW - (bubbleW / 2) - 10;

                    // Vertical Flip check
                    if (y - bubbleH < 10) {
                        y = rect.bottom + bubbleH + 10;
                    }

                    // Show Bubble
                    setAssistBubble({
                        x: x,
                        y: y,
                        text: text,
                        translation: null
                    });
                } catch (err) {
                    // console.error("Selection Error:", err);
                }
            }
        }, 300); // 300ms debounce for mobile stability
    }, [highlightMode, submitted]);

    // Attach Selection Handler
    useEffect(() => {
        document.addEventListener('selectionchange', handleSelection);
        return () => {
            document.removeEventListener('selectionchange', handleSelection);
            if (window.selectionTimeout) clearTimeout(window.selectionTimeout);
        };
    }, [handleSelection]);

    // Cleanup long-press timer on unmount to prevent ghost triggers after navigation
    useEffect(() => {
        return () => { clearTimeout(longPressTimerRef.current); };
    }, []);

    // --- Dictionary Handlers (When Highlight Mode is OFF) ---
    // Note: dictionary works in BOTH exam and review mode (submitted guard removed intentionally)
    const handleGlobalDoubleClick = (e) => {
        if (highlightMode) return; // Only skip if highlight assist is ON (not for review/submitted)

        const selection = window.getSelection();
        const text = selection.toString().trim();

        // Simple regex to check if it's a single word (mostly letters)
        if (text && /^[a-zA-Z\s]+$/.test(text) && text.length < 30) {
            // Calculate position
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Clamp x so tooltip never overflows screen edges
            const clampedX = Math.max(80, Math.min(rect.left + rect.width / 2, window.innerWidth - 80));
            // Flip above if close to bottom of screen
            const clampedY = rect.bottom + 40 > window.innerHeight ? rect.top - 10 : rect.bottom;

            setTooltipState({
                visible: true,
                term: text,
                x: clampedX,
                y: clampedY
            });
        }
    };

    const handleTouchStart = (e) => {
        if (highlightMode) return; // Dictionary works in both exam and review mode

        const touch = e.touches[0];
        touchStartXRef.current = touch.clientX;
        touchStartYRef.current = touch.clientY;

        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;

            // Try to clear any native selection first
            if (window.getSelection) window.getSelection().removeAllRanges();

            // Get element at touch point
            let range;
            if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(touch.clientX, touch.clientY);
            } else if (document.caretPositionFromPoint) {
                const pos = document.caretPositionFromPoint(touch.clientX, touch.clientY);
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse(true);
            }

            if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                range.expand('word');
                const text = range.toString().trim();

                if (text && /^[a-zA-Z\s]+$/.test(text) && text.length < 30) {
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);

                    const rect = range.getBoundingClientRect();
                    // Clamp position so tooltip never overflows screen edges
                    const clampedX = Math.max(80, Math.min(rect.left + rect.width / 2, window.innerWidth - 80));
                    const clampedY = rect.bottom + 40 > window.innerHeight ? rect.top - 10 : rect.bottom;

                    setTooltipState({
                        visible: true,
                        term: text,
                        x: clampedX,
                        y: clampedY
                    });

                    if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(50);
                    }
                }
            }
        }, 600); // 600ms hold
    };

    const handleTouchMove = (e) => {
        if (highlightMode) return;
        const touch = e.touches[0];
        const moveX = Math.abs(touch.clientX - touchStartXRef.current);
        const moveY = Math.abs(touch.clientY - touchStartYRef.current);

        if (moveX > 10 || moveY > 10) {
            clearTimeout(longPressTimerRef.current);
        }
    };

    const handleTouchEnd = () => {
        if (highlightMode) return;
        clearTimeout(longPressTimerRef.current);
        setTimeout(() => { isLongPressRef.current = false; }, 100);
    };

    const handleContextMenu = (e) => {
        if ((!highlightMode && isLongPressRef.current) || tooltipState.visible) {
            e.preventDefault();
        }
    };


    // Fetch Assist Data
    const fetchAssist = async (text) => {
        if (!exam?.enableHighlight) return;
        setLoadingAssist(true);
        try {
            const res = await apiClient.post(`/api/exams/${id}/assist`, { selectedText: text });

            // Update bubble with translation
            setAssistBubble(prev => ({
                ...prev,
                translation: res.data.teluguTranslation
            }));

            // Auto-play if enabled
            if (res.data.teluguTranslation) {
                playSequence(text, res.data.teluguTranslation, res.data.allowEnglishAudio, res.data.allowTeluguTranslation);
            }

        } catch (err) {
            console.error("Assist Error:", err);
            alert("Failed to get assistance. Please try again.");
        } finally {
            setLoadingAssist(false);
        }
    };

    // Sequential TTS with zero-gap pre-fetch strategy
    // Telugu audio is fetched IN PARALLEL with English playback so it's
    // ready the instant English finishes — eliminating the 1-3s gap.
    const playSequence = async (englishText, teluguText, allowEng, allowTel) => {
        window.speechSynthesis.cancel();

        // --- Step 1: Pre-fetch Telugu audio immediately (don't wait for English to finish) ---
        // This runs in the background while English is speaking.
        let teluguAudioReady = null; // Will hold the decoded Blob URL when ready
        const prefetchPromise = (allowTel !== false && teluguText)
            ? apiClient.post(`/api/exams/${id}/assist/tts`, { text: teluguText, language: 'te' })
                .then(res => {
                    if (res.data?.audioBase64) {
                        // Legacy audioUrl still supported for backward compatibility
                        const binary = atob(res.data.audioBase64);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                        const blob = new Blob([bytes], { type: res.data.mimeType || 'audio/mp3' });
                        teluguAudioReady = URL.createObjectURL(blob);
                    } else if (res.data?.audioUrl) {
                        teluguAudioReady = res.data.audioUrl; // legacy fallback
                    }
                })
                .catch(err => {
                    console.warn('[ExamPlayer] Telugu audio pre-fetch failed:', err.message);
                })
            : Promise.resolve();

        // --- Step 2: Play Telugu using the pre-fetched audio ---
        const playTelugu = async () => {
            if (allowTel === false || !teluguText) return;

            // Wait for the pre-fetch to complete (it started in parallel so usually done already)
            await prefetchPromise;

            if (teluguAudioReady) {
                console.log('[ExamPlayer] Playing pre-fetched Telugu audio');
                const audio = new Audio(teluguAudioReady);
                audio.onended = () => {
                    // Clean up object URL to free memory
                    if (teluguAudioReady?.startsWith('blob:')) URL.revokeObjectURL(teluguAudioReady);
                };
                audio.play().catch(e => console.error('[ExamPlayer] Telugu audio playback error:', e));
            } else {
                // Final fallback: browser SpeechSynthesis for Telugu
                console.warn('[ExamPlayer] No pre-fetched audio; using browser Telugu voice fallback');
                const voice = getBestVoice('te-IN', ['Telugu', 'India']);
                if (voice) {
                    const u = new SpeechSynthesisUtterance(teluguText);
                    u.voice = voice;
                    u.lang = voice.lang;
                    u.rate = 0.9;
                    window.speechSynthesis.speak(u);
                }
            }
        };

        // --- Step 3: Play English, then immediately trigger Telugu on end ---
        if (allowEng !== false) {
            const u1 = new SpeechSynthesisUtterance(englishText);
            window.activeUtterance = u1; // prevent GC

            const voice = getBestVoice('en-IN', ['India', 'Google', 'Microsoft']);
            if (voice) u1.voice = voice;
            u1.lang = voice ? voice.lang : 'en-US';
            u1.rate = 0.75; // Slower rate for clearer English audio

            u1.onend = () => {
                // Telugu audio is already pre-fetched by now — minimal gap
                playTelugu();
            };
            u1.onerror = () => {
                console.error('[ExamPlayer] English TTS error, skipping to Telugu');
                playTelugu();
            };

            console.log('[ExamPlayer] Speaking English:', u1.text);
            window.speechSynthesis.speak(u1);
        } else {
            // English disabled — play Telugu immediately (it may still be fetching)
            playTelugu();
        }
    };


    useEffect(() => {
        const mediaQuery = window.matchMedia("(orientation: portrait)");
        const handleOrientationChange = (e) => setIsPortrait(e.matches);
        mediaQuery.addEventListener("change", handleOrientationChange);
        return () => mediaQuery.removeEventListener("change", handleOrientationChange);
    }, []);

    // When exam loads, set the correct starting tab:
    // Story_MCQ and Image_MCQ start on 'reference' (to show context first).
    // All other patterns start on 'question' so the student sees content immediately.
    useEffect(() => {
        if (!exam) return;
        if (['Story_MCQ', 'Image_MCQ'].includes(exam.pattern)) {
            setMobileTab('reference');
        } else {
            setMobileTab('question');
        }
    }, [exam?.pattern]);
    // Auto-save ref
    const saveTimeoutRef = useRef(null);

    const extractYouTubeId = (url) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    };

    useEffect(() => {
        const fetchExamOrResult = async () => {
            try {
                // check if we are in review mode
                if (location.state?.reviewMode) {
                    console.log("[ExamPlayer] Review Mode detected. Fetching Result ONLY.");
                    // Fetch Result directly (now includes basic exam info)
                    const resResult = await apiClient.get(`/api/exams/${id}/result`);
                    console.log("[ExamPlayer] Result Fetched:", resResult.data);

                    setResult(resResult.data);

                    // Use embedded exam info if available to avoid separate fetch
                    if (resResult.data.exam) {
                        setExam(resResult.data.exam);
                    } else {
                        // Fallback for safety if backend outdated
                        const examRes = await apiClient.get(`/api/exams/${id}`);
                        setExam(examRes.data);
                    }

                    setSubmitted(true);

                } else {
                    // Normal Exam Start/Resume
                    const res = await apiClient.get(`/api/exams/${id}`);
                    const examData = res.data;
                    console.log("[ExamPlayer] Fetched Exam Data:", examData);
                    console.log("[ExamPlayer] Flags:", {
                        enableHighlight: examData.enableHighlight,
                        enableEnglishAudio: examData.enableEnglishAudio,
                        enableTeluguTranslation: examData.enableTeluguTranslation
                    });
                    setExam(examData);

                    // Unified Session & Timer Logic (Fix for Auto-Submit on Resume)
                    const SESSION_KEY = `exam_session_${id}_${examData.version || 'v1'}`;
                    const TIMER_KEY = `exam_timer_${id}_${examData.version || 'v1'}`;

                    // If this is a "fresh" entry to the page (not a reload), clear any stale wall-clock timer
                    if (!sessionStorage.getItem(SESSION_KEY)) {
                        console.log("[ExamPlayer] New Session detected (Start or Resume). Clearing stale timer.");
                        localStorage.removeItem(TIMER_KEY);
                        sessionStorage.setItem(SESSION_KEY, 'active');
                    }

                    // Handle Saved Progress (Resume)
                    try {
                        if (examData.savedProgress) {
                            console.log("[ExamPlayer] Resuming from saved progress");
                            setIsExamStarted(true); // Auto-start if resuming

                            // Convert Array to Object map
                            const answerMap = {};
                            if (Array.isArray(examData.savedProgress.answers)) {
                                examData.savedProgress.answers.forEach(a => {
                                    answerMap[a.questionId] = a.selectedAnswer;
                                });
                            }
                            setAnswers(answerMap);

                            // Restore Index with Validation
                            let savedIndex = examData.savedProgress.currentQuestionIndex || 0;
                            if (savedIndex >= (examData.questions?.length || 0)) {
                                console.warn("Saved index out of bounds, resetting to 0");
                                savedIndex = 0;
                            }
                            setCurrentQuestionIndex(savedIndex);

                            // If started, skip video usually, or if index > 0
                            if (savedIndex > 0 || Object.keys(answerMap).length > 0) {
                                setExamStage('questions');
                            } else if (examData.pattern === 'Video_MCQ') {
                                setExamStage('video');
                            } else {
                                setExamStage('questions');
                            }
                        } else {
                            // New Attempt
                            // ALWAYS show Start Screen (Instructions) to require user confirmation
                            setIsExamStarted(false);

                            if (examData.pattern === 'Video_MCQ') {
                                setExamStage('video');
                            } else {
                                setExamStage('questions');
                            }
                        }
                    } catch (resumeErr) {
                        console.error("Error resuming progress:", resumeErr);
                        // Fallback to fresh start
                        setIsExamStarted(false);

                        if (examData.pattern === 'Video_MCQ') {
                            setExamStage('video');
                        } else {
                            setExamStage('questions');
                        }
                    }
                }

            } catch (err) {
                console.error("Error fetching exam:", err);
                // Capture specific error message from backend if available
                const msg = err.response?.data?.message || err.message || 'Unknown Error';
                setError(`Failed to load exam: ${msg}`);
            } finally {
                setLoading(false);
            }
        };
        fetchExamOrResult();
    }, [id, location.state]);

    useEffect(() => {
        // Attempt to enter full screen automatically when exam loads
        if (!loading && exam && examPlayerRef.current) {
            const tryEnterFullScreen = async () => {
                try {
                    if (!document.fullscreenElement) {
                        await examPlayerRef.current.requestFullscreen();
                        setIsFullscreen(true);
                    }
                } catch (err) {
                    console.log("Auto-fullscreen blocked, waiting for user interaction.", err);
                }
            };
            tryEnterFullScreen();
        }
    }, [loading, exam]);

    // Auto Save functionality
    const saveProgress = async () => {
        if (submitted || loading || !exam) return;

        try {
            const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
                questionId: qId,
                selectedAnswer: ans
            }));

            await apiClient.post(`/api/exams/${id}/save-progress`, {
                answers: formattedAnswers,
                currentQuestionIndex,
                timeRemaining: timeLeft // Save remaining time
            });
            console.log("[ExamPlayer] Progress auto-saved");
        } catch (err) {
            console.error("Auto-save failed:", err);
        }
    };

    // Debounced Auto-Save trigger on changes
    useEffect(() => {
        if (loading || submitted) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            saveProgress();
        }, 2000); // Save after 2 seconds of inactivity/change

        return () => clearTimeout(saveTimeoutRef.current);
    }, [answers, currentQuestionIndex]);

    const handleOptionSelect = (questionId, option) => {
        if (submitted) return;
        setAnswers(prev => {
            if (prev[questionId] === option) {
                const newAnswers = { ...prev };
                delete newAnswers[questionId];
                return newAnswers;
            }
            return { ...prev, [questionId]: option };
        });
    };

    const toggleMarkForReview = (index) => {
        setMarked(prev => {
            const newMarked = new Set(prev);
            if (newMarked.has(index)) {
                newMarked.delete(index);
            } else {
                newMarked.add(index);
            }
            return newMarked;
        });
    };

    const goToQuestion = (index) => {
        setCurrentQuestionIndex(index);
        setVisited(prev => new Set(prev).add(index));
    };

    const handleNext = () => {
        if (currentQuestionIndex < (exam?.questions?.length || 0) - 1) {
            goToQuestion(currentQuestionIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            goToQuestion(currentQuestionIndex - 1);
        }
    };

    const handlePauseAndExit = async () => {
        // Force save immediately
        await saveProgress();

        // Clear session flag so next time is treated as a fresh entry (timer resets)
        const SESSION_KEY = `exam_session_${id}_${exam?.version || 'v1'}`;
        sessionStorage.removeItem(SESSION_KEY);

        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        // Use REPLACE to prevent "Back" from returning to Exam
        navigate(returnPath, { state: subjectData, replace: true });
    };

    const handleSubmit = async (isAutoSubmit = false) => {
        if (!isAutoSubmit && !window.confirm('Are you sure you want to submit your exam?')) return;

        // Cancel any pending auto-saves immediately
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        try {
            setLoading(true);
            const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
                questionId: qId,
                selectedAnswer: ans
            }));

            const res = await apiClient.post(`/api/exams/${id}/submit`, { answers: formattedAnswers });
            setResult(res.data);
            setSubmitted(true); // This stops future saves via the useEffect check

            // Clear timer storage
            const TIMER_KEY = `exam_timer_${id}_${exam?.version || 'v1'}`;
            localStorage.removeItem(TIMER_KEY);

            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        } catch (err) {
            console.error("Submit Error:", err);
            alert("Failed to submit exam. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const getQuestionStatus = (index, questionId) => {
        if (marked.has(index)) return 'marked';
        if (answers[questionId]) return 'answered';
        if (visited.has(index)) return 'not_answered';
        return 'not_viewed';
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            examPlayerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // ── Auto-fullscreen when exam starts (portrait mobile) ─────────────────────
    // Requests fullscreen as soon as the student starts or resumes an exam.
    // Also syncs isFullscreen state with the real browser fullscreen state so
    // pressing Escape on desktop (or swiping down on Android) is tracked.
    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    useEffect(() => {
        if (!isExamStarted) return;
        // Only request fullscreen if not already in it
        if (!document.fullscreenElement && examPlayerRef.current) {
            examPlayerRef.current.requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(() => {
                    // Fullscreen denied (permissions policy, etc.) — silently ignore
                    console.warn('[ExamPlayer] Fullscreen request denied — continuing without it.');
                });
        }
    }, [isExamStarted]);

    // Timer Logic with Persistence
    useEffect(() => {
        if (!exam || loading || submitted || !exam.duration) return;

        // PAUSE TIMER for Video Stage in Video+MCQ pattern
        // The timer should only start when the student enters the "questions" stage
        if (exam.pattern === 'Video_MCQ' && examStage === 'video') {
            setTimeLeft((exam.duration || 0) * 60);
            return;
        }

        const TIMER_KEY = `exam_timer_${id}_${exam?.version || 'v1'}`;

        // Initialize Timer logic
        const initializeTimer = () => {
            const now = Math.floor(Date.now() / 1000);
            let savedStart = localStorage.getItem(TIMER_KEY);
            let remaining = 0;

            if (savedStart) {
                // Timer already running in this browser session
                const elapsed = now - parseInt(savedStart, 10);
                const totalDuration = (exam.duration || 0) * 60;
                remaining = Math.max(0, totalDuration - elapsed);
            } else {
                // New Session (Start or Resume)
                let initialTime = (exam.duration || 0) * 60;

                // If resuming, use saved remaining time if available
                if (exam.savedProgress?.timeRemaining !== undefined) {
                    initialTime = exam.savedProgress.timeRemaining;
                    console.log(`[ExamPlayer] Resuming with saved time: ${initialTime}s`);
                }

                const totalDuration = (exam.duration || 0) * 60;
                // Calculate pseudo-start time
                const simulatedElapsed = totalDuration - initialTime;
                savedStart = (now - simulatedElapsed).toString();

                localStorage.setItem(TIMER_KEY, savedStart);
                remaining = initialTime;
            }
            return { remaining, savedStart };
        };

        let isFirstSync = true;

        const syncTimer = () => {
            const now = Math.floor(Date.now() / 1000);
            let savedStart = localStorage.getItem(TIMER_KEY);

            if (!savedStart) {
                const init = initializeTimer();
                savedStart = init.savedStart;
            }

            const totalDuration = (exam.duration || 0) * 60;
            const elapsed = now - parseInt(savedStart, 10);
            const remaining = Math.max(0, totalDuration - elapsed);

            setTimeLeft(remaining);

            if (remaining <= 0) {
                if (isFirstSync) {
                    // Stale localStorage — re-initialize timer from saved progress instead of instant submit
                    console.warn('[ExamPlayer] Timer shows 0 on first sync (stale localStorage). Re-initializing from savedProgress.');
                    localStorage.removeItem(TIMER_KEY);
                    const init = initializeTimer();
                    setTimeLeft(init.remaining);
                    isFirstSync = false;
                    return;
                }
                // STOP TIMER IMMEDIATELY
                clearInterval(interval);
                // Call submit only if not already submitting
                // Note: We trust React state 'submitted' implies done.
                // But handleSubmit is async.
                handleSubmit(true);
            }
            isFirstSync = false;
        };

        // Initial sync
        syncTimer();

        // Interval
        const interval = setInterval(syncTimer, 1000);

        return () => clearInterval(interval);
    }, [exam, loading, submitted, id, examStage]);



    // Mobile Portrait Specific Logic
    // Reduced from 10000 to 500 for very light friction
    const swipeConfidenceThreshold = 500;
    const swipePower = (offset, velocity) => {
        return Math.abs(offset) * velocity;
    };

    const handleSwipe = (e, { offset, velocity }) => {
        const swipe = swipePower(offset.x, velocity.x);
        // Reduced distance threshold to 25px for easier thumb shift
        const distanceThreshold = 25;

        if (swipe < -swipeConfidenceThreshold || offset.x < -distanceThreshold) {
            // Swiped Left -> Go to Question (if on Reference)
            if (mobileTab === 'reference') setMobileTab('question');
        } else if (swipe > swipeConfidenceThreshold || offset.x > distanceThreshold) {
            // Swiped Right -> Go to Reference (if on Question)
            if (mobileTab === 'question') setMobileTab('reference');
        }
    };

    const containerRef = useRef(null);



    // Auto-scroll palette to active question
    // Auto-scroll palette to active question
    useEffect(() => {
        if (examStage === 'questions') {
            // Portrait Mode Palette
            if (isPortrait) {
                const activeBtn = document.getElementById(`q-btn-${currentQuestionIndex}`);
                if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
            // Landscape Mode Palette
            if (isMobileLandscape) {
                const activeBtnLand = document.getElementById(`q-btn-land-${currentQuestionIndex}`);
                if (activeBtnLand) activeBtnLand.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [currentQuestionIndex, isPortrait, isMobileLandscape, examStage]);

    const variants = {
        enter: (direction) => {
            return {
                x: direction > 0 ? '100%' : '-100%',
                opacity: 0
            };
        },
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => {
            return {
                zIndex: 0,
                x: direction < 0 ? '100%' : '-100%',
                opacity: 0
            };
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'answered': return 'bg-green-500 text-white border-green-600';
            case 'marked': return 'bg-purple-500 text-white border-purple-600';
            case 'not_answered': return 'bg-red-500 text-white border-red-600';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-xl font-bold text-slate-500 animate-pulse">Loading Exam...</div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="text-xl font-bold text-red-500 mb-4">{error}</div>
            <button onClick={goBackToSubject} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Return to Subject</button>
        </div>
    );

    // ── Diagnostic (visible in browser DevTools console) ─────────────────────
    console.log('[ExamPlayer] Render state:', {
        loading, submitted, error: !!error,
        examLoaded: !!exam, isExamStarted, examStage,
        isPortrait, isMobileLandscape,
        currentQuestionIndex, resultLoaded: !!result
    });

    // ── Guard: exam data missing ──────────────────────────────────────────────
    // IMPORTANT: In review mode, the backend only sends a lightweight exam object
    // with `questionsCount` but NO `questions` array. The review render at line ~939
    // uses `result.reviewData` — NOT `exam.questions`. So we must skip the questions
    // check when review result is already loaded.
    if (!exam) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="text-xl font-bold text-slate-500 mb-4">
                    {submitted ? 'Loading your results...' : 'Exam not found.'}
                </div>
                {!submitted && (
                    <button onClick={goBackToSubject} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                        Return to Subject
                    </button>
                )}
                {submitted && !result && (
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mt-4" />
                )}
            </div>
        );
    }

    // Only check questions array when NOT in review mode (review uses result.reviewData instead)
    if (!result && (!exam.questions || exam.questions.length === 0)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="text-xl font-bold text-slate-500 mb-4">No questions found in this exam.</div>
                <button onClick={goBackToSubject} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    Return to Subject
                </button>
            </div>
        );
    }

    // ── Guard: submitted but result not yet loaded (API in-flight or failed) ──
    if (submitted && !result) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <div className="text-slate-500 font-medium">Submitting your exam...</div>
                <button
                    onClick={goBackToSubject}
                    className="text-sm text-slate-400 hover:text-indigo-600 underline mt-2"
                >
                    If this takes too long, click here to return
                </button>
            </div>
        );
    }

    if (submitted && result) {
        const accuracy = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
        const reviewData = result.reviewData || [];

        // Helper to get difficulty badge
        const DifficultyBadge = ({ difficulty }) => {
            const colors = {
                green: 'bg-green-100 text-green-700 border-green-200',
                yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                red: 'bg-red-100 text-red-700 border-red-200'
            };
            return (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${colors[difficulty.color] || colors.yellow}`}>
                    <span>{difficulty.label}</span>
                    <span className="hidden group-hover/diff:inline text-[10px] opacity-75 border-l pl-2 ml-1 border-current">
                        {difficulty.text}
                    </span>
                </div>
            );
        };

        return (
            <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-8">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* SECTION A: Performance Summary */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8 border-t-8 border-indigo-600 relative">
                        {result.isFirstAttempt && (
                            <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100">
                                First Attempt
                            </div>
                        )}

                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        </div>

                        <h1 className="text-3xl font-black text-slate-800 mb-2">Exam Review & Learning Insights</h1>
                        <p className="text-slate-500 mb-8">Great job on completing the exam! Here is a breakdown of your performance.</p>

                        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                <p className="text-4xl font-black text-indigo-600">{result.score} <span className="text-xl text-slate-400">/ {result.maxScore}</span></p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
                                <p className={`text-4xl font-black ${accuracy >= 70 ? 'text-green-600' : accuracy >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {accuracy}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION C: Learning Insight (Summary) */}
                    <div className="bg-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="p-3 bg-white/10 rounded-lg shrink-0 text-2xl">💡</div>
                            <div>
                                <h2 className="text-lg font-bold mb-2 text-indigo-100">Your Learning Insight</h2>
                                <p className="text-indigo-200 leading-relaxed">
                                    {accuracy >= 80
                                        ? "Excellent work! You demonstrated strong understanding across most topics. Try verifying your answers on the few tricky questions to aim for 100% next time."
                                        : accuracy >= 50
                                            ? "Good effort! You handled the easier questions well. Focus on reviewing the 'Difficult' questions below to boost your score in the next attempt."
                                            : "Keep practicing! It seems some concepts were tricky today. Review the 'Average' and 'Difficult' questions carefully to build a stronger foundation."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION B: Question-wise Review */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                            Question Analysis
                        </h3>

                        {reviewData.map((q, idx) => (
                            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Header */}
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm">
                                            {q.number}
                                        </span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Question</span>
                                    </div>

                                    <div className="flex items-center gap-2 group/diff cursor-help">
                                        <span className="text-xs text-slate-400 font-medium mr-2 hidden md:inline">Difficuty Level:</span>
                                        <DifficultyBadge difficulty={q.difficulty} />
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6">
                                    <p className="text-lg font-medium text-slate-800 mb-6">{q.questionText}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* My Answer */}
                                        <div className={`p-4 rounded-lg border-2 ${q.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <p className="text-xs font-bold uppercase tracking-wide mb-2 opacity-70 flex items-center gap-2">
                                                {q.isCorrect ? <span className="text-green-700">✅ Your Answer (Correct)</span> : <span className="text-red-700">❌ Your Answer (Incorrect)</span>}
                                            </p>
                                            <p className={`font-bold ${q.isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                                                {q.myAnswer || <span className="italic opacity-50">No Answer</span>}
                                            </p>
                                        </div>

                                        {/* Correct Answer */}
                                        {!q.isCorrect && (
                                            <div className="p-4 rounded-lg border-2 border-indigo-100 bg-indigo-50">
                                                <p className="text-xs font-bold uppercase tracking-wide mb-2 text-indigo-600 opacity-70">
                                                    Correct Answer
                                                </p>
                                                <p className="font-bold text-indigo-900">
                                                    {q.correctAnswer}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* SECTION D: Explanation Placeholder */}
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <button className="text-sm font-bold text-slate-400 flex items-center gap-2 cursor-not-allowed hover:text-slate-500 transition-colors">
                                            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">i</span>
                                            View Explanation (Coming Soon)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer / Retake Reminder */}
                    <div className="text-center py-8 space-y-4">
                        <div className="inline-block bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg text-sm border border-yellow-100">
                            <strong>Note:</strong> You can retake this exam to improve your understanding.
                            Practice attempts do not affect your original performance score.
                        </div>

                        <div className="pt-4 flex items-center justify-center gap-4">
                            <button
                                onClick={goBackToSubject}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                            >
                                Not Now, Return
                            </button>

                            <button
                                onClick={() => {
                                    if (window.confirm("Do you want to retake this exam instantly?")) {
                                        // Force reload current route with CLEARED reviewMode state
                                        // We use navigate with replace to same path but clean state
                                        navigate(location.pathname, {
                                            state: {
                                                ...subjectData, // keep subject data for return path
                                                returnPath: returnPath,
                                                reviewMode: false // Force NEW attempt
                                            },
                                            replace: true
                                        });
                                        // Trigger reload to ensure fresh mounting/fetching
                                        window.location.reload();
                                    }
                                }}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200"
                            >
                                Retake Exam Now
                            </button>
                        </div>
                    </div>

                </div>
                {/* Inline Translation Tooltip */}
                {tooltipState.visible && (
                    <TranslationTooltip
                        term={tooltipState.term}
                        position={{ x: tooltipState.x, y: tooltipState.y }}
                        onClose={() => setTooltipState(prev => ({ ...prev, visible: false }))}
                    />
                )}
            </div>
        );
    }

    const currentQuestion = exam?.questions?.[currentQuestionIndex];

    // ------------------------------------------------------------------------
    // PORTRAIT MODE RENDER
    // ------------------------------------------------------------------------
    // MANDATORY INSTRUCTION CHECK
    if (!isExamStarted && !submitted && !loading && exam) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    <div className="bg-indigo-600 p-6 text-white text-center">
                        <h1 className="text-2xl font-bold mb-2">{exam.title}</h1>
                        <p className="opacity-90">Instructions & Guidelines</p>
                    </div>
                    <div className="p-8">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8">
                            <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2 text-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                Please read carefully before starting
                            </h3>
                            {exam.instructions ? (
                                <div className="prose prose-indigo text-slate-700 leading-relaxed text-lg">
                                    {exam.instructions}
                                </div>
                            ) : (
                                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                                    <li><strong>Ready to begin?</strong> Click the button below to start the timer.</li>
                                    <li>Total Duration: <strong>{exam.duration} Minutes</strong>.</li>
                                    <li>Please answer all questions. You can mark questions for review.</li>
                                    <li>Do not refresh or close the window during the exam.</li>
                                </ul>
                            )}
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><clock cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                <span>Total Duration: <strong>{exam.duration} Minutes</strong></span>
                            </div>

                            <button
                                onClick={() => setIsExamStarted(true)}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span>I have read the instructions. Start Exam</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                            </button>

                            <button
                                onClick={goBackToSubject}
                                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl font-bold border-2 border-slate-100 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                <span>Not Ready? Go Back</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isPortrait && examStage === 'questions' && exam) {
        return (

            <div
                ref={examPlayerRef}
                className="flex flex-col h-screen bg-white font-sans text-slate-800 overflow-hidden"
                onDoubleClick={handleGlobalDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onContextMenu={handleContextMenu}
                onClick={() => { if (tooltipState.visible) setTooltipState(prev => ({ ...prev, visible: false })); }}
            >
                {/* 1. Header */}
                <header className="shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shadow-sm">
                    <button onClick={handlePauseAndExit} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors font-bold text-xs" title="Save & Exit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        <span>Pause & Exit</span>
                    </button>

                    <div className="flex flex-col max-w-[120px]">
                        <div className="font-black text-sm text-slate-700 truncate">{exam?.title}</div>
                        {exam?.language && (
                            <span className="text-[10px] font-bold text-slate-400 capitalize">{exam.language} Medium</span>
                        )}
                    </div>

                    {/* Right side: timer + fullscreen toggle + optional highlight */}
                    <div className="flex items-center gap-2">
                        {/* Timer */}
                        <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-sm flex items-center gap-1 ${timeLeft !== null && timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse border border-red-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            <span className="tabular-nums">{formatTime(timeLeft)}</span>
                        </div>

                        {/* Fullscreen toggle — solves the cut-off footer issue on mobile */}
                        <button
                            onClick={toggleFullscreen}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"
                            title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
                        >
                            {isFullscreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                            )}
                        </button>

                        {/* Highlight Assist Toggle */}
                        {exam?.enableHighlight && (
                            <button
                                onClick={() => {
                                    setHighlightMode(!highlightMode);
                                    if (highlightMode) setAssistBubble(null);
                                }}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${highlightMode
                                    ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400 ring-offset-1'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-100'
                                    }`}
                                title="Toggle Highlight Reading Assist"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={highlightMode ? "fill-current" : ""}><path d="m9 11-6 6v3h9l3-3" /><path d="m22 2-7 20-4-9-9-4 20-7z" /></svg>
                            </button>
                        )}
                    </div>
                </header>

                {/* Assist Bubble Overlay */}
                <AnimatePresence>
                    {assistBubble && (
                        <motion.div
                            drag
                            dragMomentum={false}
                            whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`fixed z-50 shadow-2xl transition-all ${assistBubble.mode === 'mini'
                                ? 'rounded-full'
                                : 'bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl flex flex-col gap-2 max-w-sm'}`}
                            style={{
                                top: assistBubble.y,
                                left: assistBubble.x,
                                transform: 'translateX(-50%)', // Center align based on X
                                touchAction: 'none' // Essential for dragging
                            }}
                        >
                            {assistBubble.mode === 'mini' ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAssistBubble({ ...assistBubble, mode: 'expanded' });
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 animate-bounce-in ring-2 ring-white/50 shadow-lg"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                    AI Assist
                                </button>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2 mb-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{highlightMode ? "Reading Assist" : "Dictionary"}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAssistBubble(null);
                                                window.speechSynthesis.cancel();
                                            }}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        </button>
                                    </div>

                                    <p className="text-sm font-serif leading-relaxed text-slate-200 line-clamp-3 italic">
                                        "{assistBubble.text}"
                                    </p>

                                    <div className="pt-2 flex flex-col gap-2">
                                        {!assistBubble.translation ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    fetchAssist(assistBubble.text);
                                                }}
                                                disabled={loadingAssist}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                            >
                                                {loadingAssist ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                                        {highlightMode ? "Read Aloud & Translate" : "Get Telugu Meaning"}
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="bg-indigo-500/20 rounded-lg p-2 border border-indigo-500/30 mb-2">
                                                    <span className="text-[10px] font-bold text-indigo-300 block mb-1">TELUGU TRANSLATION</span>
                                                    <p className="text-sm font-medium text-indigo-50">{assistBubble.translation}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        playSequence(assistBubble.text, assistBubble.translation);
                                                    }}
                                                    className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                                    {highlightMode ? "Replay Audio" : "Listen"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2. Tabs */}
                {['Story_MCQ', 'Image_MCQ'].includes(exam?.pattern) && (
                    <div className="shrink-0 flex items-center border-b border-slate-200 bg-white relative z-10">
                        <button
                            onClick={() => setMobileTab('reference')}
                            className={`flex-1 py-3 text-sm font-bold relative transition-colors ${mobileTab === 'reference' ? 'text-indigo-600' : 'text-slate-400'}`}
                        >
                            Reference Content
                            {mobileTab === 'reference' && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                            )}
                        </button>
                        <button
                            onClick={() => setMobileTab('question')}
                            className={`flex-1 py-3 text-sm font-bold relative transition-colors ${mobileTab === 'question' ? 'text-indigo-600' : 'text-slate-400'}`}
                        >
                            Question
                            {mobileTab === 'question' && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                            )}
                        </button>
                    </div>
                )}

                {/* 3. Main Content — flex-1 fills remaining space between header and footer */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white min-h-0" ref={containerRef}>
                    <div className="flex-1 overflow-hidden relative min-h-0">
                        <motion.div
                            className="flex h-full w-[200%]"
                            animate={{ x: mobileTab === 'reference' ? '0%' : '-50%' }}
                            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 }}
                        >
                            {/* Panel 1: Reference View (Story/Image context) */}
                            <div className="w-1/2 h-full overflow-y-auto p-5">
                                {['Story_MCQ', 'Image_MCQ'].includes(exam?.pattern) ? (
                                    <div
                                        className="select-text cursor-text"
                                        onContextMenu={(e) => e.preventDefault()}
                                    >
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            {exam.pattern === 'Story_MCQ' ? '📖 Story Context' : '🖼️ Reference Image'}
                                        </h3>
                                        {exam.pattern === 'Story_MCQ' && (
                                            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-serif text-base selection:bg-indigo-300 selection:text-indigo-900">
                                                {exam.patternSourceUrl}
                                            </div>
                                        )}
                                        {exam.pattern === 'Image_MCQ' && (
                                            <img
                                                src={exam.patternSourceUrl}
                                                alt="Exam Reference"
                                                loading="lazy"
                                                className="w-full h-auto rounded-xl shadow-md"
                                            />
                                        )}
                                        <div className="mt-8 text-center text-slate-400 text-xs opacity-60">
                                            Swipe left or tap "Question" tab to answer
                                        </div>
                                    </div>
                                ) : (
                                    /* Non-reference patterns: show placeholder so slider has something */
                                    <div className="h-full flex items-center justify-center text-slate-300 text-sm">
                                        No reference content
                                    </div>
                                )}
                            </div>

                            {/* Panel 2: Question View */}
                            <div className="w-1/2 h-full overflow-y-auto p-5">
                                <div className="max-w-md mx-auto">
                                    {/* Question Header */}
                                    <div className="flex justify-between items-center mb-5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Question {currentQuestionIndex + 1}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">1 Mark</span>
                                            <button
                                                onClick={() => toggleMarkForReview(currentQuestionIndex)}
                                                className={`text-xs font-bold px-2 py-0.5 rounded border transition-colors ${marked.has(currentQuestionIndex) ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-slate-400 border-slate-200'}`}
                                            >
                                                {marked.has(currentQuestionIndex) ? 'Marked' : 'Mark'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Question Text */}
                                    <p className="text-xl font-bold text-slate-800 mb-6 leading-relaxed">
                                        {currentQuestion?.questionText}
                                    </p>

                                    {/* Options */}
                                    <div className="space-y-3 pb-4">
                                        {currentQuestion?.options?.map((opt, optIdx) => (
                                            <label
                                                key={optIdx}
                                                className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${answers[currentQuestion._id] === opt
                                                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                                                    : 'border-slate-100 bg-white shadow-sm'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[currentQuestion._id] === opt ? 'border-indigo-600' : 'border-slate-300'}`}>
                                                    {answers[currentQuestion._id] === opt && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name={currentQuestion._id}
                                                    value={opt}
                                                    checked={answers[currentQuestion._id] === opt}
                                                    onClick={() => handleOptionSelect(currentQuestion._id, opt)}
                                                    onChange={() => { }}
                                                    className="hidden"
                                                />
                                                <span className={`text-base font-medium ${answers[currentQuestion._id] === opt ? 'text-indigo-900' : 'text-slate-700'}`}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* 4. Bottom Footer Navigation — 2-row layout: palette on top, controls on bottom */}
                <div className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.06)] z-20">

                    {/* Row 1: Scrollable question number palette */}
                    <div className="overflow-x-auto no-scrollbar border-b border-slate-100">
                        <div className="flex gap-1.5 px-3 py-2 w-max">
                            {exam?.questions?.map((q, idx) => {
                                const status = getQuestionStatus(idx, q._id);
                                const isCurrent = currentQuestionIndex === idx;
                                let borderColor = 'border-slate-200';
                                let bgColor = 'bg-white';
                                let textColor = 'text-slate-500';
                                let ring = '';

                                if (status === 'answered') {
                                    borderColor = 'border-green-500';
                                    bgColor = 'bg-green-500';
                                    textColor = 'text-white';
                                } else if (status === 'marked') {
                                    borderColor = 'border-purple-500';
                                    bgColor = 'bg-purple-500';
                                    textColor = 'text-white';
                                } else if (status === 'not_answered' && idx < currentQuestionIndex) {
                                    borderColor = 'border-red-400';
                                    bgColor = 'bg-red-400';
                                    textColor = 'text-white';
                                }

                                if (isCurrent) {
                                    ring = 'ring-2 ring-indigo-500 ring-offset-1 scale-110';
                                    if (status === 'not_viewed') {
                                        borderColor = 'border-indigo-600';
                                        bgColor = 'bg-indigo-50';
                                        textColor = 'text-indigo-700';
                                    }
                                }

                                return (
                                    <button
                                        key={q._id}
                                        onClick={() => goToQuestion(idx)}
                                        id={`q-btn-${idx}`}
                                        className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all ${bgColor} ${borderColor} ${textColor} ${ring}`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 2: Prev · Submit · Next  — all always visible for consistent tap targets */}
                    <div className="flex items-center justify-between px-4 py-2 gap-3">
                        {/* Prev — disabled on first question */}
                        <button
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 active:scale-95 transition-all shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>

                        {/* Center: Submit — always available */}
                        <button
                            onClick={handleSubmit}
                            className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-md shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            <span>Submit Exam</span>
                        </button>

                        {/* Next — disabled on last question */}
                        <button
                            onClick={handleNext}
                            disabled={currentQuestionIndex === (exam?.questions?.length || 0) - 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 active:scale-95 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>


                {/* Inline Translation Tooltip */}
                {tooltipState.visible && (
                    <TranslationTooltip
                        term={tooltipState.term}
                        position={{ x: tooltipState.x, y: tooltipState.y }}
                        onClose={() => setTooltipState(prev => ({ ...prev, visible: false }))}
                    />
                )}
            </div>
        );
    }

    return (
        <div
            ref={examPlayerRef}
            className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col h-screen overflow-hidden"
            onDoubleClick={handleGlobalDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={handleContextMenu}
            onClick={() => { if (tooltipState.visible) setTooltipState(prev => ({ ...prev, visible: false })); }}
        >
            {/* Header */}
            <header className={`bg-white border-b border-slate-200 shrink-0 z-30 ${isMobileLandscape ? 'h-12' : 'h-16'}`}>
                <div className="max-w-full mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={handlePauseAndExit} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm" title="Save Progress and Exit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                            <span>Pause & Exit</span>
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-lg leading-tight truncate max-w-xs md:max-w-md">{exam?.title}</h1>
                                {exam?.language && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">
                                        {exam.language}
                                    </span>
                                )}
                                {exam?.instructions && (
                                    <button
                                        onClick={() => setShowInstructions(true)}
                                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="View Instructions"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Highlight Assist Toggle (Desktop/Landscape) */}
                        {exam?.enableHighlight && (
                            <div className="mr-2 pr-2 border-r border-slate-200">
                                <button
                                    onClick={() => {
                                        setHighlightMode(!highlightMode);
                                        // Clear selection if turning off
                                        if (highlightMode) setAssistBubble(null);
                                    }}
                                    className={`p-2 rounded-lg transition-all ${highlightMode
                                        ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400 ring-offset-1'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                        }`}
                                    title="Toggle Highlight Reading Assist"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={highlightMode ? "fill-current" : ""}><path d="m9 11-6 6v3h9l3-3" /><path d="m22 2-7 20-4-9-9-4 20-7z" /></svg>
                                </button>
                            </div>
                        )}

                        <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-2 text-sm font-bold"
                            title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                        >
                            {isFullscreen ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                                    <span className="hidden sm:inline">Exit Full Screen</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                                    <span className="hidden sm:inline">Full Screen</span>
                                </>
                            )}
                        </button>
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-bold border flex items-center gap-2 ${timeLeft !== null && timeLeft < 60 ? 'bg-red-100 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            <span className="tabular-nums text-lg">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Assist Bubble Overlay (Desktop) */}
            <AnimatePresence>
                {assistBubble && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        drag
                        dragMomentum={false}
                        dragListener={true}

                        className="fixed z-50 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl flex flex-col gap-2 max-w-sm cursor-move"
                        style={{
                            top: Math.min(window.innerHeight - 200, Math.max(20, assistBubble.y - 100)), // dynamic positioning
                            left: Math.min(window.innerWidth - 300, Math.max(20, assistBubble.x - 100))
                        }}
                        onDragStart={(e) => {
                            // Prevent interfering with text selection if any
                            e.stopPropagation();
                        }}
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2 mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest select-none">Reading Assist</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setAssistBubble(null);
                                    window.speechSynthesis.cancel();
                                }}
                                className="text-slate-400 hover:text-white"
                                onPointerDown={(e) => e.stopPropagation()} // Prevent drag on close button
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <p className="text-sm font-serif leading-relaxed text-slate-200 line-clamp-3 italic select-text cursor-text" onPointerDown={(e) => e.stopPropagation()}>
                            "{assistBubble.text}"
                        </p>

                        <div className="pt-2 flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
                            {!assistBubble.translation ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fetchAssist(assistBubble.text);
                                    }}
                                    disabled={loadingAssist}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {loadingAssist ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                            Read Aloud & Translate
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-indigo-500/20 rounded-lg p-2 border border-indigo-500/30 mb-2">
                                        <span className="text-[10px] font-bold text-indigo-300 block mb-1">TELUGU TRANSLATION</span>
                                        <p className="text-sm font-medium text-indigo-50 select-text cursor-text">{assistBubble.translation}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playSequence(assistBubble.text, assistBubble.translation);
                                        }}
                                        className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                        Replay Audio
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Instructions Modal */}
            <AnimatePresence>
                {showInstructions && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                    Exam Instructions
                                </h3>
                                <button
                                    onClick={() => setShowInstructions(false)}
                                    className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {exam?.instructions ? (
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{exam.instructions}</p>
                                ) : (
                                    <ul className="list-disc pl-5 space-y-2 text-slate-600">
                                        <li><strong>Ready to begin?</strong> Click the button below to start the timer.</li>
                                        <li>Total Duration: <strong>{exam?.duration} Minutes</strong>.</li>
                                        <li>Please answer all questions. You can mark questions for review.</li>
                                        <li>Do not refresh or close the window during the exam.</li>
                                    </ul>
                                )}
                            </div>
                            <div className="p-4 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setShowInstructions(false)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <main className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* Stage 1: Video Watch Mode */}
                {examStage === 'video' ? (
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
                        <div className="max-w-4xl w-full">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                                <span className="text-2xl">📺</span>
                                <div>
                                    <h3 className="font-bold text-blue-900">Watch the Video</h3>
                                    <p className="text-sm text-blue-700">Please watch the entire video carefully. Once you are ready, click the button below to start answering questions.</p>
                                </div>
                            </div>

                            {exam?.instructions && (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-6">
                                    <h3 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        Exam Instructions
                                    </h3>
                                    <div className="prose prose-sm prose-yellow text-yellow-800">
                                        {exam.instructions}
                                    </div>
                                </div>
                            )}

                            {exam?.patternSourceUrl && (
                                <div className="relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 aspect-video mb-8 ring-4 ring-slate-100 mx-auto group">
                                    {/* Link Blockers */}
                                    {/* <div className="absolute top-0 left-0 w-full h-16 z-20 bg-transparent"></div>
                                    <div className="absolute bottom-0 left-0 w-40 h-14 z-20 bg-transparent"></div> */}

                                    <SecureVideoPlayer
                                        url={(() => {
                                            if (!exam?.patternSourceUrl) return '';
                                            // Robust regex to extract ID from various YouTube formats
                                            const match = exam.patternSourceUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                                            const id = match ? match[1] : null;
                                            return id ? `https://www.youtube.com/watch?v=${id}` : exam.patternSourceUrl;
                                        })()}
                                        onEnded={() => {
                                            console.log("Video Finished");
                                        }}
                                    />
                                </div>
                            )}

                            <div className="flex justify-center">
                                <button
                                    onClick={() => {
                                        setExamStage('questions');
                                        setVisited(new Set([0]));
                                        // Ensure full screen when starting questions
                                        if (examPlayerRef.current && !document.fullscreenElement) {
                                            examPlayerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
                                        }
                                    }}
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                                >
                                    <span>Proceed to Questions</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Stage 2: Questions Mode (Split Layout)
                    <>
                        {/* Split Layout Container */}
                        <div className={`flex-1 flex ${isMobileLandscape ? 'flex-row' : 'flex-col md:flex-row'} h-full overflow-hidden bg-white md:border-r border-slate-200 relative`}>

                            {/* Mobile Toggle Tabs (Visible only on small screens for Split patterns) */}
                            {['Story_MCQ', 'Image_MCQ'].includes(exam?.pattern) && !isMobileLandscape && (
                                <div className="md:hidden flex border-b border-slate-200 bg-white shrink-0">
                                    <button
                                        onClick={() => setMobileTab('reference')}
                                        className={`flex-1 py-3 text-sm font-bold ${mobileTab === 'reference' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                                    >
                                        Reference Content
                                    </button>
                                    <button
                                        onClick={() => setMobileTab('question')}
                                        className={`flex-1 py-3 text-sm font-bold ${mobileTab === 'question' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                                    >
                                        Question
                                    </button>
                                </div>
                            )}

                            {/* Reference Panel (Left Side for Split) */}
                            {['Story_MCQ', 'Image_MCQ'].includes(exam?.pattern) && (
                                <div className={`${isMobileLandscape ? 'w-1/2 shrink-0' : 'flex-1 md:w-1/2'} flex flex-col border-r border-slate-200 bg-slate-50 overflow-hidden ${mobileTab === 'question' && !isMobileLandscape ? 'hidden md:flex' : 'flex'}`}>
                                    <div className={`p-3 border-b border-slate-200 bg-white shadow-sm shrink-0 ${isMobileLandscape ? 'py-2' : ''}`}>
                                        <h3 className={`font-bold text-slate-800 flex items-center gap-2 ${isMobileLandscape ? 'text-sm' : ''}`}>
                                            {exam.pattern === 'Story_MCQ' ? '📖 Story Context' : '🖼️ Reference Image'}
                                        </h3>
                                    </div>
                                    <div className={`flex-1 overflow-y-auto ${isMobileLandscape ? 'p-3' : 'p-6'}`}>
                                        {exam.pattern === 'Story_MCQ' && (
                                            <div className={`prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-serif ${isMobileLandscape ? 'text-sm' : 'text-lg'}`}>
                                                {exam.patternSourceUrl}
                                            </div>
                                        )}
                                        {exam.pattern === 'Image_MCQ' && (
                                            <div className="flex justify-center">
                                                <img
                                                    src={exam.patternSourceUrl}
                                                    alt="Exam Reference"
                                                    loading="lazy"
                                                    className="w-full h-auto rounded-lg shadow-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Question Panel (Right Side for Split, or Full Width otherwise) */}
                            <div className={`${isMobileLandscape ? 'w-1/2 shrink-0' : 'flex-1'} flex flex-col h-full overflow-hidden bg-white ${['Story_MCQ', 'Image_MCQ'].includes(exam?.pattern) && mobileTab === 'reference' && !isMobileLandscape ? 'hidden md:flex' : 'flex'}`}>
                                {/* Question Header */}
                                <div className={`px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 ${isMobileLandscape ? 'py-2 px-3' : 'px-6 py-4'}`}>
                                    <span className="font-bold text-slate-500 text-sm uppercase tracking-wider">Question {currentQuestionIndex + 1}</span>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={marked.has(currentQuestionIndex)}
                                                onChange={() => toggleMarkForReview(currentQuestionIndex)}
                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                            />
                                            <span className={`text-sm font-medium ${marked.has(currentQuestionIndex) ? 'text-purple-600' : 'text-slate-500'} ${isMobileLandscape ? 'hidden sm:inline' : ''}`}>Mark for Review</span>
                                        </label>
                                        <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">1 Mark</span>
                                    </div>
                                </div>

                                {/* Question Content */}
                                <div className={`flex-1 overflow-y-auto ${isMobileLandscape ? 'p-3' : 'p-6 md:p-8'}`}>



                                    <p className={`font-medium text-slate-800 mb-4 leading-relaxed max-w-3xl ${isMobileLandscape ? 'text-base mb-3' : 'text-xl mb-8'}`}>
                                        {currentQuestion?.questionText}
                                    </p>

                                    <div className={`space-y-4 max-w-2xl ${isMobileLandscape ? 'grid grid-cols-2 gap-3 space-y-0' : ''}`}>
                                        {currentQuestion?.options?.map((opt, optIdx) => (
                                            <label
                                                key={optIdx}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all group ${answers[currentQuestion._id] === opt
                                                    ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-sm'
                                                    : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                                                    } ${isMobileLandscape ? 'p-2 text-sm' : ''}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${answers[currentQuestion._id] === opt ? 'border-indigo-600' : 'border-slate-300 group-hover:border-indigo-300'
                                                    }`}>
                                                    {answers[currentQuestion._id] === opt && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name={currentQuestion._id}
                                                    value={opt}
                                                    checked={answers[currentQuestion._id] === opt}
                                                    onClick={() => handleOptionSelect(currentQuestion._id, opt)}
                                                    onChange={() => { }}
                                                    className="hidden"
                                                />
                                                <span className={`font-medium ${answers[currentQuestion._id] === opt ? 'text-indigo-900' : 'text-slate-700'} ${isMobileLandscape ? 'text-sm' : 'text-lg'}`}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer / Navigation */}
                                <div className={`border-t border-slate-200 bg-white flex justify-between items-center z-10 shrink-0 ${isMobileLandscape ? 'p-2' : 'p-4'}`}>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handlePrev}
                                            disabled={currentQuestionIndex === 0}
                                            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                            <span className={isMobileLandscape ? "hidden sm:inline" : ""}>Previous</span>
                                        </button>

                                    </div>

                                    {/* Mobile Landscape Palette (In Footer) */}
                                    {isMobileLandscape && (
                                        <div className="flex-1 overflow-x-auto no-scrollbar mx-2 min-w-0">
                                            <div className="flex gap-2 pl-1 pr-6"> {/* Added pr-6 to prevent overlap with Submit button */}
                                                {exam?.questions?.map((q, idx) => {
                                                    const status = getQuestionStatus(idx, q._id);
                                                    const isCurrent = currentQuestionIndex === idx;
                                                    let borderColor = 'border-slate-200';
                                                    let bgColor = 'bg-white';
                                                    let textColor = 'text-slate-600';
                                                    let ring = '';

                                                    if (status === 'answered') {
                                                        borderColor = 'border-green-500';
                                                        bgColor = 'bg-green-500';
                                                        textColor = 'text-white';
                                                    } else if (status === 'marked') {
                                                        borderColor = 'border-purple-500';
                                                        bgColor = 'bg-purple-500';
                                                        textColor = 'text-white';
                                                    } else if (status === 'not_answered' && idx < currentQuestionIndex) {
                                                        borderColor = 'border-red-500';
                                                        bgColor = 'bg-red-500';
                                                        textColor = 'text-white';
                                                    }

                                                    if (isCurrent) {
                                                        ring = 'ring-2 ring-indigo-500 ring-offset-2';
                                                        if (status === 'not_viewed') {
                                                            borderColor = 'border-indigo-600';
                                                            textColor = 'text-indigo-600';
                                                        }
                                                    }

                                                    return (
                                                        <button
                                                            key={q._id}
                                                            onClick={() => goToQuestion(idx)}
                                                            id={`q-btn-land-${idx}`}
                                                            className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all ${bgColor} ${borderColor} ${textColor} ${ring}`}
                                                        >
                                                            {idx + 1}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {currentQuestionIndex === (exam?.questions?.length || 0) - 1 ? (
                                        <button
                                            onClick={handleSubmit}
                                            className="md:hidden px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md shadow-green-200 transition-all flex items-center gap-2 shrink-0"
                                        >
                                            <span className="hidden sm:inline">Submit Exam</span>
                                            <span className="sm:hidden">Submit</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleNext}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 shrink-0"
                                        >
                                            <span className="hidden sm:inline">Next Question</span>
                                            <span className="sm:hidden">Next</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Palette / Sidebar */}
                        <div className={`w-full md:w-80 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col h-64 md:h-full shrink-0 ${isMobileLandscape ? 'hidden' : ''}`}>
                            <div className="p-4 border-b border-slate-200 bg-white shadow-sm shrink-0">
                                <h3 className="font-bold text-slate-800">Question Palette</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 content-start">
                                <div className="grid grid-cols-5 gap-2">
                                    {exam?.questions?.map((q, idx) => {
                                        const status = getQuestionStatus(idx, q._id);
                                        const colorClass = getStatusColor(status);
                                        const isCurrent = currentQuestionIndex === idx;

                                        return (
                                            <button
                                                key={q._id}
                                                onClick={() => goToQuestion(idx)}
                                                className={`w-10 h-10 rounded-lg font-bold text-sm border-2 transition-all flex items-center justify-center ${colorClass} ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 z-10 scale-110 shadow-lg' : 'hover:opacity-90'}`}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-8 space-y-3">
                                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                                        <div className="w-4 h-4 rounded bg-green-500 border border-green-600"></div> Answered
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                                        <div className="w-4 h-4 rounded bg-red-500 border border-red-600"></div> Not Answered
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                                        <div className="w-4 h-4 rounded bg-slate-100 border border-slate-300"></div> Not Viewed
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                                        <div className="w-4 h-4 rounded bg-purple-500 border border-purple-600"></div> Marked for Review
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                                <button
                                    onClick={handleSubmit}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Submit Exam
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </main>
            {/* Inline Translation Tooltip */}
            {tooltipState.visible && (
                <TranslationTooltip
                    term={tooltipState.term}
                    position={{ x: tooltipState.x, y: tooltipState.y }}
                    onClose={() => setTooltipState(prev => ({ ...prev, visible: false }))}
                />
            )}
        </div>
    );
};

export default ExamPlayer;
