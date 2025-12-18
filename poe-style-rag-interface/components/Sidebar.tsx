import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, LogOut, Bot, Database, LayoutGrid, 
  MessageSquare, Trash2 // ★ 引入 MessageSquare 和 Trash2
} from 'lucide-react';
import { auth, logOut } from '../services/firebase';
import { User } from 'firebase/auth';
// ★ 引入 fetchChats 和 deleteChat
import { fetchChats, deleteChat } from '../services/api';

interface SidebarProps {
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // ★ 新增 state
  const [chats, setChats] = useState<any[]>([]);

  const isActive = (path: string) => location.pathname === path;

  // ★ 新增：加载聊天历史
  useEffect(() => {
    const loadChats = async () => {
      if (!user) return;
      try {
        const data = await fetchChats();
        // 按时间倒序排列 (最新的在上面)
        const sortedChats = (data.chats || []).sort((a: any, b: any) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setChats(sortedChats);
      } catch (error) {
        console.error("Failed to load chats", error);
      }
    };
    loadChats();
  }, [user, location.pathname]); // 当路径变化时刷新（例如创建新对话后）

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // ★ 新增：删除聊天
  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // 防止触发点击跳转
    if (!window.confirm("Delete this chat?")) return;
    
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      // 如果当前正在看这个聊天，跳回主页
      if (location.pathname === `/chat/${chatId}`) {
        navigate('/');
      }
    } catch (error) {
      console.error("Failed to delete chat", error);
    }
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full flex-shrink-0 transition-all duration-300">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
          <Bot size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">RAG Bot</h1>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <button
          onClick={() => navigate('/')}
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
            onClick={() => navigate('/create-bot')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
              isActive('/create-bot') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
            }`}
          >
            <LayoutGrid size={18} />
            <span className="text-sm">My Bots</span>
          </button>

          <button
            onClick={() => navigate('/documents')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/documents') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
            }`}
          >
            <Database size={18} />
            <span className="text-sm">Knowledge Base</span>
          </button>
        </div>

        {/* ★ 恢复：History Section */}
        {chats.length > 0 && (
          <div className="pt-2 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              History
            </p>
            <div className="space-y-1">
              {chats.map(chat => (
                <div 
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
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
                  
                  {/* Delete button (visible on hover) */}
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

      {/* Bottom Section - User Profile Only */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-800 transition-colors group cursor-pointer">
          
          {/* ★ 修改开始：优先显示 Google 头像，如果没有才显示首字母 */}
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
          {/* ★ 修改结束 */}

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
  );
};

export default Sidebar;