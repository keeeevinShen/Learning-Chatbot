import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ChatPage from './pages/ChatPage';
import EmbedDocumentPage from './pages/EmbedDocumentPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import GoogleCallback from './pages/GoogleCallback';

function App() {
  return (
    <div className="h-full">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/embed" element={<EmbedDocumentPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/google-callback" element={<GoogleCallback />} />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
