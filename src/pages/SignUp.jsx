import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import PublicNavbar from '../components/layout/PublicNavbar';
import DateSelector from '../components/common/DateSelector';
import { API_BASE_URL } from '../api/config';

const InputField = ({ labelKey, name, type = "text", placeholderKey, required = true, isTextArea = false, t, formData, errors, handleChange, handleBlur, reviewMode }) => (
    <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            {t(labelKey)} {required && <span className="text-red-500">*</span>}
        </label>
        {!reviewMode ? (
            <>
                {isTextArea ? (
                    <textarea
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={t(placeholderKey)}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 transition-all outline-none text-slate-800 uppercase ${errors[name] ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'}`}
                        rows="3"
                    />
                ) : (
                    <input
                        type={type}
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={t(placeholderKey)}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 transition-all outline-none text-slate-800 uppercase ${errors[name] ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'}`}
                    />
                )}
                {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
            </>
        ) : (
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-800 font-medium">
                {type === 'password' ? '********' : formData[name] || '-'}
            </div>
        )}
    </div>
);

const SelectField = ({ labelKey, name, options, placeholderKey, t, formData, errors, handleChange, handleBlur, reviewMode }) => (
    <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            {t(labelKey)} <span className="text-red-500">*</span>
        </label>
        {!reviewMode ? (
            <>
                <select
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 transition-all outline-none text-slate-800 bg-white ${errors[name] ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'}`}
                >
                    <option value="">{t(placeholderKey)}</option>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey) || opt.label}</option>
                    ))}
                </select>
                {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
            </>
        ) : (
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-800 font-medium field-value">
                {options.find(opt => opt.value === formData[name])?.label || formData[name] || t(options.find(opt => opt.value === formData[name])?.labelKey) || '-'}
            </div>
        )}
    </div>
);

const SignUp = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        fullName: '', username: '', password: '', confirmPassword: '',
        gender: '', dateOfBirth: '',
        class: '', medium: '', schoolName: '',
        fatherName: '', motherName: '', phoneNumber: '',
        village: '', mandal: '', district: '',
        favouriteSubject: '', lifeAmbition: '', favouriteSport: '',
        consentAcknowledged: false,
        profileImage: ''
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        let finalValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({
            ...prev,
            [name]: finalValue
        }));

        // Clear error on change
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (typeof value === 'string') {
            const upperCaseFields = [
                'fullName', 'schoolName', 'medium',
                'fatherName', 'motherName',
                'village', 'mandal', 'district',
                'lifeAmbition', 'favouriteSport'
            ];

            let cleanValue = value.trim();
            if (upperCaseFields.includes(name)) {
                cleanValue = cleanValue.toUpperCase();
            }

            setFormData(prev => ({
                ...prev,
                [name]: cleanValue
            }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profileImage: reader.result, profileImageFile: file }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const requiredFields = [
            'fullName', 'gender', 'dateOfBirth',
            'schoolName', 'class', 'medium', 'favouriteSubject',
            'fatherName', 'motherName', 'phoneNumber',
            'village', 'mandal', 'district',
            'username', 'password', 'confirmPassword'
        ];

        requiredFields.forEach(field => {
            if (!formData[field]) {
                newErrors[field] = t('error_required');
            }
        });

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.consentAcknowledged) {
            newErrors.consentAcknowledged = t('error_required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAction = async (e) => {
        e.preventDefault();

        if (!reviewMode) {
            // Step 1: Validate and go to Review
            if (validateForm()) {
                setReviewMode(true);
                window.scrollTo(0, 0);
            }
        } else {
            // Step 2: Submit
            setLoading(true);
            try {
                const payload = new FormData();
                Object.keys(formData).forEach(key => {
                    if (key !== 'profileImage' && key !== 'profileImageFile' && formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                        payload.append(key, formData[key]);
                    }
                });

                if (formData.profileImageFile) {
                    payload.append('profileImage', formData.profileImageFile);
                }

                const REGISTER_URL = `${API_BASE_URL}/auth/register`;
                let data = {};
                try {
                    // Use absolute URL from env config so this works in both
                    // local development (localhost:5000) and production (Render)
                    const response = await fetch(REGISTER_URL, {
                        method: 'POST',
                        body: payload,
                    });

                    const responseText = await response.text();
                    try {
                        data = JSON.parse(responseText);
                    } catch (_) {
                        throw new Error(`Server error (${response.status}). Please try again.`);
                    }

                    if (!response.ok) {
                        throw new Error(data.message || 'Registration failed');
                    }
                } catch (fetchErr) {
                    throw fetchErr;
                }

                // Success
                navigate('/login');
            } catch (err) {
                setErrors(prev => ({ ...prev, formBy: err.message }));
            } finally {
                setLoading(false);
            }
        }
    };

    const subjects = [
        { value: 'MATHS', labelKey: 'subject_maths' },
        { value: 'SCIENCE', labelKey: 'subject_science' },
        { value: 'SOCIAL', labelKey: 'subject_social' },
        { value: 'ENGLISH', labelKey: 'subject_english' },
        { value: 'TELUGU', labelKey: 'subject_telugu' },
        { value: 'HINDI', labelKey: 'subject_hindi' },
        { value: 'BIOLOGY', labelKey: 'subject_biology' },
        { value: 'PHYSICS', labelKey: 'subject_physics' },
        { value: 'CHEMISTRY', labelKey: 'subject_chemistry' },
    ];

    const commonProps = { t, formData, errors, handleChange, handleBlur, reviewMode };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            <div className="flex-1 py-10 px-4 pt-24 flex justify-center">
                <div className="max-w-4xl w-full bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
                    <div className={`p-6 text-center ${reviewMode ? 'bg-green-600' : 'bg-blue-600'}`}>
                        <h1 className="text-2xl font-bold text-white tracking-tight uppercase">
                            {reviewMode ? t('review_details') : t('signup_title')}
                        </h1>
                    </div>

                    <div className="p-8">
                        {errors.formBy && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 border border-red-100">
                                <span>⚠️</span> {errors.formBy}
                            </div>
                        )}

                        <form onSubmit={handleAction}>
                            {/* 1. Personal Details */}
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 uppercase text-blue-600">1. Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField labelKey="full_name" name="fullName" placeholderKey="enter_full_name" {...commonProps} />
                                <SelectField
                                    labelKey="gender"
                                    name="gender"
                                    placeholderKey="select_gender"
                                    options={[
                                        { value: 'Boy', labelKey: 'boy' },
                                        { value: 'Girl', labelKey: 'girl' },
                                        { value: 'Other', labelKey: 'other' }
                                    ]}
                                    {...commonProps}
                                />
                                {/* Date of Birth */}
                                <div className="mb-4">
                                    {!reviewMode ? (
                                        <DateSelector
                                            label={t('date_of_birth')}
                                            value={formData.dateOfBirth}
                                            onChange={(val) => handleChange({ target: { name: 'dateOfBirth', value: val } })}
                                            startYear={1990}
                                            endYear={new Date().getFullYear()}
                                            required
                                        />
                                    ) : (
                                        <>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                                                {t('date_of_birth')}
                                            </label>
                                            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-800 font-medium">
                                                {formData.dateOfBirth}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Profile Image */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                                        {t('profile_image')}
                                    </label>
                                    {!reviewMode ? (
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    ) : (
                                        <div className="mt-2">
                                            {formData.profileImage ? (
                                                <img src={formData.profileImage} alt="Preview" loading="lazy" className="h-20 w-20 object-cover rounded-full border shadow-sm" />
                                            ) : (
                                                <span className="text-slate-400 italic">No image uploaded</span>
                                            )}
                                        </div>
                                    )}
                                    {!reviewMode && formData.profileImage && (
                                        <img src={formData.profileImage} alt="Preview" loading="lazy" className="mt-2 h-20 w-20 object-cover rounded-full border" />
                                    )}
                                </div>
                            </div>

                            {/* 2. Academic Details */}
                            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-4 border-b pb-2 uppercase text-blue-600">2. Academic Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField labelKey="school_name" name="schoolName" placeholderKey="enter_school_name" {...commonProps} />
                                <SelectField
                                    labelKey="class"
                                    name="class"
                                    placeholderKey="select_class"
                                    options={['6', '7', '8', '9', '10'].map(c => ({ value: c, label: c }))}
                                    {...commonProps}
                                />
                                <SelectField
                                    labelKey="medium"
                                    name="medium"
                                    placeholderKey="select_medium"
                                    options={['English', 'Telugu'].map(m => ({ value: m, label: m }))}
                                    {...commonProps}
                                />
                                <SelectField
                                    labelKey="favourite_subject"
                                    name="favouriteSubject"
                                    placeholderKey="select_subject"
                                    options={subjects}
                                    {...commonProps}
                                />
                            </div>

                            {/* 3. Family & Contact */}
                            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-4 border-b pb-2 uppercase text-blue-600">3. Family & Contact</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField labelKey="father_name" name="fatherName" placeholderKey="enter_father_name" {...commonProps} />
                                <InputField labelKey="mother_name" name="motherName" placeholderKey="enter_mother_name" {...commonProps} />
                                <InputField labelKey="mobile_number" name="phoneNumber" type="tel" placeholderKey="enter_mobile_number" {...commonProps} />
                            </div>

                            {/* 4. Address */}
                            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-4 border-b pb-2 uppercase text-blue-600">4. Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField labelKey="village" name="village" placeholderKey="enter_village" {...commonProps} />
                                <InputField labelKey="mandal" name="mandal" placeholderKey="enter_mandal" {...commonProps} />
                                <InputField labelKey="district" name="district" placeholderKey="enter_district" {...commonProps} />
                            </div>

                            {/* 5. Extra (Optional) */}
                            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-4 border-b pb-2 uppercase text-blue-600">5. Additional Info (Optional)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField labelKey="life_ambition" name="lifeAmbition" placeholderKey="enter_life_ambition" required={false} {...commonProps} />
                                <InputField labelKey="favourite_sport" name="favouriteSport" placeholderKey="enter_favourite_sport" required={false} {...commonProps} />
                            </div>

                            {/* 6. Account Credentials */}
                            {!reviewMode && (
                                <>
                                    <h3 className="text-lg font-bold text-slate-800 mt-6 mb-4 border-b pb-2 uppercase text-blue-600">6. Account Setup</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputField labelKey="username" name="username" placeholderKey="enter_username" {...commonProps} />
                                        <InputField labelKey="password" name="password" type="password" placeholderKey="enter_password" {...commonProps} />
                                        <InputField labelKey="confirm_password" name="confirmPassword" type="password" placeholderKey="enter_confirm_password" {...commonProps} />
                                    </div>
                                </>
                            )}

                            {/* 7. Consent */}
                            <div className="mt-6 flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    name="consentAcknowledged"
                                    checked={formData.consentAcknowledged}
                                    onChange={handleChange}
                                    disabled={reviewMode}
                                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <p className="text-sm text-slate-600">
                                    {t('consent_text')}
                                    {errors.consentAcknowledged && <span className="text-red-500 block text-xs font-bold">{errors.consentAcknowledged}</span>}
                                </p>
                            </div>

                            {/* Submit Button */}
                            <div className="mt-8 flex gap-4">
                                {reviewMode && (
                                    <button
                                        type="button"
                                        onClick={() => setReviewMode(false)}
                                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-4 rounded-lg transition-all shadow-md transform active:scale-[0.99] uppercase tracking-wider"
                                    >
                                        {t('edit_details')}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 ${reviewMode ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-4 rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-[0.99] uppercase tracking-wider ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? 'Processing...' : (reviewMode ? t('confirm_register') : t('review_details'))}
                                </button>
                            </div>

                            {!reviewMode && (
                                <div className="mt-6 text-center">
                                    <span className="text-slate-500">Already have an account? </span>
                                    <Link to="/login" className="text-blue-600 hover:text-blue-800 font-semibold">
                                        {t('login_link')}
                                    </Link>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
