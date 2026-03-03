import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import BackButton from '../components/common/BackButton';
import DateSelector from '../components/common/DateSelector';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DictionaryModal from '../components/dashboard/DictionaryModal';
import Avatar from '../components/common/Avatar';

const ProfilePage = () => {
    const { user, login } = useAuth(); // login used potentially to update local user state if needed
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const isEditMode = location.pathname.includes('/edit');
    const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        fatherName: '',
        motherName: '',
        village: '',
        mandal: '',
        district: '',
        dateOfBirth: '',
        profileImage: '', // Add this
        // Read-only or restricted fields
        class: '',
        medium: '',
        schoolName: '',
        admissionNumber: ''
    });
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    // Helper removed, using Avatar component
    // const getProfileImageUrl = ...

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const res = await apiClient.get('/api/profile');
            const data = res.data;
            setFormData({
                fullName: data.fullName || '',
                phoneNumber: data.phoneNumber || '',
                fatherName: data.fatherName || '',
                motherName: data.motherName || '',
                village: data.village || '',
                mandal: data.mandal || '',
                district: data.district || '',
                dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
                profileImage: data.profileImage || '', // Capture profile image
                class: data.class || '',
                medium: data.medium || '',
                schoolName: data.schoolName || '',
                admissionNumber: data.admissionNumber || '',
                // New Fields
                favouriteSubject: data.favouriteSubject || '',
                lifeAmbition: data.lifeAmbition || '',
                favouriteSport: data.favouriteSport || ''
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to load profile data';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast.error(t('invalid_image_type') || 'Please select a valid image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('image_too_large') || 'Image size should be less than 5MB');
            return;
        }

        const uploadData = new FormData();
        uploadData.append('profileImage', file);

        try {
            setUploadingImage(true);
            const res = await apiClient.post('/api/profile/upload-image', uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Update local state with new image path
            setFormData(prev => ({ ...prev, profileImage: res.data.filePath }));

            // Also update AuthContext if user object is stored there to reflect change immediately in header
            if (login) {
                // Determine if we need to fetch full user or just patch local user
                // For now, assuming fetchProfile refreshed the data, but we can also manually update if context exposes a setter
                // Or simply reload page/trigger re-fetch of user
                // window.location.reload(); // Aggressive but ensures header updates
                // Better: login({ ...user, profileImage: res.data.filePath }); // If 'login' acts as 'setUser'
            }

            toast.success(t('profile_image_updated') || 'Profile photo updated successfully');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(error.response?.data?.message || t('profile_image_update_failed') || 'Failed to update profile photo');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await apiClient.put('/api/profile', formData);
            toast.success(t('profile_updated'));
            // Refetch to ensure sync
            await fetchProfile();
            navigate('/profile');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error.response?.data?.message || t('profile_update_failed'));
        } finally {
            setSaving(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    // ... (Loading and Error states remain same)

    // ...

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <Toaster position="top-right" />
            <DashboardHeader onOpenDictionary={() => setIsDictionaryOpen(true)} />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
                {/* Back Button */}
                <div className="mb-6">
                    <BackButton to="/dashboard" label={t('back_to_dashboard')} />
                </div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="bg-white rounded-2xl shadow-xl shadow-indigo-100 overflow-hidden border border-slate-100"
                >
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
                            <div className="relative group">
                                <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-white p-1 shadow-lg">
                                    <Avatar
                                        src={formData.profileImage}
                                        name={formData.fullName}
                                        size="xl"
                                        className="w-full h-full border-4 border-white"
                                        alt="Profile"
                                    />
                                </div>
                                {isEditMode && (
                                    <>
                                        <input
                                            type="file"
                                            id="profileImageInput"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('profileImageInput').click()}
                                            className="absolute bottom-0 right-0 bg-white text-indigo-600 p-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                                            title={t('change_photo')}
                                        >
                                            {uploadingImage ? (
                                                <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="text-center md:text-left flex-1">
                                <h1 className="text-3xl font-bold tracking-tight">{formData.fullName}</h1>
                                <p className="text-indigo-100 font-medium mt-1 flex items-center justify-center md:justify-start gap-2">
                                    <span>{formData.class}</span>
                                    <span>•</span>
                                    <span>{formData.medium} {t('medium_label')}</span>
                                </p>
                            </div>
                            {!isEditMode && (
                                <button
                                    onClick={() => navigate('/profile/edit')}
                                    className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl font-semibold transition-all flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                    {t('edit_profile')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="p-8">
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                                {/* Personal Info Group */}
                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        {t('personal_information')}
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('full_name')}</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        placeholder={t('enter_full_name')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <DateSelector
                                        label={t('date_of_birth')}
                                        value={formData.dateOfBirth}
                                        onChange={(val) => handleChange({ target: { name: 'dateOfBirth', value: val } })}
                                        disabled={!isEditMode}
                                        startYear={1990}
                                        endYear={new Date().getFullYear()}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('mobile_number')}</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        placeholder={t('enter_mobile_number')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('father_name')}</label>
                                    <input
                                        type="text"
                                        name="fatherName"
                                        value={formData.fatherName}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('mother_name')}</label>
                                    <input
                                        type="text"
                                        name="motherName"
                                        value={formData.motherName}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Interests Section */}
                                <div className="md:col-span-2 mt-4">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                        {t('interests_ambition')}
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('favourite_subject')}</label>
                                    <input
                                        type="text"
                                        name="favouriteSubject"
                                        value={formData.favouriteSubject}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('favourite_sport')}</label>
                                    <input
                                        type="text"
                                        name="favouriteSport"
                                        value={formData.favouriteSport}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('life_ambition')}</label>
                                    <input
                                        type="text"
                                        name="lifeAmbition"
                                        value={formData.lifeAmbition}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Address Group */}
                                <div className="md:col-span-2 mt-4">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                        {t('address_details')}
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('village')}</label>
                                    <input
                                        type="text"
                                        name="village"
                                        value={formData.village}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        placeholder={t('enter_village')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('mandal')}</label>
                                    <input
                                        type="text"
                                        name="mandal"
                                        value={formData.mandal}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        placeholder={t('enter_mandal')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('district')}</label>
                                    <input
                                        type="text"
                                        name="district"
                                        value={formData.district}
                                        onChange={handleChange}
                                        disabled={!isEditMode}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        placeholder={t('enter_district')}
                                    />
                                </div>

                                {/* Academic Group */}
                                <div className="md:col-span-2 mt-4">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                                        {t('academic_information')} <span className="text-xs font-normal text-slate-400 ml-2">{t('read_only')}</span>
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 block">{t('school_name')}</label>
                                    <input
                                        type="text"
                                        value={formData.schoolName}
                                        disabled
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100/50 text-slate-500 font-medium cursor-not-allowed"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 block">{t('class')}</label>
                                        <input
                                            type="text"
                                            value={formData.class}
                                            disabled
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100/50 text-slate-500 font-medium cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 block">{t('medium')}</label>
                                        <input
                                            type="text"
                                            value={formData.medium}
                                            disabled
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100/50 text-slate-500 font-medium cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Actions */}
                            {isEditMode && (
                                <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/profile')}
                                        className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-8 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                {t('saving')}
                                            </>
                                        ) : (
                                            t('save_changes')
                                        )}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </motion.div>
            </main>

            <DictionaryModal
                isOpen={isDictionaryOpen}
                onClose={() => setIsDictionaryOpen(false)}
            />
        </div>
    );
};

export default ProfilePage;
