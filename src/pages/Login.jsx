import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/layout/PublicNavbar';
import { useLanguage } from '../context/LanguageContext';
import ErrorBoundary from '../components/ErrorBoundary';

import WallOfFame from '../components/WallOfFame';

const Login = () => {
    const { login, user, loading: authLoading } = useAuth(); // Renamed to authLoading to avoid conflict
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Form loading state

    // Auto-redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Call login from context
        const res = await login(formData.username, formData.password);

        if (res.success) {
            // REPLACE history to prevent "Back" from returning to login
            navigate('/dashboard', { replace: true });
        } else {
            if (res.status === 404) {
                setError('User not found. Please check your username.');
            } else if (res.status === 401) {
                setError('Incorrect password. Please try again.');
            } else {
                // Show detailed error for debugging
                const debugMsg = res.message || 'Connection failed';
                setError(`Login failed: ${debugMsg} (Status: ${res.status || 'N/A'})`);
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
            <PublicNavbar />
            <div className="flex-1 flex flex-col p-4 pt-24 sm:pt-20 overflow-y-auto items-center justify-center">
                <div className="w-full max-w-6xl flex flex-col lg:flex-row items-start lg:items-center justify-center gap-8 lg:gap-20">

                    {/* Wall of Fame Section - Left Side */}
                    <div className="w-full max-w-md mx-auto lg:mx-0">
                        <ErrorBoundary>
                            <WallOfFame />
                        </ErrorBoundary>
                        <div className="mt-6 text-center lg:text-left hidden lg:block">
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Join the Hall of Fame! 🚀</h3>
                            <p className="text-slate-500 text-sm">
                                Compete with peers, earn XP, and showcase your achievements to the whole school.
                            </p>
                        </div>
                    </div>

                    {/* Login Form Section - Right Side */}
                    <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 mx-auto lg:mx-0">
                        <div className="p-8">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('welcome_back')}</h1>
                                <p className="text-slate-500 mt-2">{t('sign_in_text')}</p>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 border border-red-100">
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">{t('username')}</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-slate-800"
                                        placeholder={t('enter_username')}
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">{t('password')}</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="w-full pl-4 pr-12 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-slate-800"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <span
                                            onClick={() => navigate('/reset-password')}
                                            className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium hover:underline"
                                        >
                                            {t('forgot_password') || 'Forgot Password?'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? t('signing_in') : t('sign_in')}
                                </button>
                            </form>

                            <div className="mt-8 text-center text-sm text-slate-500">
                                <p>{t('no_account')} <span onClick={() => navigate('/signup')} className="text-blue-600 font-bold cursor-pointer hover:underline">{t('create_account')}</span></p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                            <p className="text-xs text-slate-400 font-medium tracking-wider">MY DREAM SCHOOL PLATFORM</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
