import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    // Default to English, potentially load from localStorage
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('appLanguage') || 'en';
    });

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const toggleLanguage = () => {
        setLanguage((prev) => (prev === 'en' ? 'te' : 'en'));
    };

    // Translation Dictionary
    const translations = {
        en: {
            // Header
            "student_portal": "Student Portal",
            "dictionary": "Dictionary",
            "my_account": "My Account",
            "manage_profile": "Manage your profile & preferences",
            "my_profile": "My Profile",
            "edit_profile": "Edit Profile",
            "subscription": "Subscription",
            "active": "ACTIVE",
            "inactive": "INACTIVE",
            "logout": "Logout",
            // Dictionary Modal
            "type_word": "Type an English word...",
            "translating": "Translating...",
            "type_to_translate": "Type a word to translate instantly",
            "powered_by": "Powered by Google Translate",
            "telugu_meaning": "Telugu Meaning",
            "translation_not_found": "Translation not found.",
            // Dashboard
            "todays_focus": "Today's Focus",
            "daily_handwriting": "Daily Handwriting Practice",
            "upload_handwriting": "Upload a photo of your daily writing page.",
            "upload_now": "Upload Now",
            "scheduled_today": "SCHEDULED FOR TODAY",
            "view_all_tasks": "View all tasks",
            "my_subjects": "My Subjects",
            "progress_snapshot": "Progress Snapshot",
            "exams_conducted": "Exams Conducted",
            "average_score": "Average Score",
            "completion_rate": "Completion Rate",
            // Subjects
            "telugu": "Telugu",
            "hindi": "Hindi",
            "english": "English",
            "math": "Mathematics",
            "science": "Science",
            "social": "Social Studies",
            "biology": "General Knowledge",
            "continue_learning": "Continue Learning",
            // Sign Up Page
            "signup_title": "Student Registration",
            "full_name": "Full Name",
            "username": "Username",
            "password": "Password",
            "confirm_password": "Confirm Password",
            "gender": "Gender",
            "date_of_birth": "Date of Birth",
            "class": "Class",
            "medium": "Medium",
            "school_name": "School Name",
            "father_name": "Father's Name",
            "mother_name": "Mother's Name",
            "mobile_number": "Mobile Number",
            "village": "Village / Town",
            "mandal": "Mandal",
            "district": "District",
            "favourite_subject": "Favourite Subject",
            "life_ambition": "Life Ambition",
            "favourite_sport": "Favourite Sport",
            "consent_text": "I agree to the terms and conditions and privacy policy.",
            "register_button": "Register",
            "login_link": "Already have an account? Login",
            "profile_image": "Profile Image",
            "enter_full_name": "Enter Full Name",
            "enter_username": "Enter Username",
            "enter_password": "Enter Password",
            "enter_confirm_password": "Confirm Password",
            "enter_mobile_number": "Enter Mobile Number",
            "enter_father_name": "Enter Father's Name",
            "enter_mother_name": "Enter Mother's Name",
            "enter_village": "Enter Village",
            "enter_mandal": "Enter Mandal",
            "enter_district": "Enter District",
            "enter_school_name": "Enter School Name",
            "select_gender": "Select Gender",
            "select_class": "Select Class",
            "select_medium": "Select Medium",
            "select_subject": "Select Subject",
            "enter_life_ambition": "Enter Life Ambition",
            "enter_favourite_sport": "Enter Favourite Sport",
            "boy": "Boy",
            "girl": "Girl",
            "other": "Other",

            // Phase 2: Preview & Validation
            "review_details": "Review Details",
            "confirm_register": "Confirm & Register",
            "edit_details": "Edit Details",
            "error_required": "This field is required",
            "select_one": "Select an option",
            "subject_maths": "Mathematics",
            "subject_science": "Science",
            "subject_social": "Social Studies",
            "subject_english": "English",
            "subject_telugu": "Telugu",
            "subject_hindi": "Hindi",
            "subject_biology": "General Knowledge",
            "subject_physics": "Physics",
            "subject_chemistry": "Chemistry",

            // Login Page
            "welcome_back": "Welcome Back",
            "sign_in_text": "Sign in to your account",
            "sign_in": "Sign In",
            "signing_in": "Signing In...",
            "no_account": "Don't have an account?",
            "create_account": "Create Account",

            // Profile Page

            "back_to_dashboard": "Back to Dashboard",
            "personal_information": "Personal Information",
            "interests_ambition": "Interests & Ambition",
            "address_details": "Address Details",
            "academic_information": "Academic Information",
            "read_only": "(Read Only)",
            "cancel": "Cancel",
            "save_changes": "Save Changes",
            "saving": "Saving...",
            "profile_updated": "Profile updated successfully!",
            "profile_update_failed": "Failed to update profile",
            "change_photo": "Change Photo",

            // Announcements Widget
            "announcements": "Announcements",
            "view_all": "View All",
            "no_announcements": "No new announcements at this time.",
            "imp": "IMP",

            // Pending Tasks
            "catch_up": "Catch Up",
            "all_caught_up": "All Caught Up!",
            "no_pending_message": "You have no pending tasks. Great job staying on track!",
            "pending": "Pending",
            "view_more_tasks": "View more pending tasks",
            "show_less": "Show less",
            "total": "total",

            // Subject Details
            "tab_introduction": "Introduction",
            "tab_chapters": "Chapters",
            "tab_revision": "Revision",
            "loading_content": "Loading content...",
            "no_content_yet": "No Content Yet",
            "no_content_message": "There are no exams or lessons in this section yet.",
            "completed": "Completed",
            "in_progress": "In Progress",
            "score": "Score",
            "questions": "Questions",
            "retake": "Retake",
            "resume": "Resume",
            "start_exam": "Start Exam",
            "mins": "mins"
        },
        te: {
            // Header
            "student_portal": "విద్యార్థి పోర్టల్",
            "dictionary": "నిఘంటువు",
            "my_account": "నా ఖాతా",
            "manage_profile": "మీ ప్రొఫైల్ & ప్రాధాన్యతలను నిర్వహించండి",
            "my_profile": "నా ప్రొఫైల్",
            "edit_profile": "ప్రొఫైల్ సవరించండి",
            "subscription": "చందా",
            "active": "యాక్టివ్",
            "inactive": "క్రియారహితం",
            "logout": "లాగ్ అవుట్",
            // Dictionary Modal
            "type_word": "ఆంగ్ల పదాన్ని టైప్ చేయండి...",
            "translating": "అనువదిస్తోంది...",
            "type_to_translate": "తక్షణమే అనువదించడానికి పదాన్ని టైప్ చేయండి",
            "powered_by": "గూగుల్ ట్రాన్స్లేట్ ద్వారా ఆధారితం",
            "telugu_meaning": "తెలుగు అర్థం",
            "translation_not_found": "అనువాదం కనుగొనబడలేదు.",
            // Dashboard
            "todays_focus": "నేటి ముఖ్యాంశం",
            "daily_handwriting": "రోజువారీ చేతిరాత సాధన",
            "upload_handwriting": "మీ రోజువారీ రాత పేజీ ఫోటోను అప్‌లోడ్ చేయండి.",
            "upload_now": "ఇప్పుడు అప్‌లోడ్ చేయండి",
            "scheduled_today": "ఈ రోజు కోసం షెడ్యూల్ చేయబడింది",
            "view_all_tasks": "అన్ని విధులను చూడండి",
            "my_subjects": "నా పాఠ్యాంశాలు",
            "progress_snapshot": "పురోగతి  snapshot",
            "exams_conducted": "నిర్వహించిన పరీక్షలు",
            "average_score": "సగటు స్కోరు",
            "completion_rate": "పూర్తి రేటు",
            // Subjects
            "telugu": "తెలుగు",
            "hindi": "హిందీ",
            "english": "ఆంగ్లం",
            "math": "గణితం",
            "science": "సైన్స్",
            "social": "సాంఘిక శాస్త్రం",
            "biology": "సాధారణ జ్ఞానం",
            "continue_learning": "నేర్చుకోవడం కొనసాగించు",
            // Sign Up Page
            "signup_title": "విద్యార్థి నమోదు",
            "full_name": "పూర్తి పేరు",
            "username": "వాడుకరి పేరు",
            "password": "పాస్వర్డ్",
            "confirm_password": "పాస్వర్డ్ని నిర్ధారించండి",
            "gender": "లింగం",
            "date_of_birth": "పుట్టిన తేది",
            "class": "తరగతి",
            "medium": "మీడియం",
            "school_name": "పాఠశాల పేరు",
            "father_name": "తండ్రి పేరు",
            "mother_name": "తల్లి పేరు",
            "mobile_number": "మొబైల్ నంబర్",
            "village": "గ్రామం / పట్టణం",
            "mandal": "మండలం",
            "district": "జిల్లా",
            "favourite_subject": "ఇష్టమైన సబ్జెక్ట్",
            "life_ambition": "జీవిత ఆశయం",
            "favourite_sport": "ఇష్టమైన ఆట",
            "consent_text": "నేను నిబంధనలు మరియు షరతులు అంగీకరిస్తున్నాను.",
            "register_button": "నమోదు చేయండి",
            "login_link": "ఇప్పటికే ఖాతా ఉందా? లాగిన్",
            "profile_image": "ప్రొఫైల్ చిత్రం",
            "enter_full_name": "పూర్తి పేరును నమోదు చేయండి",
            "enter_username": "వాడుకరి పేరును నమోదు చేయండి",
            "enter_password": "పాస్వర్డ్ను నమోదు చేయండి",
            "enter_confirm_password": "పాస్వర్డ్ని నిర్ధారించండి",
            "enter_mobile_number": "మొబైల్ నంబర్ను నమోదు చేయండి",
            "enter_father_name": "తండ్రి పేరును నమోదు చేయండి",
            "enter_mother_name": "తల్లి పేరును నమోదు చేయండి",
            "enter_village": "గ్రామం పేరును నమోదు చేయండి",
            "enter_mandal": "మండలం పేరును నమోదు చేయండి",
            "enter_district": "జిల్లా పేరును నమోదు చేయండి",
            "enter_school_name": "పాఠశాల పేరును నమోదు చేయండి",
            "select_gender": "లింగాన్ని ఎంచుకోండి",
            "select_class": "తరగతిని ఎంచుకోండి",
            "select_medium": "మీడియంను ఎంచుకోండి",
            "select_subject": "సబ్జెక్ట్ను ఎంచుకోండి",
            "enter_life_ambition": "జీవిత ఆశయాన్ని నమోదు చేయండి",
            "enter_favourite_sport": "ఇష్టమైన ఆటను నమోదు చేయండి",
            "boy": "బాలుడు",
            "girl": "బాలిక",
            "other": "ఇతర",

            // Phase 2: Preview & Validation
            "review_details": "వివరాలను సమీక్షించండి",
            "confirm_register": "నిర్ధారించండి ఆపై నమోదు చేయండి",
            "edit_details": "వివరాలను సవరించండి",
            "error_required": "ఈ ఫీల్డ్ తప్పనిసరి",
            "select_one": "ఎంపికను ఎంచుకోండి",
            "subject_maths": "గణితం",
            "subject_science": "సైన్స్",
            "subject_social": "సాంఘిక శాస్త్రం",
            "subject_english": "ఆంగ్లం",
            "subject_telugu": "తెలుగు",
            "subject_hindi": "హిందీ",
            "subject_biology": "సాధారణ జ్ఞానం",
            "subject_physics": "భౌతిక శాస్త్రం",
            "subject_chemistry": "రసాయన శాస్త్రం",

            // Login Page
            "welcome_back": "స్వాగతం",
            "sign_in_text": "మీ ఖాతాలోకి లాగిన్ అవ్వండి",
            "sign_in": "లాగిన్",
            "signing_in": "లాగిన్ అవుతోంది...",
            "no_account": "ఖాతా లేదా?",
            "create_account": "కొత్త ఖాతా సృష్టించండి",

            // Profile Page

            "back_to_dashboard": "డ్యాష్‌బోర్డ్‌కు తిరిగి వెళ్లు",
            "personal_information": "వ్యక్తిగత సమాచారం",
            "interests_ambition": "ఆసక్తులు & ఆశయం",
            "address_details": "చిరునామా వివరాలు",
            "academic_information": "చదువు వివరాలు",
            "read_only": "(చదవడానికి మాత్రమే)",
            "cancel": "రద్దు చేయి",
            "save_changes": "మార్పులను దాచు",
            "saving": "దాచుతోంది...",
            "profile_updated": "ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది!",
            "profile_update_failed": "ప్రొఫైల్ నవీకరించడం విఫలమైంది",
            "change_photo": "ఫోటో మార్చండి",

            // Announcements Widget
            "announcements": "ప్రకటనలు",
            "view_all": "అన్నీ చూడండి",
            "no_announcements": "ప్రస్తుతానికి కొత్త ప్రకటనలు ఏమీ లేవు.",
            "imp": "ముఖ్యం",

            // Pending Tasks
            "catch_up": "క్యాచ్ అప్ చేయండి",
            "all_caught_up": "అన్నీ పూర్తయ్యాయి!",
            "no_pending_message": "మీకు పెండింగ్ పనులు ఏవీ లేవు. శభాష్!",
            "pending": "పెండింగ్‌లో ఉంది",
            "view_more_tasks": "మరిన్ని పెండింగ్ పనులను చూడండి",
            "show_less": "తక్కువ చూపించు",
            "total": "మొత్తం",

            // Subject Details
            "tab_introduction": "పరిచయం",
            "tab_chapters": "అధ్యాయాలు",
            "tab_revision": "పునశ్చరణ",
            "loading_content": "కంటెంట్ లోడ్ అవుతోంది...",
            "no_content_yet": "ఇంకా కంటెంట్ లేదు",
            "no_content_message": "ఈ విభాగంలో ఇంకా పరీక్షలు లేదా పాఠాలు లేవు.",
            "completed": "పూర్తయింది",
            "in_progress": "పురోగతిలో ఉంది",
            "score": "స్కోరు",
            "questions": "ప్రశ్నలు",
            "retake": "మళ్ళీ వ్రాయండి",
            "resume": "కొనసాగించండి",
            "start_exam": "పరీక్ష ప్రారంభించండి",
            "mins": "నిమిషాలు"
        }
    };

    const t = (key) => {
        const langData = translations[language] || translations['en'];
        return langData[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
