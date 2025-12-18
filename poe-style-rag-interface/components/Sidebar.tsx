import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, LogOut, Bot, Database, LayoutGrid, 
  MessageSquare, Trash2, PanelLeftClose // ★ 引入 PanelLeftClose
} from 'lucide-react';
import { auth, logOut } from '../services/firebase';
import { User } from 'firebase/auth';
import { fetchChats, deleteChat } from '../services/api';

interface SidebarProps {
  user: User;
  isOpen: boolean;       // ★ 新增 prop
  setIsOpen: (v: boolean) => void; // ★ 新增 prop
}

const Sidebar: React.FC<SidebarProps> = ({ user, isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState<any[]>([]);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const loadChats = async () => {
      if (!user) return;
      try {
        const data = await fetchChats();
        const sortedChats = (data.chats || []).sort((a: any, b: any) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setChats(sortedChats);
      } catch (error) {
        console.error("Failed to load chats", error);
      }
    };
    loadChats();
  }, [user, location.pathname]);

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat?")) return;
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (location.pathname === `/chat/${chatId}`) {
        navigate('/');
      }
    } catch (error) {
      console.error("Failed to delete chat", error);
    }
  };

  // ★ 点击链接后，如果是移动端，自动关闭侧边栏
  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* ★ 侧边栏容器：处理移动端 fixed 和桌面端 relative 逻辑 */}
      {/* ★ 修复：pt-14 md:pt-0 移动端增加顶部内边距，防止内容被状态栏遮挡 */}
      <div 
        className={`
          fixed md:relative z-40 h-full bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out pt-14 md:pt-0
          ${isOpen ? 'translate-x-0 w-72 md:w-64' : '-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden'}
        `}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between mb-2 min-w-[256px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Bot size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">RAG Bot</h1>
          </div>
          {/* ★ 移动端关闭按钮 */}
          {/* ★ 修复：确保在移动端容易点击 */}
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-400 hover:text-white p-2 bg-gray-800/50 rounded-lg"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar min-w-[256px]">
          <button
            onClick={() => handleNavigation('/')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
              isActive('/') && location.search === '' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
            }`}
          >
            <Plus size={18} className={isActive('/') ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
            <span className="font-medium text-sm">New Chat</span>
          </button>

          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Menu
            </p>
            
            <button
              onClick={() => handleNavigation('/my-bots')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                isActive('/my-bots') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <LayoutGrid size={18} />
              <span className="text-sm">My Bots</span>
            </button>

            <button
              onClick={() => handleNavigation('/documents')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/documents') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <Database size={18} />
              <span className="text-sm">Knowledge Base</span>
            </button>
          </div>

          {chats.length > 0 && (
            <div className="pt-2 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                History
              </p>
              <div className="space-y-1">
                {chats.map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => handleNavigation(`/chat/${chat.id}`)}
                    className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      isActive(`/chat/${chat.id}`) 
                        ? 'bg-gray-800 text-white' 
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    }`}
                  >
                    <MessageSquare size={16} className="flex-shrink-0" />
                    <span className="text-sm truncate flex-1 text-left">
                      {chat.title || 'New Chat'}
                    </span>
                    
                    <button 
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 hover:bg-gray-700 rounded transition-all"
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-gray-800 bg-gray-900/50 min-w-[256px]">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-800 transition-colors group cursor-pointer">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover border border-gray-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {user.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;