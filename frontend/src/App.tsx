import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WelcomeScreen } from './pages/auth/WelcomeScreen';
import { SurveyScreen } from './pages/auth/SurveyScreen';
import { MainLayout } from './layouts/MainLayout';
import { LearnRoom } from './pages/learn/LearnRoom';
import { LessonIntro } from './pages/learn/LessonIntro'; // Added LessonIntro import
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
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
    </BrowserRouter>
  );
}

export default App;
