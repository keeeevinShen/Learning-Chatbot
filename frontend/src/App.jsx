import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import EmbedDocumentPage from './pages/EmbedDocumentPage';

function App() {
  return (
    <div className="h-full">
      <Router>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/embed" element={<EmbedDocumentPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
