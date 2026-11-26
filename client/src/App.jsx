import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import DocumentsPage from './pages/DocumentsPage';

// Shows the header + page if logged in; otherwise sends the user to /login.
function ProtectedLayout({ children }) {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <header className="topbar">
        <span className="brand">GeoEnergy · Document Approval</span>
        <span className="topbar-right">
          {user.username} ({user.role})
          <button className="secondary" onClick={logout}>Log out</button>
        </span>
      </header>
      <main className="container">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedLayout><DocumentsPage /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
