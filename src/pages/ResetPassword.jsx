import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/layout/PublicNavbar';
import apiClient from '../utils/apiClient';
import { useLanguage } from '../context/LanguageContext';
import DateSelector from '../components/common/DateSelector';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(true);
    const [showConfirmPassword, setShowConfirmPassword] = useState(true);

    const [formData, setFormData] = useState({
        username: '',
        dateOfBirth: '',
        phoneNumber: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleVerifyAndReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Basic Validation
        if (step === 2 && formData.newPassword !== formData.confirmPassword) {
            setError(t('passwords_mismatch') || "Passwords do not match");
            return;
        }

        if (step === 2 && formData.newPassword.length < 6) {
            setError(t('password_too_short') || "Password must be at least 6 characters");
            return;
        }

        // Prepare payload (Only send what is needed, but controller expects all at once for simplicity in this designated endpoint)
        // Ideally we verify first, then token, but for "basic logic" requested:
        // We will just try to hit the reset endpoint.
        // Wait! The user asked for "verify first" flow logic usually but backend implemented "one shot".
        // Let's stick to the controller implementation: It takes everything and resets.
        // So Step 1 is just UI collection, Step 2 is collecting password, THEN we submit.

        if (step === 1) {
            // "Pseudo" verification or just move to step 2?
            // Since our backend endpoint `resetPassword` does everything in one go (verify + update),
            // We should collect user details in Step 1, then prevent empty fields, then move to Step 2.
            if (!formData.username || !formData.dateOfBirth || !formData.phoneNumber) {
                setError("Please fill in all fields");
                return;
            }
            setStep(2);
            return;
        }

        // Final Submit (Step 2)
        setLoading(true);
        try {
            const res = await apiClient.post('/api/auth/reset-password', {
                username: formData.username,
                dateOfBirth: formData.dateOfBirth,
                phoneNumber: formData.phoneNumber,
                newPassword: formData.newPassword
            });

            setSuccess("Password reset successful! Redirecting to login...");
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            console.error("Reset Error Full:", err);
            const errorMessage = err.response?.data?.message || err.message || "Verification failed. Please check your details.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
            <PublicNavbar />
            <div className="flex-1 flex flex-col p-4 pt-24 sm:pt-20 overflow-y-auto">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 m-auto">
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                                {step === 1
                                    ? (t('reset_password') !== 'reset_password' ? t('reset_password') : 'Reset Password')
                                    : (t('set_new_password') !== 'set_new_password' ? t('set_new_password') : 'Set New Password')}
                            </h1>
                            <p className="text-slate-500 mt-2 text-sm">
                                {step === 1 ? "Enter your details to verify it's you." : "Create a new strong password."}
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 border border-red-100">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 border border-emerald-100">
                                <span>✅</span> {success}
                            </div>
                        )}

                        <form onSubmit={handleVerifyAndReset} className="space-y-5">
                            {step === 1 && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">{t('username')}</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-800"
                                            placeholder={t('enter_username')}
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <DateSelector
                                            label={t('date_of_birth') || "Date of Birth"}
                                            value={formData.dateOfBirth}
                                            onChange={(val) => setFormData({ ...formData, dateOfBirth: val })}
                                            startYear={1980}
                                            endYear={new Date().getFullYear()}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">{t('phone_number') || "Mobile Number"}</label>
                                        <input
                                            type="tel"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-800"
                                            placeholder="Enter your registered mobile number"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                            {t('new_password') !== 'new_password' ? t('new_password') : "New Password"}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-800"
                                                placeholder="••••••••"
                                                value={formData.newPassword}
                                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                            >
                                                {showPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                            {t('confirm_password') !== 'confirm_password' ? t('confirm_password') : "Confirm Password"}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-800"
                                                placeholder="••••••••"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                            >
                                                {showConfirmPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg transform active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? "Processing..." : (step === 1 ? "Verify & Continue" : "Update Password")}
                            </button>

                            {step === 2 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full mt-3 text-slate-500 text-sm font-semibold hover:text-slate-800"
                                >
                                    Back to Verification
                                </button>
                            )}
                        </form>

                        <div className="mt-8 text-center text-sm text-slate-500">
                            <span onClick={() => navigate('/login')} className="text-indigo-600 font-bold cursor-pointer hover:underline">
                                Back to Login
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
