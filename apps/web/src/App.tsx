import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GamePage from './pages/GamePage';
import LobbyPage from './pages/LobbyPage';
import CharactersPage from './pages/CharactersPage';
import CharacterDetailPage from './pages/CharacterDetailPage';
import CharacterViewPage from './pages/CharacterViewPage';
import ProfilePage from './pages/ProfilePage';
import AdminHomePage from './pages/admin/AdminHomePage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminPlayerCharactersPage from './pages/admin/AdminPlayerCharactersPage';
import AdminFriendshipsPage from './pages/admin/AdminFriendshipsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/games/:id" element={<GamePage />} />
          <Route path="/games/:id/lobby" element={<LobbyPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/characters/:id" element={<CharacterViewPage />} />
          <Route path="/characters/:id/edit" element={<CharacterDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/player-characters" element={<AdminPlayerCharactersPage />} />
          <Route path="/admin/friendships" element={<AdminFriendshipsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
