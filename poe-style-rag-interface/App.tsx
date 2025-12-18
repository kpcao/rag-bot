import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebase';
import Sidebar from './components/Sidebar';
import Chat from './pages/Chat';
import BotMaker from './pages/BotMaker';
import DocumentsPage from './pages/DocumentsPage';
import Auth from './pages/Auth';
import MyBots from './pages/MyBots';
import { PanelLeft } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) return <div className="h-[100dvh] bg-gray-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Auth /> : <Navigate to="/" />} />
        
        <Route path="/*" element={user ? (
          // ★ 修复 1: 使用 h-[100dvh] 替代 h-screen，完美适配移动端浏览器地址栏
          <div className="flex h-[100dvh] bg-gray-950 text-white overflow-hidden relative">
            
            <Sidebar 
              user={user} 
              isOpen={isSidebarOpen} 
              setIsOpen={setIsSidebarOpen} 
            />

            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative transition-all duration-300">
              
              {/* ★ 修复 2: 使用 env(safe-area-inset-top) 动态适配刘海屏/灵动岛，不再硬编码 top-12 */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`absolute left-3 z-50 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors 
                  ${isSidebarOpen ? 'hidden md:hidden' : 'block'} 
                `}
                style={{ top: 'max(12px, env(safe-area-inset-top) + 12px)' }}
                title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              >
                <PanelLeft size={20} />
              </button>

              <Routes>
                <Route path="/" element={<Chat />} />
                <Route path="/chat/:chatId" element={<Chat />} />
                <Route path="/my-bots" element={<MyBots />} />
                <Route path="/create-bot" element={<BotMaker />} />
                <Route path="/edit-bot/:botId" element={<BotMaker />} />
                <Route path="/documents" element={<DocumentsPage />} />
              </Routes>
            </div>
          </div>
        ) : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;