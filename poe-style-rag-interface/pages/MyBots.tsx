import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Plus, Settings, Sparkles } from 'lucide-react';
import { fetchBots } from '../services/api';

const MyBots: React.FC = () => {
  const navigate = useNavigate();
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBots = async () => {
      try {
        const data = await fetchBots();
        setBots(data.bots || []);
      } catch (error) {
        console.error("Failed to load bots", error);
      } finally {
        setLoading(false);
      }
    };
    loadBots();
  }, []);

  return (
    <div 
      className="min-h-full bg-gray-950 text-white p-8 overflow-y-auto"
      style={{ paddingTop: 'max(3rem, env(safe-area-inset-top) + 3rem)' }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Bots</h1>
            <p className="text-gray-400">Manage your custom AI assistants.</p>
          </div>
          <button
            onClick={() => navigate('/create-bot')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors"
          >
            <Plus size={20} />
            Create Bot
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading...</div>
        ) : bots.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
            <Bot size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No bots yet</h3>
            <p className="text-gray-500 mb-6">Create your first custom AI assistant to get started.</p>
            <button
              onClick={() => navigate('/create-bot')}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white transition-colors"
            >
              Create a Bot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bots.map((bot) => (
              <div 
                key={bot.id}
                onClick={() => navigate(`/edit-bot/${bot.id}`)}
                className="group bg-gray-900 border border-gray-800 hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-900/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl flex items-center justify-center group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
                    <Bot size={24} className="text-gray-400 group-hover:text-white" />
                  </div>
                  <Settings size={18} className="text-gray-600 group-hover:text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-200 group-hover:text-white mb-1">
                  {bot.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3 h-10">
                  {bot.description || "No description provided."}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="px-2 py-1 bg-gray-800 rounded border border-gray-700">
                    {bot.model}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBots;