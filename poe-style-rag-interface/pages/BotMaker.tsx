import React, { useState } from 'react';
import { motion } from 'framer-motion';
// ★ 引入 Sparkles 图标
import { Bot, Save, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
// ★ 引入 generateBotProfile
import { createBot, generateBotProfile } from '../services/api';

const BotMaker: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // ★ 新增：生成中的状态
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    model: 'llama3',
    temperature: 0.7
  });

  // ★ 新增：处理自动生成
  const handleAutoGenerate = async () => {
    if (!formData.name.trim()) {
      alert("Please enter a Bot Name first.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const data = await generateBotProfile(formData.name);
      setFormData(prev => ({
        ...prev,
        description: data.description,
        instructions: data.instructions
      }));
    } catch (error) {
      console.error(error);
      alert("Failed to generate profile. Make sure Ollama is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createBot(formData);
      navigate('/');
    } catch (err) {
      alert("Failed to create bot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Chat
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Create a Bot</h1>
              <p className="text-gray-400">Customize personality, knowledge, and behavior.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-6">
              
              {/* Identity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bot Handle / Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. CodeWizard"
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                  />
                  {/* ★ 新增：AI 生成按钮 */}
                  <button
                    type="button"
                    onClick={handleAutoGenerate}
                    disabled={isGenerating || !formData.name}
                    className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-xl transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Auto-generate description and instructions based on name"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span className="text-sm font-medium">AI Fill</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Short Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Helps with React coding questions"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                />
              </div>

              {/* Behavior */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  System Instructions (Prompt)
                  <span className="block text-xs text-gray-500 font-normal mt-1">Define how the bot should behave. Be specific.</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.instructions}
                  onChange={e => setFormData({...formData, instructions: e.target.value})}
                  placeholder="You are an expert programmer. You prefer concise answers..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none transition font-mono text-sm"
                />
              </div>

              {/* Model Config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Base Model</label>
                  <select
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                  >
                    <option value="llama3">Llama 3 (8B)</option>
                    <option value="mistral">Mistral (7B)</option>
                    <option value="gemma">Gemma (7B)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Creativity (Temperature): {formData.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={e => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3">
               <Link to="/" className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition">
                 Cancel
               </Link>
               <button
                 type="submit"
                 disabled={loading}
                 className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition flex items-center gap-2 shadow-lg shadow-brand-900/20"
               >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                 Create Bot
               </button>
            </div>

          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default BotMaker;