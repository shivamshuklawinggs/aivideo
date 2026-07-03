
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import PublicRoute from './components/Auth/PublicRoute';
// Layout
import Layout from './components/Layout/Layout';
// Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import SettingsPage from './pages/Settings/SettingsPage';
import NotFoundPage from './pages/NotFound/NotFoundPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import WebtoonsPage from './pages/Webtoons/WebtoonsPage';
import ChaptersPage from './pages/Chapters/ChaptersPage';
import ChapterDetailsPage from './pages/Chapters/ChapterDetailsPage';

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
            <Layout>
              <Routes>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="webtoons" element={<WebtoonsPage />} />
                <Route path="webtoons/:webtoonId/chapters" element={<ChaptersPage />} />
                <Route path="chapters/:chapterId" element={<ChapterDetailsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
