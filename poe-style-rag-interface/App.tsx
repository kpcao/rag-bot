import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Chat from './pages/Chat';
import BotMaker from './pages/BotMaker';
import DocumentsPage from './pages/DocumentsPage';
import Auth from './pages/Auth';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 登录路由：如果已登录则跳转首页，否则显示 Auth */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" replace /> : <Auth />} 
        />

        {/* 受保护路由：如果未登录则跳转 /login */}
        <Route
          path="/*"
          element={
            user ? (
              <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
                <Sidebar user={user} />
                <div className="flex-1 flex flex-col min-w-0 bg-gray-800 relative">
                  <Routes>
                    <Route path="/" element={<Chat />} />
                    <Route path="/chat/:chatId" element={<Chat />} />
                    <Route path="/create-bot" element={<BotMaker />} />
                    <Route path="/edit-bot/:botId" element={<BotMaker />} />
                    <Route path="/documents" element={<DocumentsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;