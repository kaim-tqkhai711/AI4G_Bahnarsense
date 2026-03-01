import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { WelcomeScreen } from './pages/auth/WelcomeScreen';
import { AuthCallback } from './pages/auth/AuthCallback';
import { SurveyScreen } from './pages/auth/SurveyScreen';
import { MainLayout } from './layouts/MainLayout';
import { LearnRoom } from './pages/learn/LearnRoom';
import { LessonIntro } from './pages/learn/LessonIntro';
import { LessonInteractive } from './pages/learn/LessonInteractive';
import { RewardsScreen } from './pages/learn/RewardsScreen';
import { ReviewRoom } from './pages/review/ReviewRoom';
import { CommunityRoom } from './pages/community/CommunityRoom';
import { StoriesRoom } from './pages/stories/StoriesRoom';
import { ChatRoom } from './pages/chat/ChatRoom';
import { ShopRoom } from './pages/shop/ShopRoom';
import { AdminRoom } from './pages/admin/AdminRoom';
import { useUserStore } from './store/useUserStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUserStore();

  if (!isAuthenticated && !localStorage.getItem('isGuest')) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}

/** If Supabase sent tokens in URL but we're not on callback, redirect to /auth/callback so we keep the hash */
function useOAuthRedirectGuard() {
  const location = useLocation();
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const hasTokens = hash.includes('access_token') || hash.includes('refresh_token') || search.includes('code=');
    if (hasTokens && location.pathname !== '/auth/callback') {
      window.location.replace(`/auth/callback${hash}${search}`);
    }
  }, [location.pathname]);
}

function AppRoutes() {
  useOAuthRedirectGuard();
  return (
    <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/survey" element={<SurveyScreen />} />

        {/* Protected Routes inside MainLayout */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<LearnRoom />} />
          <Route path="/lesson/:id/intro" element={<LessonIntro />} /> {/* Added LessonIntro Route */}
          <Route path="/lesson/:id/interactive" element={<LessonInteractive />} />
          <Route path="/lesson/:id/rewards" element={<RewardsScreen />} />
          <Route path="/lesson/:id" element={<LearnRoom />} /> {/* Fallback legacy router */}
          <Route path="/review" element={<ReviewRoom />} />
          <Route path="/community" element={<CommunityRoom />} />
          <Route path="/stories" element={<StoriesRoom />} />
          <Route path="/chat" element={<ChatRoom />} />
          <Route path="/shop" element={<ShopRoom />} />
        </Route>

        {/* Admin Route - basic unprotected for MVP */}
        <Route path="/admin" element={<AdminRoom />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
