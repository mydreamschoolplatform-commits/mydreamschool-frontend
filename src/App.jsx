import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import { lazy, Suspense } from 'react';
import ToastContainer from './components/common/ToastContainer';

// Lazy-load all pages so the browser only downloads the JS for the current page.
// Login/Signup/Reset are tiny and loaded eagerly — everything else is on-demand.
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const HandwritingPractice = lazy(() => import('./pages/HandwritingPractice'));
const ExamPlayer = lazy(() => import('./pages/ExamPlayer'));
const TeacherHandwritingReview = lazy(() => import('./pages/TeacherHandwritingReview'));
const SubjectDetails = lazy(() => import('./pages/SubjectDetails'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const LiveSessionJoinPage = lazy(() => import('./pages/LiveSessionJoinPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RankingLeaderboard = lazy(() => import('./pages/RankingLeaderboard'));

// Minimal inline spinner shown while any lazy page is loading
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', width: '100vw', background: '#f8faff'
  }}>
    <div style={{
      width: 40, height: 40, border: '4px solid #e0e7ff',
      borderTopColor: '#6366f1', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <ToastContainer />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Dashboard />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/handwriting"
                element={
                  <ProtectedRoute>
                    <HandwritingPractice />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exams/:id"
                element={
                  <ProtectedRoute>
                    <ExamPlayer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/handwriting"
                element={
                  <ProtectedRoute>
                    <TeacherHandwritingReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rankings"
                element={
                  <ProtectedRoute>
                    <RankingLeaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subjects/:id"
                element={
                  <ProtectedRoute>
                    <SubjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <SupportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/announcements"
                element={
                  <ProtectedRoute>
                    <AnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/live-session/:sessionId"
                element={
                  <ProtectedRoute>
                    <LiveSessionJoinPage />
                  </ProtectedRoute>
                }
              />

              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
