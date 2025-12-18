import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Send, Bot, StopCircle, RefreshCw, FileText, 
  ChevronDown, Plus, Book, X, CheckSquare, Square,
  Paperclip, Loader // ★ 引入 Paperclip 和 Loader
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
// ★ 引入 uploadFile
import { fetchBots, fetchChats, createChat, streamChat, fetchDocuments, updateChat, uploadFile } from '../services/api';
import { auth } from '../services/firebase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  timestamp?: string;
}

const Chat: React.FC = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [input, setInput] = useState('');
  const [bots, setBots] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [currentBot, setCurrentBot] = useState<any>(null);
  const [streamStatus, setStreamStatus] = useState('');
  
  // UI State
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showBotSelector, setShowBotSelector] = useState(false);
  
  // ★ 新增：上传状态
  const [isUploading, setIsUploading] = useState(false);

  // Ref to track streaming status
  const isStreamingRef = useRef(false);

  // 1. 加载基础数据
  useEffect(() => {
    const loadData = async () => {
      if (!auth.currentUser) return;
      try {
        const [botsData, chatsData, docsData] = await Promise.all([
          fetchBots(),
          fetchChats(),
          fetchDocuments()
        ]);
        const loadedBots = botsData.bots || [];
        setBots(loadedBots);
        setChats(chatsData.chats || []);
        setDocuments(docsData.documents || []);
        
        if (!currentBot && loadedBots.length > 0) {
          setCurrentBot(loadedBots[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. 处理当前 Chat 的逻辑
  useEffect(() => {
    if (isStreamingRef.current) return;

    if (!chatId) {
      setMessages([]);
      return;
    }

    const chat = chats?.find((c: any) => c.id === chatId);
    
    if (chat) {
      setMessages(chat.messages || []);
      if (chat.bot_id && bots.length > 0) {
        const bot = bots.find((b: any) => b.id === chat.bot_id);
        if (bot) setCurrentBot(bot);
      }
      setSelectedDocIds(chat.selected_documents || []);
    }
  }, [chatId, chats, bots]);

  // 3. 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamStatus]);

  useEffect(() => {
    isStreamingRef.current = streaming;
  }, [streaming]);

  // ★ 修复：允许在没有 chatId 时更新本地选中状态
  const toggleDocument = async (docId: string) => {
    const newSelection = selectedDocIds.includes(docId)
      ? selectedDocIds.filter(id => id !== docId)
      : [...selectedDocIds, docId];
    
    // 1. 无论是否有 chatId，先更新 UI 状态
    setSelectedDocIds(newSelection);
    
    // 2. 如果是在已有对话中，同步到后端
    if (chatId) {
      try {
        await updateChat(chatId, { selected_documents: newSelection });
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, selected_documents: newSelection } : c));
      } catch (error) {
        console.error("Failed to update context selection", error);
      }
    }
  };

  // ★ 新增：处理快速上传
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      // 1. 上传文件
      const response = await uploadFile(file);
      
      // 2. 刷新文档列表
      const docsData = await fetchDocuments();
      const allDocs = docsData.documents || [];
      setDocuments(allDocs);
      
      // 3. 自动选中刚上传的文件
      // 假设后端返回了 filename 或 original_filename，我们尝试在列表中找到它
      // 这里简单起见，我们重新获取列表后，找到最新的那个文件（或者根据文件名匹配）
      const uploadedDoc = allDocs.find((d: any) => d.name === response.original_filename || d.name === file.name);
      
      if (uploadedDoc) {
        await toggleDocument(uploadedDoc.id);
        // 提示用户
        alert(`Uploaded and selected: ${uploadedDoc.name}`);
      }
      
    } catch (error) {
      console.error("Quick upload failed:", error);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
      e.target.value = ''; // 重置 input
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || streaming) return;

    setInput('');
    setStreaming(true);
    setStreamStatus('Initializing...');

    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    let activeChatId = chatId;

    try {
      // 如果是新对话，创建 Chat
      if (!activeChatId) {
        const newChat = await createChat({
          title: textToSend.slice(0, 50),
          bot_id: currentBot?.id,
          // ★ 修复：创建新对话时，带上当前选中的文档 ID
          selected_documents: selectedDocIds 
        });
        activeChatId = newChat.chat.id;
        setChats(prev => [newChat.chat, ...prev]);
      }

      const tempBotMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: tempBotMsgId,
        role: 'assistant',
        content: ''
      }]);

      let fullResponse = '';

      await streamChat(
        activeChatId!,
        textToSend,
        (data) => {
          if (data.token) {
            fullResponse += data.token;
            setMessages(prev => prev.map(msg => 
              msg.id === tempBotMsgId ? { ...msg, content: fullResponse } : msg
            ));
            setStreamStatus('');
          }
          if (data.status) setStreamStatus(data.status);
          if (data.sources) {
            setMessages(prev => prev.map(msg => 
              msg.id === tempBotMsgId ? { ...msg, sources: data.sources } : msg
            ));
          }
        },
        (err) => {
          console.error("Stream error:", err);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Error: ${err.message || 'Failed to get response'}`
          }]);
        },
        () => {
          setStreaming(false);
          setStreamStatus('');
          
          setChats(prev => prev.map(c => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: [
                  ...(c.messages || []),
                  tempUserMsg,
                  { id: tempBotMsgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() }
                ]
              };
            }
            return c;
          }));

          if (!chatId) {
            navigate(`/chat/${activeChatId}`, { replace: true });
          }
        }
      );

    } catch (error) {
      console.error("Failed to send message:", error);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Summarize this document",
    "What are the key findings?",
    "Explain the methodology",
    "Create a bulleted list"
  ];

  return (
    <div className="flex h-full bg-gray-900 text-gray-100 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/95 backdrop-blur z-20">
          
          {/* Bot Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowBotSelector(!showBotSelector)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span className="font-semibold text-lg">
                {currentBot ? currentBot.name : 'Select a Bot'}
              </span>
              <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400 border border-gray-700">
                {currentBot?.model || 'Standard'}
              </span>
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {showBotSelector && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 px-2 py-1">YOUR BOTS</div>
                  {bots.map(bot => (
                    <button
                      key={bot.id}
                      onClick={() => {
                        setCurrentBot(bot);
                        setShowBotSelector(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                        currentBot?.id === bot.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      <Bot size={16} />
                      {bot.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowContextPanel(!showContextPanel)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border ${
                showContextPanel 
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                  : 'hover:bg-gray-800 border-transparent text-gray-400'
              }`}
            >
              <Book size={18} />
              <span className="text-sm font-medium">Context</span>
              {selectedDocIds.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">
                  {selectedDocIds.length}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => {
                navigate('/');
                setInput('');
                setSelectedDocIds([]); 
              }}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="New Chat"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {!chatId && messages.length === 0 ? (
            // ★ Empty State with Suggestions
            <div className="h-full flex flex-col items-center justify-center pb-20">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Bot size={32} className="text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Start a new chat</h2>
              <p className="text-gray-400 mb-8 text-center max-w-md">
                I can help you analyze documents, answer questions, and generate content.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="p-4 bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600 rounded-xl text-left text-sm text-gray-300 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message List
            <div className="space-y-6 max-w-3xl mx-auto pt-4 pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
                  
                  <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-5 py-3.5 ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-100 border border-gray-700'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* ★ 修改：Reference 样式优化 */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        {msg.sources.slice(0, 5).map((source: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="group relative flex items-center gap-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 rounded-full px-3 py-1 text-xs transition-all cursor-help max-w-[200px]"
                          >
                            <FileText size={10} className="text-blue-400 flex-shrink-0" />
                            <span className="truncate text-gray-400 group-hover:text-gray-200 font-medium">
                              {source.metadata?.original_filename || 'Document'}
                            </span>
                            
                            {/* Hover Tooltip: 鼠标悬停时显示详细内容 */}
                            <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700/50">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Source Content</span>
                                <span className="text-[10px] text-gray-500">Page {source.metadata?.page || 1}</span>
                              </div>
                              <p className="text-xs text-gray-300 leading-relaxed line-clamp-6">
                                {source.content}
                              </p>
                            </div>
                          </div>
                        ))}
                        {msg.sources.length > 5 && (
                          <span className="text-[10px] text-gray-500 px-1">+{msg.sources.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {streaming && streamStatus && (
                <div className="flex gap-4">
                   <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 animate-pulse">
                      <Bot size={16} className="text-white" />
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{streamStatus}</span>
                    </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="max-w-3xl mx-auto relative">
            {/* ★ 新增：左侧上传按钮 */}
            <label className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg cursor-pointer transition-colors z-10">
              {isUploading ? <Loader size={20} className="animate-spin" /> : <Paperclip size={20} />}
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.txt,.md,.csv,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
                onChange={handleQuickUpload}
                disabled={isUploading || streaming}
              />
            </label>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Assistant..."
              disabled={streaming}
              // ★ 修改：增加左侧 padding 以避开图标
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-lg disabled:opacity-50"
            />
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || streaming}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:bg-transparent disabled:text-gray-600"
            >
              {streaming ? <StopCircle size={18} /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>

      {/* Right Context Panel */}
      {showContextPanel && (
        <div className="w-80 border-l border-gray-800 bg-gray-900 flex flex-col transition-all duration-300 shadow-2xl z-30">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
            <div>
              <h3 className="font-semibold text-sm text-white">Knowledge Base</h3>
              <p className="text-xs text-gray-400">Select documents to chat with</p>
            </div>
            <button onClick={() => setShowContextPanel(false)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
            {documents.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText size={20} className="text-gray-500" />
                </div>
                <p className="text-sm text-gray-300 mb-2">No documents found</p>
                <button 
                  onClick={() => navigate('/documents')}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  Upload Documents
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {documents.map(doc => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div 
                      key={doc.id}
                      onClick={() => toggleDocument(doc.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                        isSelected 
                          ? 'bg-blue-900/20 border-blue-500/30' 
                          : 'hover:bg-gray-800 border-transparent'
                      }`}
                    >
                      <div className={`mt-0.5 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-100' : 'text-gray-300'}`}>
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-800 bg-gray-900">
             <button 
                onClick={() => navigate('/documents')}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
                <span>Manage Documents</span>
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;