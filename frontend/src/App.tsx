
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import PublicRoute from './components/Auth/PublicRoute';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import WebtoonLibraryPage from './pages/Webtoon/WebtoonLibraryPage';
import UploadComicPage from './pages/Webtoon/UploadComicPage';
import ChapterViewerPage from './pages/Webtoon/ChapterViewerPage';
import VoiceProfilesPage from './pages/Voice/VoiceProfilesPage';
import ScriptViewerPage from './pages/Script/ScriptViewerPage';
import VideoEditorPage from './pages/Video/VideoEditorPage';
import RenderQueuePage from './pages/Video/RenderQueuePage';
import GeneratedVideosPage from './pages/Video/GeneratedVideosPage';
import SettingsPage from './pages/Settings/SettingsPage';
import NotFoundPage from './pages/NotFound/NotFoundPage';

function App() {

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="webtoons" element={<WebtoonLibraryPage />} />
        <Route path="upload" element={<UploadComicPage />} />
        <Route path="webtoons/:webtoonId/chapters/:chapterId" element={<ChapterViewerPage />} />
        <Route path="voice-profiles" element={<VoiceProfilesPage />} />
        <Route path="scripts/:scriptId" element={<ScriptViewerPage />} />
        <Route path="video-editor/:videoId" element={<VideoEditorPage />} />
        <Route path="render-queue" element={<RenderQueuePage />} />
        <Route path="videos" element={<GeneratedVideosPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
